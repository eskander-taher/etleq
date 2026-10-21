import type { RelOption, RelOptions } from '@/components/admin/fields'

import { type Doc, isLocaleMap } from './fields'
import { cms } from './local'
import { lexicalToMarkdown } from './richtext'
import { type CollectionConfig, type Field, getCollectionConfig, type RelationField } from './schema'
import type { CollectionSlug } from './types'

/** Field definitions without functions (validate), safe to pass to client components. */
export const clientFields = (fields: Field[]): Field[] => JSON.parse(JSON.stringify(fields)) as Field[]

/** A document's display title (Arabic first, then English). */
export function titleOf(config: CollectionConfig, doc: Doc): string {
  const v = doc?.[config.useAsTitle]
  if (isLocaleMap(v)) return String(v.ar || v.en || '') || String(doc.filename || doc.id)
  return v ? String(v) : String(doc?.filename || doc?.id || '')
}

function relationFields(fields: Field[], out: RelationField[] = []): RelationField[] {
  for (const f of fields) {
    if (f.type === 'relationship' || f.type === 'upload') out.push(f)
    if (f.type === 'group' || f.type === 'array') relationFields(f.fields, out)
    if (f.type === 'blocks') f.blocks.forEach((b) => relationFields(b.fields, out))
  }
  return out
}

const keyOf = (f: RelationField) =>
  f.filter
    ? `${f.relationTo}?${Object.entries(f.filter)
        .map(([k, v]) => `${k}=${v}`)
        .join('&')}`
    : f.relationTo

/** Options for every relation field in the form, keyed like `optionsKey()` on the client. */
export async function relationOptions(fields: Field[]): Promise<RelOptions> {
  const out: RelOptions = {}
  const unique = new Map(relationFields(fields).map((f) => [keyOf(f), f]))
  await Promise.all(
    [...unique].map(async ([key, field]) => {
      const config = getCollectionConfig(field.relationTo)
      if (!config) return
      const where = field.filter
        ? Object.fromEntries(Object.entries(field.filter).map(([k, v]) => [k, { equals: v }]))
        : undefined
      const res = await cms.find({
        collection: config.slug as CollectionSlug,
        where,
        locale: 'all',
        limit: 500,
        pagination: false,
        sort: '-createdAt',
      })
      out[key] = res.docs.map((d): RelOption => ({
        value: String(d.id),
        label: `${titleOf(config, d as Doc)}${(d as Doc)._status === 'draft' ? ' (draft)' : ''}`,
        thumb: config.upload === 'media' ? ((d as Doc).url as string) : null,
        ...(config.upload === 'media' && isLocaleMap((d as Doc).alt)
          ? { alt: { ar: String((d as Doc).alt.ar ?? ''), en: String((d as Doc).alt.en ?? '') } }
          : {}),
      }))
    }),
  )
  return out
}

/** Stored document → form value: legacy Lexical rich text becomes Markdown. */
export function editableDoc(fields: Field[], doc: Doc): Doc {
  const out: Doc = { ...doc }
  for (const f of fields) {
    const v = out[f.name]
    if (v == null) continue
    if (f.type === 'richText') {
      out[f.name] = f.localized && isLocaleMap(v) ? { ar: toMd(v.ar), en: toMd(v.en) } : toMd(v)
    } else if (f.type === 'group' && typeof v === 'object') {
      out[f.name] = editableDoc(f.fields, v)
    } else if (f.type === 'array' && Array.isArray(v)) {
      out[f.name] = v.map((row) => (row && typeof row === 'object' ? editableDoc(f.fields, row) : row))
    } else if (f.type === 'blocks') {
      const map = (list: unknown) =>
        Array.isArray(list)
          ? list.map((b: Doc) => {
              const block = f.blocks.find((x) => x.slug === b?.blockType)
              return block ? editableDoc(block.fields, b) : b
            })
          : list
      out[f.name] = f.localized && isLocaleMap(v) ? { ar: map(v.ar), en: map(v.en) } : map(v)
    }
  }
  return out
}

const toMd = (v: unknown) => (v == null ? v : typeof v === 'string' ? v : lexicalToMarkdown(v))

/**
 * Values the form should show for documents saved before a field existed.
 * Projects without `kind` predate own products and are treated as client
 * projects (the consent gate keeps applying to them).
 */
export function withLegacyDefaults(config: CollectionConfig, doc: Doc): Doc {
  if (config.slug === 'projects' && doc.id && !doc.kind) return { ...doc, kind: 'client' }
  return doc
}

/** New content in the admin is meant for both languages; untick one to skip it. */
export function newDocDefaults(config: CollectionConfig): Doc {
  return config.fields.some((f) => f.name === 'translated') ? { translated: { ar: true, en: true } } : {}
}
