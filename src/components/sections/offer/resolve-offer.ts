import { getTranslations } from 'next-intl/server'
import type { OfferData } from './data'

// Prices always come from the `offer` global. The fallback below mirrors brief section 2 and is
// used only when the global is empty; it is flagged so the page can say so outside production.

const FALLBACK_PRICES = {
  blueprint: 390,
  tiers: { core: 5900, pro: 8900, vertical: 12000 },
  care: [290, 590, 1200],
} as const

export interface ResolvedTier {
  key: string
  name: string
  priceFrom: number
  description?: string | null
  features: string[]
}

export interface ResolvedOffer {
  isFallback: boolean
  blueprint: { name: string; price: number; description?: string | null }
  tiers: ResolvedTier[]
  bonuses: { name: string; statedValue?: number | null; description?: string | null }[]
  carePlans: { name: string; monthlyPrice: number; features: string[] }[]
  guarantee?: string | null
  guaranteeHonestLine?: string | null
  paymentTerms?: string | null
  notIncluded: string[]
  /** Lowest tier price: the "from" price shown in the hero. */
  priceFrom: number
  /** Lowest care plan price. */
  careFrom: number | null
}

const texts = (arr?: { text?: string | null }[] | null) => (arr ?? []).map((f) => f.text).filter((s): s is string => Boolean(s))

export async function resolveOffer(locale: 'ar' | 'en', offer: OfferData): Promise<ResolvedOffer> {
  const t = await getTranslations({ locale, namespace: 'home' })
  const cmsTiers = (offer.tiers ?? []).filter((x) => x.name && typeof x.priceFrom === 'number')
  const isFallback = cmsTiers.length === 0

  if (isFallback && process.env.SITE_ENV === 'production') {
    console.warn('[offer] Offer global is empty; rendering fallback prices from the brief')
  }

  const tiers: ResolvedTier[] = isFallback
    ? (['core', 'pro', 'vertical'] as const).map((key) => ({
        key,
        name: t(`offer.fallback.tiers.${key}.name`),
        priceFrom: FALLBACK_PRICES.tiers[key],
        description: t(`offer.fallback.tiers.${key}.description`),
        features: [],
      }))
    : cmsTiers.map((x) => ({ key: x.key ?? '', name: x.name!, priceFrom: x.priceFrom!, description: x.description, features: texts(x.features) }))

  const cmsCare = (offer.carePlans ?? []).filter((c) => c.name && typeof c.monthlyPrice === 'number')
  const careNames = t.raw('offer.fallback.careNames') as string[]
  const careFeatures = t.raw('offer.fallback.careFeatures') as string[]
  const carePlans = cmsCare.length
    ? cmsCare.map((c) => ({ name: c.name!, monthlyPrice: c.monthlyPrice!, features: texts(c.features) }))
    : isFallback
      ? FALLBACK_PRICES.care.map((p, i) => ({ name: careNames[i], monthlyPrice: p, features: careFeatures }))
      : []

  const blueprint =
    offer.blueprint?.name && typeof offer.blueprint.price === 'number'
      ? { name: offer.blueprint.name, price: offer.blueprint.price, description: offer.blueprint.description }
      : { name: t('offer.fallback.blueprintName'), price: FALLBACK_PRICES.blueprint, description: t('offer.fallback.blueprintDescription') }

  const notIncluded = texts(offer.notIncluded)

  return {
    isFallback,
    blueprint,
    tiers,
    // Bonuses are never invented: shown only when the founders add them.
    bonuses: (offer.bonuses ?? []).filter((b) => b.name).map((b) => ({ name: b.name!, statedValue: b.statedValue, description: b.description })),
    carePlans,
    guarantee: offer.guarantee || null,
    guaranteeHonestLine: offer.guaranteeHonestLine || null,
    paymentTerms: offer.paymentTerms || null,
    notIncluded: notIncluded.length ? notIncluded : (t.raw('launch30.notIncludedFallback') as string[]),
    priceFrom: Math.min(...tiers.map((x) => x.priceFrom)),
    careFrom: carePlans.length ? Math.min(...carePlans.map((c) => c.monthlyPrice)) : null,
  }
}
