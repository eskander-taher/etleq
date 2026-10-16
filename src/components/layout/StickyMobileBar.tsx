'use client'

import { useEffect, useState } from 'react'
import { usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { WhatsAppIcon } from '@/components/ui/icons'
import { TrackedAnchor, TrackedLink } from '@/components/ui/tracked-link'
import { NO_STICKY_BAR } from './nav-config'

const FALLBACK_OFFSET = 600

/**
 * Keeps the primary action one tap away on phones once the visitor scrolls past the hero
 * (`#hero` if the page has one, else 600px). While visible it reserves space at the bottom of
 * the page and of the scroll-padding so it never covers the focused element (WCAG 2.4.11).
 */
export function StickyMobileBar({
  scorecardLabel,
  whatsappHref,
  whatsappLabel,
}: {
  scorecardLabel: string
  whatsappHref?: string | null
  whatsappLabel: string
}) {
  const pathname = usePathname() || '/'
  const hidden = NO_STICKY_BAR.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (hidden) return
    const hero = document.getElementById('hero')
    if (hero && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([entry]) => {
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0)
      })
      io.observe(hero)
      return () => io.disconnect()
    }
    const onScroll = () => setVisible(window.scrollY > FALLBACK_OFFSET)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hidden, pathname])

  const shown = visible && !hidden

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const apply = () => {
      const on = shown && !mq.matches
      document.body.style.paddingBlockEnd = on ? '5.5rem' : ''
      document.documentElement.style.scrollPaddingBlockEnd = on ? '6rem' : ''
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.body.style.paddingBlockEnd = ''
      document.documentElement.style.scrollPaddingBlockEnd = ''
    }
  }, [shown])

  if (hidden) return null

  return (
    <div
      inert={!shown}
      aria-hidden={!shown}
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-sand-300 bg-sand-50/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-300 ease-out md:hidden',
        shown ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-md gap-2">
        <TrackedLink
          href="/scorecard"
          event="cta_click"
          params={{ cta_id: 'scorecard', location: 'sticky_bar' }}
          className={cn(buttonVariants({ variant: 'primary' }), 'flex-1')}
        >
          {scorecardLabel}
        </TrackedLink>
        {whatsappHref ? (
          <TrackedAnchor
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            event="whatsapp_click"
            params={{ location: 'sticky_bar' }}
            aria-label={whatsappLabel}
            className={cn(buttonVariants({ variant: 'whatsapp' }), 'w-14 px-0')}
          >
            <WhatsAppIcon className="size-6" />
          </TrackedAnchor>
        ) : null}
      </div>
    </div>
  )
}
