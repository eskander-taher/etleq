import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { faqPageNode, graph, organizationNode, serviceNode } from '@/lib/schema'
import { JsonLd } from '@/components/seo/JsonLd'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { Section, SectionHeading } from '@/components/ui/section'
import { Stepper } from '@/components/ui/stepper'
import { Faq, FinalCta } from '@/components/sections/home/sections'
import { Bonuses, BlueprintCard, FallbackNote, TierCards } from '@/components/sections/offer/OfferStack'
import { CarePlansTable, Guarantee, NotIncluded, PaymentTerms, SlotCounter } from '@/components/sections/offer/OfferDetails'
import { resolveOffer } from '@/components/sections/offer/resolve-offer'
import { getFaqs, getOffer, getSiteSettings, whatsappNumberFor } from '@/components/sections/offer/data'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'home' })
  return buildMetadata({ locale, path: '/launch-30', title: t('launch30.meta.title'), description: t('launch30.meta.description'), alternates: { ar: true, en: true } })
}

const OFFER_FAQ_CATEGORIES = new Set(['price', 'payments', 'refunds', 'timeline', 'ownership', 'hosting', 'process'])

export default async function Launch30Page({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [t, settings, offerData, allFaqs] = await Promise.all([
    getTranslations({ locale, namespace: 'home' }),
    getSiteSettings(locale),
    getOffer(locale),
    getFaqs(locale, 30),
  ])
  const offer = await resolveOffer(locale, offerData)
  const faqs = allFaqs.filter((f) => !f.category || OFFER_FAQ_CATEGORIES.has(f.category)).slice(0, 8)
  const steps = t.raw('how.steps') as { title: string; body: string }[]
  const url = absoluteUrl(locale, '/launch-30')

  const jsonLd = graph(
    organizationNode(),
    serviceNode({
      name: t('launch30.meta.title'),
      description: t('launch30.meta.description'),
      priceFrom: offer.priceFrom,
      currency: 'USD',
      url: '/launch-30',
      locale,
      areaServed: ['SA', 'AE'],
      serviceType: 'SaaS development',
    }),
    faqs.length ? faqPageNode(faqs.map((f) => ({ question: f.question, answer: f.answer })), { url, locale }) : null,
  )

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow={t('launch30.eyebrow')}
        title={t('launch30.h1')}
        lead={t('launch30.lead')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('launch30.eyebrow'), href: '/launch-30' }]} />}
      >
        <div className="max-w-md">
          <SlotCounter locale={locale} settings={settings} />
        </div>
      </PageHeader>

      <Section aria-labelledby="tiers-title">
        <div id="tiers-title">
          <SectionHeading title={t('offer.tiersTitle')} lead={t('offer.lead')} />
        </div>
        <div className="mt-10">
          <FallbackNote locale={locale} show={offer.isFallback} />
          <TierCards locale={locale} offer={offer} />
          <div className="mt-6">
            <BlueprintCard locale={locale} offer={offer} />
          </div>
          <Bonuses locale={locale} offer={offer} />
          <p className="mt-6 text-sm text-ink-600">
            {t('offer.vat')} {locale === 'ar' ? t('offer.sarNote') : null}
          </p>
        </div>
      </Section>

      {offer.carePlans.length ? (
        <Section tone="alt" aria-labelledby="care-title">
          <h2 id="care-title" className="mb-8 text-display-2 font-bold">
            {t('offer.careTitle')}
          </h2>
          <CarePlansTable locale={locale} offer={offer} />
        </Section>
      ) : null}

      <Section aria-labelledby="payment-title">
        <h2 id="payment-title" className="mb-8 text-display-2 font-bold">
          {t('launch30.paymentTitle')}
        </h2>
        <PaymentTerms locale={locale} offer={offer} />
      </Section>

      <Section tone="dark" aria-labelledby="guarantee-title">
        <h2 id="guarantee-title" className="mb-8 text-display-2 font-bold">
          {t('launch30.guaranteeTitle')}
        </h2>
        <Guarantee locale={locale} offer={offer} detailed />
      </Section>

      <Section tone="alt" aria-labelledby="not-included-title">
        <h2 id="not-included-title" className="mb-8 text-display-2 font-bold">
          {t('launch30.notIncludedTitle')}
        </h2>
        <NotIncluded offer={offer} />
      </Section>

      <Section aria-labelledby="process-title">
        <h2 id="process-title" className="mb-10 text-display-2 font-bold">
          {t('launch30.processTitle')}
        </h2>
        <Stepper locale={locale} layout="grid" steps={steps.map((s) => ({ title: s.title, description: s.body }))} />
      </Section>

      <Faq locale={locale} faqs={faqs} title={t('launch30.faqTitle')} />
      <FinalCta locale={locale} whatsappNumber={whatsappNumberFor(settings)} title={t('launch30.ctaTitle')} location="launch30_cta" />
    </>
  )
}
