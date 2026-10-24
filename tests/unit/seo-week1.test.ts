import { beforeEach, describe, expect, it } from 'vitest'
import { cleanSameAs, organizationNode, serviceNode, siteGraph } from '@/lib/schema'
import { DEFAULT_ONE_LINER } from '@/lib/seo'
import { buildLlmsTxt } from '@/components/seo/llms'
import { formatRange, sourcedRanges } from '@/components/content/lib'
import { evidenceProblems } from '@/hooks/gates'
import arHome from '@/messages/ar/home.json'
import enHome from '@/messages/en/home.json'
import arContent from '@/messages/ar/content.json'
import enContent from '@/messages/en/content.json'

const WWW = 'https://www.etleq.com'
const ORG = { '@id': `${WWW}/#organization` }
type Obj = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = WWW
})

describe('Organization sameAs guard', () => {
  it('drops placeholder ("example") and invalid URLs, keeps real ones once', () => {
    expect(
      cleanSameAs([
        { url: 'https://www.instagram.com/example-etleq' },
        { url: 'https://www.linkedin.com/company/EXAMPLE-etleq' },
        'https://example.com/etleq',
        { url: 'https://x.com/etleq' },
        'https://x.com/etleq',
        { url: '  https://www.linkedin.com/company/etleq  ' },
        { url: 'instagram.com/etleq' },
        { url: '' },
        null,
      ]),
    ).toEqual(['https://x.com/etleq', 'https://www.linkedin.com/company/etleq'])
  })

  it('full Organization never publishes the fake instagram.com/example-etleq', () => {
    const org = organizationNode({
      full: true,
      seo: { sameAs: [{ url: 'https://www.instagram.com/example-etleq' }, { url: 'https://x.com/etleq' }] },
      founders: [{ name: 'A', sameAs: ['https://www.linkedin.com/in/example', 'https://www.linkedin.com/in/a'] }],
    }) as Obj
    expect(org.sameAs).toEqual(['https://x.com/etleq'])
    expect(org.founder[0].sameAs).toEqual(['https://www.linkedin.com/in/a'])
    const onlyFake = organizationNode({ full: true, seo: { sameAs: [{ url: 'https://instagram.com/example-etleq' }] } }) as Obj
    expect(onlyFake.sameAs).toBeUndefined()
  })
})

describe('Organization @id on every page', () => {
  it('siteGraph (rendered by the locale layout) references the Organization and WebSite', () => {
    for (const locale of ['ar', 'en'] as const) {
      const g = siteGraph(locale) as Obj
      expect(g['@graph']).toContainEqual(ORG)
      const site = g['@graph'].find((n: Obj) => n['@type'] === 'WebSite')
      expect(site.publisher).toEqual(ORG)
      expect(site.url).toBe(locale === 'ar' ? WWW : `${WWW}/en`)
    }
  })
})

describe('Service schema on solution pages', () => {
  it('without priceFrom: name, serviceType, provider ref, areaServed SA + AE, no Offer', () => {
    const s = serviceNode({
      name: 'نظام إدارة عيادات',
      priceFrom: null,
      url: '/solutions/clinics',
      locale: 'ar',
      areaServed: ['SA', 'AE'],
      serviceType: 'Clinics',
    }) as Obj
    expect(s['@type']).toBe('Service')
    expect(s.name).toBe('نظام إدارة عيادات')
    expect(s.serviceType).toBe('Clinics')
    expect(s.provider).toEqual(ORG)
    expect(s.areaServed).toEqual([
      { '@type': 'Country', name: 'SA' },
      { '@type': 'Country', name: 'AE' },
    ])
    expect(s.url).toBe(`${WWW}/solutions/clinics`)
    expect(s.offers).toBeUndefined()
    expect(JSON.stringify(s)).not.toMatch(/Offer|price/i)
  })

  it('with a visible priceFrom the Offer is kept', () => {
    const s = serviceNode({ name: 'X', priceFrom: 5900, url: '/solutions/x', locale: 'en' }) as Obj
    expect(s.offers.priceSpecification.minPrice).toBe(5900)
    expect(s.offers.priceCurrency).toBe('USD')
  })
})

describe('one-liner', () => {
  const fixedPrice = /fixed[- ]price|سعر ثابت|بسعر ثابت|السعر الثابت/i

  it('matches the approved lines and never says "fixed price"', () => {
    expect(DEFAULT_ONE_LINER.ar).toBe(
      'اطلق استوديو يبني منصّتك البرمجية بالعربية ويطلقها خلال 30 يوم عمل، مع الدفع عبر مدى والاستضافة.',
    )
    expect(DEFAULT_ONE_LINER.en).toMatch(/30 working days/)
    expect(DEFAULT_ONE_LINER.en).toMatch(/mada/)
    for (const line of Object.values(DEFAULT_ONE_LINER)) expect(line).not.toMatch(fixedPrice)
  })

  it('is the default for the Organization description and llms.txt', () => {
    expect((organizationNode({ full: true, locale: 'ar' }) as Obj).description).toBe(DEFAULT_ONE_LINER.ar)
    expect((organizationNode({ full: true, locale: 'en' }) as Obj).description).toBe(DEFAULT_ONE_LINER.en)
    const llms = buildLlmsTxt({})
    expect(llms).toContain(`> ${DEFAULT_ONE_LINER.en}`)
    expect(llms).toContain(`> ${DEFAULT_ONE_LINER.ar}`)
    expect(llms).not.toMatch(fixedPrice)
  })

  it('home messages carry no stale meta description', () => {
    expect((arHome.meta as Obj).description).toBeUndefined()
    expect((enHome.meta as Obj).description).toBeUndefined()
  })
})

describe('cost guide', () => {
  const row = {
    option: 'Local agency',
    low: 35000,
    high: 65000,
    currency: 'SAR',
    sourceUrl: 'https://example.org/src',
    checkedAt: '2026-10-01',
  }

  it('shows only rows with a label, a figure, a source URL and a checked date', () => {
    const rows = [
      row,
      { ...row, sourceUrl: '' },
      { ...row, sourceUrl: 'ftp://x' },
      { ...row, checkedAt: null },
      { ...row, low: null, high: null },
      { ...row, option: ' ' },
      { ...row, option: 'From only', high: null },
    ]
    expect(sourcedRanges(rows).map((r) => r.option)).toEqual(['Local agency', 'From only'])
  })

  it('formats ranges per locale with Western digits', () => {
    expect(formatRange(row, 'ar')).toBe('35,000–65,000 ر.س')
    expect(formatRange(row, 'en')).toBe('SAR 35,000–65,000')
    expect(formatRange({ ...row, currency: 'USD', low: 9000, high: 17000 }, 'en')).toBe('$9,000–$17,000')
    expect(formatRange({ ...row, high: null }, 'en')).toBe('SAR 35,000')
  })

  it('publish gate: each priced row needs its source link and date', () => {
    const base = {
      type: 'cost',
      answerBox: 'a',
      content: 'c',
      reviewer: 'r',
      lastReviewedAt: '2026-10-01',
      sources: [1, 2, 3].map((n) => ({ url: `https://s${n}.org`, accessedAt: '2026-10-01' })),
    }
    expect(evidenceProblems({ ...base, costRanges: [row] }, 'guide')).toEqual([])
    const problems = evidenceProblems({ ...base, costRanges: [row, { ...row, sourceUrl: '' }] }, 'guide')
    expect(problems.map((p) => p.path)).toEqual(['costRanges.1.sourceUrl'])
  })

  it('cost copy names no Etleq price model', () => {
    for (const cost of [arContent.cost, enContent.cost]) expect(JSON.stringify(cost)).not.toMatch(/fixed|ثابت/i)
  })
})
