import { getTranslations } from 'next-intl/server'
import { ArrowRight, CreditCard } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { localePath, cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { TrackedAnchor } from '@/components/ui/tracked-link'
import type { SiteSettingsData } from '@/components/sections/offer/data'
import { ProductMockup } from './ProductMockup'

const COUNTRY: Record<'ar' | 'en', Record<string, string>> = {
  ar: { SA: 'السعودية', AE: 'الإمارات', OM: 'عُمان' },
  en: { SA: 'Saudi Arabia', AE: 'UAE', OM: 'Oman' },
}

export async function Hero({ locale, priceFrom, settings }: { locale: 'ar' | 'en'; priceFrom: number; settings: SiteSettingsData }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const price = formatPrice(priceFrom, locale)
  // Entity claims only for real legal entities: bracketed founder placeholders ("[CR number]") don't count.
  const real = (v?: string | null) => Boolean(v?.trim()) && !v!.trim().startsWith('[')
  const countries = [
    ...new Set(
      (settings.legalEntities ?? [])
        .filter((e) => real(e.legalName) && real(e.crNumber) && e.country)
        .map((e) => e.country!.toUpperCase()),
    ),
  ]

  return (
    <section id="hero" className="relative overflow-hidden bg-sand-50">
      <Container className="grid gap-12 py-8 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16 lg:py-24">
        <div>
          <p className="mb-3 text-sm font-semibold text-ignition-700 sm:mb-4">{t('hero.eyebrow')}</p>
          <h1 className="text-display-1 font-bold">{t('hero.h1')}</h1>
          <p className="mt-4 inline-flex rounded-full border border-sand-300 bg-white px-4 py-1.5 text-sm font-semibold text-ink-950">
            <span>{t.rich('hero.priceChip', { price, num: (chunks) => <bdi className="num">{chunks}</bdi> })}</span>
          </p>
          <p className="mt-4 max-w-xl text-lg text-ink-600 sm:mt-6 sm:text-xl">{t('hero.sub')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
            <TrackedAnchor
              href={localePath(locale, '/scorecard')}
              event="cta_click"
              params={{ cta_id: 'scorecard', location: 'hero' }}
              className={buttonVariants({ size: 'lg' })}
            >
              {t('hero.cta')}
              <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </TrackedAnchor>
            <TrackedAnchor
              href={localePath(locale, '/demo/clinic')}
              event="cta_click"
              params={{ cta_id: 'demo', location: 'hero' }}
              className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'px-4 sm:px-6')}
            >
              {t('hero.secondary')}
              <ArrowRight className="size-5 shrink-0 rtl:rotate-180" aria-hidden="true" />
            </TrackedAnchor>
          </div>
          <p className="mt-3 text-sm text-ink-600">{t('hero.microcopy')}</p>

          <div className="mt-10 flex flex-col gap-3">
            <p className="text-xs font-semibold text-stone-500">{t('hero.trustLabel')}</p>
            <ul className="flex flex-wrap gap-2">
              {(['mada', 'applePay', 'cards'] as const).map((k) => (
                <li key={k} className="inline-flex min-h-9 items-center gap-1.5 rounded-button border border-sand-300 bg-white px-3 text-sm font-semibold">
                  {k === 'cards' ? <CreditCard className="size-4" aria-hidden="true" /> : null}
                  <bdi>{t(`hero.payments.${k}`)}</bdi>
                </li>
              ))}
            </ul>
            {countries.length ? (
              <p className="text-sm text-ink-600">
                {t('hero.entitiesLabel')} {countries.map((c) => COUNTRY[locale][c] ?? c).join(locale === 'ar' ? '، ' : ', ')}
              </p>
            ) : null}
          </div>
        </div>
        <ProductMockup locale={locale} />
      </Container>
    </section>
  )
}
