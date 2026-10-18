import { describe, expect, it } from 'vitest'
import {
  collectHeadings,
  hostOf,
  isJobClosed,
  mrrShowable,
  isPublicIn,
  pageParam,
  publicRelations,
  slugifyHeading,
  videoMeta,
  withQuery,
} from '@/components/content/lib'
import { countryName, salaryRange } from '@/components/content/jobs'
import { applicationSchema, checkCvFile, CV_MAX_BYTES, isPdfSignature } from '@/lib/validation/application'

describe('content visibility', () => {
  const doc = (ar: boolean, en: boolean, status: 'draft' | 'published' = 'published') => ({
    id: `${ar}-${en}-${status}`,
    translated: { ar, en },
    _status: status,
  })

  it('shows a document only in locales ticked as translated', () => {
    expect(isPublicIn(doc(true, false), 'ar')).toBe(true)
    expect(isPublicIn(doc(true, false), 'en')).toBe(false)
  })

  it('never shows drafts', () => {
    expect(isPublicIn(doc(true, true, 'draft'), 'ar')).toBe(false)
  })

  it('drops unpopulated ids and untranslated relations', () => {
    const list = publicRelations(['abc', doc(true, true), doc(false, true)], 'ar')
    expect(list).toHaveLength(1)
    expect(publicRelations(null, 'ar')).toEqual([])
    expect(publicRelations(doc(true, true), 'en')).toHaveLength(1)
  })
})

describe('MRR rule', () => {
  it('requires amount, source link and reported date', () => {
    expect(mrrShowable({ amount: 34000, sourceUrl: 'https://example.com', reportedAt: '2026-01-01' })).toBe(true)
    expect(mrrShowable({ amount: 34000, sourceUrl: 'https://example.com' })).toBe(false)
    expect(mrrShowable({ amount: 34000, reportedAt: '2026-01-01' })).toBe(false)
    expect(mrrShowable({ sourceUrl: 'https://example.com', reportedAt: '2026-01-01' })).toBe(false)
    expect(mrrShowable(null)).toBe(false)
  })
})

describe('headings and table of contents', () => {
  it('slugifies Arabic and Latin headings, dropping diacritics', () => {
    expect(slugifyHeading('كم تكلفة نظام حجز؟')).toBe('كم-تكلفة-نظام-حجز')
    expect(slugifyHeading('مجرّبة جديدًا')).toBe('مجربة-جديدا')
    expect(slugifyHeading('How much does it cost?')).toBe('how-much-does-it-cost')
    expect(slugifyHeading('***')).toBe('section')
  })

  it('assigns unique ids to h2/h3 in document order', () => {
    const h = (tag: string, text: string) => ({ type: 'heading', tag, children: [{ type: 'text', text }] })
    const data = { root: { type: 'root', children: [h('h2', 'Cost'), h('h3', 'Hosting'), h('h2', 'Cost'), h('h4', 'Ignored')] } }
    const { toc, ids } = collectHeadings(data)
    expect(toc.map((x) => x.id)).toEqual(['cost', 'hosting', 'cost-2'])
    expect(toc.map((x) => x.level)).toEqual([2, 3, 2])
    expect(ids.get(data.root.children[2])).toBe('cost-2')
  })
})

describe('list helpers', () => {
  it('builds crawlable query links and omits page 1', () => {
    expect(withQuery('/blog', { page: 1 })).toBe('/blog')
    expect(withQuery('/blog', { page: 2, q: 'mada' })).toBe('/blog?page=2&q=mada')
    expect(withQuery('/models', { category: undefined })).toBe('/models')
  })

  it('parses page params defensively', () => {
    expect(pageParam('3')).toBe(3)
    expect(pageParam('-1')).toBe(1)
    expect(pageParam('abc')).toBe(1)
    expect(pageParam(undefined)).toBe(1)
    expect(pageParam(['2', '5'])).toBe(2)
  })

  it('labels sources by hostname without throwing on bad URLs', () => {
    expect(hostOf('https://www.indiehackers.com/post/x')).toBe('indiehackers.com')
    expect(hostOf('not a url')).toBe('not a url')
  })

  it('reads YouTube and Instagram reel URLs', () => {
    expect(videoMeta('https://www.youtube.com/shorts/abcdefghijk')).toMatchObject({
      embedUrl: 'https://www.youtube.com/embed/abcdefghijk',
      vertical: true,
    })
    expect(videoMeta('https://youtu.be/abcdefghijk').vertical).toBe(false)
    expect(videoMeta('https://www.instagram.com/reel/Cxyz123/').embedUrl).toBe('https://www.instagram.com/reel/Cxyz123/embed/')
  })
})

describe('jobs', () => {
  const now = new Date('2026-10-16T12:00:00Z')
  it('treats status closed or a past validThrough as closed', () => {
    expect(isJobClosed({ status: 'open', validThrough: '2026-12-31' }, now)).toBe(false)
    expect(isJobClosed({ status: 'open', validThrough: null }, now)).toBe(false)
    expect(isJobClosed({ status: 'closed', validThrough: '2026-12-31' }, now)).toBe(true)
    expect(isJobClosed({ status: 'open', validThrough: '2026-10-01' }, now)).toBe(true)
  })

  it('shows salary only when allowed', () => {
    expect(salaryRange({ min: 10000, max: 15000, currency: 'SAR', show: false }, 'en')).toBeNull()
    expect(salaryRange({ min: 10000, max: 15000, currency: 'SAR', show: true }, 'en')).toBe('SAR 10,000 – SAR 15,000')
    expect(salaryRange({ min: 10000, max: 15000, currency: 'SAR', show: true }, 'ar')).toBe('10,000 ر.س – 15,000 ر.س')
  })

  it('names countries in the page language', () => {
    expect(countryName('SA', 'en')).toBe('Saudi Arabia')
    expect(countryName(null, 'en')).toBe('')
  })
})

describe('application validation', () => {
  const valid = {
    name: 'Sara Ahmed',
    email: 'Sara@Example.com',
    phoneCountry: '966',
    phone: '0512345678',
    linkedin: 'https://www.linkedin.com/in/sara',
    portfolio: '',
    answers: ['I built a booking app.', 'Two years with Next.js.'],
    consent: true,
  }

  it('accepts a complete application and normalises email', () => {
    const r = applicationSchema('ar', 2).safeParse(valid)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.email).toBe('sara@example.com')
  })

  it('requires PDPL consent', () => {
    const r = applicationSchema('en', 2).safeParse({ ...valid, consent: false })
    expect(r.success).toBe(false)
  })

  it('rejects an invalid Saudi mobile number', () => {
    const r = applicationSchema('ar', 2).safeParse({ ...valid, phone: '12345' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues.some((i) => i.path[0] === 'phone')).toBe(true)
  })

  it('rejects non-LinkedIn profile links and answers that are missing', () => {
    expect(applicationSchema('en', 2).safeParse({ ...valid, linkedin: 'https://example.com/me' }).success).toBe(false)
    expect(applicationSchema('en', 2).safeParse({ ...valid, answers: ['only one'] }).success).toBe(false)
    expect(applicationSchema('en', 2).safeParse({ ...valid, answers: ['', 'ok answer'] }).success).toBe(false)
  })

  it('writes messages in the page language', () => {
    const r = applicationSchema('ar', 0).safeParse({ ...valid, answers: [], name: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toMatch(/[؀-ۿ]/)
  })
})

describe('CV checks', () => {
  it('accepts a PDF up to 4 MB', () => {
    expect(checkCvFile({ name: 'cv.pdf', size: 1000, type: 'application/pdf' }, 'en')).toBeNull()
    expect(checkCvFile({ name: 'cv.pdf', size: CV_MAX_BYTES, type: 'application/pdf' }, 'en')).toBeNull()
  })

  it('rejects other types, oversize files and missing files with a clear message', () => {
    expect(checkCvFile({ name: 'cv.docx', size: 1000, type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }, 'en')).toMatch(/PDF/)
    expect(checkCvFile({ name: 'cv.pdf', size: CV_MAX_BYTES + 1, type: 'application/pdf' }, 'en')).toMatch(/4 MB/)
    expect(checkCvFile(null, 'ar')).toBeTruthy()
  })

  it('checks the PDF file signature, not the extension', () => {
    expect(isPdfSignature(new TextEncoder().encode('%PDF-1.7\n'))).toBe(true)
    expect(isPdfSignature(new TextEncoder().encode('PK\u0003\u0004'))).toBe(false)
    expect(isPdfSignature(new Uint8Array())).toBe(false)
  })
})
