import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { env } from '@/lib/env'
import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/container'
import { Scorecard } from '@/components/scorecard/Scorecard'
import { resolveQuestions } from '@/components/scorecard/resolve'
import { getModels, getScorecardSettings } from '@/components/sections/offer/data'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ model?: string; from?: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'scorecard' })
  return buildMetadata({ locale, path: '/scorecard', title: t('meta.title'), description: t('meta.description'), alternates: { ar: true, en: true } })
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export default async function ScorecardPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const sp = await searchParams
  const [t, settings, models] = await Promise.all([getTranslations({ locale, namespace: 'scorecard' }), getScorecardSettings(locale), getModels(locale, 50)])

  const requested = typeof sp.model === 'string' && SLUG.test(sp.model) ? sp.model : null
  const prefill = requested ? models.find((m) => m.slug === requested) : undefined
  const questions = await resolveQuestions(locale, settings, models)

  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto mb-10 max-w-2xl">
        <p className="mb-2 text-sm font-semibold text-ignition-700">{t('intro.eyebrow')}</p>
        <h1 className="text-display-2 font-bold">{t('intro.h1')}</h1>
        <p className="mt-3 text-lg text-ink-600">{t('intro.lead')}</p>
        {prefill ? <p className="mt-3 text-sm font-medium text-ink-950">{t('intro.modelNote', { model: prefill.title })}</p> : null}
      </div>
      <Scorecard
        locale={locale}
        questions={questions}
        modelPrefill={prefill?.slug ?? null}
        turnstileSiteKey={env.turnstileSiteKey || null}
        sourcePage={typeof sp.from === 'string' ? sp.from.slice(0, 200) : prefill ? `/models/${prefill.slug}` : null}
      />
    </Container>
  )
}
