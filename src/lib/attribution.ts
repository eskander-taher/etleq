/**
 * First-party attribution (client). On landing, capture UTM, click ids, referrer and landing
 * page into sessionStorage. Mirror to a first-party cookie only after analytics consent.
 * Forms call `getAttribution()` and send it with the lead.
 */
import { hasConsent } from './consent'

export const ATTRIBUTION_KEY = 'etleq_attr'
export const ATTRIBUTION_COOKIE = 'etleq_attr'
const COOKIE_DAYS = 90

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
const CLICK_ID_KEYS = ['gclid', 'fbclid', 'ttclid', 'ScCid'] as const

export interface Utm {
  source?: string
  medium?: string
  campaign?: string
  content?: string
  term?: string
}
export type ClickIds = Partial<Record<(typeof CLICK_ID_KEYS)[number], string>>

export interface Touch {
  at: string
  landingPage: string
  referrer: string
  utm: Utm
  clickIds: ClickIds
}

export interface Attribution {
  utm: Utm
  clickIds: ClickIds
  referrer: string
  landingPage: string
  firstTouch: Touch | null
  lastTouch: Touch | null
  refCode: string
}

interface Stored {
  firstTouch: Touch | null
  lastTouch: Touch | null
  refCode: string
}

const isBrowser = () => typeof window !== 'undefined'
const empty: Stored = { firstTouch: null, lastTouch: null, refCode: '' }

/** Pure: build a touch from a URL and referrer. Returns null for internal navigation with nothing new. */
export function touchFromUrl(
  href: string,
  referrer: string,
  now = new Date(),
): { touch: Touch; refCode: string; meaningful: boolean } {
  const url = new URL(href)
  const utm: Utm = {}
  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k)
    if (v) utm[k.slice(4) as keyof Utm] = v.slice(0, 200)
  }
  const clickIds: ClickIds = {}
  for (const k of CLICK_ID_KEYS) {
    const v = url.searchParams.get(k) || url.searchParams.get(k.toLowerCase())
    if (v) clickIds[k] = v.slice(0, 500)
  }
  let ref = ''
  try {
    if (referrer && new URL(referrer).host !== url.host) ref = referrer.slice(0, 500)
  } catch {
    /* invalid referrer */
  }
  // Landing page without click ids / tokens.
  const clean = new URL(url.pathname, url.origin)
  for (const k of UTM_KEYS) {
    const v = url.searchParams.get(k)
    if (v) clean.searchParams.set(k, v)
  }
  const refCode = (url.searchParams.get('ref') || '').slice(0, 64)
  const meaningful = Boolean(Object.keys(utm).length || Object.keys(clickIds).length || ref || refCode)
  return {
    touch: { at: now.toISOString(), landingPage: clean.toString(), referrer: ref, utm, clickIds },
    refCode,
    meaningful,
  }
}

function readSession(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

function readCookie(): Stored | null {
  try {
    const hit = document.cookie.split('; ').find((c) => c.startsWith(`${ATTRIBUTION_COOKIE}=`))
    return hit ? (JSON.parse(decodeURIComponent(hit.slice(ATTRIBUTION_COOKIE.length + 1))) as Stored) : null
  } catch {
    return null
  }
}

function save(s: Stored) {
  try {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(s))
  } catch {
    /* storage blocked */
  }
  persistAttributionCookie(s)
}

/** Mirror attribution to a first-party cookie, only with analytics consent. */
export function persistAttributionCookie(s: Stored | null = readSession()) {
  if (!isBrowser() || !s || !hasConsent('analytics')) return
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(s))}; Path=/; Max-Age=${
      COOKIE_DAYS * 86400
    }; SameSite=Lax${secure}`
  } catch {
    /* ignore */
  }
}

/** Call once per page load (ConsentManager does). Idempotent within a page view. */
export function captureAttribution() {
  if (!isBrowser()) return
  try {
    const prev = readSession() || readCookie() || empty
    const { touch, refCode, meaningful } = touchFromUrl(window.location.href, document.referrer)
    const next: Stored = {
      firstTouch: prev.firstTouch || touch,
      lastTouch: meaningful || !prev.lastTouch ? touch : prev.lastTouch,
      refCode: refCode || prev.refCode || '',
    }
    save(next)
  } catch {
    /* never break the page */
  }
}

export function getAttribution(): Attribution {
  const s = (isBrowser() && (readSession() || readCookie())) || empty
  const last = s.lastTouch || s.firstTouch
  return {
    utm: last?.utm || {},
    clickIds: { ...(s.firstTouch?.clickIds || {}), ...(s.lastTouch?.clickIds || {}) },
    referrer: last?.referrer || '',
    landingPage: s.firstTouch?.landingPage || (isBrowser() ? window.location.href : ''),
    firstTouch: s.firstTouch,
    lastTouch: s.lastTouch,
    refCode: s.refCode || '',
  }
}
