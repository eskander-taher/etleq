import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

export type Loc = 'ar' | 'en'

/** Sitemap ids (one sitemap file per section). */
export const SITEMAP_SECTIONS = [
  'static',
  'models',
  'solutions',
  'projects',
  'posts',
  'news',
  'guides',
  'jobs',
  'authors',
  'categories',
] as const
export type SitemapSection = (typeof SITEMAP_SECTIONS)[number]

/** Payload collection behind each section. */
export const SECTION_COLLECTION: Record<Exclude<SitemapSection, 'static'>, string> = {
  models: 'models',
  solutions: 'solutions',
  projects: 'projects',
  posts: 'posts',
  news: 'news',
  guides: 'guides',
  jobs: 'jobs',
  authors: 'authors',
  categories: 'categories',
}

/** Indexable static pages that exist in both locales. Locale-less paths. */
export const STATIC_PATHS = [
  '/',
  '/launch-30',
  '/how-it-works',
  '/scorecard',
  '/book',
  '/playbook',
  '/models',
  '/projects',
  '/blog',
  '/news',
  '/careers',
  '/about',
  '/faq',
  '/contact',
  '/privacy',
  '/terms',
  '/disclaimer',
  '/cookies',
  '/accessibility',
]

/** Never in a sitemap (noindex / utility). */
const EXCLUDED_PREFIXES = ['/thank-you', '/scorecard/result', '/design', '/admin', '/api', '/hooks', '/go']

export interface SitemapDoc {
  slug?: string | null
  updatedAt?: string | null
  publishedAt?: string | null
  lastReviewedAt?: string | null
  translated?: { ar?: boolean | null; en?: boolean | null } | null
  isSample?: boolean | null
  _status?: string | null
  /** jobs */
  status?: string | null
  /** guides: 'cost' | 'comparison' */
  type?: string | null
  noindex?: boolean | null
  meta?: { noindex?: boolean | null } | null
}

export function sectionPath(section: Exclude<SitemapSection, 'static'>, doc: SitemapDoc): string {
  const slug = doc.slug as string
  switch (section) {
    case 'models':
      return `/models/${slug}`
    case 'solutions':
      return `/solutions/${slug}`
    case 'projects':
      return `/projects/${slug}`
    case 'posts':
      return `/blog/${slug}`
    case 'news':
      return `/news/${slug}`
    case 'guides':
      return doc.type === 'comparison' ? `/compare/${slug}` : `/cost/${slug}`
    case 'jobs':
      return `/careers/${slug}`
    case 'authors':
      return `/authors/${slug}`
    case 'categories':
      return `/blog/category/${slug}`
  }
}

export const isExcludedPath = (p: string) => EXCLUDED_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`))

export interface BuildOptions {
  /** Include `isSample` docs (non-production only). Default false. */
  includeSamples?: boolean
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Pure: docs → sitemap entries, one per translated locale, hreflang alternates only when both exist. */
export function buildSitemapEntries(
  docs: SitemapDoc[],
  section: SitemapSection,
  opts: BuildOptions = {},
): MetadataRoute.Sitemap {
  if (section === 'static') return buildStaticEntries(STATIC_PATHS)
  const out: MetadataRoute.Sitemap = []
  for (const doc of docs) {
    if (!doc?.slug || !SLUG_RE.test(doc.slug)) continue
    if (doc._status && doc._status !== 'published') continue
    if (doc.isSample && !opts.includeSamples) continue
    if (doc.noindex || doc.meta?.noindex) continue
    if (section === 'jobs' && doc.status !== 'open') continue
    const path = sectionPath(section, doc)
    if (isExcludedPath(path)) continue
    const ar = Boolean(doc.translated?.ar)
    const en = Boolean(doc.translated?.en)
    if (!ar && !en) continue
    const lastModified = doc.lastReviewedAt || doc.updatedAt || doc.publishedAt || undefined
    const languages =
      ar && en
        ? { ar: absoluteUrl('ar', path), en: absoluteUrl('en', path), 'x-default': absoluteUrl('ar', path) }
        : undefined
    for (const locale of [ar && 'ar', en && 'en'].filter(Boolean) as Loc[]) {
      out.push({
        url: absoluteUrl(locale, path),
        ...(lastModified ? { lastModified: new Date(lastModified) } : {}),
        ...(languages ? { alternates: { languages } } : {}),
      })
    }
  }
  return out
}

/** Static pages exist in both locales, so they always carry alternates. */
export function buildStaticEntries(paths: string[], lastModified?: Date): MetadataRoute.Sitemap {
  return paths
    .filter((p) => !isExcludedPath(p))
    .flatMap((path) => {
      const languages = {
        ar: absoluteUrl('ar', path),
        en: absoluteUrl('en', path),
        'x-default': absoluteUrl('ar', path),
      }
      return (['ar', 'en'] as const).map((locale) => ({
        url: absoluteUrl(locale, path),
        ...(lastModified ? { lastModified } : {}),
        alternates: { languages },
      }))
    })
}
