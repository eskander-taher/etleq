import { beforeEach, describe, expect, it } from 'vitest'
import {
  aboutPageNode,
  articleNode,
  blogPostingNode,
  breadcrumbNode,
  faqPageNode,
  graph,
  jobPostingNode,
  newsArticleNode,
  organizationNode,
  personNode,
  profilePageNode,
  richTextToPlain,
  serviceNode,
  videoNode,
  websiteNode,
} from '@/lib/schema'
import { serializeJsonLd } from '@/components/seo/JsonLd'

const SITE = 'https://etleq.com'
type Obj = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

const lexical = (text: string) => ({
  root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text }] }] },
})

describe('schema builders', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE
  })

  it('organization: full vs reference', () => {
    expect(organizationNode()).toEqual({ '@id': `${SITE}/#organization` })
    const org = organizationNode({
      full: true,
      seo: { sameAs: [{ url: 'https://x.com/etleq' }, 'https://linkedin.com/company/etleq'], oneLiner: 'One line' },
      settings: { contactEmail: 'hello@etleq.com', whatsappNumber: '966500000000' },
      founders: [{ name: 'A', slug: 'a', jobTitle: 'CEO' }],
    }) as Obj
    expect(org['@type']).toBe('Organization')
    expect(org.name).toBe('Etleq')
    expect(org.alternateName).toEqual(['إطلاق', 'منصة اطلق'])
    expect(org.sameAs).toHaveLength(2)
    expect(org.contactPoint.areaServed).toEqual(['SA', 'AE', 'OM'])
    expect(org.contactPoint.availableLanguage).toEqual(['ar', 'en'])
    expect(org.contactPoint.telephone).toBe('+966500000000')
    expect(org.founder[0]['@id']).toBe(`${SITE}/authors/a#person`)
  })

  it('website + breadcrumbs resolve localized URLs', () => {
    expect((websiteNode('en') as Obj).url).toBe(`${SITE}/en`)
    const bc = breadcrumbNode(
      [
        { label: 'Home', href: '/' },
        { label: 'Models', href: '/en/models' },
        { label: 'X', href: '/models/x' },
      ],
      'en',
    ) as Obj
    expect(bc.itemListElement.map((i: Obj) => i.item)).toEqual([
      `${SITE}/en`,
      `${SITE}/en/models`,
      `${SITE}/en/models/x`,
    ])
    expect(bc.itemListElement[2].position).toBe(3)
  })

  it('articles: dateModified falls back, author refs, never ratings', () => {
    const input = {
      locale: 'ar' as const,
      path: '/models/x',
      headline: 'H',
      datePublished: '2026-01-01',
      dateModified: '2026-03-01',
      authors: ['sara'],
      reviewer: 'omar',
      images: ['/media/x.jpg'],
    }
    const a = articleNode(input) as Obj
    expect(a['@type']).toBe('Article')
    expect(a.dateModified).toBe('2026-03-01T00:00:00.000Z')
    expect(a.author).toEqual([{ '@id': `${SITE}/authors/sara#person` }])
    expect(a.reviewedBy).toEqual({ '@id': `${SITE}/authors/omar#person` })
    expect(a.image).toEqual([`${SITE}/media/x.jpg`])
    expect((blogPostingNode(input) as Obj)['@type']).toBe('BlogPosting')
    expect((newsArticleNode(input) as Obj)['@type']).toBe('NewsArticle')
    const all = JSON.stringify(graph(a))
    expect(all).not.toMatch(/AggregateRating|"Review"/)
  })

  it('service has Offer + PriceSpecification minPrice', () => {
    const s = serviceNode({
      name: 'Launch 30',
      priceFrom: 5900,
      currency: 'USD',
      url: '/launch-30',
      locale: 'en',
    }) as Obj
    expect(s.url).toBe(`${SITE}/en/launch-30`)
    expect(s.offers['@type']).toBe('Offer')
    expect(s.offers.priceSpecification).toMatchObject({
      '@type': 'PriceSpecification',
      minPrice: 5900,
      priceCurrency: 'USD',
    })
    expect(s.areaServed).toHaveLength(3)
  })

  it('job posting: required props; remote uses TELECOMMUTE', () => {
    const base = {
      slug: 'senior-engineer',
      title: 'Senior Engineer',
      description: lexical('Build things'),
      responsibilities: [{ item: 'Ship' }],
      employmentType: 'FULL_TIME',
      datePosted: '2026-10-01',
      validThrough: '2026-12-01',
      salary: { min: 20000, max: 30000, currency: 'SAR', unit: 'MONTH', show: true },
    }
    const onsite = jobPostingNode({ ...base, workplace: 'onsite', city: 'Riyadh', country: 'SA' }, 'en') as Obj
    for (const k of [
      'title',
      'description',
      'datePosted',
      'hiringOrganization',
      'jobLocation',
      'validThrough',
      'employmentType',
      'baseSalary',
      'identifier',
    ]) {
      expect(onsite[k], k).toBeDefined()
    }
    expect(onsite.description).toContain('<p>Build things</p>')
    expect(onsite.description).toContain('<li>Ship</li>')
    expect(onsite.jobLocation.address.addressCountry).toBe('SA')
    expect(onsite.baseSalary.value).toMatchObject({ minValue: 20000, maxValue: 30000, unitText: 'MONTH' })

    const remote = jobPostingNode(
      {
        ...base,
        workplace: 'remote',
        applicantLocationRequirements: [{ country: 'SA' }, { country: 'AE' }],
        salary: null,
      },
      'ar',
    ) as Obj
    expect(remote.jobLocationType).toBe('TELECOMMUTE')
    expect(remote.applicantLocationRequirements).toEqual([
      { '@type': 'Country', name: 'SA' },
      { '@type': 'Country', name: 'AE' },
    ])
    expect(remote.jobLocation).toBeUndefined()
    expect(remote.baseSalary).toBeUndefined()
    expect(remote.url).toBe(`${SITE}/careers/senior-engineer`)
  })

  it('person, profile page, about page', () => {
    const person = personNode(
      { slug: 'sara', name: 'Sara', sameAs: [{ url: 'https://linkedin.com/in/sara' }], credentials: ['PMP'] },
      'en',
    )
    const p = person as Obj
    expect(p['@id']).toBe(`${SITE}/authors/sara#person`)
    expect(p.hasCredential[0].name).toBe('PMP')
    const pp = profilePageNode({ path: '/authors/sara', locale: 'en', person }) as Obj
    expect(pp.mainEntity['@id']).toBe(p['@id'])
    expect((aboutPageNode({ locale: 'ar', name: 'من نحن' }) as Obj).url).toBe(`${SITE}/about`)
  })

  it('faq + video', () => {
    const f = faqPageNode([
      { question: 'Q?', answer: 'A' },
      { question: '', answer: 'x' },
    ]) as Obj
    expect(f.mainEntity).toHaveLength(1)
    const v = videoNode({
      name: 'Reel',
      description: 'd',
      thumbnailUrl: '/media/poster.jpg',
      uploadDate: '2026-05-01',
      embedUrl: 'https://www.youtube.com/embed/abc',
      transcript: 'hello',
    }) as Obj
    expect(v.thumbnailUrl).toEqual([`${SITE}/media/poster.jpg`])
    expect(v.transcript).toBe('hello')
  })

  it('graph output parses as JSON and is script-safe', () => {
    const g = graph(
      organizationNode({ full: true }),
      websiteNode('ar'),
      null,
      faqPageNode([{ question: '</script><b>', answer: 'a & b' }]),
    )
    const html = serializeJsonLd(g)
    expect(html).not.toContain('</script>')
    expect(html).not.toContain('<')
    const parsed = JSON.parse(html)
    expect(parsed['@context']).toBe('https://schema.org')
    expect(parsed['@graph']).toHaveLength(3)
    expect(parsed['@graph'][2].mainEntity[0].name).toBe('</script><b>')
  })

  it('richTextToPlain flattens lexical', () => {
    expect(richTextToPlain(lexical('Hello'))).toBe('Hello')
    expect(richTextToPlain('plain')).toBe('plain')
    expect(richTextToPlain(null)).toBe('')
  })
})
