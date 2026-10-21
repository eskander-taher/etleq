import { getTranslations } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { TrackedLink } from '@/components/ui/tracked-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { cn } from '@/lib/utils'
import { getSiteSettings } from './globals'
import type { Loc } from './lib'

/**
 * Closing call to action: one primary button (scorecard or a page-specific target) plus WhatsApp as secondary.
 * Server-rendered; only click tracking runs on the client.
 */
export async function CtaPanel({
  locale,
  title,
  body,
  href = '/scorecard',
  label,
  ctaId,
  whatsappMessage,
  refCode,
  placement,
  trackParams,
}: {
  locale: Loc
  title: string
  body?: string
  href?: string
  label?: string
  ctaId: string
  whatsappMessage?: string
  refCode?: string
  placement: string
  /** Extra cta_click params, e.g. { model_slug } or { vertical }. */
  trackParams?: Record<string, string | undefined>
}) {
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'content' }), getSiteSettings(locale)])
  return (
    <section className="bg-ink-950 py-14 text-sand-50 lg:py-20" data-tone="dark">
      <Container>
        <h2 className="max-w-3xl text-display-2 font-bold">{title}</h2>
        {body && <p className="mt-3 max-w-2xl text-lg text-sand-300">{body}</p>}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <TrackedLink
            href={href}
            event="cta_click"
            params={{ ...trackParams, cta_id: ctaId, location: placement, ref_code: refCode }}
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            {label ?? t('cta.scorecard')}
          </TrackedLink>
          <WhatsAppButton
            message={whatsappMessage ?? t('cta.whatsappMessage')}
            refCode={refCode}
            placement={placement}
            number={settings?.whatsappNumber}
            label={t('cta.whatsapp')}
            variant="secondary-dark"
            size="lg"
          />
        </div>
      </Container>
    </section>
  )
}
