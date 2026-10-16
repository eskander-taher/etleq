import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { PageHeader } from '@/components/ui/page-header'
import { Section } from '@/components/ui/section'
import { Stepper } from '@/components/ui/stepper'
import { FinalCta } from '@/components/sections/home/sections'
import { GuaranteeSection } from '@/components/sections/offer/OfferSection'
import { resolveOffer } from '@/components/sections/offer/resolve-offer'
import { getOffer, getSiteSettings, whatsappNumberFor } from '@/components/sections/offer/data'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'home' })
  return buildMetadata({
    locale,
    path: '/how-it-works',
    title: t('howItWorks.meta.title'),
    description: t('howItWorks.meta.description'),
    alternates: { ar: true, en: true },
  })
}

export default async function HowItWorksPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [t, settings, offerData] = await Promise.all([getTranslations({ locale, namespace: 'home' }), getSiteSettings(locale), getOffer(locale)])
  const offer = await resolveOffer(locale, offerData)
  const steps = t.raw('how.steps') as { title: string; body: string }[]
  const details = t.raw('howItWorks.details') as { duration: string; outcome: string }[]

  return (
    <>
      <PageHeader
        title={t('howItWorks.h1')}
        lead={t('howItWorks.lead')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('howItWorks.h1'), href: '/how-it-works' }]} />}
      />
      <Section>
        <div className="mx-auto max-w-3xl">
          <Stepper
            locale={locale}
            steps={steps.map((s, i) => ({
              title: s.title,
              meta: details[i] ? `${t('howItWorks.durationLabel')}: ${details[i].duration}` : undefined,
              description: (
                <>
                  <p>{s.body}</p>
                  {details[i] ? (
                    <p className="mt-2">
                      <span className="font-semibold text-ink-950">{t('howItWorks.outcomeLabel')}:</span> {details[i].outcome}
                    </p>
                  ) : null}
                </>
              ),
            }))}
          />
        </div>
      </Section>
      <GuaranteeSection locale={locale} offer={offer} />
      <FinalCta locale={locale} whatsappNumber={whatsappNumberFor(settings)} title={t('howItWorks.ctaTitle')} location="how_cta" />
    </>
  )
}
