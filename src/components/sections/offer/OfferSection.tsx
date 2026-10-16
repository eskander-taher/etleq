import { getTranslations } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Section, SectionHeading } from '@/components/ui/section'
import { Bonuses, BlueprintCard, CarePlanCards, FallbackNote, TierCards } from './OfferStack'
import { Guarantee } from './OfferDetails'
import type { ResolvedOffer } from './resolve-offer'

/* Home 7: offer stack. */
export async function OfferSection({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <Section aria-labelledby="offer-title" id="offer">
      <div id="offer-title">
        <SectionHeading title={t('offer.title')} lead={t('offer.lead')} />
      </div>
      <div className="mt-10">
        <FallbackNote locale={locale} show={offer.isFallback} />
        <h3 className="mb-6 font-display text-xl font-semibold">{t('offer.tiersTitle')}</h3>
        <TierCards locale={locale} offer={offer} />
        <div className="mt-6">
          <BlueprintCard locale={locale} offer={offer} />
        </div>
        <Bonuses locale={locale} offer={offer} />
        <CarePlanCards locale={locale} offer={offer} />
        <p className="mt-6 text-sm text-ink-600">
          {t('offer.vat')} {locale === 'ar' ? t('offer.sarNote') : null}
        </p>
        <Link href="/launch-30" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-8')}>
          {t('offer.fullOffer')}
          <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
    </Section>
  )
}

/* Home 9: guarantee. */
export async function GuaranteeSection({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <Section tone="dark" aria-labelledby="guarantee-title">
      <h2 id="guarantee-title" className="mb-8 text-sm font-semibold text-ignition-500">
        {t('guarantee.title')}
      </h2>
      <Guarantee locale={locale} offer={offer} />
    </Section>
  )
}
