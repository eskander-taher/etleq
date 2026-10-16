/**
 * Cookie consent state (client-safe; every function is a no-op or returns null on the server).
 * Basic mode: nothing analytics/marketing loads until the visitor opts in.
 */

/** Bump when the privacy/cookie policy changes; visitors are asked again. */
export const POLICY_VERSION = '2026-10-01'
export const CONSENT_COOKIE = 'etleq_consent'
/** Dispatch on `window` to reopen the banner (e.g. footer "Cookie settings" link). */
export const OPEN_CONSENT_EVENT = 'etleq:open-consent'
/** Dispatched on `window` with `detail: ConsentState` whenever the choice changes. */
export const CONSENT_CHANGE_EVENT = 'etleq:consent-change'
const MAX_AGE_DAYS = 180

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing'

export interface ConsentCategories {
  necessary: true
  analytics: boolean
  marketing: boolean
}

export interface ConsentState {
  categories: ConsentCategories
  /** ISO timestamp of the choice. */
  at: string
  policyVersion: string
}

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

/** Parse a raw cookie value. Returns null when missing, malformed or for an old policy version. */
export function parseConsent(raw: string | null | undefined, policyVersion = POLICY_VERSION): ConsentState | null {
  if (!raw) return null
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>
    if (!v || v.policyVersion !== policyVersion || !v.categories) return null
    return {
      categories: {
        necessary: true,
        analytics: v.categories.analytics === true,
        marketing: v.categories.marketing === true,
      },
      at: String(v.at || ''),
      policyVersion: v.policyVersion,
    }
  } catch {
    return null
  }
}

function readCookie(name: string): string | null {
  if (!isBrowser()) return null
  try {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
    return hit ? hit.slice(name.length + 1) : null
  } catch {
    return null
  }
}

/** Current valid consent, or null if the visitor has not chosen (or the policy changed). */
export function readConsent(): ConsentState | null {
  return parseConsent(readCookie(CONSENT_COOKIE))
}

export function hasConsent(category: ConsentCategory): boolean {
  if (category === 'necessary') return true
  const c = readConsent()
  return Boolean(c?.categories[category])
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }): ConsentState {
  const state: ConsentState = {
    categories: { necessary: true, analytics: choice.analytics, marketing: choice.marketing },
    at: new Date().toISOString(),
    policyVersion: POLICY_VERSION,
  }
  if (!isBrowser()) return state
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(state))}; Path=/; Max-Age=${
      MAX_AGE_DAYS * 86400
    }; SameSite=Lax${secure}`
  } catch {
    /* cookies blocked: choice applies for this page view only */
  }
  try {
    window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_CHANGE_EVENT, { detail: state }))
  } catch {
    /* ignore */
  }
  return state
}

/** Reopen the consent banner (footer link). */
export function openConsentSettings(): void {
  if (!isBrowser()) return
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))
}

/** Google Consent Mode v2 signals for a consent state. */
export function consentModeSignals(c: ConsentCategories | null) {
  const a = c?.analytics ? 'granted' : 'denied'
  const m = c?.marketing ? 'granted' : 'denied'
  return {
    analytics_storage: a,
    ad_storage: m,
    ad_user_data: m,
    ad_personalization: m,
  } as const
}
