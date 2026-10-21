import { getTranslations } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'
import { Container } from './container'
import { TrackedLink } from './tracked-link'
import { Trajectory } from './trajectory'
import { WhatsAppButton } from './whatsapp-button'

/**
 * Closing call to action: the one primary CTA (scorecard) plus WhatsApp as the fallback channel.
 * Dark band; ink text on ignition-500 for the button (white fails AA).
 */
export async function CtaBand({
  locale,
  title,
  text,
  placement,
  whatsappNumber,
  whatsappMessage,
  refCode,
  ctaLabel,
  ctaHref = '/scorecard',
  ctaId,
  micro,
  className,
}: {
  locale: 'ar' | 'en'
  title: string
  text?: string
  /** Analytics location, e.g. 'about_cta'. */
  placement: string
  whatsappNumber?: string | null
  whatsappMessage?: string
  refCode?: string
  ctaLabel?: string
  ctaHref?: string
  /** `cta_id` of the cta_click event; defaults to 'scorecard' for the scorecard, else derived from the href. */
  ctaId?: string
  /**
   * Line under the buttons. Defaults to the scorecard micro-copy ("Short questions…"), shown only when
   * the button goes to the scorecard. Pass `false` to hide it (e.g. when `text` already says it).
   */
  micro?: string | false
  className?: string
}) {
  const t = await getTranslations({ locale, namespace: 'common' })
  const toScorecard = ctaHref === '/scorecard' || ctaHref.startsWith('/scorecard?')
  const microText = micro === false ? null : (micro ?? (toScorecard ? t('cta.scorecardMicro') : null))
  const id =
    ctaId ?? (toScorecard ? 'scorecard' : ctaHref.replace(/^\//, '').split(/[?#]/)[0].replace(/\W+/g, '_') || 'cta')
  return (
    <section data-tone="dark" className={cn('relative overflow-hidden bg-ink-950 text-sand-50', className)}>
      <div className="pointer-events-none absolute -top-10 end-0 hidden w-[34rem] max-w-full opacity-50 md:block" aria-hidden="true">
        <Trajectory tone="dark" milestones={false} />
      </div>
      <Container className="relative py-16 lg:py-24">
        <h2 className="max-w-2xl text-display-2 font-bold">{title}</h2>
        {text ? <p className="mt-4 max-w-xl text-lg text-sand-300">{text}</p> : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <TrackedLink
            href={ctaHref}
            event="cta_click"
            params={{ cta_id: id, location: placement }}
            className={buttonVariants({ variant: 'primary', size: 'lg' })}
          >
            {ctaLabel || t('cta.scorecard')}
            <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </TrackedLink>
          <WhatsAppButton
            number={whatsappNumber}
            message={whatsappMessage || t('whatsapp.defaultMessage')}
            refCode={refCode}
            placement={placement}
            label={t('cta.whatsapp')}
            variant="secondary-dark"
            size="lg"
          />
        </div>
        {microText ? <p className="mt-4 text-sm text-sand-300">{microText}</p> : null}
      </Container>
    </section>
  )
}
