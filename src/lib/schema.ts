/**
 * JSON-LD graph builders (schema-dts typed). One `@graph` per page via `graph(...)`.
 * Markup must match what the page visibly shows. Never emit Review/AggregateRating about Etleq.
 */
import type {
  AboutPage,
  Article,
  BlogPosting,
  BreadcrumbList,
  FAQPage,
  Graph,
  JobPosting,
  NewsArticle,
  Organization,
  Person,
  ProfilePage,
  Service,
  Thing,
  VideoObject,
  WebSite,
} from 'schema-dts'
import { absoluteUrl } from './seo'
import { localePath, siteUrl } from './utils'

export type SchemaLocale = 'ar' | 'en'
export type Ref = { '@id': string }
/** A node that is either a full object or an `@id` reference. */
export type SchemaNode = Thing | Ref | Record<string, unknown>

const site = () => siteUrl()
const inLang = (locale: SchemaLocale) => (locale === 'ar' ? 'ar' : 'en')

export const ids = {
  organization: () => `${site()}/#organization`,
  website: (locale: SchemaLocale) => `${absoluteUrl(locale, '/')}#website`,
  person: (slug: string) => `${site()}/authors/${slug}#person`,
  page: (url: string) => `${url}#webpage`,
}

const ORG_NAME = 'Etleq'
const ORG_ALT_NAMES = ['إطلاق', 'منصة اطلق']

/** Wrap nodes in a single `@graph`. Falsy entries are dropped. */
export function graph(...nodes: Array<SchemaNode | null | undefined | false>): Graph {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter(Boolean) as Thing[],
  }
}

/** Resolve a href (locale-less, already localized, or absolute) to an absolute URL. */
export function toAbsolute(href: string, locale: SchemaLocale): string {
  if (/^https?:\/\//.test(href)) return href
  const p = href.startsWith('/') ? href : `/${href}`
  if (p === '/en' || p.startsWith('/en/')) return `${site()}${p}`
  const lp = localePath(locale, p)
  return `${site()}${lp === '/' ? '' : lp}`
}

const absMedia = (url?: string | null) =>
  url ? (/^https?:\/\//.test(url) ? url : `${site()}${url.startsWith('/') ? '' : '/'}${url}`) : undefined

const isoDate = (d?: string | Date | null) => (d ? new Date(d).toISOString() : undefined)

/* ------------------------------------------------------------------ */
/* Lexical rich text helpers                                           */
/* ------------------------------------------------------------------ */

type LexNode = { type?: string; text?: string; tag?: string; listType?: string; children?: LexNode[] }

const BLOCK_TYPES = ['paragraph', 'heading', 'listitem', 'quote']

/** Flatten Payload Lexical JSON (or a string) to plain text, one block per line. */
export function richTextToPlain(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  const root = (value as { root?: LexNode }).root
  if (!root) return ''
  const lines: string[] = []
  const walk = (n: LexNode): string => {
    if (typeof n.text === 'string') return n.text
    if (n.type === 'linebreak') return '\n'
    const inner = (n.children || []).map(walk).join('')
    if (BLOCK_TYPES.includes(n.type || '')) lines.push(inner)
    return inner
  }
  ;(root.children || []).forEach(walk)
  return lines.filter(Boolean).join('\n').trim()
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Minimal Lexical → HTML for structured data (p, h2-h6, ul/ol, li, br). */
export function richTextToHtml(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return /<[a-z]/i.test(value) ? value : `<p>${esc(value)}</p>`
  const root = (value as { root?: LexNode }).root
  if (!root) return ''
  const render = (n: LexNode): string => {
    if (typeof n.text === 'string') return esc(n.text)
    if (n.type === 'linebreak') return '<br>'
    const inner = (n.children || []).map(render).join('')
    switch (n.type) {
      case 'paragraph':
        return inner ? `<p>${inner}</p>` : ''
      case 'heading': {
        const tag = /^h[2-6]$/.test(n.tag || '') ? n.tag : 'h3'
        return `<${tag}>${inner}</${tag}>`
      }
      case 'list':
        return n.listType === 'number' ? `<ol>${inner}</ol>` : `<ul>${inner}</ul>`
      case 'listitem':
        return `<li>${inner}</li>`
      default:
        return inner
    }
  }
  return (root.children || []).map(render).join('')
}

/* ------------------------------------------------------------------ */
/* Organization / WebSite / Breadcrumbs                                */
/* ------------------------------------------------------------------ */

export interface OrgSettingsInput {
  contactEmail?: string | null
  whatsappNumber?: string | null
  legalEntities?: Array<{ legalName?: string | null; country?: string | null } | null> | null
}
export interface OrgSeoInput {
  sameAs?: Array<{ url?: string | null } | string> | null
  oneLiner?: string | null
}
export interface OrgFounder {
  name: string
  jobTitle?: string | null
  /** Author slug → links to the Person @id. */
  slug?: string | null
  sameAs?: string[]
}
export interface OrganizationNodeOptions {
  /** Full object on home and about; an `@id` reference elsewhere. */
  full?: boolean
  /** SiteSettings global (contactEmail, whatsappNumber, legalEntities). */
  settings?: OrgSettingsInput | null
  /** SeoDefaults global (sameAs, oneLiner). */
  seo?: OrgSeoInput | null
  founders?: OrgFounder[]
}

export function organizationNode(opts: OrganizationNodeOptions = {}): Organization | Ref {
  const id = ids.organization()
  if (!opts.full) return { '@id': id }
  const sameAs = (opts.seo?.sameAs || [])
    .map((s) => (typeof s === 'string' ? s : s?.url))
    .filter((u): u is string => Boolean(u))
  const phone = opts.settings?.whatsappNumber ? `+${opts.settings.whatsappNumber.replace(/^\+/, '')}` : undefined
  const legal = opts.settings?.legalEntities?.find((e) => e?.legalName)
  return {
    '@type': 'Organization',
    '@id': id,
    name: ORG_NAME,
    alternateName: ORG_ALT_NAMES,
    url: site(),
    logo: { '@type': 'ImageObject', url: `${site()}/logo.png` },
    ...(opts.seo?.oneLiner ? { description: opts.seo.oneLiner } : {}),
    ...(legal?.legalName ? { legalName: legal.legalName } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(opts.founders?.length
      ? {
          founder: opts.founders.map((f) => ({
            '@type': 'Person' as const,
            ...(f.slug ? { '@id': ids.person(f.slug) } : {}),
            name: f.name,
            ...(f.jobTitle ? { jobTitle: f.jobTitle } : {}),
            ...(f.sameAs?.length ? { sameAs: f.sameAs } : {}),
          })),
        }
      : {}),
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      areaServed: ['SA', 'AE', 'OM'],
      availableLanguage: ['ar', 'en'],
      ...(opts.settings?.contactEmail ? { email: opts.settings.contactEmail } : {}),
      ...(phone ? { telephone: phone } : {}),
    },
  }
}

export function websiteNode(locale: SchemaLocale, opts: { description?: string | null } = {}): WebSite {
  return {
    '@type': 'WebSite',
    '@id': ids.website(locale),
    url: absoluteUrl(locale, '/'),
    name: locale === 'ar' ? 'إطلاق' : 'Etleq',
    alternateName: locale === 'ar' ? ['Etleq', 'منصة اطلق'] : ['إطلاق', 'منصة اطلق'],
    inLanguage: inLang(locale),
    publisher: { '@id': ids.organization() },
    ...(opts.description ? { description: opts.description } : {}),
  }
}

export interface BreadcrumbItem {
  label: string
  /** Locale-less ('/models'), localized ('/en/models') or absolute. */
  href: string
}

export function breadcrumbNode(items: BreadcrumbItem[], locale: SchemaLocale): BreadcrumbList {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem' as const,
      position: i + 1,
      name: it.label,
      item: toAbsolute(it.href, locale),
    })),
  }
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

export interface AuthorInput {
  slug: string
  name: string
  role?: string | null
  bio?: string | null
  /** Absolute or root-relative image URL. */
  photoUrl?: string | null
  credentials?: Array<{ text?: string | null } | string> | null
  sameAs?: Array<{ url?: string | null } | string> | null
}

function strList(arr: Array<Record<string, unknown> | string> | null | undefined, key: string): string[] {
  return (arr || [])
    .map((s) => (typeof s === 'string' ? s : (s?.[key] as string | null | undefined)))
    .filter((s): s is string => Boolean(s))
}

export function personNode(author: AuthorInput, locale: SchemaLocale): Person {
  const sameAs = strList(author.sameAs, 'url')
  const creds = strList(author.credentials, 'text')
  return {
    '@type': 'Person',
    '@id': ids.person(author.slug),
    name: author.name,
    url: absoluteUrl(locale, `/authors/${author.slug}`),
    ...(author.role ? { jobTitle: author.role } : {}),
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.photoUrl ? { image: absMedia(author.photoUrl) } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    ...(creds.length
      ? { hasCredential: creds.map((c) => ({ '@type': 'EducationalOccupationalCredential' as const, name: c })) }
      : {}),
    worksFor: { '@id': ids.organization() },
  }
}

export interface ProfilePageInput {
  /** Locale-less path, e.g. '/authors/sara'. */
  path: string
  locale: SchemaLocale
  person: Person | Ref
  dateCreated?: string | null
  dateModified?: string | null
}

export function profilePageNode(input: ProfilePageInput): ProfilePage {
  const url = absoluteUrl(input.locale, input.path)
  return {
    '@type': 'ProfilePage',
    '@id': ids.page(url),
    url,
    inLanguage: inLang(input.locale),
    mainEntity: input.person,
    isPartOf: { '@id': ids.website(input.locale) },
    ...(input.dateCreated ? { dateCreated: isoDate(input.dateCreated) } : {}),
    ...(input.dateModified ? { dateModified: isoDate(input.dateModified) } : {}),
  }
}

export interface AboutPageInput {
  locale: SchemaLocale
  name: string
  description?: string | null
  /** Default '/about'. */
  path?: string
}

export function aboutPageNode(input: AboutPageInput): AboutPage {
  const url = absoluteUrl(input.locale, input.path || '/about')
  return {
    '@type': 'AboutPage',
    '@id': ids.page(url),
    url,
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    inLanguage: inLang(input.locale),
    isPartOf: { '@id': ids.website(input.locale) },
    about: { '@id': ids.organization() },
    mainEntity: { '@id': ids.organization() },
  }
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

export interface ArticleInput {
  locale: SchemaLocale
  /** Locale-less path, e.g. '/models/barber-booking-app'. */
  path: string
  headline: string
  description?: string | null
  /** Absolute or root-relative image URLs. */
  images?: Array<string | null | undefined>
  datePublished?: string | Date | null
  /** For models and guides: the last-reviewed date. */
  dateModified?: string | Date | null
  /** Author slugs (→ Person @id) or Person nodes/refs. Defaults to the Organization. */
  authors?: Array<string | Person | Ref>
  /** Reviewer author slug. */
  reviewer?: string | null
  /** e.g. the client Organization for project case studies. */
  about?: SchemaNode | SchemaNode[]
  keywords?: string[]
  /** e.g. a VideoObject node or @id reference. */
  video?: VideoObject | Ref
}

function articleBase(input: ArticleInput) {
  const url = absoluteUrl(input.locale, input.path)
  const images = (input.images || []).map(absMedia).filter((u): u is string => Boolean(u))
  const author = input.authors?.length
    ? input.authors.map((a) => (typeof a === 'string' ? { '@id': ids.person(a) } : a))
    : [{ '@id': ids.organization() }]
  const modified = input.dateModified || input.datePublished
  return {
    '@id': `${url}#article`,
    headline: input.headline.slice(0, 110),
    url,
    mainEntityOfPage: url,
    inLanguage: inLang(input.locale),
    ...(input.description ? { description: input.description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(input.datePublished ? { datePublished: isoDate(input.datePublished) } : {}),
    ...(modified ? { dateModified: isoDate(modified) } : {}),
    author,
    publisher: { '@id': ids.organization() },
    isPartOf: { '@id': ids.website(input.locale) },
    ...(input.reviewer ? { reviewedBy: { '@id': ids.person(input.reviewer) } } : {}),
    ...(input.about ? { about: input.about } : {}),
    ...(input.keywords?.length ? { keywords: input.keywords.join(', ') } : {}),
    ...(input.video ? { video: input.video } : {}),
  }
}

export function articleNode(input: ArticleInput): Article {
  return { '@type': 'Article', ...articleBase(input) } as Article
}

export function blogPostingNode(input: ArticleInput): BlogPosting {
  return { '@type': 'BlogPosting', ...articleBase(input) } as BlogPosting
}

export function newsArticleNode(input: ArticleInput): NewsArticle {
  return { '@type': 'NewsArticle', ...articleBase(input) } as NewsArticle
}

/* ------------------------------------------------------------------ */
/* Service / FAQ / Video                                               */
/* ------------------------------------------------------------------ */

export interface ServiceInput {
  name: string
  description?: string | null
  /** Starting price (minPrice). */
  priceFrom: number
  /** ISO 4217, e.g. 'USD' or 'SAR'. */
  currency: string
  /** Absolute URL, localized path, or locale-less path (resolved with `locale`, default 'ar'). */
  url: string
  locale?: SchemaLocale
  /** ISO2 country codes. Default SA, AE, OM. */
  areaServed?: string[]
  serviceType?: string
}

export function serviceNode(input: ServiceInput): Service {
  const url = toAbsolute(input.url, input.locale || 'ar')
  const areas = input.areaServed?.length ? input.areaServed : ['SA', 'AE', 'OM']
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name: input.name,
    url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.serviceType ? { serviceType: input.serviceType } : {}),
    ...(input.locale ? { inLanguage: inLang(input.locale) } : {}),
    provider: { '@id': ids.organization() },
    areaServed: areas.map((c) => ({ '@type': 'Country' as const, name: c })),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: input.currency,
      price: input.priceFrom,
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'PriceSpecification',
        priceCurrency: input.currency,
        minPrice: input.priceFrom,
      },
    },
  }
}

export interface FaqItem {
  question: string
  answer: string
}

export function faqPageNode(items: FaqItem[], opts: { url?: string; locale?: SchemaLocale } = {}): FAQPage {
  return {
    '@type': 'FAQPage',
    ...(opts.url ? { '@id': `${opts.url}#faq`, url: opts.url } : {}),
    ...(opts.locale ? { inLanguage: inLang(opts.locale) } : {}),
    mainEntity: items
      .filter((i) => i?.question && i?.answer)
      .map((i) => ({
        '@type': 'Question' as const,
        name: i.question,
        acceptedAnswer: { '@type': 'Answer' as const, text: i.answer },
      })),
  }
}

export interface VideoInput {
  name: string
  description: string
  thumbnailUrl: string | string[]
  uploadDate: string | Date
  /** Player URL (YouTube embed / Instagram reel). */
  embedUrl?: string | null
  contentUrl?: string | null
  transcript?: string | null
  /** ISO 8601 duration, e.g. PT45S. */
  duration?: string | null
  /** Absolute page URL; used for a stable @id. */
  pageUrl?: string
  locale?: SchemaLocale
}

export function videoNode(input: VideoInput): VideoObject {
  const thumbs = (Array.isArray(input.thumbnailUrl) ? input.thumbnailUrl : [input.thumbnailUrl])
    .map(absMedia)
    .filter((u): u is string => Boolean(u))
  return {
    '@type': 'VideoObject',
    ...(input.pageUrl ? { '@id': `${input.pageUrl}#video` } : {}),
    name: input.name,
    description: input.description,
    thumbnailUrl: thumbs,
    uploadDate: isoDate(input.uploadDate) as string,
    ...(input.embedUrl ? { embedUrl: input.embedUrl } : {}),
    ...(input.contentUrl ? { contentUrl: input.contentUrl } : {}),
    ...(input.duration ? { duration: input.duration } : {}),
    ...(input.transcript ? { transcript: input.transcript } : {}),
    ...(input.locale ? { inLanguage: inLang(input.locale) } : {}),
    publisher: { '@id': ids.organization() },
  }
}

/* ------------------------------------------------------------------ */
/* JobPosting                                                          */
/* ------------------------------------------------------------------ */

/** Shape of a `jobs` doc (subset), typed loosely so it accepts the generated `Job`. */
export interface JobInput {
  slug: string
  title: string
  /** Lexical JSON, plain text or HTML. */
  description?: unknown
  /** Pre-rendered HTML description; preferred when present. */
  descriptionHtml?: string | null
  responsibilities?: Array<{ item?: string | null }> | null
  requirements?: Array<{ item?: string | null }> | null
  employmentType?: string | null
  city?: string | null
  /** ISO2. */
  country?: string | null
  workplace?: 'onsite' | 'hybrid' | 'remote' | string | null
  applicantLocationRequirements?: Array<{ country?: string | null }> | null
  salary?: {
    min?: number | null
    max?: number | null
    currency?: string | null
    unit?: string | null
    show?: boolean | null
  } | null
  datePosted?: string | null
  validThrough?: string | null
  status?: 'open' | 'closed' | string | null
}

export function jobPostingNode(job: JobInput, locale: SchemaLocale): JobPosting {
  const url = absoluteUrl(locale, `/careers/${job.slug}`)
  const listHtml = (title: string, arr?: Array<{ item?: string | null }> | null) => {
    const items = (arr || []).map((r) => r?.item).filter((s): s is string => Boolean(s))
    return items.length ? `<h3>${esc(title)}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''
  }
  const description =
    job.descriptionHtml ||
    [
      richTextToHtml(job.description),
      listHtml(locale === 'ar' ? 'المسؤوليات' : 'Responsibilities', job.responsibilities),
      listHtml(locale === 'ar' ? 'المتطلبات' : 'Requirements', job.requirements),
    ].join('')
  const remote = job.workplace === 'remote'
  const countries = (job.applicantLocationRequirements || [])
    .map((r) => r?.country)
    .filter((s): s is string => Boolean(s))
  const s = job.salary
  const salary =
    s?.show && (s.min || s.max) && s.currency
      ? {
          baseSalary: {
            '@type': 'MonetaryAmount' as const,
            currency: s.currency,
            value: {
              '@type': 'QuantitativeValue' as const,
              ...(s.min ? { minValue: s.min } : {}),
              ...(s.max ? { maxValue: s.max } : {}),
              ...(s.min && !s.max ? { value: s.min } : {}),
              unitText: s.unit || 'MONTH',
            },
          },
        }
      : {}
  const address = {
    '@type': 'PostalAddress' as const,
    ...(job.city ? { addressLocality: job.city } : {}),
    addressCountry: job.country || 'SA',
  }
  const location = remote
    ? {
        jobLocationType: 'TELECOMMUTE',
        applicantLocationRequirements: (countries.length ? countries : [job.country || 'SA']).map((c) => ({
          '@type': 'Country' as const,
          name: c,
        })),
      }
    : { jobLocation: { '@type': 'Place' as const, address } }
  return {
    '@type': 'JobPosting',
    '@id': `${url}#job`,
    title: job.title,
    description: description || esc(job.title),
    url,
    datePosted: (isoDate(job.datePosted) || new Date().toISOString()).slice(0, 10),
    ...(job.validThrough ? { validThrough: isoDate(job.validThrough) } : {}),
    ...(job.employmentType ? { employmentType: job.employmentType } : {}),
    hiringOrganization: {
      '@type': 'Organization',
      '@id': ids.organization(),
      name: ORG_NAME,
      sameAs: site(),
      logo: `${site()}/logo.png`,
    },
    identifier: { '@type': 'PropertyValue', name: ORG_NAME, value: job.slug },
    directApply: true,
    inLanguage: inLang(locale),
    ...location,
    ...salary,
  } as unknown as JobPosting
}
