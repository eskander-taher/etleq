import { beforeEach, describe, expect, it } from 'vitest'
import { buildSitemapEntries, sectionPath, STATIC_PATHS } from '@/components/seo/sitemap-entries'
import { buildRss } from '@/components/seo/rss'

const SITE = 'https://www.etleq.com'

describe('buildSitemapEntries', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE
  })

  it('emits one entry per translated locale with alternates only when both exist', () => {
    const entries = buildSitemapEntries(
      [
        { slug: 'both', updatedAt: '2026-10-01T00:00:00Z', translated: { ar: true, en: true }, _status: 'published' },
        { slug: 'ar-only', updatedAt: '2026-10-02T00:00:00Z', translated: { ar: true, en: false } },
      ],
      'models',
    )
    expect(entries.map((e) => e.url)).toEqual([
      `${SITE}/models/both`,
      `${SITE}/en/models/both`,
      `${SITE}/models/ar-only`,
    ])
    expect(entries[0].alternates?.languages).toEqual({
      ar: `${SITE}/models/both`,
      en: `${SITE}/en/models/both`,
      'x-default': `${SITE}/models/both`,
    })
    expect(entries[2].alternates).toBeUndefined()
    expect(entries[2].lastModified).toEqual(new Date('2026-10-02T00:00:00Z'))
  })

  it('excludes drafts, samples (unless allowed), noindex, untranslated and bad slugs', () => {
    const docs = [
      { slug: 'draft', translated: { ar: true }, _status: 'draft' },
      { slug: 'sample', translated: { ar: true }, isSample: true },
      { slug: 'hidden', translated: { ar: true }, meta: { noindex: true } },
      { slug: 'none', translated: { ar: false, en: false } },
      { slug: 'Bad Slug', translated: { ar: true } },
      { slug: 'ok', translated: { ar: true } },
    ]
    expect(buildSitemapEntries(docs, 'posts').map((e) => e.url)).toEqual([`${SITE}/blog/ok`])
    expect(buildSitemapEntries(docs, 'posts', { includeSamples: true }).map((e) => e.url)).toContain(
      `${SITE}/blog/sample`,
    )
  })

  it('jobs: only open roles', () => {
    const e = buildSitemapEntries(
      [
        { slug: 'open-role', status: 'open', translated: { en: true } },
        { slug: 'closed-role', status: 'closed', translated: { en: true } },
      ],
      'jobs',
    )
    expect(e.map((x) => x.url)).toEqual([`${SITE}/en/careers/open-role`])
  })

  it('section paths', () => {
    expect(sectionPath('guides', { slug: 'a', type: 'comparison' })).toBe('/compare/a')
    expect(sectionPath('guides', { slug: 'a', type: 'cost' })).toBe('/cost/a')
    expect(sectionPath('categories', { slug: 'a' })).toBe('/blog/category/a')
    expect(sectionPath('posts', { slug: 'a' })).toBe('/blog/a')
  })

  it('static section: both locales, no utility pages', () => {
    const e = buildSitemapEntries([], 'static')
    expect(e).toHaveLength(STATIC_PATHS.length * 2)
    const urls = e.map((x) => x.url)
    expect(urls).toContain(SITE)
    expect(urls).toContain(`${SITE}/en`)
    expect(urls.some((u) => /thank-you|scorecard\/result|design/.test(u))).toBe(false)
  })
})

describe('buildRss', () => {
  it('escapes and links per locale', () => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE
    const xml = buildRss('en', [{ title: 'A & B <c>', path: '/blog/a', publishedAt: '2026-10-01T00:00:00Z' }])
    expect(xml).toContain('<title>A &amp; B &lt;c&gt;</title>')
    expect(xml).toContain(`<link>${SITE}/en/blog/a</link>`)
    expect(xml).toContain(`href="${SITE}/en/rss.xml"`)
    expect(buildRss('ar', [])).toContain(`href="${SITE}/rss.xml"`)
  })
})
