import { ObjectId } from 'mongodb'

import { newId } from './db'
import { richTextValue } from './richtext'
import { type Block, type Field, type RelationField, richTextBlocks } from './schema'
import type { Locale } from './types'

/**
 * Schema-driven transforms between the stored shape (localized values as
 * `{ ar, en }`, rich text as Markdown) and the shape the site reads (one
 * locale, rich text as a Lexical-shaped tree, relations populated).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents of any collection
export type Doc = Record<string, any>

const LOCALES: Locale[] = ['ar', 'en']

/** `{ ar, en }` (either key optional, nothing else). */
export function isLocaleMap(value: unknown): value is Partial<Record<Locale, unknown>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const keys = Object.keys(value)
  return keys.length > 0 && keys.every((k) => k === 'ar' || k === 'en')
}

/** ObjectId → hex, Date → ISO, recursively (data written by Payload used both). */
export function normalize(value: unknown): unknown {
  if (value instanceof ObjectId) return value.toHexString()
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalize)
  if (
    value &&
    typeof value === 'object' &&
    !(value instanceof Uint8Array) &&
    (value as { _bsontype?: string })._bsontype === undefined
  ) {
    const out: Doc = {}
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v)
    return out
  }
  return value
}

/** Stored Mongo document → API document (`_id` → `id`). */
export function fromMongo(raw: Doc): Doc {
  const { _id, ...rest } = normalize(raw) as Doc
  return { id: String(_id), ...rest }
}

/* ------------------------------------------------------------------ */
/* Read: resolve one locale                                            */
/* ------------------------------------------------------------------ */

export function resolveDoc(fields: Field[], raw: Doc, locale: Locale): Doc {
  const out: Doc = { ...raw }
  for (const field of fields) {
    if (!(field.name in raw)) continue
    out[field.name] = resolveValue(field, raw[field.name], locale)
  }
  return out
}

function resolveValue(field: Field, value: unknown, locale: Locale): unknown {
  let v = value
  if (field.localized && isLocaleMap(v)) v = v[locale] ?? null
  if (v == null) return v
  switch (field.type) {
    case 'group':
      return typeof v === 'object' ? resolveDoc(field.fields, v as Doc, locale) : v
    case 'array':
      return Array.isArray(v)
        ? v.map((row) => (row && typeof row === 'object' ? resolveDoc(field.fields, row, locale) : row))
        : v
    case 'blocks':
      return Array.isArray(v) ? v.map((b) => resolveBlock(field.blocks, b, locale)) : v
    case 'richText':
      return richTextValue(v)
    default:
      return v
  }
}

function resolveBlock(blocks: Block[], value: Doc, locale: Locale): Doc {
  const block = blocks.find((b) => b.slug === value?.blockType)
  return block ? resolveDoc(block.fields, value, locale) : value
}

/* ------------------------------------------------------------------ */
/* Relations                                                           */
/* ------------------------------------------------------------------ */

type RefFn = (field: RelationField, value: unknown) => unknown

/** Visit (and replace) every relationship/upload value of a resolved document, including rich-text blocks. */
export function mapRefs(fields: Field[], obj: Doc | null | undefined, fn: RefFn): void {
  if (!obj || typeof obj !== 'object') return
  for (const field of fields) {
    const v = obj[field.name]
    if (v == null) continue
    switch (field.type) {
      case 'relationship':
      case 'upload':
        obj[field.name] = Array.isArray(v) ? v.map((item) => fn(field, item)) : fn(field, v)
        break
      case 'group':
        mapRefs(field.fields, v, fn)
        break
      case 'array':
        if (Array.isArray(v)) v.forEach((row) => mapRefs(field.fields, row, fn))
        break
      case 'blocks':
        if (Array.isArray(v))
          v.forEach((b: Doc) => {
            const block = field.blocks.find((x) => x.slug === b?.blockType)
            if (block) mapRefs(block.fields, b, fn)
          })
        break
      case 'richText':
        walkLexicalBlocks(v, (blockFields) => {
          const block = richTextBlocks.find((x) => x.slug === blockFields.blockType)
          if (block) mapRefs(block.fields, blockFields, fn)
        })
        break
      default:
        break
    }
  }
}

function walkLexicalBlocks(value: unknown, fn: (fields: Doc) => void) {
  const walk = (node: Doc | undefined) => {
    if (!node) return
    if (node.type === 'block' && node.fields) fn(node.fields)
    if (Array.isArray(node.children)) node.children.forEach(walk)
  }
  if (value && typeof value === 'object' && 'root' in value) walk((value as Doc).root)
}

/* ------------------------------------------------------------------ */
/* Write: merge one locale, ids, defaults                              */
/* ------------------------------------------------------------------ */

/**
 * Merge a single-locale write (`data` as the site reads it) into the stored
 * document: localized values go under `[locale]`, array rows are matched by id
 * (then by position) so the other locale's values on the same rows survive.
 */
export function mergeLocalized(fields: Field[], stored: Doc | null | undefined, data: Doc, locale: Locale): Doc {
  const out: Doc = { ...(stored || {}) }
  for (const [key, value] of Object.entries(data)) {
    const field = fields.find((f) => f.name === key)
    if (!field) {
      out[key] = value
      continue
    }
    out[key] = mergeValue(field, stored?.[key], value, locale)
  }
  return out
}

function mergeValue(field: Field, stored: unknown, value: unknown, locale: Locale): unknown {
  if (field.localized) {
    const map = isLocaleMap(stored) ? { ...stored } : {}
    return { ...map, [locale]: value }
  }
  if (field.type === 'group' && value && typeof value === 'object') {
    return mergeLocalized(field.fields, (stored as Doc) || {}, value as Doc, locale)
  }
  if (field.type === 'array' && Array.isArray(value)) {
    const rows = Array.isArray(stored) ? (stored as Doc[]) : []
    return value.map((row: Doc, i) => {
      if (!row || typeof row !== 'object') return row
      const match = (row.id && rows.find((r) => r?.id === row.id)) || rows[i]
      const merged = mergeLocalized(field.fields, match || {}, row, locale)
      merged.id = row.id || match?.id || newId()
      return merged
    })
  }
  return value
}

/** Give every array row and block an `id`. */
export function ensureIds(fields: Field[], obj: Doc | null | undefined): void {
  if (!obj || typeof obj !== 'object') return
  for (const field of fields) {
    const v = obj[field.name]
    if (v == null) continue
    const each = (fn: (value: unknown) => void) =>
      field.localized && isLocaleMap(v) ? LOCALES.forEach((l) => fn((v as Doc)[l])) : fn(v)
    if (field.type === 'group') each((g) => ensureIds(field.fields, g as Doc))
    if (field.type === 'array')
      each((rows) => {
        if (!Array.isArray(rows)) return
        for (const row of rows) {
          if (!row || typeof row !== 'object') continue
          row.id ||= newId()
          ensureIds(field.fields, row)
        }
      })
    if (field.type === 'blocks')
      each((list) => {
        if (!Array.isArray(list)) return
        for (const b of list) {
          if (!b || typeof b !== 'object') continue
          b.id ||= newId()
          const block = field.blocks.find((x) => x.slug === b.blockType)
          if (block) ensureIds(block.fields, b)
        }
      })
  }
}

/** Fill default values for fields that are missing (on create). */
export function applyDefaults(fields: Field[], obj: Doc): Doc {
  for (const field of fields) {
    if (field.type === 'group') {
      const hasDefaults = JSON.stringify(field.fields).includes('defaultValue')
      if (obj[field.name] == null && hasDefaults) obj[field.name] = {}
      if (obj[field.name] && typeof obj[field.name] === 'object') applyDefaults(field.fields, obj[field.name])
      continue
    }
    if (field.type === 'array' && Array.isArray(obj[field.name])) {
      obj[field.name].forEach((row: Doc) => row && typeof row === 'object' && applyDefaults(field.fields, row))
      continue
    }
    if (obj[field.name] === undefined && field.defaultValue !== undefined) obj[field.name] = field.defaultValue
  }
  return obj
}

/** Schema path (e.g. `title`, `utm.campaign`) → Mongo path, adding the locale under localized fields. */
export function mongoPath(fields: Field[], path: string, locale: Locale | null): { path: string; isId: boolean } {
  if (path === 'id' || path === '_id') return { path: '_id', isId: true }
  const out: string[] = []
  let current: Field[] = fields
  const segments = path.split('.')
  segments.forEach((seg, i) => {
    out.push(seg)
    const field = current.find((f) => f.name === seg)
    if (!field) {
      current = []
      return
    }
    const next = segments[i + 1]
    if (field.localized && locale && next !== 'ar' && next !== 'en') out.push(locale)
    current = field.type === 'group' || field.type === 'array' ? field.fields : []
  })
  return { path: out.join('.'), isId: false }
}
