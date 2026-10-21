// Read-side adapter for the conversion pages. Wraps workstream A's query helpers, normalises their
// results and never throws, so a missing global or an empty collection renders a page without that section.
import { getGlobal, findPublic } from '@/lib/queries/common'
import type { ScorecardSettingsLike } from '@/lib/scoring'

export type Locale = 'ar' | 'en'

export interface SiteSettingsData {
  slotsTotal?: number | null
  slotsLeft?: number | null
  /** YYYY-MM the slot numbers are for; empty = always current. */
  slotsMonth?: string | null
  foundingPriceActive?: boolean | null
  foundingPrice?: number | null
  foundingSlots?: number | null
  whatsappNumber?: string | null
  responseTimePromise?: string | null
  bookingUrls?: { ar?: string | null; en?: string | null } | null
  contactEmail?: string | null
  legalEntities?: { legalName?: string | null; country?: string | null; crNumber?: string | null; vatNumber?: string | null; address?: string | null }[] | null
  retention?: { leadsMonths?: number | null; applicationsMonths?: number | null } | null
  policyVersion?: string | null
}

export interface OfferData {
  blueprint?: { name?: string | null; price?: number | null; description?: string | null } | null
  tiers?: { key?: 'core' | 'pro' | 'vertical' | null; name?: string | null; priceFrom?: number | null; description?: string | null; features?: { text?: string | null }[] | null }[] | null
  bonuses?: { name?: string | null; statedValue?: number | null; description?: string | null }[] | null
  carePlans?: { name?: string | null; monthlyPrice?: number | null; features?: { text?: string | null }[] | null }[] | null
  guarantee?: string | null
  guaranteeHonestLine?: string | null
  paymentTerms?: string | null
  notIncluded?: { text?: string | null }[] | null
  confirmed?: boolean | null
}

export interface MediaLike {
  url?: string | null
  alt?: string | null
  width?: number | null
  height?: number | null
  sizes?: Record<string, { url?: string | null; width?: number | null; height?: number | null } | undefined> | null
}

export interface ModelCard {
  id: string
  slug: string
  title: string
  answerBox?: string | null
  whatItDoes?: string | null
  category?: string | null
  priceFrom?: number | null
  buildDays?: number | null
  mrr?: { amount?: number | null; currency?: string | null; sourceName?: string | null; sourceUrl?: string | null; reportedAt?: string | null } | null
  heroImage?: MediaLike | string | null
}

export interface AuthorCard {
  id: string
  slug: string
  name: string
  role?: string | null
  bio?: string | null
  photo?: MediaLike | string | null
  sameAs?: { url?: string | null }[] | null
}

export interface ProjectCard {
  id: string
  slug: string
  title: string
  clientName?: string | null
  context?: string | null
  plannedDays?: number | null
  actualDays?: number | null
}

export interface FaqItemData {
  id: string
  question: string
  answer: string
  category?: string | null
  order?: number | null
}

export interface TestimonialData {
  id: string
  person?: string | null
  role?: string | null
  company?: string | null
  quote?: string | null
  verified?: boolean | null
  relatedProject?: { slug?: string | null } | string | null
}

const asArray = <T,>(r: unknown): T[] => {
  if (Array.isArray(r)) return r as T[]
  if (r && typeof r === 'object' && Array.isArray((r as { docs?: unknown }).docs)) return (r as { docs: T[] }).docs
  return []
}

async function safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return (await fn()) ?? fallback
  } catch (err) {
    console.error(`[conversion-data] ${label} failed:`, (err as Error).message)
    return fallback
  }
}

type GlobalFn = (slug: string, locale: Locale) => Promise<unknown>
type FindFn = (collection: string, locale: Locale, opts?: Record<string, unknown>) => Promise<unknown>
const g = getGlobal as unknown as GlobalFn
const f = findPublic as unknown as FindFn

export const getSiteSettings = (locale: Locale) => safe('site-settings', async () => ((await g('site-settings', locale)) || {}) as SiteSettingsData, {} as SiteSettingsData)
export const getOffer = (locale: Locale) => safe('offer', async () => ((await g('offer', locale)) || {}) as OfferData, {} as OfferData)
export const getScorecardSettings = (locale: Locale) =>
  safe('scorecard-settings', async () => ((await g('scorecard-settings', locale)) || {}) as ScorecardSettingsLike, {} as ScorecardSettingsLike)

export const getModels = (locale: Locale, limit = 6) =>
  safe('models', async () => asArray<ModelCard>(await f('models', locale, { limit, sort: '-updatedAt', depth: 1 })), [] as ModelCard[])

export const getAuthors = (locale: Locale) => safe('authors', async () => asArray<AuthorCard>(await f('authors', locale, { where: { isFounder: { equals: true } }, sort: 'order', limit: 4, depth: 1 })), [] as AuthorCard[])

export const getProjects = (locale: Locale) =>
  safe('projects', async () => asArray<ProjectCard>(await f('projects', locale, { limit: 3, sort: '-publishedAt', depth: 1 })), [] as ProjectCard[])

export const getFaqs = (locale: Locale, limit = 10) =>
  safe('faqs', async () => asArray<FaqItemData>(await f('faqs', locale, { limit, sort: 'order', depth: 0 })), [] as FaqItemData[])

/** Verified testimonials only (they carry no publish workflow of their own). */
export const getTestimonials = (locale: Locale) =>
  safe(
    'testimonials',
    async () => {
      const { getCms } = await import('@/lib/cms')
      const cms = await getCms()
      const res = await cms.find({
        collection: 'testimonials' as never,
        locale,
        fallbackLocale: false,
        where: { verified: { equals: true } },
        limit: 6,
        depth: 1,
      } as never)
      return asArray<TestimonialData>(res).filter((t) => t.quote)
    },
    [] as TestimonialData[],
  )

export const mediaUrl = (m: MediaLike | string | null | undefined, size?: string) =>
  m && typeof m === 'object' ? (size && m.sizes?.[size]?.url) || m.url || null : null

/** Booking URL: site-settings per locale, then CAL_BOOKING_URL. */
export function bookingUrlFor(settings: SiteSettingsData, locale: Locale) {
  return settings.bookingUrls?.[locale] || process.env.CAL_BOOKING_URL || ''
}

/** Current month in Riyadh as YYYY-MM. */
export function riyadhMonth(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit' }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}`
}

/**
 * Real scarcity only (guardrail 2): slot numbers count only for the month they were entered for.
 * Unset slotsMonth keeps the old behaviour (always shown).
 */
export function slotsAreCurrent(slotsMonth: string | null | undefined, now = new Date()) {
  const month = typeof slotsMonth === 'string' ? slotsMonth.trim() : ''
  return !month || month === riyadhMonth(now)
}

export const whatsappNumberFor = (settings: SiteSettingsData) => (settings.whatsappNumber || process.env.WHATSAPP_NUMBER || '').replace(/\D/g, '')

export interface SeoDefaultsData {
  titleTemplate?: string | null
  defaultDescription?: string | null
  oneLiner?: string | null
  sameAs?: { url?: string | null }[] | null
}

export const getSeoDefaults = (locale: Locale) => safe('seo-defaults', async () => ((await g('seo-defaults', locale)) || {}) as SeoDefaultsData, {} as SeoDefaultsData)
