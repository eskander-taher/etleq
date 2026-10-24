import { lexicalHasContent } from './lexical'
import { PUBLIC_LOCALES, type PublicLocale } from './paths'

/**
 * Publishing gates. Pure functions; `src/cms/hooks.ts` runs them when a
 * document is saved as published (skipped for the seed script).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents of any collection
type Doc = Record<string, any>
export type GateProblem = { path: string; message: string }

export const isFilled = (v: unknown): boolean => {
  if (v === null || v === undefined) return false
  if (typeof v === 'string') return v.trim().length > 0
  if (Array.isArray(v)) return v.length > 0
  if (typeof v === 'object' && 'root' in (v as object)) return lexicalHasContent(v)
  return true
}

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

export type EvidenceKind = 'model' | 'guide'

/**
 * Evidence rules before a model or guide may be published:
 * - answerBox filled
 * - at least 3 sources with URL and checked date (models: factSources[].url + checkedAt;
 *   guides: sources[].url + accessedAt, because guides have no factSources field)
 * - reviewer and lastReviewedAt set
 * - models also: gulfVersion, whyItWorks, at least one fitCriteria row, and an MRR
 *   figure (when given) must carry its source URL and reported date
 * - guides also: content filled; cost guides: every price range row carries its source URL and checked date
 */
export function evidenceProblems(doc: Doc, kind: EvidenceKind): GateProblem[] {
  const problems: GateProblem[] = []
  const need = (ok: boolean, path: string, message: string) => {
    if (!ok) problems.push({ path, message })
  }

  need(isFilled(doc.answerBox), 'answerBox', 'Add the answer box (a 40–60 word direct answer) before publishing.')

  if (kind === 'model') {
    const sources = (doc.factSources || []).filter((s: Doc) => isFilled(s?.url) && isFilled(s?.checkedAt))
    need(
      sources.length >= 3,
      'factSources',
      `Add at least 3 fact sources with a URL and a checked date (currently ${sources.length}).`,
    )
    need(isFilled(doc.gulfVersion), 'gulfVersion', 'Describe the Gulf version before publishing.')
    need(isFilled(doc.whyItWorks), 'whyItWorks', 'Explain why the model works before publishing.')
    need(
      Array.isArray(doc.fitCriteria) && doc.fitCriteria.some((c: Doc) => isFilled(c?.criterion)),
      'fitCriteria',
      'Add at least one fit criterion before publishing.',
    )
    if (doc.mrr && isFilled(doc.mrr.amount)) {
      need(isFilled(doc.mrr.sourceUrl), 'mrr.sourceUrl', 'A reported MRR needs its source URL.')
      need(isFilled(doc.mrr.reportedAt), 'mrr.reportedAt', 'A reported MRR needs the date it was reported.')
    }
  } else {
    const sources = (doc.sources || []).filter((s: Doc) => isFilled(s?.url) && isFilled(s?.accessedAt))
    need(
      sources.length >= 3,
      'sources',
      `Add at least 3 sources with a URL and an accessed date (currently ${sources.length}).`,
    )
    need(isFilled(doc.content), 'content', 'Write the guide content before publishing.')
    if (doc.type === 'cost') {
      ;(doc.costRanges || []).forEach((r: Doc, i: number) => {
        if (!r || (!isFilled(r.low) && !isFilled(r.high))) return
        need(
          isFilled(r.sourceUrl) && isFilled(r.checkedAt),
          `costRanges.${i}.sourceUrl`,
          `Price range ${i + 1} needs its source link and the date you checked it.`,
        )
      })
    }
  }

  need(isFilled(doc.reviewer), 'reviewer', 'Choose a reviewer before publishing.')
  need(isFilled(doc.lastReviewedAt), 'lastReviewedAt', 'Set the "last reviewed" date before publishing.')
  return problems
}

export function projectConsentProblems(doc: Doc): GateProblem[] {
  const problems: GateProblem[] = []
  if (doc.consentGiven !== true)
    problems.push({
      path: 'consentGiven',
      message: 'A project can only be published with the client’s recorded consent (tick "consent given").',
    })
  if (!isFilled(doc.consentFile))
    problems.push({ path: 'consentFile', message: 'Attach the signed consent file before publishing this project.' })
  return problems
}

export const dedupeProblems = (problems: GateProblem[]) => {
  const seen = new Set<string>()
  return problems.filter((p) => (seen.has(p.message) ? false : (seen.add(p.message), true)))
}
