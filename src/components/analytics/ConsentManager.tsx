'use client'

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import { useTranslations } from 'next-intl'
import { usePathname } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import { captureAttribution, persistAttributionCookie } from '@/lib/attribution'
import {
  CONSENT_CHANGE_EVENT,
  CONSENT_COOKIE,
  OPEN_CONSENT_EVENT,
  parseConsent,
  readConsent,
  writeConsent,
} from '@/lib/consent'
import { applyConsent, trackPageView } from './loaders'

const SERVER = '\u0000server'

/** Raw consent cookie as an external store (stable string snapshot). */
function subscribe(cb: () => void) {
  window.addEventListener(CONSENT_CHANGE_EVENT, cb)
  window.addEventListener('focus', cb)
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, cb)
    window.removeEventListener('focus', cb)
  }
}
function getSnapshot() {
  try {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    return hit ? hit.slice(CONSENT_COOKIE.length + 1) : ''
  } catch {
    return ''
  }
}
const getServerSnapshot = () => SERVER

const btn =
  'inline-flex min-h-11 flex-1 items-center justify-center rounded-[12px] border border-ink-950 px-4 text-sm font-semibold transition-colors duration-200 hover:bg-ink-950 hover:text-sand-50 sm:flex-none'

/**
 * Cookie banner + tag loader. Render once in the frontend layout, inside NextIntlClientProvider (no props).
 * Bottom sheet, not modal: the page stays usable while it is open.
 */
export function ConsentManager() {
  const t = useTranslations('consent')
  const pathname = usePathname()
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const stored = raw === SERVER ? null : parseConsent(raw)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [draft, setDraft] = useState({ analytics: false, marketing: false })
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descId = useId()
  const firstPath = useRef(true)

  // On mount: capture attribution and apply a stored choice. Nothing loads without one.
  useEffect(() => {
    captureAttribution()
    const c = readConsent()
    if (c) applyConsent(c.categories)
  }, [])

  // Client-side navigations → pixel page views (only for tags already loaded).
  useEffect(() => {
    if (firstPath.current) {
      firstPath.current = false
      return
    }
    trackPageView()
  }, [pathname])

  // Reopen from the footer link.
  useEffect(() => {
    const open = () => {
      const c = readConsent()
      setDraft({ analytics: Boolean(c?.categories.analytics), marketing: Boolean(c?.categories.marketing) })
      setSettingsOpen(true)
      requestAnimationFrame(() => panelRef.current?.focus())
    }
    window.addEventListener(OPEN_CONSENT_EVENT, open)
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, open)
  }, [])

  const commit = useCallback((choice: { analytics: boolean; marketing: boolean }) => {
    const prev = readConsent()
    const state = writeConsent(choice)
    setSettingsOpen(false)
    const needsReload = applyConsent(state.categories)
    if (state.categories.analytics) persistAttributionCookie()
    const revoked =
      prev && ((prev.categories.analytics && !choice.analytics) || (prev.categories.marketing && !choice.marketing))
    if (needsReload || revoked) window.location.reload()
  }, [])

  if (raw === SERVER) return null
  const view = settingsOpen ? 'settings' : stored ? 'hidden' : 'banner'
  if (view === 'hidden') return null

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && stored) setSettingsOpen(false)
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-testid="consent-banner"
      className="fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto border-t border-sand-300 bg-sand-50 text-ink-950 shadow-[0_-8px_30px_rgba(11,15,20,0.12)] focus:outline-none sm:inset-x-4 sm:bottom-4 sm:mx-auto sm:max-w-3xl sm:rounded-[20px] sm:border"
    >
      <div className="p-4 sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          {view === 'settings' ? t('settingsTitle') : t('title')}
        </h2>
        <p id={descId} className="mt-2 text-sm text-ink-800">
          {t('body')}{' '}
          <Link href="/cookies" className="font-semibold underline underline-offset-4">
            {t('policyLink')}
          </Link>
        </p>

        {view === 'settings' && (
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">{t('settingsTitle')}</legend>
            {(['necessary', 'analytics', 'marketing'] as const).map((cat) => {
              const id = `consent-${cat}`
              const locked = cat === 'necessary'
              return (
                <div key={cat} className="flex items-start gap-3 rounded-[12px] border border-sand-300 p-3">
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-1 size-5 shrink-0 accent-ink-950"
                    checked={locked ? true : draft[cat]}
                    disabled={locked}
                    onChange={(e) => {
                      if (!locked) setDraft((d) => ({ ...d, [cat]: e.target.checked }))
                    }}
                    aria-describedby={`${id}-desc`}
                  />
                  <div>
                    <label htmlFor={id} className="font-semibold">
                      {t(`categories.${cat}.name`)}
                      {locked && <span className="ms-2 text-xs font-normal text-stone-500">({t('alwaysOn')})</span>}
                    </label>
                    <p id={`${id}-desc`} className="text-sm text-ink-800">
                      {t(`categories.${cat}.description`)}
                    </p>
                  </div>
                </div>
              )
            })}
          </fieldset>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btn} onClick={() => commit({ analytics: true, marketing: true })}>
            {t('acceptAll')}
          </button>
          <button type="button" className={btn} onClick={() => commit({ analytics: false, marketing: false })}>
            {t('rejectAll')}
          </button>
          {view === 'settings' ? (
            <button type="button" className={btn} onClick={() => commit(draft)}>
              {t('save')}
            </button>
          ) : (
            <button type="button" className={btn} onClick={() => setSettingsOpen(true)}>
              {t('settings')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ConsentManager
