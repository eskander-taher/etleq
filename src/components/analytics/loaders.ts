/**
 * Third-party tag loaders. Called only by ConsentManager after the matching consent.
 * Each is idempotent and does nothing when its NEXT_PUBLIC_* id is empty.
 */
import { consentModeSignals, type ConsentCategories } from '@/lib/consent'

type AnyFn = ((...args: unknown[]) => void) & Record<string, unknown>
type W = Window & Record<string, unknown>

export const TAG_IDS = {
  ga4: process.env.NEXT_PUBLIC_GA4_ID || '',
  clarity: process.env.NEXT_PUBLIC_CLARITY_ID || '',
  meta: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
  snap: process.env.NEXT_PUBLIC_SNAP_PIXEL_ID || '',
  tiktok: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID || '',
}

const loaded = new Set<string>()

function addScript(id: string, src: string) {
  if (document.getElementById(id)) return
  const s = document.createElement('script')
  s.id = id
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

/** GA4 with Consent Mode v2: defaults denied, then update from the visitor's choice. */
export function loadGA4(categories: ConsentCategories) {
  if (!TAG_IDS.ga4) return
  const w = window as unknown as W
  if (!loaded.has('ga4')) {
    w.dataLayer = (w.dataLayer as unknown[]) || []
    // gtag must push `arguments`, not an array.
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      ;(w.dataLayer as unknown[]).push(arguments)
    }
    const gtag = w.gtag as AnyFn
    gtag('consent', 'default', { ...consentModeSignals(null), wait_for_update: 500 })
    gtag('consent', 'update', consentModeSignals(categories))
    gtag('js', new Date())
    gtag('config', TAG_IDS.ga4, { anonymize_ip: true })
    addScript('etleq-ga4', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(TAG_IDS.ga4)}`)
    loaded.add('ga4')
  } else {
    ;(w.gtag as AnyFn)('consent', 'update', consentModeSignals(categories))
  }
}

/** Microsoft Clarity. Never on /admin. Masking: set "Strict" in the Clarity project settings. */
export function loadClarity() {
  if (!TAG_IDS.clarity || loaded.has('clarity')) return
  if (window.location.pathname.startsWith('/admin')) return
  const w = window as unknown as W
  w.clarity =
    w.clarity ||
    function clarity(...args: unknown[]) {
      const c = w.clarity as AnyFn
      ;((c.q as unknown[]) = (c.q as unknown[]) || []).push(args)
    }
  addScript('etleq-clarity', `https://www.clarity.ms/tag/${encodeURIComponent(TAG_IDS.clarity)}`)
  ;(w.clarity as AnyFn)('consent')
  loaded.add('clarity')
}

export function loadMetaPixel() {
  if (!TAG_IDS.meta || loaded.has('meta')) return
  const w = window as unknown as W
  if (!w.fbq) {
    const n = function fbq(...args: unknown[]) {
      if (n.callMethod) (n.callMethod as AnyFn)(...args)
      else (n.queue as unknown[]).push(args)
    } as AnyFn
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    w.fbq = n
    w._fbq = n
  }
  addScript('etleq-meta', 'https://connect.facebook.net/en_US/fbevents.js')
  ;(w.fbq as AnyFn)('init', TAG_IDS.meta)
  ;(w.fbq as AnyFn)('track', 'PageView')
  loaded.add('meta')
}

export function loadSnapPixel() {
  if (!TAG_IDS.snap || loaded.has('snap')) return
  const w = window as unknown as W
  if (!w.snaptr) {
    const a = function snaptr(...args: unknown[]) {
      if (a.handleRequest) (a.handleRequest as AnyFn)(...args)
      else (a.queue as unknown[]).push(args)
    } as AnyFn
    a.queue = []
    w.snaptr = a
  }
  addScript('etleq-snap', 'https://sc-static.net/scevent.min.js')
  ;(w.snaptr as AnyFn)('init', TAG_IDS.snap, {})
  ;(w.snaptr as AnyFn)('track', 'PAGE_VIEW')
  loaded.add('snap')
}

export function loadTikTokPixel() {
  if (!TAG_IDS.tiktok || loaded.has('tiktok')) return
  const w = window as unknown as W
  w.TiktokAnalyticsObject = 'ttq'
  const ttq = ((w.ttq as unknown) || []) as unknown[] & Record<string, unknown>
  ;(w as Record<string, unknown>).ttq = ttq
  const methods = [
    'page',
    'track',
    'identify',
    'instances',
    'debug',
    'on',
    'off',
    'once',
    'ready',
    'alias',
    'group',
    'enableCookie',
    'disableCookie',
    'holdConsent',
    'revokeConsent',
    'grantConsent',
  ]
  for (const m of methods) {
    ttq[m] = (...args: unknown[]) => ttq.push([m, ...args])
  }
  ttq._i = ttq._i || {}
  ;(ttq._i as Record<string, unknown>)[TAG_IDS.tiktok] = []
  ttq._t = ttq._t || {}
  ;(ttq._t as Record<string, number>)[TAG_IDS.tiktok] = Date.now()
  ttq._o = ttq._o || {}
  ;(ttq._o as Record<string, unknown>)[TAG_IDS.tiktok] = {}
  addScript(
    'etleq-tiktok',
    `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(TAG_IDS.tiktok)}&lib=ttq`,
  )
  ;(ttq.page as AnyFn)()
  loaded.add('tiktok')
}

/** Apply a consent choice: load what is granted. Returns true if a reload is needed to unload tags. */
export function applyConsent(categories: ConsentCategories): boolean {
  const revoke =
    (!categories.analytics && (loaded.has('ga4') || loaded.has('clarity'))) ||
    (!categories.marketing && (loaded.has('meta') || loaded.has('snap') || loaded.has('tiktok')))
  if (loaded.has('ga4')) loadGA4(categories)
  if (revoke) return true
  if (categories.analytics) {
    loadGA4(categories)
    loadClarity()
  }
  if (categories.marketing) {
    loadMetaPixel()
    loadSnapPixel()
    loadTikTokPixel()
  }
  return false
}

/** Page view for client-side navigations (GA4 handles its own via enhanced measurement). */
export function trackPageView() {
  const w = window as unknown as W
  try {
    if (loaded.has('meta')) (w.fbq as AnyFn)('track', 'PageView')
    if (loaded.has('snap')) (w.snaptr as AnyFn)('track', 'PAGE_VIEW')
    if (loaded.has('tiktok')) ((w.ttq as Record<string, unknown>).page as AnyFn)()
  } catch {
    /* ignore */
  }
}
