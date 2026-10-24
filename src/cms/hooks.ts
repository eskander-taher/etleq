import { dedupeProblems, evidenceProblems, type GateProblem } from '@/hooks/gates'
import { PUBLIC_LOCALES } from '@/hooks/paths'
import { computeRetainUntil, DECISIONS, DEFAULT_APPLICATIONS_MONTHS, DEFAULT_LEADS_MONTHS } from '@/hooks/retention'
import { draftSlug, isDraftSlug, slugify, uniqueSlug } from '@/hooks/slug'
import { notifyGoogleIndexing, pingIndexNow, runAfterResponse } from '@/lib/indexnow'
import { revalidateDoc, revalidateGlobal } from '@/lib/revalidate'

import type { Document } from 'mongodb'

import { hashPassword } from './auth-crypto'
import { fieldLabel, noLanguageProblem, projectPublishProblems, translationProblems } from './gates'
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
    // First publish: stamp the publish date so founders never have to.
    if (config.fields.some((f) => f.name === 'publishedAt') && !doc.publishedAt)
      doc.publishedAt = new Date().toISOString()
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
  await notifySearchEngines(config.slug, liveUrls, removedUrls, doc.status === 'closed')
}

export async function afterDelete(config: CollectionConfig, doc: Doc) {
  if (!config.hooks?.revalidate) return
  const { removedUrls } = revalidateDoc(config.slug, null, doc)
  await notifySearchEngines(config.slug, [], removedUrls)
}

/** IndexNow for every changed public URL; Google Indexing for jobs. Runs after the admin response. */
function notifySearchEngines(collection: string, liveUrls: string[], removedUrls: string[], jobClosed = false) {
  return runAfterResponse(async () => {
    const pings = [pingIndexNow([...liveUrls, ...removedUrls])]
    if (collection === 'jobs') {
      for (const url of liveUrls) pings.push(notifyGoogleIndexing(url, jobClosed ? 'URL_DELETED' : 'URL_UPDATED'))
      for (const url of removedUrls) pings.push(notifyGoogleIndexing(url, 'URL_DELETED'))
    }
    await Promise.all(pings)
  })
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
  if (config.fields.some((f) => f.name === 'translated')) problems.push(...noLanguageProblem(doc.translated))
  const required = config.hooks?.requiredLocalized
  if (required?.length) problems.push(...translationProblems(config.fields, doc.translated, views, required))
  const kind = config.hooks?.evidence
  if (kind) {
    const locales = PUBLIC_LOCALES.filter((l) => doc.translated?.[l])
    const both = locales.length > 1
    for (const locale of locales.length ? locales : (['ar'] as const)) {
      for (const p of evidenceProblems(views[locale], kind)) {
        const where = both ? ` (${locale === 'ar' ? 'Arabic' : 'English'})` : ''
        problems.push({ ...p, message: `${fieldLabel(config.fields, p.path)}${where}: ${p.message}` })
      }
    }
  }
  if (config.hooks?.projectConsent) problems.push(...projectPublishProblems(doc))
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
      problems.push({ path, message: `“${fieldLabel(fields, field.name)}” cannot be empty.` })
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
