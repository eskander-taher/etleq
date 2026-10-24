import { Binary, type Document } from 'mongodb'

import { checkPrivateFile } from '@/hooks/privateFiles'

import { sendEmail } from './email'
import { FILES_COLLECTION, getDb, GLOBALS_COLLECTION, idCandidates, idString, newId } from './db'
import { applyDefaults, type Doc, ensureIds, fromMongo, mapRefs, mergeLocalized, normalize, resolveDoc } from './fields'
import { afterChange, afterDelete, afterGlobalChange, beforeChange } from './hooks'
import { type CollectionConfig, type Field, getGlobalConfig, requireCollection } from './schema'
import type {
  CollectionSlug,
  DataFromCollectionSlug,
  DataFromGlobalSlug,
  GlobalSlug,
  Locale,
  PaginatedDocs,
  Sort,
  Where,
  WriteContext,
} from './types'
import { NotFoundError } from './types'
import { toFilter, toSort } from './where'

/**
 * The CMS data API used by the site, server actions, scripts and the admin.
 * The call shapes follow Payload's Local API (find / findByID / create /
 * update / delete / findGlobal / updateGlobal), so existing call sites only
 * changed their import.
 *
 * `locale: 'all'` returns the stored shape (both locales, Markdown rich text,
 * relation ids) for the admin forms.
 */

export type ReadLocale = Locale | 'all'

export type FindArgs = {
  collection: CollectionSlug | string
  where?: Where
  locale?: ReadLocale
  depth?: number
  limit?: number
  page?: number
  sort?: Sort
  pagination?: boolean
  // Accepted for call-site compatibility; reads always return published + draft documents as stored.
  draft?: boolean
  fallbackLocale?: false | Locale
  overrideAccess?: boolean
  select?: Record<string, unknown>
}

/** Fields never returned by reads. */
const HIDDEN: Record<string, Record<string, 0>> = {
  users: { hash: 0, salt: 0, loginAttempts: 0, lockUntil: 0 },
}

/** Relations that are never populated on public reads (user accounts). */
const NEVER_POPULATE = new Set(['users'])

async function findDocs(config: CollectionConfig, args: Omit<FindArgs, 'collection'>) {
  const db = await getDb()
  const locale = args.locale === 'all' ? null : (args.locale ?? 'ar')
  const filter = toFilter(args.where, config.fields, locale)
  const sort = toSort(args.sort ?? config.defaultSort, config.fields, locale)
  const limit = args.limit ?? 10
  const paginate = args.pagination !== false && limit > 0
  const page = Math.max(1, Math.floor(args.page ?? 1))
  const coll = db.collection(config.slug)

  let cursor = coll.find(filter, { projection: HIDDEN[config.slug] }).sort(sort)
  let totalDocs: number | undefined
  if (paginate) {
    totalDocs = await coll.countDocuments(filter)
    cursor = cursor.skip((page - 1) * limit).limit(limit)
  } else if (limit > 0) {
    cursor = cursor.limit(limit)
  }
  const raws = await cursor.toArray()
  let docs = raws.map((r) => fromMongo(r))
  if (locale) {
    docs = docs.map((d) => resolveDoc(config.fields, d, locale))
    await populate(config.fields, docs, args.depth ?? 2, locale)
  }
  return { docs, totalDocs: totalDocs ?? docs.length, limit: paginate ? limit : docs.length, page: paginate ? page : 1 }
}

/** Replace relation ids with documents (batched per collection), `depth` levels deep. */
async function populate(fields: Field[], docs: Doc[], depth: number, locale: Locale) {
  if (depth <= 0 || !docs.length) return
  const wanted = new Map<string, Set<string>>()
  for (const doc of docs) {
    mapRefs(fields, doc, (field, value) => {
      if (value == null || typeof value === 'object' || NEVER_POPULATE.has(field.relationTo)) return value
      const id = idString(value)
      if (!wanted.has(field.relationTo)) wanted.set(field.relationTo, new Set())
      wanted.get(field.relationTo)!.add(id)
      return id
    })
  }
  if (!wanted.size) return
  const found = new Map<string, Map<string, Doc>>()
  await Promise.all(
    [...wanted].map(async ([slug, ids]) => {
      const config = requireCollection(slug)
      const res = await findDocs(config, {
        where: { id: { in: [...ids] } },
        locale,
        depth: depth - 1,
        limit: 0,
        pagination: false,
      })
      found.set(slug, new Map(res.docs.map((d) => [String(d.id), d])))
    }),
  )
  for (const doc of docs) {
    mapRefs(fields, doc, (field, value) => {
      if (value == null || typeof value === 'object') return value
      return found.get(field.relationTo)?.get(String(value)) ?? value
    })
  }
}

function paginated<T>(res: { docs: Doc[]; totalDocs: number; limit: number; page: number }): PaginatedDocs<T> {
  const totalPages = res.limit > 0 ? Math.max(1, Math.ceil(res.totalDocs / res.limit)) : 1
  return {
    docs: res.docs as T[],
    totalDocs: res.totalDocs,
    limit: res.limit,
    totalPages,
    page: res.page,
    pagingCounter: (res.page - 1) * res.limit + 1,
    hasPrevPage: res.page > 1,
    hasNextPage: res.page < totalPages,
    prevPage: res.page > 1 ? res.page - 1 : null,
    nextPage: res.page < totalPages ? res.page + 1 : null,
  }
}

async function rawById(config: CollectionConfig, id: string): Promise<Doc | null> {
  const db = await getDb()
  const raw = await db.collection(config.slug).findOne({ _id: { $in: idCandidates(id) } } as Document)
  return raw ? fromMongo(raw) : null
}

/** Strip API-only keys before writing. */
function toStored(doc: Doc): Doc {
  const { id: _id, ...rest } = doc
  return rest
}

type UploadFile = { data: Buffer | Uint8Array; mimetype: string; name: string; size?: number }

export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const safeFilename = (name: string) => {
  const dot = name.lastIndexOf('.')
  const base =
    (dot > 0 ? name.slice(0, dot) : name)
      .normalize('NFKD')
      .replace(/[^\w-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'file'
  const ext =
    dot > 0
      ? name
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '')
      : ''
  return ext ? `${base}.${ext}` : base
}

/** Validate an upload and return the metadata fields to store on its document. */
async function uploadMeta(config: CollectionConfig, id: string, file: UploadFile): Promise<Doc> {
  const data = Buffer.from(file.data)
  const filename = safeFilename(file.name)
  if (config.upload === 'private') {
    const check = checkPrivateFile({ data, size: data.length, mimetype: file.mimetype })
    if (!check.ok) throw new Error(check.message)
    return { filename, mimeType: 'application/pdf', filesize: data.length }
  }
  if (!/^image\/(png|jpe?g|webp|gif|avif|svg\+xml)$/.test(file.mimetype))
    throw new Error('Only images (PNG, JPEG, WebP, GIF, AVIF, SVG) can be uploaded.')
  if (data.length > MAX_IMAGE_BYTES) throw new Error('Images must be 4 MB or smaller.')
  let width: number | null = null
  let height: number | null = null
  if (file.mimetype !== 'image/svg+xml') {
    try {
      const sharp = (await import('sharp')).default
      const meta = await sharp(data).metadata()
      width = meta.width ?? null
      height = meta.height ?? null
    } catch {
      // Dimensions are optional.
    }
  }
  return { filename, mimeType: file.mimetype, filesize: data.length, width, height, url: `/media/${id}/${filename}` }
}

async function storeFile(id: string, file: UploadFile, mimeType: string) {
  const db = await getDb()
  await db
    .collection(FILES_COLLECTION)
    .replaceOne({ _id: id as never }, { data: new Binary(Buffer.from(file.data)), mimeType }, { upsert: true })
}

export const cms = {
  async find<S extends CollectionSlug>(
    args: FindArgs & { collection: S },
  ): Promise<PaginatedDocs<DataFromCollectionSlug<S>>> {
    const config = requireCollection(args.collection)
    return paginated(await findDocs(config, args))
  },

  async count(args: {
    collection: CollectionSlug | string
    where?: Where
    overrideAccess?: boolean
  }): Promise<{ totalDocs: number }> {
    const config = requireCollection(args.collection)
    const db = await getDb()
    return { totalDocs: await db.collection(config.slug).countDocuments(toFilter(args.where, config.fields, null)) }
  },

  async findByID<S extends CollectionSlug>(args: {
    collection: S
    id: string | number
    locale?: ReadLocale
    depth?: number
    overrideAccess?: boolean
    draft?: boolean
    fallbackLocale?: false
  }) {
    const config = requireCollection(args.collection)
    const res = await findDocs(config, {
      where: { id: { equals: String(args.id) } },
      locale: args.locale,
      depth: args.depth,
      limit: 1,
      pagination: false,
    })
    if (!res.docs[0]) throw new NotFoundError(args.collection, String(args.id))
    return res.docs[0] as DataFromCollectionSlug<S>
  },

  async create<S extends CollectionSlug>(args: {
    collection: S
    data: Doc
    locale?: Locale
    file?: UploadFile
    context?: WriteContext
    overrideAccess?: boolean
  }): Promise<DataFromCollectionSlug<S>> {
    const config = requireCollection(args.collection)
    const id = typeof args.data.id === 'string' && args.data.id ? args.data.id : newId()
    let doc: Doc = args.locale ? mergeLocalized(config.fields, {}, args.data, args.locale) : { ...args.data }
    if (config.upload) {
      if (!args.file) throw new Error('A file is required.')
      Object.assign(doc, await uploadMeta(config, id, args.file))
    }
    doc = await beforeChange(config, doc, null, args.context)
    const now = new Date().toISOString()
    const stored = { ...toStored(doc), createdAt: now, updatedAt: now }
    const db = await getDb()
    if (config.upload && args.file) await storeFile(id, args.file, String(doc.mimeType))
    await db.collection(config.slug).insertOne({ _id: id as never, ...stored })
    await afterChange(config, { id, ...stored }, null, args.context)
    return (await this.findByID({
      collection: args.collection,
      id,
      locale: args.locale ?? 'ar',
      depth: 0,
    })) as DataFromCollectionSlug<S>
  },

  async update<S extends CollectionSlug>(args: {
    collection: S
    id: string | number
    data: Doc
    locale?: Locale
    file?: UploadFile
    context?: WriteContext
    overrideAccess?: boolean
  }): Promise<DataFromCollectionSlug<S>> {
    const config = requireCollection(args.collection)
    const original = await rawById(config, String(args.id))
    if (!original) throw new NotFoundError(args.collection, String(args.id))
    let doc: Doc = args.locale
      ? mergeLocalized(config.fields, original, args.data, args.locale)
      : { ...original, ...args.data }
    if (config.upload && args.file) Object.assign(doc, await uploadMeta(config, original.id, args.file))
    doc = await beforeChange(config, doc, original, args.context)
    const stored = { ...toStored(doc), createdAt: original.createdAt, updatedAt: new Date().toISOString() }
    const db = await getDb()
    if (config.upload && args.file) await storeFile(original.id, args.file, String(doc.mimeType))
    await db.collection(config.slug).replaceOne({ _id: { $in: idCandidates(original.id) } } as Document, stored)
    await afterChange(config, { id: original.id, ...stored }, original, args.context)
    return (await this.findByID({
      collection: args.collection,
      id: original.id,
      locale: args.locale ?? 'ar',
      depth: 0,
    })) as DataFromCollectionSlug<S>
  },

  async delete(args: {
    collection: CollectionSlug | string
    id: string | number
    overrideAccess?: boolean
  }): Promise<void> {
    const config = requireCollection(args.collection)
    const original = await rawById(config, String(args.id))
    if (!original) return
    const db = await getDb()
    await db.collection(config.slug).deleteOne({ _id: { $in: idCandidates(original.id) } } as Document)
    if (config.upload)
      await db.collection(FILES_COLLECTION).deleteOne({ _id: { $in: idCandidates(original.id) } } as Document)
    await afterDelete(config, original)
  },

  async findGlobal<S extends GlobalSlug>(args: {
    slug: S
    locale?: ReadLocale
    depth?: number
    fallbackLocale?: false
    draft?: boolean
    overrideAccess?: boolean
  }): Promise<DataFromGlobalSlug<S>> {
    const config = getGlobalConfig(args.slug)
    if (!config) throw new Error(`Unknown global "${args.slug}"`)
    const db = await getDb()
    const raw = await db
      .collection(GLOBALS_COLLECTION)
      .findOne({ $or: [{ _id: args.slug as never }, { globalType: args.slug }] })
    const { _id, ...stored } = (raw ? normalize(raw) : {}) as Doc
    const base: Doc = { ...stored, globalType: args.slug }
    if (args.locale === 'all') return base as DataFromGlobalSlug<S>
    const locale = args.locale ?? 'ar'
    const doc = resolveDoc(config.fields, base, locale)
    await populate(config.fields, [doc], args.depth ?? 2, locale)
    return doc as DataFromGlobalSlug<S>
  },

  async updateGlobal<S extends GlobalSlug>(args: {
    slug: S
    data: Doc
    locale?: Locale
    context?: WriteContext
    overrideAccess?: boolean
  }): Promise<DataFromGlobalSlug<S>> {
    const config = getGlobalConfig(args.slug)
    if (!config) throw new Error(`Unknown global "${args.slug}"`)
    const db = await getDb()
    const coll = db.collection(GLOBALS_COLLECTION)
    const existing = await coll.findOne({ $or: [{ _id: args.slug as never }, { globalType: args.slug }] })
    const { _id, ...stored } = (existing ? normalize(existing) : {}) as Doc
    const merged = args.locale
      ? mergeLocalized(config.fields, stored, args.data, args.locale)
      : { ...stored, ...args.data }
    ensureIds(config.fields, merged)
    if (!existing) applyDefaults(config.fields, merged)
    const { id: _ignored, ...doc } = merged
    await coll.replaceOne(
      { _id: (existing?._id ?? args.slug) as never },
      { ...doc, globalType: args.slug, updatedAt: new Date().toISOString() },
      { upsert: true },
    )
    afterGlobalChange(config, args.context)
    return this.findGlobal({ slug: args.slug, locale: args.locale ?? 'ar', depth: 0 })
  },

  sendEmail,
}

export type Cms = typeof cms

/** Binary data of an upload (media image or private PDF). */
export async function readUploadFile(id: string): Promise<{ data: Buffer; mimeType: string } | null> {
  const db = await getDb()
  const doc = await db.collection(FILES_COLLECTION).findOne({ _id: { $in: idCandidates(id) } } as Document)
  if (!doc) return null
  const data = doc.data as Binary
  return { data: Buffer.from(data.buffer), mimeType: String(doc.mimeType || 'application/octet-stream') }
}
