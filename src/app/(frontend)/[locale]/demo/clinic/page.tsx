import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CalendarCheck, CreditCard, LayoutDashboard, MessageCircle, Receipt, ShieldCheck } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { ClinicDemo } from '@/components/demo/ClinicDemo'
import { CtaBand } from '@/components/ui/cta-band'
import { PageHeader } from '@/components/ui/page-header'
import { Section, SectionHeading } from '@/components/ui/section'
import { getSiteSettings, whatsappNumberFor } from '@/components/sections/offer/data'
import { SetPageCta } from '@/components/layout/page-cta'
import { scorecardFrom } from '@/components/content/lib'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

// Sent to leads from outreach; not part of the public nav or search results.
export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'demo' })
  return buildMetadata({
    locale,
    path: '/demo/clinic',
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: { ar: true, en: true },
    noindex: true,
  })
}

const FEATURES = [
  { key: 'booking', Icon: CalendarCheck },
  { key: 'whatsapp', Icon: MessageCircle },
  { key: 'payments', Icon: CreditCard },
  { key: 'zatca', Icon: Receipt },
  { key: 'branches', Icon: LayoutDashboard },
  { key: 'owned', Icon: ShieldCheck },
] as const

export default async function ClinicDemoPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [t, tc, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'demo' }),
    getTranslations({ locale, namespace: 'common' }),
    getSiteSettings(locale),
  ])

  const scorecardHref = scorecardFrom('/demo/clinic')
  const refCode = 'DEMO-CLINIC'

  return (
    <>
      <SetPageCta scorecardHref={scorecardHref} waMessage={t('cta.whatsapp')} refCode={refCode} />
      <PageHeader eyebrow={t('header.eyebrow')} title={t('header.h1')} lead={t('header.lead')}>
        <p className="inline-flex rounded-button border border-sand-300 bg-sand-50 px-4 py-2 text-sm text-ink-600">
          {t('header.notice')}
        </p>
      </PageHeader>

      <Section className="py-10 lg:py-16">
        <ClinicDemo
          scorecardHref={scorecardHref}
          whatsappNumber={whatsappNumberFor(settings)}
          whatsappMessage={t('cta.whatsapp')}
          refCode={refCode}
        />
      </Section>

      <Section tone="alt">
        <SectionHeading title={t('features.h2')} />
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ key, Icon }) => (
            <li key={key} className="rounded-card border border-sand-300 bg-sand-50 p-6">
              <Icon className="size-6 text-ignition-700" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold">{t(`features.items.${key}.title`)}</h3>
              <p className="mt-2 text-ink-600">{t(`features.items.${key}.text`)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-2xl text-lg font-semibold">{t('features.note')}</p>
      </Section>

      <CtaBand
        locale={locale}
        title={t('cta.title')}
        text={t('cta.text')}
        placement="demo_clinic_cta"
        ctaLabel={tc('cta.scorecard')}
        ctaHref={scorecardHref}
        ctaId="scorecard"
        whatsappNumber={settings.whatsappNumber}
        whatsappMessage={t('cta.whatsapp')}
        refCode="DEMO-CLINIC"
      />
    </>
  )
}
