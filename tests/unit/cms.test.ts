import { describe, expect, it } from 'vitest'

import { evidenceProblems, missingTranslations, projectConsentProblems } from '@/hooks/gates'
import { lexicalHasContent, toLexical } from '@/hooks/lexical'
import { basePath, localizedPath } from '@/hooks/paths'
import { checkPrivateFile, isPdfBuffer, MAX_PRIVATE_FILE_BYTES } from '@/hooks/privateFiles'
import { computeRetainUntil } from '@/hooks/retention'
import { sampleVerdict } from '@/hooks/samples'
import { draftSlug, isDraftSlug, redirectsForPathChange, slugify, uniqueSlug, validateSlug } from '@/hooks/slug'
import { publicWhere } from '@/lib/queries/common'

describe('slugs', () => {
  it('normalises English titles to lowercase Latin', () => {
    expect(slugify('Clinic Booking System')).toBe('clinic-booking-system')
    expect(slugify('  Café & Bar — Riyadh!  ')).toBe('cafe-and-bar-riyadh')
    expect(slugify('Gym--Membership__Platform')).toBe('gym-membership-platform')
  })

  it('returns an empty string for Arabic-only titles (caller falls back)', () => {
    expect(slugify('نظام حجوزات للعيادات')).toBe('')
    expect(isDraftSlug(draftSlug())).toBe(true)
  })

  it('validates the slug pattern', () => {
    expect(validateSlug('barber-booking-app')).toBe(true)
    expect(validateSlug('Barber')).not.toBe(true)
    expect(validateSlug('a--b')).not.toBe(true)
    expect(validateSlug('حلاق')).not.toBe(true)
  })

  it('makes slugs unique with numeric suffixes', async () => {
    const taken = new Set(['model', 'model-2'])
    expect(await uniqueSlug('model', async (s) => taken.has(s))).toBe('model-3')
    expect(await uniqueSlug('fresh', async (s) => taken.has(s))).toBe('fresh')
  })

  it('creates 301 pairs for both locales when a path changes', () => {
    const from = basePath('models', { slug: 'old' })
    const to = basePath('models', { slug: 'new' })
    expect(redirectsForPathChange(from, to)).toEqual([
      { from: '/models/old', to: '/models/new' },
      { from: '/en/models/old', to: '/en/models/new' },
    ])
    expect(redirectsForPathChange('/a', '/a')).toEqual([])
  })

  it('maps collections to public paths', () => {
    expect(basePath('posts', { slug: 'x' })).toBe('/blog/x')
    expect(basePath('guides', { slug: 'x', type: 'comparison' })).toBe('/compare/x')
    expect(basePath('guides', { slug: 'x', type: 'cost' })).toBe('/cost/x')
    expect(basePath('pages', { slug: 'home' })).toBe('/')
    expect(localizedPath('/', 'en')).toBe('/en')
    expect(localizedPath('/', 'ar')).toBe('/')
  })
})

describe('translation gate', () => {
  it('requires fields only for ticked locales', () => {
    const problems = missingTranslations({ ar: true, en: false }, { ar: { title: 'عنوان' }, en: {} }, ['title'])
    expect(problems).toEqual([])
  })

  it('flags a ticked locale with missing fields', () => {
    const problems = missingTranslations({ ar: true, en: true }, { ar: { title: 'عنوان', excerpt: 'ملخص' }, en: { title: 'Title' } }, ['title', 'excerpt'])
    expect(problems).toHaveLength(1)
    expect(problems[0].path).toBe('excerpt')
    expect(problems[0].message).toMatch(/English/)
  })

  it('treats empty rich text as missing', () => {
    expect(missingTranslations({ en: true }, { en: { content: toLexical('') } }, ['content'])).toHaveLength(1)
    expect(missingTranslations({ en: true }, { en: { content: toLexical('Hello') } }, ['content'])).toHaveLength(0)
  })
})

describe('model and guide publish gate', () => {
  const source = (n: number) => ({ url: `https://example.com/${n}`, checkedAt: '2026-10-01' })
  const goodModel = {
    answerBox: 'A direct answer.',
    factSources: [source(1), source(2), source(3)],
    gulfVersion: toLexical('Arabic, mada, ZATCA.'),
    whyItWorks: toLexical('Recurring problem.'),
    fitCriteria: [{ criterion: 'Has customers' }],
    reviewer: 'author-1',
    lastReviewedAt: '2026-10-10',
    mrr: { amount: 1000, sourceUrl: 'https://example.com/mrr', reportedAt: '2026-09-01' },
  }

  it('passes a complete model', () => {
    expect(evidenceProblems(goodModel, 'model')).toEqual([])
  })

  it('blocks a model with fewer than 3 dated sources', () => {
    const doc = { ...goodModel, factSources: [source(1), source(2), { url: 'https://example.com/3' }] }
    expect(evidenceProblems(doc, 'model').map((p) => p.path)).toEqual(['factSources'])
  })

  it('blocks a model without reviewer, review date, Gulf version, why it works or fit criteria', () => {
    const paths = evidenceProblems({ ...goodModel, reviewer: null, lastReviewedAt: null, gulfVersion: toLexical(''), whyItWorks: null, fitCriteria: [] }, 'model').map((p) => p.path)
    expect(paths).toEqual(expect.arrayContaining(['reviewer', 'lastReviewedAt', 'gulfVersion', 'whyItWorks', 'fitCriteria']))
  })

  it('requires the MRR source and date when an MRR is shown', () => {
    const paths = evidenceProblems({ ...goodModel, mrr: { amount: 5000 } }, 'model').map((p) => p.path)
    expect(paths).toEqual(['mrr.sourceUrl', 'mrr.reportedAt'])
  })

  it('checks guides against sources with accessed dates', () => {
    const guide = {
      answerBox: 'Answer',
      content: toLexical('Body'),
      sources: [1, 2, 3].map((n) => ({ url: `https://example.com/${n}`, accessedAt: '2026-10-01' })),
      reviewer: 'a',
      lastReviewedAt: '2026-10-10',
    }
    expect(evidenceProblems(guide, 'guide')).toEqual([])
    expect(evidenceProblems({ ...guide, answerBox: '' }, 'guide').map((p) => p.path)).toEqual(['answerBox'])
  })
})

describe('project consent gate', () => {
  it('requires both the consent checkbox and the consent file', () => {
    expect(projectConsentProblems({ consentGiven: true, consentFile: 'file-1' })).toEqual([])
    expect(projectConsentProblems({ consentGiven: true }).map((p) => p.path)).toEqual(['consentFile'])
    expect(projectConsentProblems({ consentFile: 'file-1' }).map((p) => p.path)).toEqual(['consentGiven'])
  })
})

describe('retention', () => {
  it('adds calendar months', () => {
    expect(computeRetainUntil(new Date('2026-10-16T10:00:00Z'), 24)).toBe('2028-10-16T10:00:00.000Z')
    expect(computeRetainUntil(new Date('2026-10-16T10:00:00Z'), 12)).toBe('2027-10-16T10:00:00.000Z')
  })

  it('clamps to the last day of shorter months', () => {
    expect(computeRetainUntil(new Date('2026-01-31T00:00:00Z'), 1)).toBe('2026-02-28T00:00:00.000Z')
  })
})

describe('private file checks', () => {
  const pdf = new TextEncoder().encode('%PDF-1.7\n%âãÏÓ\n')
  const fakePdf = new TextEncoder().encode('MZ\x90\x00 this is an exe renamed to .pdf')

  it('recognises the PDF signature', () => {
    expect(isPdfBuffer(pdf)).toBe(true)
    expect(isPdfBuffer(fakePdf)).toBe(false)
    expect(isPdfBuffer(new Uint8Array())).toBe(false)
  })

  it('rejects renamed files, wrong MIME types and files over 5 MB', () => {
    expect(checkPrivateFile({ data: pdf, mimetype: 'application/pdf' })).toEqual({ ok: true })
    expect(checkPrivateFile({ data: fakePdf, mimetype: 'application/pdf' }).ok).toBe(false)
    expect(checkPrivateFile({ data: pdf, mimetype: 'image/png' }).ok).toBe(false)
    expect(checkPrivateFile({ data: pdf, size: MAX_PRIVATE_FILE_BYTES + 1, mimetype: 'application/pdf' }).ok).toBe(false)
  })
})

describe('samples and public queries', () => {
  it('fails only in production when samples are published', () => {
    expect(sampleVerdict(0, 'production').exitCode).toBe(0)
    expect(sampleVerdict(3, 'production').exitCode).toBe(1)
    expect(sampleVerdict(3, 'development').exitCode).toBe(0)
  })

  it('publicWhere always filters status and translation, and samples in production', () => {
    const prev = process.env.SITE_ENV
    process.env.SITE_ENV = 'development'
    expect(publicWhere('en')).toEqual({ and: [{ _status: { equals: 'published' } }, { 'translated.en': { equals: true } }] })
    process.env.SITE_ENV = 'production'
    expect(publicWhere('ar', { slug: { equals: 'x' } })).toEqual({
      and: [{ _status: { equals: 'published' } }, { 'translated.ar': { equals: true } }, { isSample: { not_equals: true } }, { slug: { equals: 'x' } }],
    })
    process.env.SITE_ENV = prev
  })

  it('detects content in Lexical JSON', () => {
    expect(lexicalHasContent(toLexical('', ''))).toBe(false)
    expect(lexicalHasContent(toLexical('Text'))).toBe(true)
    expect(lexicalHasContent(toLexical({ blockType: 'cta', heading: 'Go' }))).toBe(true)
  })
})
