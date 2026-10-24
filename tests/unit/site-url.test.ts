import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SITE_URL, normalizeSiteUrl, siteUrl } from '@/lib/site-url'
import { absoluteUrl, buildMetadata, ogImageUrl } from '@/lib/seo'
import { buildRobotsPolicy } from '@/components/seo/robots-policy'
import { buildSitemapEntries } from '@/components/seo/sitemap-entries'
import { buildRss } from '@/components/seo/rss'
import { buildLlmsTxt } from '@/components/seo/llms'
import { ids } from '@/lib/schema'

const WWW = 'https://www.etleq.com'

describe('canonical host', () => {
  const env = { ...process.env }
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL
    process.env.SITE_ENV = 'production'
  })
  afterEach(() => {
    process.env = { ...env }
  })

  it('defaults to https://www.etleq.com', () => {
    expect(DEFAULT_SITE_URL).toBe(WWW)
    expect(siteUrl()).toBe(WWW)
    process.env.NEXT_PUBLIC_SITE_URL = '  '
    expect(siteUrl()).toBe(WWW)
  })

  it('normalises the configured origin', () => {
    expect(normalizeSiteUrl('https://www.etleq.com/')).toBe(WWW)
    expect(normalizeSiteUrl('https://etleq.com')).toBe(WWW)
    expect(normalizeSiteUrl('http://etleq.com/')).toBe(WWW)
    expect(normalizeSiteUrl('etleq.com')).toBe(WWW)
    expect(normalizeSiteUrl('http://www.etleq.com/some/path?x=1')).toBe(WWW)
    expect(normalizeSiteUrl('https://staging.etleq.com/')).toBe('https://staging.etleq.com')
    expect(normalizeSiteUrl('http://localhost:3000/')).toBe('http://localhost:3000')
    expect(normalizeSiteUrl('not a url')).toBe(WWW)
  })

  it('canonicals, hreflang and OG build from it', () => {
    const meta = buildMetadata({ locale: 'ar', path: '/models/x', title: 'X', alternates: { ar: true, en: true } })
    expect(meta.alternates?.canonical).toBe(`${WWW}/models/x`)
    expect(meta.alternates?.languages).toEqual({
      ar: `${WWW}/models/x`,
      en: `${WWW}/en/models/x`,
      'x-default': `${WWW}/models/x`,
    })
    const og = meta.openGraph as { url?: string; images?: { url: string }[] }
    expect(og.url).toBe(`${WWW}/models/x`)
    expect(og.images?.[0].url.startsWith(`${WWW}/og.png?`)).toBe(true)
    expect(ogImageUrl('en', 'T').startsWith(`${WWW}/og.png?`)).toBe(true)
    expect(ids.organization()).toBe(`${WWW}/#organization`)
  })

  it('sitemaps, robots, RSS and llms.txt build from it', () => {
    const [entry] = buildSitemapEntries([{ slug: 'x', translated: { ar: true, en: false } }], 'models')
    expect(entry.url).toBe(`${WWW}/models/x`)

    const robots = buildRobotsPolicy({ siteUrl: siteUrl() })
    expect(robots.host).toBe(WWW)
    expect(robots.sitemap).toEqual([`${WWW}/sitemap.xml`])

    const rss = buildRss('en', [{ title: 'P', path: '/blog/p' }], new Date('2026-10-01'))
    expect(rss).toContain(`<link>${WWW}/en/blog/p</link>`)
    expect(rss).toContain(`${WWW}/en/rss.xml`)

    const llms = buildLlmsTxt({ models: [{ slug: 'm', title: 'M' }] })
    expect(llms).toContain(`(${WWW}/en/models/m)`)
    expect(llms).toContain(`${WWW}/sitemap.xml`)
    // Every site URL in the machine files uses the canonical host (XML namespaces aside).
    for (const text of [rss, llms]) {
      const urls = (text.match(/https?:\/\/[^\s)<"]+/g) ?? []).filter((u) => u.includes('etleq'))
      expect(urls.length).toBeGreaterThan(0)
      for (const url of urls) expect(url.startsWith(WWW), url).toBe(true)
    }
    expect(absoluteUrl('en', '/')).toBe(`${WWW}/en`)
  })
})
