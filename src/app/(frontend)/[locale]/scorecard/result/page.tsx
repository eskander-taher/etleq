import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, BookOpen, Layers, RotateCcw } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { buildMetadata } from '@/lib/seo'
import { findLeadById, verifyResultToken } from '@/lib/leads'
import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button-link'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { BookingPanel } from '@/components/scorecard/BookingPanel'
import { FireOnce } from '@/components/forms/FireOnce'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { getSiteSettings, whatsappNumberFor } from '@/components/sections/offer/data'
import { cn } from '@/lib/utils'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ t?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'scorecard' })
  return buildMetadata({ locale, path: '/scorecard/result', title: t('result.meta.title'), noindex: true })
}

export default async function ScorecardResultPage({ params, searchParams }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const { t: token } = await searchParams
  const t = await getTranslations({ locale, namespace: 'scorecard' })
  const result = verifyResultToken(token)

  if (!result) {
    return (
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-display-3 font-bold">{t('result.invalid')}</h1>
          <ButtonLink href="/scorecard" className="mt-8">
            {t('result.retake')}
          </ButtonLink>
        </div>
      </Container>
    )
  }

  const [settings, lead] = await Promise.all([getSiteSettings(locale), findLeadById(result.leadId)])
  const { tier, score } = result
  const disqualifiers = (Array.isArray(lead?.disqualifiers) ? lead.disqualifiers : []).filter((d) => t.has(`result.reasons.${d}`))
  const reasons = [...new Set(disqualifiers.map((d) => t(`result.reasons.${d}`)))]
  const whatsapp = whatsappNumberFor(settings)

  return (
    <Container className="py-12 sm:py-20">
      <FireOnce onceKey={`result:${result.leadId}`} fallback={[{ name: 'scorecard_complete', params: { score, tier } }]} />
      <div className="mx-auto max-w-3xl">
        <Badge variant={tier === 'ready' ? 'verified' : tier === 'almost' ? 'accent' : 'neutral'}>{t(`result.${tier}.badge`)}</Badge>
        <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
          <h1 className="text-display-2 font-bold">{t(`result.${tier}.title`)}</h1>
        </div>
        <p className="mt-4 flex items-baseline gap-2 text-ink-600">
          <span>{t('result.scoreLabel')}:</span>
          <bdi className="num text-3xl font-medium text-ink-950">{score}</bdi>
          <span>{t('result.outOf')}</span>
        </p>
        <p className="mt-4 text-lg text-ink-600">{t(`result.${tier}.body`)}</p>

        {reasons.length ? (
          <Card tone="alt" className="mt-8">
            <h2 className="font-display text-lg font-semibold">{t('result.reasonsTitle')}</h2>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-ink-600">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        {tier === 'ready' ? (
          <section className="mt-10" aria-labelledby="book-heading">
            <h2 id="book-heading" className="text-display-3 font-bold">
              {t('booking.choose')}
            </h2>
            <div className="mt-6">
              <BookingPanel locale={locale} settings={settings} name={lead?.name} email={lead?.email} leadToken={token} location="result_ready" />
            </div>
            <Card className="mt-10">
              <h3 className="font-display text-lg font-semibold">{t('result.ready.nextTitle')}</h3>
              <ol className="mt-3 list-decimal space-y-1 ps-5 text-ink-600">
                {(t.raw('result.ready.next') as string[]).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </Card>
          </section>
        ) : null}

        {tier === 'almost' ? (
          <section className="mt-10 flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/playbook" size="lg">
                <BookOpen className="size-5" aria-hidden="true" />
                {t('result.almost.playbook')}
              </ButtonLink>
              <WhatsAppButton
                number={whatsapp}
                message={t('result.almost.whatsappMessage', { score })}
                refCode={`SC-${score}`}
                placement="result_almost"
                label={t('result.almost.whatsapp')}
                size="lg"
              />
            </div>
            <p className="text-ink-600">{t('result.almost.retakeNote')}</p>
            <Link href="/scorecard" className={cn(buttonVariants({ variant: 'ghost' }), 'self-start')}>
              <RotateCcw className="size-5" aria-hidden="true" />
              {t('result.retake')}
            </Link>
          </section>
        ) : null}

        {tier === 'explore' ? (
          <section className="mt-10 flex flex-col gap-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <Link href="/blog" className="group rounded-card border border-sand-300 bg-white p-6 transition-colors hover:border-ink-600">
                <BookOpen className="size-6 text-ignition-700" aria-hidden="true" />
                <span className="mt-3 flex items-center gap-2 font-display text-lg font-semibold">
                  {t('result.explore.blog')}
                  <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
                </span>
              </Link>
              <Link href="/models" className="group rounded-card border border-sand-300 bg-white p-6 transition-colors hover:border-ink-600">
                <Layers className="size-6 text-ignition-700" aria-hidden="true" />
                <span className="mt-3 flex items-center gap-2 font-display text-lg font-semibold">
                  {t('result.explore.models')}
                  <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
                </span>
              </Link>
            </div>
            <Card tone="alt">
              <h2 className="font-display text-lg font-semibold">{t('result.explore.newsletter')}</h2>
              <div className="mt-4">
                <NewsletterForm locale={locale} source="newsletter" compact />
              </div>
            </Card>
            <Link href="/scorecard" className={cn(buttonVariants({ variant: 'ghost' }), 'self-start')}>
              <RotateCcw className="size-5" aria-hidden="true" />
              {t('result.retake')}
            </Link>
          </section>
        ) : null}

      </div>
    </Container>
  )
}
