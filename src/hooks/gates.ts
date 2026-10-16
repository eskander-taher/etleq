import { ValidationError } from 'payload'
import type { CollectionBeforeChangeHook, CollectionSlug, PayloadRequest, ValidationFieldError } from 'payload'

import { lexicalHasContent } from './lexical'
import { PUBLIC_LOCALES, type PublicLocale } from './paths'

/**
 * Publishing gates. Each gate is a pure function (exported for unit tests)
 * plus a `beforeChange` hook that runs it when a document is being published.
 *
 * All gates are skipped when `req.context.seed` is true (the seed script
 * writes one locale at a time, so the other locale is briefly incomplete).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents of any collection
type Doc = Record<string, any>
export type GateProblem = { path: string; message: string }

const isFilled = (v: unknown): boolean => {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object' && 'root' in (v as object)) return lexicalHasContent(v)
  return true
}

const isPublishing = (data: Doc | undefined, originalDoc: Doc | undefined, hasDrafts: boolean) => {
  if (!hasDrafts) return true
  const status = data?._status ?? originalDoc?._status
  return status === 'published'
}

/** Merge incoming data over the stored document (incoming partial updates win). */
export const mergeDoc = (data: Doc | undefined, originalDoc: Doc | undefined): Doc => ({ ...(originalDoc || {}), ...(data || {}) })

/* ------------------------------------------------------------------ */
/* Translation gate                                                    */
/* ------------------------------------------------------------------ */

/**
 * For each ticked locale, every required localized field must have a value in
 * that locale. `valuesByLocale` holds the document as seen in each locale.
 */
export function missingTranslations(
  translated: { ar?: boolean | null; en?: boolean | null } | null | undefined,
  valuesByLocale: Partial<Record<PublicLocale, Doc | null | undefined>>,
  requiredFields: string[],
): GateProblem[] {
  const problems: GateProblem[] = []
  for (const locale of PUBLIC_LOCALES) {
    if (!translated?.[locale]) continue
    const values = valuesByLocale[locale] || {}
    for (const field of requiredFields) {
      if (!isFilled(getPath(values, field))) {
        problems.push({
          path: field,
          message: `"${field}" is required in ${locale === 'ar' ? 'Arabic' : 'English'} because translated.${locale} is ticked. Fill it in the ${locale.toUpperCase()} locale or untick the translation.`,
        })
      }
    }
  }
  return problems
}

const getPath = (obj: Doc, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Doc)[key] : undefined), obj)

/** Load the other locale's version of the document (latest draft, no fallback). */
async function loadLocale(req: PayloadRequest, collection: string, id: string | number | undefined, locale: PublicLocale): Promise<Doc | null> {
  if (!id) return null
  try {
    return (await req.payload.findByID({
      collection: collection as CollectionSlug,
      id,
      locale,
      fallbackLocale: false,
      draft: true,
      depth: 0,
      overrideAccess: true,
      req,
    })) as Doc
  } catch {
    return null
  }
}

/** Build the per-locale view: current locale from incoming data + stored doc, other locale from the database. */
async function valuesByLocale(
  req: PayloadRequest,
  collection: { slug: string; fields: { localized?: boolean; name?: string }[] },
  data: Doc | undefined,
  originalDoc: Doc | undefined,
) {
  const current = (req.locale === 'en' ? 'en' : 'ar') as PublicLocale
  const other: PublicLocale = current === 'ar' ? 'en' : 'ar'
  const merged = mergeDoc(data, originalDoc)
  const otherDoc = await loadLocale(req, collection.slug, originalDoc?.id, other)
  if (!otherDoc) return { [current]: merged, [other]: null } as Record<PublicLocale, Doc | null>
  // Non-localized fields are shared, so the incoming data is the truth for them;
  // localized top-level fields come from the other locale as stored.
  const localizedNames = collection.fields.filter((f) => f.localized && f.name).map((f) => f.name as string)
  return { [current]: merged, [other]: pickLocalized(merged, otherDoc, localizedNames) } as Record<PublicLocale, Doc | null>
}

/** Overlay the other locale's values of the localized top-level fields onto the merged data. */
export const pickLocalized = (merged: Doc, otherDoc: Doc, localizedNames: string[]): Doc => {
  const out: Doc = { ...merged }
  for (const name of localizedNames) out[name] = otherDoc[name]
  return out
}

/**
 * Translation gate hook: when a document is published, each ticked locale
 * must have its required fields filled.
 */
export const translationGate =
  (requiredFields: string[], { hasDrafts = true } = {}): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req, collection, context }) => {
    if (context?.seed) return data
    if (!isPublishing(data, originalDoc, hasDrafts)) return data
    const merged = mergeDoc(data, originalDoc)
    if (!merged.translated?.ar && !merged.translated?.en) return data
    const views = await valuesByLocale(req, collection as never, data, originalDoc)
    const problems = missingTranslations(merged.translated, views, requiredFields)
    if (problems.length) throwProblems(collection.slug, problems, req)
    return data
  }

/* ------------------------------------------------------------------ */
/* Model and guide publish gate (GEO evidence rules)                   */
/* ------------------------------------------------------------------ */

export type EvidenceKind = 'model' | 'guide'

/**
 * Evidence rules before a model or guide may be published:
 * - answerBox filled
 * - at least 3 sources with URL and checked date (models: factSources[].url + checkedAt;
 *   guides: sources[].url + accessedAt, because guides have no factSources field)
 * - reviewer and lastReviewedAt set
 * - models also: gulfVersion, whyItWorks, at least one fitCriteria row, and an MRR
 *   figure (when given) must carry its source URL and reported date
 * - guides also: content filled
 */
export function evidenceProblems(doc: Doc, kind: EvidenceKind): GateProblem[] {
  const problems: GateProblem[] = []
  const need = (ok: boolean, path: string, message: string) => {
    if (!ok) problems.push({ path, message })
  }

  need(isFilled(doc.answerBox), 'answerBox', 'Add the answer box (a 40–60 word direct answer) before publishing.')

  if (kind === 'model') {
    const sources = (doc.factSources || []).filter((s: Doc) => isFilled(s?.url) && isFilled(s?.checkedAt))
    need(sources.length >= 3, 'factSources', `Add at least 3 fact sources with a URL and a checked date (currently ${sources.length}).`)
    need(isFilled(doc.gulfVersion), 'gulfVersion', 'Describe the Gulf version before publishing.')
    need(isFilled(doc.whyItWorks), 'whyItWorks', 'Explain why the model works before publishing.')
    need(Array.isArray(doc.fitCriteria) && doc.fitCriteria.some((c: Doc) => isFilled(c?.criterion)), 'fitCriteria', 'Add at least one fit criterion before publishing.')
    if (doc.mrr && isFilled(doc.mrr.amount)) {
      need(isFilled(doc.mrr.sourceUrl), 'mrr.sourceUrl', 'A reported MRR needs its source URL.')
      need(isFilled(doc.mrr.reportedAt), 'mrr.reportedAt', 'A reported MRR needs the date it was reported.')
    }
  } else {
    const sources = (doc.sources || []).filter((s: Doc) => isFilled(s?.url) && isFilled(s?.accessedAt))
    need(sources.length >= 3, 'sources', `Add at least 3 sources with a URL and an accessed date (currently ${sources.length}).`)
    need(isFilled(doc.content), 'content', 'Write the guide content before publishing.')
  }

  need(isFilled(doc.reviewer), 'reviewer', 'Choose a reviewer before publishing.')
  need(isFilled(doc.lastReviewedAt), 'lastReviewedAt', 'Set the "last reviewed" date before publishing.')
  return problems
}

/** Runs the evidence rules for every ticked locale (localized fields are checked per locale). */
export const evidenceGate =
  (kind: EvidenceKind): CollectionBeforeChangeHook =>
  async ({ data, originalDoc, req, collection, context }) => {
    if (context?.seed) return data
    if (!isPublishing(data, originalDoc, true)) return data
    const merged = mergeDoc(data, originalDoc)
    const views = await valuesByLocale(req, collection as never, data, originalDoc)
    const current = (req.locale === 'en' ? 'en' : 'ar') as PublicLocale
    const locales = PUBLIC_LOCALES.filter((l) => merged.translated?.[l])
    if (!locales.length) locales.push(current)
    const problems: GateProblem[] = []
    for (const locale of locales) {
      const view = views[locale] || merged
      for (const p of evidenceProblems(view, kind)) {
        problems.push({ ...p, message: `[${locale.toUpperCase()}] ${p.message}` })
      }
    }
    if (problems.length) throwProblems(collection.slug, dedupe(problems), req)
    return data
  }

/* ------------------------------------------------------------------ */
/* Project consent gate                                                */
/* ------------------------------------------------------------------ */

export function projectConsentProblems(doc: Doc): GateProblem[] {
  const problems: GateProblem[] = []
  if (doc.consentGiven !== true) problems.push({ path: 'consentGiven', message: 'A project can only be published with the client’s recorded consent (tick "consent given").' })
  if (!isFilled(doc.consentFile)) problems.push({ path: 'consentFile', message: 'Attach the signed consent file before publishing this project.' })
  return problems
}

export const projectConsentGate: CollectionBeforeChangeHook = async ({ data, originalDoc, req, collection, context }) => {
  if (context?.seed) return data
  if (!isPublishing(data, originalDoc, true)) return data
  const problems = projectConsentProblems(mergeDoc(data, originalDoc))
  if (problems.length) throwProblems(collection.slug, problems, req)
  return data
}

/* ------------------------------------------------------------------ */

const dedupe = (problems: GateProblem[]) => {
  const seen = new Set<string>()
  return problems.filter((p) => (seen.has(p.message) ? false : (seen.add(p.message), true)))
}

function throwProblems(collection: string, problems: GateProblem[], req: PayloadRequest): never {
  const errors: ValidationFieldError[] = problems.map((p) => ({ path: p.path, message: p.message }))
  throw new ValidationError({ collection, errors, req })
}
