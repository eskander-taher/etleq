'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Cloudflare Turnstile, invisible/managed. The script loads only when a site key is configured
// and only on pages that render a form. No puzzle captchas (brief section 9).

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
    __etleqTurnstileLoading?: Promise<void>
  }
}

const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadScript() {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.turnstile) return Promise.resolve()
  if (!window.__etleqTurnstileLoading) {
    window.__etleqTurnstileLoading = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SRC
      s.async = true
      s.defer = true
      s.onload = () => resolve()
      s.onerror = () => reject(new Error('turnstile script failed'))
      document.head.appendChild(s)
    })
  }
  return window.__etleqTurnstileLoading
}

/**
 * Returns a container ref to place in the form, the current token and a reset function.
 * Without a site key it returns a null token and the server skips verification in development.
 */
export function useTurnstile(siteKey: string | null | undefined, locale: 'ar' | 'en') {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    if (!siteKey || !ref.current) return
    let cancelled = false
    loadScript()
      .then(() => {
        if (cancelled || !ref.current || !window.turnstile) return
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          language: locale,
          callback: (t: string) => setToken(t),
          'expired-callback': () => setToken(null),
          'error-callback': () => setToken(null),
        })
      })
      .catch(() => {
        /* the server rejects the submission; the form shows the spam message */
      })
    return () => {
      cancelled = true
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey, locale])

  const reset = useCallback(() => {
    setToken(null)
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current)
  }, [])

  return { ref, token, reset, enabled: Boolean(siteKey) }
}

export function TurnstileBox({ boxRef, note }: { boxRef: React.RefObject<HTMLDivElement | null>; note?: string }) {
  return (
    <div>
      <div ref={boxRef} />
      {note ? <p className="sr-only">{note}</p> : null}
    </div>
  )
}
