import {
  evidenceProblems,
  type GateProblem,
  missingTranslations,
  projectConsentProblems,
  dedupeProblems,
} from '@/hooks/gates'
import { PUBLIC_LOCALES } from '@/hooks/paths'
import { computeRetainUntil, DECISIONS, DEFAULT_APPLICATIONS_MONTHS, DEFAULT_LEADS_MONTHS } from '@/hooks/retention'
import { draftSlug, isDraftSlug, slugify, uniqueSlug } from '@/hooks/slug'
import { notifyGoogleIndexing, pingIndexNow } from '@/lib/indexnow'
import { revalidateDoc, revalidateGlobal } from '@/lib/revalidate'

import type { Document } from 'mongodb'

import { hashPassword } from './auth-crypto'
import { getDb, GLOBALS_COLLECTION, idCandidates } from './db'
import { applyDefaults, type Doc, ensureIds, resolveDoc } from './fields'
import type { CollectionConfig, Field, GlobalConfig } from './schema'
import { ValidationError, type WriteContext } from './types'

/**
 * Save pipeline. `beforeChange` turns the merged stored document into what is
 * written (ids, defaults, slug, publish gates, retention dates, password hash);
 * `afterChange` revalidates the public pages.
 */

export async function beforeChange(
  config: CollectionConfig,
  doc: Doc,
  original: Doc | null,
  ctx: WriteContext = {},
): Promise<Doc> {
  ensureIds(config.fields, doc)
  if (!original) applyDefaults(config.fields, doc)
  if (config.drafts) doc._status = doc._status === 'published' ? 'published' : 'draft'

  if (config.fields.some((f) => f.name === 'slug')) await generateSlug(config, doc, original)

  if (!ctx.seed && config.drafts && doc._status === 'published') {
    const problems = publishProblems(config, doc)
    if (problems.length) throw new ValidationError(problems)
  }

  if (config.hooks?.retention && !ctx.retentionJob) await setRetention(config.hooks.retention, doc, original)

  if (config.auth) {
    if (typeof doc.email === 'string') doc.email = doc.email.trim().toLowerCase()
    if (typeof doc.password === 'string' && doc.password) Object.assign(doc, await hashPassword(doc.password))
    delete doc.password
  }
  return doc
}

export async function afterChange(config: CollectionConfig, doc: Doc, original: Doc | null, ctx: WriteContext = {}) {
  if (ctx.disableRevalidate || ctx.seed) return
  const mode = config.hooks?.revalidate
  if (mode === 'tag') {
    revalidateDoc(config.slug, null, null)
    return
  }
  if (mode !== 'doc') return
  // A draft save of a document that was never live changes nothing public.
  if (doc._status === 'draft' && original?._status !== 'published') return
  const { liveUrls, removedUrls } = revalidateDoc(config.slug, doc, original)
  void pingIndexNow([...liveUrls, ...removedUrls])
  if (config.slug === 'jobs') {
    for (const url of liveUrls) void notifyGoogleIndexing(url, doc.status === 'closed' ? 'URL_DELETED' : 'URL_UPDATED')
    for (const url of removedUrls) void notifyGoogleIndexing(url, 'URL_DELETED')
  }
}

export function afterDelete(config: CollectionConfig, doc: Doc) {
  if (!config.hooks?.revalidate) return
  const { removedUrls } = revalidateDoc(config.slug, null, doc)
  void pingIndexNow(removedUrls)
  if (config.slug === 'jobs') for (const url of removedUrls) void notifyGoogleIndexing(url, 'URL_DELETED')
}

export function afterGlobalChange(config: GlobalConfig, ctx: WriteContext = {}) {
  if (ctx.disableRevalidate || ctx.seed) return
  revalidateGlobal(config.slug)
}

/* ------------------------------------------------------------------ */

/** Gates for publishing: translation completeness, evidence (models/guides), project consent. */
export function publishProblems(config: CollectionConfig, doc: Doc): GateProblem[] {
  const views = { ar: resolveDoc(config.fields, doc, 'ar'), en: resolveDoc(config.fields, doc, 'en') }
  const problems: GateProblem[] = []
  const required = config.hooks?.requiredLocalized
  if (required?.length && (doc.translated?.ar || doc.translated?.en))
    problems.push(...missingTranslations(doc.translated, views, required))
  const kind = config.hooks?.evidence
  if (kind) {
    const locales = PUBLIC_LOCALES.filter((l) => doc.translated?.[l])
    for (const locale of locales.length ? locales : (['ar'] as const)) {
      for (const p of evidenceProblems(views[locale], kind))
        problems.push({ ...p, message: `[${locale.toUpperCase()}] ${p.message}` })
    }
  }
  if (config.hooks?.projectConsent) problems.push(...projectConsentProblems(doc))
  return dedupeProblems(problems)
}

/** Field-level checks for admin saves: `required` (non-localized) and custom `validate` functions. */
export function validateFields(fields: Field[], data: Doc, prefix = ''): GateProblem[] {
  const problems: GateProblem[] = []
  for (const field of fields) {
    const path = `${prefix}${field.name}`
    const value = data?.[field.name]
    if (
      field.required &&
      !field.localized &&
      field.type !== 'group' &&
      (value == null || value === '' || (Array.isArray(value) && !value.length))
    ) {
      problems.push({ path, message: `"${path}" is required.` })
    }
    if (field.validate && !field.localized) {
      const result = field.validate(value, data)
      if (result !== true) problems.push({ path, message: result })
    }
    if (field.type === 'group' && value && typeof value === 'object')
      problems.push(...validateFields(field.fields, value, `${path}.`))
    if (field.type === 'array' && Array.isArray(value))
      value.forEach((row, i) => problems.push(...validateFields(field.fields, row, `${path}.${i}.`)))
  }
  return problems
}

async function generateSlug(config: CollectionConfig, doc: Doc, original: Doc | null) {
  const current = typeof doc.slug === 'string' ? doc.slug.trim() : ''
  if (current && !isDraftSlug(current)) {
    doc.slug = slugify(current) || current
  } else if (isDraftSlug(current) && original?._status === 'published') {
    return
  } else {
    const title = doc[config.hooks?.slugFrom ?? 'title']
    const candidate = typeof title === 'string' ? slugify(title) : slugify(title?.en) || slugify(title?.ar)
    if (!candidate) {
      doc.slug = current || draftSlug()
      return
    }
    doc.slug = candidate
  }
  const db = await getDb()
  const exclude = original?.id ? { _id: { $nin: idCandidates(original.id) } } : {}
  doc.slug = await uniqueSlug(doc.slug, async (slug) =>
    Boolean(await db.collection(config.slug).findOne({ slug, ...exclude } as Document, { projection: { _id: 1 } })),
  )
}

async function retentionMonths(key: 'leadsMonths' | 'applicationsMonths', fallback: number) {
  try {
    const db = await getDb()
    const settings = await db
      .collection(GLOBALS_COLLECTION)
      .findOne({ $or: [{ _id: 'site-settings' as never }, { globalType: 'site-settings' }] })
    const value = (settings?.retention as Record<string, unknown> | undefined)?.[key]
    return typeof value === 'number' && value > 0 ? value : fallback
  } catch {
    return fallback
  }
}

/** Leads: set on create and refreshed on a status change. Applications: restarted when a decision is recorded. */
async function setRetention(kind: 'lead' | 'application', doc: Doc, original: Doc | null) {
  const changed = original && doc.status && doc.status !== original.status
  const refresh = kind === 'lead' ? changed : changed && DECISIONS.has(doc.status)
  if (!original || refresh || !doc.retainUntil) {
    const months =
      kind === 'lead'
        ? await retentionMonths('leadsMonths', DEFAULT_LEADS_MONTHS)
        : await retentionMonths('applicationsMonths', DEFAULT_APPLICATIONS_MONTHS)
    doc.retainUntil = computeRetainUntil(new Date(), months)
  }
}
