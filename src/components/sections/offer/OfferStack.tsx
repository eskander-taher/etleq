import { getTranslations } from 'next-intl/server'
import { Check, Gift } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Price } from '@/components/ui/price'
import type { ResolvedOffer } from './resolve-offer'

/** Fallback-price flag: visible outside production so the founders notice an empty Offer global. */
export async function FallbackNote({ locale, show }: { locale: 'ar' | 'en'; show: boolean }) {
  if (!show || process.env.SITE_ENV === 'production') return null
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <p role="note" className="mb-6 rounded-button border border-dashed border-ignition-700 bg-white px-4 py-2 text-sm text-ignition-700">
      {t('offer.fallbackNote')}
    </p>
  )
}

export async function TierCards({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {offer.tiers.map((tier, i) => (
        <Card key={tier.key || tier.name} className={cn('flex flex-col gap-4', i === 0 && 'border-ink-950')}>
          <h3 className="font-display text-xl font-semibold">{tier.name}</h3>
          <Price usd={tier.priceFrom} locale={locale} from showUsdOnArabic />
          {tier.description ? <p className="text-ink-600">{tier.description}</p> : null}
          {tier.features.length ? (
            <ul className="flex flex-col gap-2 text-[0.95rem]">
              {tier.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-1 size-4 shrink-0 text-verified-600" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      ))}
    </div>
  )
}

export async function Bonuses({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  if (!offer.bonuses.length) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  const bonusTotal = offer.bonuses.reduce((s, b) => s + (b.statedValue || 0), 0)
  const totalValue = offer.priceFrom + bonusTotal
  return (
    <div className="mt-12">
      <h3 className="text-display-3 font-bold">{t('offer.bonusesTitle')}</h3>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {offer.bonuses.map((b) => (
          <li key={b.name} className="flex gap-4 rounded-card border border-sand-300 bg-white p-5">
            <Gift className="mt-1 size-6 shrink-0 text-ignition-700" aria-hidden="true" />
            <div>
              <p className="font-semibold">{b.name}</p>
              {b.description ? <p className="mt-1 text-ink-600">{b.description}</p> : null}
              {b.statedValue ? (
                <Badge variant="outline" className="mt-2">
                  {t('offer.statedValue', { value: formatPrice(b.statedValue, locale) })}
                </Badge>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {bonusTotal > 0 ? (
        <dl className="mt-8 grid gap-4 rounded-card bg-ink-950 p-6 text-sand-50 sm:grid-cols-2" data-tone="dark">
          <div>
            <dt className="text-sm text-sand-300">{t('offer.totalValue')}</dt>
            <dd className="num mt-1 text-3xl line-through decoration-ignition-500 decoration-2">
              <bdi>{formatPrice(totalValue, locale)}</bdi>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-sand-300">{t('offer.yourPrice')}</dt>
            <dd className="num mt-1 text-3xl text-ignition-500">
              <bdi>{formatPrice(offer.priceFrom, locale)}</bdi>
            </dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}

export async function CarePlanCards({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  if (!offer.carePlans.length) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <div className="mt-12">
      <h3 className="text-display-3 font-bold">{t('offer.careTitle')}</h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {offer.carePlans.map((c) => (
          <Card key={c.name} tone="alt" className="flex flex-col gap-2">
            <p className="font-semibold">{c.name}</p>
            <p>
              <bdi className="num text-2xl">{formatPrice(c.monthlyPrice, locale)}</bdi> <span className="text-sm text-ink-600">{t('offer.perMonth')}</span>
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}

export async function BlueprintCard({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <Card tone="alt" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-ignition-700">{t('offer.blueprintTitle')}</p>
        <h3 className="mt-1 font-display text-xl font-semibold">{offer.blueprint.name}</h3>
        {offer.blueprint.description ? <p className="mt-1 text-ink-600">{offer.blueprint.description}</p> : null}
        <p className="mt-1 text-sm text-ink-600">{t('offer.blueprintCredited')}</p>
      </div>
      <Price usd={offer.blueprint.price} locale={locale} size="md" />
    </Card>
  )
}
