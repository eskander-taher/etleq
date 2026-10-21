// Scorecard scoring (brief section 9). Pure and framework-free so it runs on the server, in tests and in the browser.

export type ScorecardTier = 'ready' | 'almost' | 'explore'
export type QuestionType = 'single' | 'text' | 'model'

export interface ScorecardOptionLike {
  value: string
  label?: string | null
  points?: number | null
}

export interface ScorecardQuestionLike {
  key: string
  type?: QuestionType | null
  prompt?: string | null
  options?: ScorecardOptionLike[] | null
}

export interface ScorecardDisqualifierLike {
  questionKey: string
  optionValue: string
  reason?: string | null
}

export interface ScorecardSettingsLike {
  questions?: ScorecardQuestionLike[] | null
  thresholds?: { ready?: number | null; almost?: number | null } | null
  disqualifiers?: ScorecardDisqualifierLike[] | null
}

export interface ScoreResult {
  score: number
  tier: ScorecardTier
  /** Codes in the form `questionKey:optionValue`. */
  disqualifiers: string[]
  canBook: boolean
}

/**
 * Section 9 table. Used whenever the `scorecard-settings` global is empty. Labels come from the `scorecard` messages.
 * Order (owner decision 2026-10-22): easy, identity-building questions first, money last. Points are unchanged.
 */
export const DEFAULT_SCORECARD = {
  questions: [
    { key: 'model', type: 'model', options: [] },
    { key: 'timeline', type: 'single', options: [{ value: 'month', points: 10 }, { value: '1to3', points: 7 }, { value: '3to6', points: 3 }, { value: 'later', points: 0 }] },
    { key: 'country', type: 'single', options: [{ value: 'ksa_uae', points: 5 }, { value: 'gcc', points: 3 }, { value: 'other', points: 1 }] },
    { key: 'business', type: 'single', options: [{ value: 'none', points: 0 }, { value: 'lt1m', points: 10 }, { value: '1to5m', points: 15 }, { value: 'gt5m', points: 20 }] },
    { key: 'audience', type: 'single', options: [{ value: 'none', points: 0 }, { value: 'lt500', points: 4 }, { value: '500to5k', points: 7 }, { value: 'gt5k', points: 10 }] },
    { key: 'marketer', type: 'single', options: [{ value: 'me', points: 10 }, { value: 'etleq', points: 0 }] },
    { key: 'soldOnline', type: 'single', options: [{ value: 'yes', points: 5 }, { value: 'no', points: 0 }] },
    { key: 'hours', type: 'single', options: [{ value: 'lt3', points: 0 }, { value: '3to8', points: 3 }, { value: 'gt8', points: 5 }] },
    { key: 'commercialReg', type: 'single', options: [{ value: 'yes', points: 5 }, { value: 'no', points: 0 }] },
    // "partner" (decides with a partner) is not a disqualifier; only "no" is.
    { key: 'decisionMaker', type: 'single', options: [{ value: 'yes', points: 10 }, { value: 'partner', points: 6 }, { value: 'no', points: 0 }] },
    { key: 'budget', type: 'single', options: [{ value: 'lt2k', points: 0 }, { value: '2to5k', points: 5 }, { value: '5to10k', points: 15 }, { value: 'gt10k', points: 20 }] },
  ],
  thresholds: { ready: 60, almost: 40 },
  disqualifiers: [
    { questionKey: 'budget', optionValue: 'lt2k' },
    { questionKey: 'budget', optionValue: '2to5k' },
    { questionKey: 'decisionMaker', optionValue: 'no' },
    { questionKey: 'timeline', optionValue: 'later' },
    { questionKey: 'marketer', optionValue: 'etleq' },
  ],
} as const satisfies {
  questions: ScorecardQuestionLike[]
  thresholds: { ready: number; almost: number }
  disqualifiers: ScorecardDisqualifierLike[]
}

/**
 * Questions no longer asked, even when an older `scorecard-settings` global still lists them.
 * `success` (free text) opened the keyboard right before the contact step; the booking form asks it now.
 * Answers already stored on old leads stay readable.
 */
export const RETIRED_QUESTION_KEYS: readonly string[] = ['success']

/** The CMS global when it has questions, otherwise the default. Thresholds and disqualifiers fall back individually. */
export function resolveScorecardSettings(settings?: ScorecardSettingsLike | null) {
  const cmsQuestions = (settings?.questions ?? []).filter((q) => !RETIRED_QUESTION_KEYS.includes(q.key))
  const hasQuestions = cmsQuestions.length > 0
  return {
    fromCms: hasQuestions,
    questions: (hasQuestions ? cmsQuestions : DEFAULT_SCORECARD.questions) as ScorecardQuestionLike[],
    thresholds: {
      ready: settings?.thresholds?.ready ?? DEFAULT_SCORECARD.thresholds.ready,
      almost: settings?.thresholds?.almost ?? DEFAULT_SCORECARD.thresholds.almost,
    },
    disqualifiers: (settings?.disqualifiers?.length ? settings.disqualifiers : DEFAULT_SCORECARD.disqualifiers) as ScorecardDisqualifierLike[],
  }
}

export function scoreScorecard(answers: Record<string, string | undefined>, settings?: ScorecardSettingsLike | null): ScoreResult {
  const s = resolveScorecardSettings(settings)

  let score = 0
  for (const q of s.questions) {
    if (q.type === 'text' || q.type === 'model') continue
    const answer = answers[q.key]
    if (answer == null) continue
    const option = q.options?.find((o) => o.value === answer)
    score += Math.max(0, Number(option?.points) || 0)
  }
  score = Math.min(100, score)

  const disqualifiers = s.disqualifiers
    .filter((d) => answers[d.questionKey] === d.optionValue)
    .map((d) => `${d.questionKey}:${d.optionValue}`)

  let tier: ScorecardTier
  if (score >= s.thresholds.ready && disqualifiers.length === 0) tier = 'ready'
  else if (score >= s.thresholds.almost) tier = 'almost'
  else tier = 'explore'

  return { score, tier, disqualifiers, canBook: tier === 'ready' }
}

/** Highest reachable score for a settings object (100 for the default). */
export function maxScore(settings?: ScorecardSettingsLike | null) {
  const s = resolveScorecardSettings(settings)
  return Math.min(
    100,
    s.questions.reduce((sum, q) => (q.type === 'text' || q.type === 'model' ? sum : sum + Math.max(0, ...(q.options ?? []).map((o) => Number(o.points) || 0))), 0),
  )
}
