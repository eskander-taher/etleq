'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { trackEvent } from '@/lib/analytics'
import { CONSENT_CHANGE_EVENT, readConsent } from '@/lib/consent'
import { useAlternatePath } from './alternate'
import { swapLocalePath } from './locale-paths'

const KEY = 'etleq:lang-banner-dismissed'
const VIEWS_KEY = 'etleq:page-views'

/** Page views this session, counted per path change. Storage blocked → 0 (the banner stays hidden). */
function countPageView(): number {
  try {
    const n = (Number(window.sessionStorage.getItem(VIEWS_KEY)) || 0) + 1
    window.sessionStorage.setItem(VIEWS_KEY, String(n))
    return n
  } catch {
    return 0
  }
}

const hasChosenConsent = () => Boolean(readConsent())
function subscribeConsent(cb: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, cb)
  return () => window.removeEventListener(CONSENT_CHANGE_EVENT, cb)
}

/**
 * Suggests the other language when the browser prefers it (brief section 5).
 * Never redirects. Its text is written in the suggested language so the visitor can read it.
 * It waits for the second page view of the session and never shows while the cookie banner is open,
 * so a first-time visitor on a phone sees one overlay at most.
 */
export function LanguageBanner() {
  const locale = useLocale() as Locale
  const t = useTranslations('common')
  const pathname = usePathname() || '/'
  const override = useAlternatePath()
  const [show, setShow] = useState(false)
  const consentChosen = useSyncExternalStore(subscribeConsent, hasChosenConsent, () => false)
  const target: Locale = locale === 'ar' ? 'en' : 'ar'

  useEffect(() => {
    if (countPageView() < 2) return
    try {
      if (window.localStorage.getItem(KEY) === '1') return
    } catch {
      /* storage blocked: fall through and decide from the browser language */
    }
    const prefs = navigator.languages?.length ? navigator.languages : [navigator.language]
    const first = (prefs[0] || '').toLowerCase().slice(0, 2)
    if (first !== target) return
    const timer = window.setTimeout(() => setShow(true), 800)
    return () => window.clearTimeout(timer)
  }, [target, pathname])

  if (!show || !consentChosen) return null

  const dismiss = () => {
    setShow(false)
    try {
      window.localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
  }
  const href = override?.[target] || swapLocalePath(pathname, target)
  const targetDir = target === 'ar' ? 'rtl' : 'ltr'

  return (
    <div
      role="region"
      aria-label={t('language.switchLabel')}
      className="fixed inset-x-3 bottom-24 z-40 mx-auto max-w-md rounded-card border border-ink-800 bg-ink-950 p-4 text-sand-50 shadow-lg md:bottom-6"
    >
      <div className="flex items-start gap-3">
        <p lang={target} dir={targetDir} className="flex-1 text-sm">
          {t('language.bannerText')}
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('a11y.dismiss')}
          className="-m-2 inline-flex size-10 shrink-0 items-center justify-center rounded-button text-sand-300 hover:bg-ink-800 hover:text-sand-50"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={href}
          hrefLang={target}
          lang={target}
          dir={targetDir}
          onClick={() => {
            try {
              trackEvent('language_switch', { from: locale, to: target, placement: 'banner' })
            } catch {
              /* ignore */
            }
          }}
          className="inline-flex min-h-11 items-center rounded-button bg-ignition-500 px-4 text-sm font-semibold text-ink-950 hover:bg-[#ff7343]"
        >
          {t('language.bannerAction')}
        </a>
        <button
          type="button"
          onClick={dismiss}
          lang={target}
          dir={targetDir}
          className="inline-flex min-h-11 items-center rounded-button border border-sand-300/40 px-4 text-sm font-semibold text-sand-50 hover:bg-ink-800"
        >
          {t('language.bannerDismiss')}
        </button>
      </div>
    </div>
  )
}
