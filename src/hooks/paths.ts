/**
 * Public URL paths for CMS documents. Arabic is served without a prefix,
 * English under `/en` (next-intl `localePrefix: 'as-needed'`).
 */

export type PublicLocale = 'ar' | 'en'
export const PUBLIC_LOCALES: PublicLocale[] = ['ar', 'en']

type DocLike = { slug?: string | null; type?: string | null } & Record<string, unknown>

/** Section segment for a collection. `null` means the collection has no public detail page. */
export function sectionFor(collection: string, doc?: DocLike | null): string | null {
  switch (collection) {
    case 'pages':
      return ''
    case 'models':
      return 'models'
    case 'solutions':
      return 'solutions'
    case 'projects':
      return 'projects'
    case 'posts':
      return 'blog'
    case 'news':
      return 'news'
    case 'guides':
      return doc?.type === 'comparison' ? 'compare' : 'cost'
    case 'jobs':
      return 'careers'
    case 'authors':
      return 'authors'
    default:
      return null
  }
}

export const localePrefix = (locale: PublicLocale) => (locale === 'en' ? '/en' : '')

/** Locale-less path, e.g. `/models/barber-booking-app`. The `home` page slug maps to `/`. */
export function basePath(collection: string, doc: DocLike | null | undefined): string | null {
  const section = sectionFor(collection, doc)
  if (section === null || !doc?.slug) return null
  if (collection === 'pages' && doc.slug === 'home') return '/'
  return section ? `/${section}/${doc.slug}` : `/${doc.slug}`
}

/** Full path for a locale, e.g. `/en/models/barber-booking-app`. */
export function localizedPath(path: string, locale: PublicLocale): string {
  const prefix = localePrefix(locale)
  if (path === '/') return prefix || '/'
  return `${prefix}${path}`
}

/** Section index path (e.g. `/models`) or null for pages. */
export function sectionIndexPath(collection: string, doc?: DocLike | null): string | null {
  const section = sectionFor(collection, doc)
  return section ? `/${section}` : null
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
