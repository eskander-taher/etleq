/**
 * Integration tests against a throwaway in-memory MongoDB replica set.
 * Skipped (not failed) when the MongoDB binary cannot be started or
 * downloaded, e.g. in a restricted CI runner.
 */
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { toLexical } from '@/hooks/lexical'
import { publicWhere } from '@/lib/queries/common'

let payload: Payload | null = null
let stop: (() => Promise<unknown>) | null = null
let skipReason = ''

const ctx = { disableRevalidate: true }

beforeAll(async () => {
  try {
    const { MongoMemoryReplSet } = await import('mongodb-memory-server')
    const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } })
    stop = () => replSet.stop()
    process.env.DATABASE_URL = replSet.getUri('etleq-test')
    process.env.PAYLOAD_SECRET = process.env.PAYLOAD_SECRET || 'test-secret-for-integration'
    process.env.DISABLE_JOBS_AUTORUN = 'true'
    process.env.SITE_ENV = 'development'
    const { getPayload } = await import('payload')
    const { default: config } = await import('@/payload.config')
    payload = await getPayload({ config })
    const db = payload.db as unknown as { collections: Record<string, { init: () => Promise<unknown> }>; versions: Record<string, { init: () => Promise<unknown> }> }
    await Promise.all([...Object.values(db.collections), ...Object.values(db.versions)].map((m) => m.init()))
  } catch (error) {
    skipReason = (error as Error).message
    console.warn(`[cms-integration] skipped: ${skipReason}`)
  }
}, 180_000)

afterAll(async () => {
  await payload?.destroy?.()
  await stop?.()
})

/** Run a write expected to fail and return the joined field-level messages. */
const failureMessages = async (fn: () => Promise<unknown>): Promise<string> => {
  try {
    await fn()
  } catch (error) {
    const errors = (error as { data?: { errors?: { message: string; path: string }[] } }).data?.errors || []
    return `${(error as Error).message} | ${errors.map((e) => `${e.path}: ${e.message}`).join(' | ')}`
  }
  throw new Error('Expected the operation to fail')
}

const maybe = (name: string, fn: () => Promise<void>) =>
  it(name, async (testCtx) => {
    if (!payload) testCtx.skip()
    await fn()
  }, 60_000)

describe('CMS integration (in-memory MongoDB)', () => {
  maybe('an Arabic-only document is never returned for English (fallbackLocale: false)', async () => {
    const p = payload!
    const doc = await p.create({
      collection: 'faqs',
      locale: 'ar',
      data: { question: 'سؤال بالعربية فقط', answer: 'جواب', translated: { ar: true, en: false }, _status: 'published' },
      context: ctx,
    })

    const en = await p.find({ collection: 'faqs', locale: 'en', fallbackLocale: false, where: publicWhere('en', { id: { equals: doc.id } }) })
    const ar = await p.find({ collection: 'faqs', locale: 'ar', fallbackLocale: false, where: publicWhere('ar', { id: { equals: doc.id } }) })
    expect(en.totalDocs).toBe(0)
    expect(ar.totalDocs).toBe(1)

    // Anonymous access control gives the same answer.
    const anonEn = await p.find({ collection: 'faqs', locale: 'en', fallbackLocale: false, overrideAccess: false })
    expect(anonEn.docs.find((d) => d.id === doc.id)).toBeUndefined()

    // And the English field is empty rather than falling back to Arabic.
    const raw = await p.findByID({ collection: 'faqs', id: doc.id, locale: 'en', fallbackLocale: false })
    expect(raw.question ?? null).toBeNull()
  })

  maybe('drafts are invisible to anonymous readers', async () => {
    const p = payload!
    const draft = await p.create({
      collection: 'faqs',
      locale: 'ar',
      draft: true,
      data: { question: 'مسودة', answer: 'نص', translated: { ar: true, en: false }, _status: 'draft' },
      context: ctx,
    })
    const anon = await p.find({ collection: 'faqs', locale: 'ar', overrideAccess: false, draft: false })
    expect(anon.docs.find((d) => d.id === draft.id)).toBeUndefined()
  })

  maybe('leads are not readable anonymously, and are readable by sales', async () => {
    const p = payload!
    const lead = await p.create({ collection: 'leads', data: { name: 'Test', phone: '+966500000001', source: 'contact' } })
    await expect(p.find({ collection: 'leads', overrideAccess: false })).rejects.toThrow()
    await expect(p.findByID({ collection: 'leads', id: lead.id, overrideAccess: false })).rejects.toThrow()

    const sales = { id: 'x', role: 'sales', collection: 'users', email: 's@example.com' }
    const recruiter = { ...sales, role: 'recruiter' }
    const asSales = await p.find({ collection: 'leads', overrideAccess: false, user: sales as never })
    expect(asSales.totalDocs).toBeGreaterThan(0)
    await expect(p.find({ collection: 'leads', overrideAccess: false, user: recruiter as never })).rejects.toThrow()

    // retainUntil is set ~24 months ahead.
    const retain = new Date(lead.retainUntil as string).getTime()
    const months = (retain - Date.now()) / (30.44 * 86400000)
    expect(months).toBeGreaterThan(23)
    expect(months).toBeLessThan(25)
  })

  maybe('a model cannot be published without its evidence', async () => {
    const p = payload!
    const messages = await failureMessages(() =>
      p.create({
        collection: 'models',
        locale: 'en',
        data: { title: 'Incomplete model', translated: { ar: false, en: true }, _status: 'published' },
        context: ctx,
      }),
    )
    // The translation gate fires first (answerBox and whatItDoes are required for a ticked locale).
    expect(messages).toMatch(/answerBox: .*English/)

    const evidence = await failureMessages(() =>
      p.create({
        collection: 'models',
        locale: 'en',
        data: { title: 'Incomplete model 2', answerBox: 'Answer', whatItDoes: 'Does', translated: { ar: false, en: true }, _status: 'published' },
        context: ctx,
      }),
    )
    expect(evidence).toMatch(/at least 3 fact sources/)
    expect(evidence).toMatch(/reviewer/)

    // As a draft it saves fine.
    const draft = await p.create({
      collection: 'models',
      locale: 'en',
      draft: true,
      data: { title: 'Incomplete model', translated: { ar: false, en: true }, _status: 'draft' },
      context: ctx,
    })
    expect(draft.slug).toBe('incomplete-model')
  })

  maybe('ticking a translation requires that locale’s fields on publish', async () => {
    const p = payload!
    const messages = await failureMessages(() =>
      p.create({
        collection: 'news',
        locale: 'ar',
        data: { title: 'خبر', excerpt: 'ملخص', slug: 'gate-test', translated: { ar: true, en: true }, _status: 'published' },
        context: ctx,
      }),
    )
    expect(messages).toMatch(/title: .*English/)
    expect(messages).not.toMatch(/Arabic/)
  })

  maybe('changing the slug of a published document creates 301s in both locales', async () => {
    const p = payload!
    const post = await p.create({
      collection: 'news',
      locale: 'en',
      data: { title: 'Old title', excerpt: 'Summary', content: toLexical('Body'), translated: { ar: false, en: true }, _status: 'published' },
      context: ctx,
    })
    expect(post.slug).toBe('old-title')
    await p.update({ collection: 'news', id: post.id, locale: 'en', data: { slug: 'new-title', _status: 'published' }, context: ctx })
    const redirects = await p.find({ collection: 'redirects', where: { from: { in: ['/news/old-title', '/en/news/old-title'] } } })
    expect(redirects.docs.map((r) => [r.from, r.to?.url, r.type]).sort()).toEqual([
      ['/en/news/old-title', '/en/news/new-title', '301'],
      ['/news/old-title', '/news/new-title', '301'],
    ])
  })

  maybe('private files reject a non-PDF upload even with a .pdf name', async () => {
    const p = payload!
    const data = Buffer.from('MZ fake executable')
    await expect(
      p.create({
        collection: 'private-files',
        data: { purpose: 'cv' },
        file: { data, mimetype: 'application/pdf', name: 'cv.pdf', size: data.length },
      }),
    ).rejects.toThrow(/invalid: file|not a valid PDF/)
  })
})

