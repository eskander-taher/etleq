'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { whatsappLink } from '@/lib/whatsapp'
import { buttonVariants } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/icons'
import { TrackedAnchor, TrackedLink } from '@/components/ui/tracked-link'

/**
 * Page-level CTA context: lets a page tell the site-wide CTAs (header button, mobile menu, sticky bar)
 * where the scorecard link should go and which WhatsApp message/ref to send, so a visitor who
 * landed on a model page from a reel keeps that context. Same pattern as SetAlternatePath.
 */
export type PageCta = {
  /** Locale-less path, e.g. "/scorecard?model=calendly". */
  scorecardHref?: string
  waMessage?: string
  refCode?: string
}

type Ctx = { value: PageCta | null; set: (v: PageCta | null) => void }

const PageCtaContext = createContext<Ctx>({ value: null, set: () => {} })

export function PageCtaProvider({ children }: { children: ReactNode }) {
  const [value, set] = useState<PageCta | null>(null)
  return <PageCtaContext.Provider value={{ value, set }}>{children}</PageCtaContext.Provider>
}

/** The current page's CTA override (null = site defaults). */
export function usePageCta() {
  return useContext(PageCtaContext).value
}

/** Render anywhere inside a page. Renders nothing; clears itself when the page unmounts. */
export function SetPageCta({ scorecardHref, waMessage, refCode }: PageCta) {
  const { set } = useContext(PageCtaContext)
  useEffect(() => {
    set({ scorecardHref, waMessage, refCode })
    return () => set(null)
  }, [scorecardHref, waMessage, refCode, set])
  return null
}

/** Scorecard link that follows the page context (header, mobile menu). */
export function PageScorecardLink({
  label,
  location,
  className,
}: {
  label: string
  location: string
  className?: string
}) {
  const cta = usePageCta()
  return (
    <TrackedLink
      href={cta?.scorecardHref || '/scorecard'}
      event="cta_click"
      params={{ cta_id: 'scorecard', location, ref_code: cta?.refCode }}
      className={className}
    >
      {label}
    </TrackedLink>
  )
}

/** WhatsApp link that uses the page's message and ref code when set, else the defaults given. */
export function PageWhatsAppLink({
  number,
  defaultMessage,
  defaultRef,
  placement,
  label,
  appearance = 'button',
  className,
}: {
  number?: string | null
  defaultMessage: string
  defaultRef?: string
  placement: string
  label: string
  appearance?: 'icon' | 'button'
  className?: string
}) {
  const cta = usePageCta()
  const digits = (number || '').replace(/[^\d]/g, '')
  if (!digits) return null
  const ref = cta?.refCode || defaultRef
  const href = whatsappLink({ number: digits, message: cta?.waMessage || defaultMessage, ref })
  const common = {
    href,
    target: '_blank',
    rel: 'noopener noreferrer',
    event: 'whatsapp_click',
    params: { location: placement, ref_code: ref },
  }
  if (appearance === 'icon') {
    return (
      <TrackedAnchor
        {...common}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex size-12 items-center justify-center rounded-button text-ink-950 transition-colors duration-200 hover:bg-sand-100',
          className,
        )}
      >
        <WhatsAppIcon className="size-6" />
      </TrackedAnchor>
    )
  }
  return (
    <TrackedAnchor {...common} className={cn(buttonVariants({ variant: 'whatsapp', block: true }), className)}>
      <WhatsAppIcon />
      {label}
    </TrackedAnchor>
  )
}
