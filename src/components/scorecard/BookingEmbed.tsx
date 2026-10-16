'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { CalendarDays, ExternalLink } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { trackEvent } from '@/lib/analytics'
import { cn } from '@/lib/utils'

// Cal.com loads only after the visitor clicks "Choose a time" (brief section 14: no third-party
// script on page load). Non-Cal booking URLs open in a new tab with name and email pre-filled.

type CalFn = ((...args: unknown[]) => void) & { loaded?: boolean; ns?: Record<string, unknown>; q?: unknown[] }
declare global {
  interface Window {
    Cal?: CalFn
  }
}

const EMBED_SRC = 'https://app.cal.com/embed/embed.js'

/** Cal.com's official loader snippet, typed. Queues calls until embed.js arrives. */
function ensureCal(): CalFn {
  const w = window
  if (w.Cal) return w.Cal
  const push = (target: { q?: unknown[] }, args: unknown) => {
    ;(target.q = target.q || []).push(args)
  }
  const cal = function (...args: unknown[]) {
    const c = w.Cal!
    if (!c.loaded) {
      c.ns = {}
      c.q = c.q || []
      const s = document.createElement('script')
      s.src = EMBED_SRC
      s.async = true
      document.head.appendChild(s)
      c.loaded = true
    }
    if (args[0] === 'init') {
      const api = function (...a: unknown[]) {
        push(api as unknown as { q?: unknown[] }, a)
      } as CalFn
      const namespace = args[1]
      if (typeof namespace === 'string') {
        c.ns![namespace] = c.ns![namespace] || api
        push(c.ns![namespace] as { q?: unknown[] }, args)
        push(c, ['initNamespace', namespace])
      } else push(c, args)
      return
    }
    push(c, args)
  } as CalFn
  w.Cal = cal
  return cal
}

export function parseCalUrl(url: string): { origin: string; calLink: string } | null {
  try {
    const u = new URL(url)
    if (!/(^|\.)cal\.com$/.test(u.hostname)) return null
    const calLink = u.pathname.replace(/^\/+|\/+$/g, '')
    if (!calLink) return null
    return { origin: u.hostname === 'app.cal.com' ? 'https://app.cal.com' : 'https://cal.com', calLink }
  } catch {
    return null
  }
}

export function prefilledUrl(url: string, name?: string | null, email?: string | null) {
  try {
    const u = new URL(url)
    if (name) u.searchParams.set('name', name)
    if (email) u.searchParams.set('email', email)
    return u.toString()
  } catch {
    return url
  }
}

export function BookingEmbed({
  bookingUrl,
  locale,
  name,
  email,
  leadToken,
  location,
}: {
  bookingUrl: string
  locale: 'ar' | 'en'
  name?: string | null
  email?: string | null
  /** Passed through to the thank-you page so it can confirm without exposing data. */
  leadToken?: string | null
  location: string
}) {
  const t = useTranslations('scorecard')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const cal = parseCalUrl(bookingUrl)
  const ns = 'etleq-fit'

  function start() {
    trackEvent('cta_click', { cta_id: 'choose_time', location })
    if (!cal) return
    setOpen(true)
    // Wait one frame for the container to mount.
    requestAnimationFrame(() => {
      const Cal = ensureCal()
      Cal('init', ns, { origin: cal.origin })
      const api = (window.Cal!.ns![ns] as CalFn) || Cal
      api('inline', {
        elementOrSelector: '#etleq-cal-inline',
        calLink: cal.calLink,
        config: { name: name || undefined, email: email || undefined, locale, layout: 'month_view', theme: 'light' },
      })
      api('ui', { hideEventTypeDetails: false, layout: 'month_view' })
      api('on', {
        action: 'bookingSuccessful',
        callback: (e: { detail?: { data?: { date?: string; duration?: number } } }) => {
          const d = e?.detail?.data
          const query: Record<string, string> = {}
          if (d?.date) query.start = d.date
          if (d?.duration) query.duration = String(d.duration)
          if (leadToken) query.t = leadToken
          router.push({ pathname: '/thank-you/booking', query })
        },
      })
    })
  }

  if (!cal) {
    return (
      <a
        href={prefilledUrl(bookingUrl, name, email)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackEvent('cta_click', { cta_id: 'choose_time', location })}
        className={cn(buttonVariants({ size: 'lg' }))}
      >
        <CalendarDays className="size-5" aria-hidden="true" />
        {t('booking.openExternal')}
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    )
  }

  return (
    <div>
      {!open ? (
        <div className="flex flex-col items-start gap-2">
          <Button type="button" size="lg" onClick={start}>
            <CalendarDays className="size-5" aria-hidden="true" />
            {t('booking.choose')}
          </Button>
          <p className="text-sm text-stone-500">{t('booking.privacy')}</p>
        </div>
      ) : (
        <div
          ref={box}
          id="etleq-cal-inline"
          aria-busy="true"
          aria-label={t('booking.choose')}
          role="region"
          className="min-h-[640px] w-full overflow-auto rounded-card border border-sand-300 bg-white"
        >
          <p className="p-6 text-ink-600">{t('booking.loading')}</p>
        </div>
      )}
    </div>
  )
}
