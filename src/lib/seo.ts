import type { Metadata } from 'next'
import { localePath, siteUrl } from './utils'

export type SeoLocale = 'ar' | 'en'

export const DEFAULT_TITLE_TEMPLATE: Record<SeoLocale, string> = {
  ar: '%s — إطلاق',
  en: '%s — Etleq',
}

export const SITE_NAME: Record<SeoLocale, string> = { ar: 'إطلاق', en: 'Etleq' }

/** Absolute URL for a locale-less path ('/models/x') in the given locale. */
export function absoluteUrl(locale: SeoLocale, path = '/'): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const lp = localePath(locale, p)
  return `${siteUrl()}${lp === '/' ? '' : lp}`
}

/** Apply a "%s — Brand" template. Falls back to the default per locale. */
export function applyTitleTemplate(title: string, locale: SeoLocale, template?: string | null): string {
  const tpl = template && template.includes('%s') ? template : DEFAULT_TITLE_TEMPLATE[locale]
  if (!title) return SITE_NAME[locale]
  // Do not double-brand titles that already contain the brand name.
  if (title.includes(SITE_NAME[locale])) return title
  return tpl.replace('%s', title)
}

/** URL of the dynamic OG image for a title. */
export function ogImageUrl(locale: SeoLocale, title: string, subtitle?: string): string {
  const q = new URLSearchParams({ locale, title })
  if (subtitle) q.set('subtitle', subtitle)
  return `${siteUrl()}/og.png?${q.toString()}`
}

export interface SeoImage {
  url: string
  width?: number
  height?: number
  alt?: string
}

export interface BuildMetadataInput {
  locale: SeoLocale
  /** Locale-less path, e.g. '/' or '/models/barber-booking-app'. */
  path: string
  title: string
  description?: string | null
  /** Absolute or root-relative URL, or an object. Defaults to the /og route. */
  image?: string | SeoImage | null
  /** Which locales exist for this page. hreflang is emitted only when both are true. */
  alternates?: { ar?: boolean; en?: boolean }
  noindex?: boolean
  type?: 'website' | 'article' | 'profile'
  /** Title template from seo-defaults (e.g. '%s — إطلاق'). */
  titleTemplate?: string | null
  /** Use the title exactly as given (home page). */
  absoluteTitle?: boolean
  publishedTime?: string | null
  modifiedTime?: string | null
}

const isStaging = () => process.env.SITE_ENV === 'staging'

function normaliseImage(image: BuildMetadataInput['image'], fallback: string): SeoImage {
  if (!image) return { url: fallback, width: 1200, height: 630 }
  const img = typeof image === 'string' ? { url: image } : image
  const url = img.url.startsWith('http') ? img.url : `${siteUrl()}${img.url.startsWith('/') ? '' : '/'}${img.url}`
  return { width: 1200, height: 630, ...img, url }
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  const { locale, path, description, alternates, noindex, type = 'website' } = input
  const fullTitle = input.absoluteTitle ? input.title : applyTitleTemplate(input.title, locale, input.titleTemplate)
  const canonical = absoluteUrl(locale, path)
  const image = normaliseImage(input.image, ogImageUrl(locale, input.title))
  const bothLocales = Boolean(alternates?.ar && alternates?.en)
  const robotsOff = Boolean(noindex) || isStaging()

  const meta: Metadata = {
    title: { absolute: fullTitle },
    description: description || undefined,
    alternates: {
      canonical,
      ...(bothLocales
        ? {
            languages: {
              ar: absoluteUrl('ar', path),
              en: absoluteUrl('en', path),
              'x-default': absoluteUrl('ar', path),
            },
          }
        : {}),
    },
    openGraph: {
      type,
      url: canonical,
      siteName: SITE_NAME[locale],
      title: fullTitle,
      description: description || undefined,
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      ...(bothLocales ? { alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SA'] } : {}),
      images: [image],
      ...(type === 'article' && input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(type === 'article' && input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: description || undefined,
      images: [image.url],
    },
  }
  if (robotsOff) meta.robots = { index: false, follow: !isStaging(), googleBot: { index: false, follow: !isStaging() } }
  return meta
}
