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

/** Section 9 table. Used whenever the `scorecard-settings` global is empty. Labels come from the `scorecard` messages. */
export const DEFAULT_SCORECARD = {
  questions: [
    { key: 'business', type: 'single', options: [{ value: 'none', points: 0 }, { value: 'lt1m', points: 10 }, { value: '1to5m', points: 15 }, { value: 'gt5m', points: 20 }] },
    { key: 'budget', type: 'single', options: [{ value: 'lt2k', points: 0 }, { value: '2to5k', points: 5 }, { value: '5to10k', points: 15 }, { value: 'gt10k', points: 20 }] },
    { key: 'marketer', type: 'single', options: [{ value: 'me', points: 10 }, { value: 'etleq', points: 0 }] },
    { key: 'audience', type: 'single', options: [{ value: 'none', points: 0 }, { value: 'lt500', points: 4 }, { value: '500to5k', points: 7 }, { value: 'gt5k', points: 10 }] },
    { key: 'model', type: 'model', options: [] },
    { key: 'country', type: 'single', options: [{ value: 'ksa_uae', points: 5 }, { value: 'gcc', points: 3 }, { value: 'other', points: 1 }] },
    { key: 'timeline', type: 'single', options: [{ value: 'month', points: 10 }, { value: '1to3', points: 7 }, { value: '3to6', points: 3 }, { value: 'later', points: 0 }] },
    { key: 'decisionMaker', type: 'single', options: [{ value: 'yes', points: 10 }, { value: 'no', points: 0 }] },
    { key: 'soldOnline', type: 'single', options: [{ value: 'yes', points: 5 }, { value: 'no', points: 0 }] },
    { key: 'hours', type: 'single', options: [{ value: 'lt3', points: 0 }, { value: '3to8', points: 3 }, { value: 'gt8', points: 5 }] },
    { key: 'commercialReg', type: 'single', options: [{ value: 'yes', points: 5 }, { value: 'no', points: 0 }] },
    { key: 'success', type: 'text', options: [] },
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

/** The CMS global when it has questions, otherwise the default. Thresholds and disqualifiers fall back individually. */
export function resolveScorecardSettings(settings?: ScorecardSettingsLike | null) {
  const hasQuestions = !!settings?.questions?.length
  return {
    fromCms: hasQuestions,
    questions: (hasQuestions ? settings!.questions! : DEFAULT_SCORECARD.questions) as ScorecardQuestionLike[],
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
