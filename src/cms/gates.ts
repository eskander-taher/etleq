import { type GateProblem, isFilled } from '@/hooks/gates'

import { type Field, humanize } from './schema/types'

/*
 * Publish-gate messages for the admin, in plain words. Pure functions (unit-tested);
 * `src/cms/hooks.ts` runs them when a document is saved as published.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents of any collection
type Doc = Record<string, any>
type Loc = 'ar' | 'en'

const LANG: Record<Loc, string> = { ar: 'Arabic', en: 'English' }

/** "results.0.label" → "Results › 1 › What" using the schema labels. */
export function fieldLabel(fields: Field[], path: string): string {
  const parts: string[] = []
  let current: Field[] = fields
  for (const seg of path.split('.')) {
    if (/^\d+$/.test(seg)) {
      parts.push(String(Number(seg) + 1))
      continue
    }
    const field = current.find((f) => f.name === seg)
    parts.push(field?.label ?? humanize(seg))
    current = field && (field.type === 'group' || field.type === 'array') ? field.fields : []
  }
  return parts.join(' › ')
}

const getPath = (obj: Doc, path: string): unknown =>
  path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Doc)[key] : undefined), obj)

/** For each ticked language, every required localized field must be filled in that language. */
export function translationProblems(
  fields: Field[],
  translated: { ar?: boolean | null; en?: boolean | null } | null | undefined,
  views: Record<Loc, Doc>,
  required: string[],
): GateProblem[] {
  const problems: GateProblem[] = []
  for (const locale of ['ar', 'en'] as const) {
    if (!translated?.[locale]) continue
    for (const path of required) {
      if (isFilled(getPath(views[locale] || {}, path))) continue
      problems.push({
        path,
        message: `Fill in the ${LANG[locale]} “${fieldLabel(fields, path)}”, or untick ${LANG[locale]} under “Show on the site in”.`,
      })
    }
  }
  return problems
}

/** Nothing would be public: neither language is ticked. */
export function noLanguageProblem(translated: { ar?: boolean | null; en?: boolean | null } | null | undefined) {
  return translated?.ar || translated?.en
    ? []
    : [
        {
          path: 'translated',
          message: 'Tick Arabic, English or both under “Show on the site in”, otherwise nobody can see it.',
        },
      ]
}

/**
 * Projects: Etleq's own products publish freely. Client projects (and older
 * projects saved before `kind` existed) need the client's recorded consent.
 */
export const isOwnProject = (doc: Doc) => doc?.kind === 'own'

export function projectPublishProblems(doc: Doc): GateProblem[] {
  if (isOwnProject(doc)) return []
  const problems: GateProblem[] = []
  if (doc.consentGiven !== true)
    problems.push({
      path: 'consentGiven',
      message:
        'This is marked as a client project, so the client must agree before it goes live: tick “The client agreed in writing that we can show this”. If it is your own product, choose “Our own product” at the top instead.',
    })
  if (!isFilled(doc.consentFile))
    problems.push({
      path: 'consentFile',
      message: 'Upload the client’s signed permission (a PDF) under “Signed permission (PDF)”.',
    })
  return problems
}
