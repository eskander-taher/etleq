/**
 * Client-side analytics. Safe to import from client components; no-op on the server.
 * Every event carries `locale` and an `event_id` (shared with server events for dedup).
 * Nothing is sent unless consent for that category was granted (src/lib/consent.ts).
 *
 * Server-side events (Measurement Protocol / CAPI) live in `@/lib/analytics-server`.
 */
import { hasConsent } from './consent'

type Params = Record<string, unknown>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    snaptr?: (...args: unknown[]) => void
    ttq?: { track: (name: string, params?: Params, opts?: Params) => void; page?: () => void }
    clarity?: (...args: unknown[]) => void
  }
}

export type AnalyticsEvent =
  | 'cta_click'
  | 'scorecard_start'
  | 'scorecard_step'
  | 'scorecard_complete'
  | 'generate_lead'
  | 'qualify_lead'
  | 'disqualify_lead'
  | 'booking_scheduled'
  | 'whatsapp_click'
  | 'video_play'
  | 'video_progress'
  | 'model_view'
  | 'language_switch'
  | 'job_view'
  | 'job_apply_submit'
  | 'newsletter_signup'
  | 'playbook_download'
  | 'close_convert_lead'
  | 'experiment_exposure'

/**
 * GA4 event → closest ad-platform standard event. Events without a mapping are sent to
 * ad platforms as custom events only on Meta (trackCustom); Snap/TikTok skip them.
 */
export const AD_EVENT_MAP: Record<string, { meta?: string; snap?: string; tiktok?: string }> = {
  generate_lead: { meta: 'Lead', snap: 'SIGN_UP', tiktok: 'SubmitForm' },
  qualify_lead: { meta: 'CompleteRegistration', snap: 'CUSTOM_EVENT_1', tiktok: 'CompleteRegistration' },
  booking_scheduled: { meta: 'Schedule', snap: 'RESERVE', tiktok: 'Schedule' },
  close_convert_lead: { meta: 'Purchase', snap: 'PURCHASE', tiktok: 'CompletePayment' },
  whatsapp_click: { meta: 'Contact', snap: 'CUSTOM_EVENT_2', tiktok: 'Contact' },
  scorecard_start: { meta: 'StartTrial', tiktok: 'ClickButton' },
  scorecard_complete: { meta: 'CustomizeProduct', snap: 'CUSTOM_EVENT_3', tiktok: 'ViewContent' },
  model_view: { meta: 'ViewContent', snap: 'VIEW_CONTENT', tiktok: 'ViewContent' },
  job_apply_submit: { meta: 'SubmitApplication', snap: 'CUSTOM_EVENT_4', tiktok: 'SubmitForm' },
  newsletter_signup: { meta: 'Subscribe', snap: 'SUBSCRIBE', tiktok: 'Subscribe' },
  playbook_download: { meta: 'Lead', snap: 'CUSTOM_EVENT_5', tiktok: 'Download' },
}

export function newEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** Params forwarded to ad pixels: drop anything that could identify a person. */
const PII_KEYS = /^(email|phone|name|first_name|last_name|message|answers)$/i
function adSafe(params: Params): Params {
  return Object.fromEntries(Object.entries(params).filter(([k, v]) => !PII_KEYS.test(k) && v !== undefined))
}

/**
 * Track an event. Returns the `event_id` so callers can pass it to a server action
 * (which forwards it to `sendServerEvent` for deduplication), or null on the server.
 */
export function trackEvent(name: AnalyticsEvent | (string & {}), params: Params = {}): string | null {
  if (typeof window === 'undefined') return null
  const eventId = (params.event_id as string) || newEventId()
  const locale = (typeof document !== 'undefined' && document.documentElement.lang) || 'ar'
  const payload: Params = { ...params, locale, event_id: eventId }

  try {
    if (hasConsent('analytics') && typeof window.gtag === 'function') {
      window.gtag('event', name, payload)
    }
  } catch {
    /* never break the page for analytics */
  }

  if (!hasConsent('marketing')) return eventId
  const map = AD_EVENT_MAP[name]
  const safe = adSafe(payload)

  try {
    if (typeof window.fbq === 'function') {
      if (map?.meta) window.fbq('track', map.meta, safe, { eventID: eventId })
      else window.fbq('trackCustom', name, safe, { eventID: eventId })
    }
  } catch {
    /* ignore */
  }
  try {
    if (map?.snap && typeof window.snaptr === 'function') {
      window.snaptr('track', map.snap, { ...safe, client_dedup_id: eventId })
    }
  } catch {
    /* ignore */
  }
  try {
    if (map?.tiktok && window.ttq && typeof window.ttq.track === 'function') {
      window.ttq.track(map.tiktok, safe, { event_id: eventId })
    }
  } catch {
    /* ignore */
  }
  return eventId
}
