import { describe, expect, it } from 'vitest'
import { DEFAULT_SCORECARD, maxScore, resolveScorecardSettings, scoreScorecard } from '@/lib/scoring'

// A clean, non-disqualified baseline that scores 0 on every scored question.
const zero: Record<string, string> = {
  business: 'none',
  budget: '5to10k',
  marketer: 'me',
  audience: 'none',
  country: 'other',
  timeline: '3to6',
  decisionMaker: 'yes',
  soldOnline: 'no',
  hours: 'lt3',
  commercialReg: 'no',
}

const best: Record<string, string> = {
  business: 'gt5m',
  budget: 'gt10k',
  marketer: 'me',
  audience: 'gt5k',
  model: 'barber-booking-app',
  country: 'ksa_uae',
  timeline: 'month',
  decisionMaker: 'yes',
  soldOnline: 'yes',
  hours: 'gt8',
  commercialReg: 'yes',
  success: 'عشرون عميلًا يدفعون شهريًا',
}

describe('scoreScorecard — points per question', () => {
  const table: Record<string, Record<string, number>> = {
    business: { none: 0, lt1m: 10, '1to5m': 15, gt5m: 20 },
    budget: { lt2k: 0, '2to5k': 5, '5to10k': 15, gt10k: 20 },
    marketer: { me: 10, etleq: 0 },
    audience: { none: 0, lt500: 4, '500to5k': 7, gt5k: 10 },
    country: { ksa_uae: 5, gcc: 3, other: 1 },
    timeline: { month: 10, '1to3': 7, '3to6': 3, later: 0 },
    decisionMaker: { yes: 10, partner: 6, no: 0 },
    soldOnline: { yes: 5, no: 0 },
    hours: { lt3: 0, '3to8': 3, gt8: 5 },
    commercialReg: { yes: 5, no: 0 },
  }

  for (const [key, options] of Object.entries(table)) {
    for (const [value, points] of Object.entries(options)) {
      it(`${key}=${value} → ${points}`, () => {
        expect(scoreScorecard({ [key]: value }).score).toBe(points)
      })
    }
  }

  it('the default table matches the brief', () => {
    for (const [key, options] of Object.entries(table)) {
      const q = DEFAULT_SCORECARD.questions.find((x) => x.key === key)!
      expect(Object.fromEntries(q.options.map((o) => [o.value, o.points]))).toEqual(options)
    }
  })

  it('model and free-text answers never score', () => {
    expect(scoreScorecard({ model: 'anything', success: 'a lot' }).score).toBe(0)
  })

  it('unknown answers score 0', () => {
    expect(scoreScorecard({ budget: 'a-million' }).score).toBe(0)
  })

  it('asks easy questions first and money last (owner decision 2026-10-22)', () => {
    expect(DEFAULT_SCORECARD.questions.map((q) => q.key)).toEqual([
      'model',
      'timeline',
      'country',
      'business',
      'audience',
      'marketer',
      'soldOnline',
      'hours',
      'commercialReg',
      'decisionMaker',
      'budget',
    ])
  })

  it('no longer asks the free-text success question', () => {
    expect(DEFAULT_SCORECARD.questions.map((q) => q.key)).not.toContain('success')
  })

  it('maximum is 100 and reaches ready', () => {
    expect(maxScore()).toBe(100)
    expect(scoreScorecard(best)).toEqual({ score: 100, tier: 'ready', disqualifiers: [], canBook: true })
  })
})

describe('scoreScorecard — disqualifiers', () => {
  const cases: [string, string][] = [
    ['budget', 'lt2k'],
    ['budget', '2to5k'],
    ['decisionMaker', 'no'],
    ['timeline', 'later'],
    ['marketer', 'etleq'],
  ]
  for (const [key, value] of cases) {
    it(`${key}=${value} blocks booking even for a high scorer`, () => {
      const r = scoreScorecard({ ...best, [key]: value })
      expect(r.disqualifiers).toEqual([`${key}:${value}`])
      expect(r.canBook).toBe(false)
      expect(r.tier).not.toBe('ready')
      expect(r.score).toBeGreaterThanOrEqual(40)
      expect(r.tier).toBe('almost')
    })
  }

  it('deciding with a partner is not a disqualifier', () => {
    const r = scoreScorecard({ ...best, decisionMaker: 'partner' })
    expect(r).toEqual({ score: 96, tier: 'ready', disqualifiers: [], canBook: true })
  })

  it('a partner answer near the boundary can drop to almost on points alone', () => {
    // 15 + 10 + 6 + 10 + 7 + 5 + 3 = 56
    const r = scoreScorecard({ budget: '5to10k', marketer: 'me', decisionMaker: 'partner', timeline: 'month', audience: '500to5k', country: 'ksa_uae', hours: '3to8' })
    expect(r.score).toBe(56)
    expect(r.disqualifiers).toEqual([])
    expect(r.tier).toBe('almost')
  })

  it('a disqualified low scorer is explore', () => {
    const r = scoreScorecard({ ...zero, budget: 'lt2k' })
    expect(r.tier).toBe('explore')
    expect(r.canBook).toBe(false)
  })

  it('collects several disqualifiers', () => {
    const r = scoreScorecard({ ...best, decisionMaker: 'no', timeline: 'later' })
    expect(r.disqualifiers).toEqual(['decisionMaker:no', 'timeline:later'])
  })
})

describe('scoreScorecard — tier boundaries', () => {
  it('39 → explore', () => {
    // 15 + 10 + 1 + 3 + 10
    const r = scoreScorecard(zero)
    expect(r.score).toBe(39)
    expect(r.tier).toBe('explore')
  })
  it('40 → almost', () => {
    // 15 + 10 + 10 + 5
    const r = scoreScorecard({ budget: '5to10k', marketer: 'me', decisionMaker: 'yes', hours: 'gt8' })
    expect(r.score).toBe(40)
    expect(r.tier).toBe('almost')
  })
  it('59 → almost, no booking', () => {
    // 15 + 10 + 10 + 7 + 7 + 5 + 5
    const r = scoreScorecard({ budget: '5to10k', marketer: 'me', decisionMaker: 'yes', timeline: '1to3', audience: '500to5k', country: 'ksa_uae', hours: 'gt8' })
    expect(r.score).toBe(59)
    expect(r.tier).toBe('almost')
    expect(r.canBook).toBe(false)
  })
  it('60 → ready', () => {
    // 15 + 10 + 10 + 10 + 7 + 5 + 3
    const r = scoreScorecard({ budget: '5to10k', marketer: 'me', decisionMaker: 'yes', timeline: 'month', audience: '500to5k', country: 'ksa_uae', hours: '3to8' })
    expect(r.score).toBe(60)
    expect(r.tier).toBe('ready')
    expect(r.canBook).toBe(true)
  })
})

describe('scoreScorecard — CMS settings', () => {
  it('uses CMS thresholds and points when present', () => {
    const settings = {
      questions: [{ key: 'q', type: 'single' as const, options: [{ value: 'a', points: 30 }] }],
      thresholds: { ready: 30, almost: 10 },
      disqualifiers: [{ questionKey: 'q', optionValue: 'b' }],
    }
    expect(scoreScorecard({ q: 'a' }, settings).tier).toBe('ready')
    expect(scoreScorecard({ q: 'b' }, settings)).toEqual({ score: 0, tier: 'explore', disqualifiers: ['q:b'], canBook: false })
  })

  it('falls back to the default when the global is empty', () => {
    expect(scoreScorecard(best, { questions: [], thresholds: null, disqualifiers: [] }).score).toBe(100)
  })

  it('drops the retired success question from an older CMS global', () => {
    const settings = {
      questions: [
        { key: 'q', type: 'single' as const, options: [{ value: 'a', points: 10 }] },
        { key: 'success', type: 'text' as const, options: [] },
      ],
    }
    expect(resolveScorecardSettings(settings).questions.map((q) => q.key)).toEqual(['q'])
  })

  it('falls back to the default when the CMS global only has retired questions', () => {
    const r = resolveScorecardSettings({ questions: [{ key: 'success', type: 'text' }] })
    expect(r.fromCms).toBe(false)
    expect(r.questions).toHaveLength(DEFAULT_SCORECARD.questions.length)
  })

  it('caps at 100', () => {
    const settings = { questions: [{ key: 'q', type: 'single' as const, options: [{ value: 'a', points: 500 }] }] }
    expect(scoreScorecard({ q: 'a' }, settings).score).toBe(100)
  })
})
