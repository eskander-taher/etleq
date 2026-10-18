import type { Filter, Sort as MongoSort } from 'mongodb'

import { idCandidates } from './db'
import { mongoPath } from './fields'
import type { Field } from './schema'
import type { Locale, Sort, Where, WhereOperator } from './types'

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Payload-style where clause → MongoDB filter. Localized paths get the locale appended. */
export function toFilter(
  where: Where | undefined,
  fields: Field[],
  locale: Locale | null,
): Filter<Record<string, unknown>> {
  if (!where) return {}
  const and: Filter<Record<string, unknown>>[] = []
  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue
    if (key === 'and' || key === 'or') {
      const parts = (value as Where[]).map((w) => toFilter(w, fields, locale)).filter((f) => Object.keys(f).length)
      if (parts.length) and.push(key === 'and' ? { $and: parts } : { $or: parts })
      continue
    }
    const { path, isId } = mongoPath(fields, key, locale)
    and.push(...operatorFilters(path, value as WhereOperator, isId))
  }
  if (!and.length) return {}
  return and.length === 1 ? and[0] : { $and: and }
}

function operatorFilters(path: string, op: WhereOperator, isId: boolean): Filter<Record<string, unknown>>[] {
  const out: Filter<Record<string, unknown>>[] = []
  const ids = (v: unknown) => (isId ? idCandidates(v) : [v])
  for (const [name, v] of Object.entries(op)) {
    switch (name) {
      case 'equals':
        out.push(v === null ? { [path]: null } : isId ? { [path]: { $in: ids(v) } } : { [path]: v })
        break
      case 'not_equals':
        out.push(isId ? { [path]: { $nin: ids(v) } } : { [path]: { $ne: v } })
        break
      case 'in':
        out.push({ [path]: { $in: (v as unknown[]).flatMap(ids) } })
        break
      case 'not_in':
        out.push({ [path]: { $nin: (v as unknown[]).flatMap(ids) } })
        break
      case 'like':
      case 'contains':
        out.push({ [path]: { $regex: escapeRegex(String(v)), $options: 'i' } })
        break
      case 'exists':
        out.push(v ? { [path]: { $ne: null } } : { [path]: null })
        break
      case 'greater_than':
        out.push({ [path]: { $gt: v } })
        break
      case 'greater_than_equal':
        out.push({ [path]: { $gte: v } })
        break
      case 'less_than':
        out.push({ [path]: { $lt: v } })
        break
      case 'less_than_equal':
        out.push({ [path]: { $lte: v } })
        break
      default:
        throw new Error(`Unsupported where operator "${name}"`)
    }
  }
  return out
}

/** `-publishedAt`, `title` or a list of them → MongoDB sort (with `_id` as tie-breaker). */
export function toSort(sort: Sort | undefined, fields: Field[], locale: Locale | null): MongoSort {
  const list = (Array.isArray(sort) ? sort : sort ? [sort] : ['-createdAt']).filter(Boolean)
  const out: Record<string, 1 | -1> = {}
  for (const item of list) {
    const desc = item.startsWith('-')
    const { path } = mongoPath(fields, desc ? item.slice(1) : item, locale)
    out[path] = desc ? -1 : 1
  }
  if (!('_id' in out)) out._id = -1
  return out
}
