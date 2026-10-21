import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { buttonVariants } from '@/components/ui/button'
import { TrackedLink } from '@/components/ui/tracked-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { cn } from '@/lib/utils'
import { getSiteSettings } from './globals'
import { ForwardArrow } from './parts'
import type { Loc } from './lib'

/**
 * Light, in-flow call to action (scorecard + WhatsApp) for the middle of long pages, e.g. right after
 * a cost table. The dark CtaPanel stays the closing CTA.
 */
export async function InlineCta({
  locale,
  title,
  body,
  href,
  label,
  ctaId,
  placement,
  whatsappMessage,
  refCode,
  trackParams,
  offerLink = false,
  children,
  className,
}: {
  locale: Loc
  title?: string
  body?: ReactNode
  href: string
  label?: string
  ctaId: string
  placement: string
  whatsappMessage: string
  refCode?: string
  trackParams?: Record<string, string | undefined>
  /** Add a text link to /launch-30 (offer and guarantee). */
  offerLink?: boolean
  children?: ReactNode
  className?: string
}) {
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'content' }), getSiteSettings(locale)])
  return (
    <aside
      className={cn('max-w-3xl rounded-[var(--radius-card)] border border-sand-300 bg-white p-5 lg:p-6', className)}
    >
      {title && <p className="text-xl font-bold">{title}</p>}
      {body && <div className={cn('text-ink-600', title && 'mt-2')}>{body}</div>}
      {children}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <TrackedLink
          href={href}
          event="cta_click"
          params={{ ...trackParams, cta_id: ctaId, location: placement, ref_code: refCode }}
          className={buttonVariants()}
        >
          {label ?? t('cta.scorecard')}
        </TrackedLink>
        <WhatsAppButton
          message={whatsappMessage}
          refCode={refCode}
          placement={placement}
          number={settings?.whatsappNumber}
          label={t('cta.whatsapp')}
          variant="secondary"
        />
      </div>
      {offerLink && (
        <Link
          href="/launch-30"
          className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ignition-700 underline underline-offset-4"
        >
          {t('common.offerLink')}
          <ForwardArrow />
        </Link>
      )}
    </aside>
  )
}
