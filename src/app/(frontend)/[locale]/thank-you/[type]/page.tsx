import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, CalendarPlus, CheckCircle2 } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { buildMetadata } from '@/lib/seo'
import { cn, localePath, siteUrl } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { FireOnce } from '@/components/forms/FireOnce'
import { icsDataUrl } from '@/components/forms/ics'
import { getSiteSettings, whatsappNumberFor } from '@/components/sections/offer/data'

const TYPES = ['booking', 'contact', 'playbook', 'newsletter', 'application'] as const
type ThankYouType = (typeof TYPES)[number]

/** Conversion event fired once when nothing more specific was queued at submit time. */
const FALLBACK_EVENT: Record<ThankYouType, string> = {
  booking: 'booking_scheduled',
  contact: 'generate_lead',
  playbook: 'playbook_download',
  newsletter: 'newsletter_signup',
  application: 'job_apply_submit',
}

type Props = { params: Promise<{ locale: string; type: string }>; searchParams: Promise<{ start?: string; duration?: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props) {
  const { locale: raw, type } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'forms' })
  return buildMetadata({ locale, path: `/thank-you/${type}`, title: t('thankYou.meta.title'), noindex: true })
}

export default async function ThankYouPage({ params, searchParams }: Props) {
  const { locale: raw, type: rawType } = await params
  const locale = raw as Locale
  if (!(TYPES as readonly string[]).includes(rawType)) notFound()
  const type = rawType as ThankYouType
  setRequestLocale(locale)
  const sp = await searchParams
  const [t, tc, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'forms' }),
    getTranslations({ locale, namespace: 'common' }),
    getSiteSettings(locale),
  ])

  const start = type === 'booking' && sp.start ? new Date(sp.start) : null
  const validStart = start && !Number.isNaN(start.getTime()) ? start : null
  const minutes = Math.min(240, Math.max(5, Number(sp.duration) || 15))
  const callTime = validStart
    ? new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Riyadh',
      }).format(validStart)
    : null
  const ics = validStart
    ? icsDataUrl({ start: validStart, minutes, title: t('thankYou.calendarTitle'), url: `${siteUrl()}${localePath(locale, '/')}` })
    : null

  return (
    <Container className="py-16 sm:py-24">
      <FireOnce onceKey={sp.start ? `${type}:${sp.start}` : type} fallback={[{ name: FALLBACK_EVENT[type], params: { source: type } }]} />
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <div>
          <CheckCircle2 className="size-12 text-verified-600" aria-hidden="true" />
          <h1 className="mt-4 text-display-2 font-bold">{t(`thankYou.${type}.title`)}</h1>
          <p className="mt-4 text-lg text-ink-600">{t(`thankYou.${type}.body`)}</p>
          {callTime ? (
            <p className="mt-4 text-lg font-semibold">
              <time dateTime={validStart!.toISOString()}>{callTime}</time>
            </p>
          ) : null}
          {settings.responseTimePromise && (type === 'contact' || type === 'application') ? (
            <p className="mt-2 text-ink-600">{t('thankYou.responseTime', { promise: settings.responseTimePromise })}</p>
          ) : null}
        </div>

        {ics ? (
          <a href={ics} download="etleq-fit-call.ics" className={cn(buttonVariants({ variant: 'secondary' }), 'self-start')}>
            <CalendarPlus className="size-5" aria-hidden="true" />
            {t('thankYou.addToCalendar')}
          </a>
        ) : null}

        {type === 'booking' ? (
          <Card tone="alt">
            <h2 className="font-display text-lg font-semibold">{t('thankYou.booking.prepTitle')}</h2>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-ink-600">
              {(t.raw('thankYou.booking.prep') as string[]).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
        ) : null}

        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-semibold">{t('thankYou.next')}</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <WhatsAppButton
              number={whatsappNumberFor(settings)}
              message={t('thankYou.whatsappMessage')}
              refCode={`TY-${type.toUpperCase()}`}
              placement={`thank_you_${type}`}
              label={t('thankYou.whatsapp')}
            />
            <Link href="/models" className={buttonVariants({ variant: 'secondary' })}>
              {t('thankYou.models')}
              <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
          <Link href="/" className="text-sm font-semibold underline underline-offset-2">
            {tc('cta.backHome')}
          </Link>
        </div>
      </div>
    </Container>
  )
}
