/**
 * Server-side conversion events: GA4 Measurement Protocol, Meta Conversions API,
 * Snap Conversions API and TikTok Events API. Server only (uses node:crypto and secrets).
 *
 * Each destination fires only when its env vars exist AND the lead consented:
 *   - GA4 needs `consentAnalytics` (or `consentMarketing`).
 *   - Meta / Snap / TikTok need `consentMarketing`.
 * Outside production (SITE_ENV !== 'production') nothing is sent; the payloads are logged.
 */
import { createHash, randomUUID } from 'node:crypto'
import { AD_EVENT_MAP } from './analytics'

export interface ServerEventParams {
  /** Shared with the browser event for deduplication. Generated if absent. */
  eventId?: string
  email?: string | null
  /** E.164, with or without '+'. */
  phone?: string | null
  value?: number | null
  currency?: string | null
  /** Marketing consent from the lead record. Required. */
  consentMarketing: boolean
  /** Analytics consent; GA4 also fires when marketing consent was given. */
  consentAnalytics?: boolean
  /** GA4 client id (from the `_ga` cookie, "GA1.1.<cid>"), if known. */
  gaClientId?: string | null
  /** Absolute URL where the conversion happened. */
  pageUrl?: string | null
  ip?: string | null
  userAgent?: string | null
  /** Click ids captured by attribution. */
  clickIds?: { gclid?: string; fbclid?: string; ttclid?: string; ScCid?: string } | null
  fbp?: string | null
  locale?: 'ar' | 'en' | string
  /** Event time (ms epoch). Default now. */
  timestamp?: number
  /** Any other GA4 event params (tier, score, source…). */
  [key: string]: unknown
}

export interface ServerEventResult {
  eventId: string
  sent: string[]
  skipped: string[]
  dryRun: boolean
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')
export const normaliseEmail = (e: string) => e.trim().toLowerCase()
export const normalisePhone = (p: string) => p.replace(/[^\d]/g, '').replace(/^00/, '')
export const hashEmail = (e?: string | null) => (e ? sha256(normaliseEmail(e)) : undefined)
export const hashPhone = (p?: string | null) => (p && normalisePhone(p) ? sha256(normalisePhone(p)) : undefined)

const RESERVED = new Set([
  'eventId',
  'email',
  'phone',
  'value',
  'currency',
  'consentMarketing',
  'consentAnalytics',
  'gaClientId',
  'pageUrl',
  'ip',
  'userAgent',
  'clickIds',
  'fbp',
  'timestamp',
])

function customParams(p: ServerEventParams): Record<string, unknown> {
  return Object.fromEntries(Object.entries(p).filter(([k, v]) => !RESERVED.has(k) && v !== undefined && v !== null))
}

type Request = { destination: string; url: string; init: RequestInit }

/** Build every outgoing request (pure apart from env reads) — exported for tests. */
export function buildServerRequests(
  name: string,
  p: ServerEventParams,
  eventId: string,
): { requests: Request[]; skipped: string[] } {
  const env = process.env
  const requests: Request[] = []
  const skipped: string[] = []
  const ts = p.timestamp ?? Date.now()
  const seconds = Math.floor(ts / 1000)
  const em = hashEmail(p.email)
  const ph = hashPhone(p.phone)
  const map = AD_EVENT_MAP[name]
  const value = typeof p.value === 'number' ? p.value : undefined
  const currency = p.currency || (value !== undefined ? 'USD' : undefined)
  const json = (body: unknown, headers: Record<string, string> = {}): RequestInit => ({
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })

  // GA4 Measurement Protocol
  const gaId = env.GA4_ID || env.NEXT_PUBLIC_GA4_ID
  if (gaId && env.GA4_API_SECRET && (p.consentAnalytics || p.consentMarketing)) {
    const clientId = p.gaClientId?.replace(/^GA\d\.\d\./, '') || `${Math.floor(Math.random() * 1e10)}.${seconds}`
    requests.push({
      destination: 'ga4',
      url: `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(gaId)}&api_secret=${encodeURIComponent(env.GA4_API_SECRET)}`,
      init: json({
        client_id: clientId,
        timestamp_micros: ts * 1000,
        consent: {
          ad_user_data: p.consentMarketing ? 'GRANTED' : 'DENIED',
          ad_personalization: p.consentMarketing ? 'GRANTED' : 'DENIED',
        },
        events: [
          {
            name,
            params: {
              ...customParams(p),
              event_id: eventId,
              ...(value !== undefined ? { value, currency } : {}),
              ...(p.pageUrl ? { page_location: p.pageUrl } : {}),
              ...(p.clickIds?.gclid ? { gclid: p.clickIds.gclid } : {}),
            },
          },
        ],
      }),
    })
  } else skipped.push('ga4')

  // Meta Conversions API
  if (env.META_PIXEL_ID && env.META_CAPI_TOKEN && p.consentMarketing) {
    const fbc = p.clickIds?.fbclid ? `fb.1.${ts}.${p.clickIds.fbclid}` : undefined
    requests.push({
      destination: 'meta',
      url: `https://graph.facebook.com/v21.0/${env.META_PIXEL_ID}/events?access_token=${encodeURIComponent(env.META_CAPI_TOKEN)}`,
      init: json({
        data: [
          {
            event_name: map?.meta || name,
            event_time: seconds,
            event_id: eventId,
            action_source: 'website',
            ...(p.pageUrl ? { event_source_url: p.pageUrl } : {}),
            user_data: {
              ...(em ? { em: [em] } : {}),
              ...(ph ? { ph: [ph] } : {}),
              ...(p.ip ? { client_ip_address: p.ip } : {}),
              ...(p.userAgent ? { client_user_agent: p.userAgent } : {}),
              ...(fbc ? { fbc } : {}),
              ...(p.fbp ? { fbp: p.fbp } : {}),
            },
            custom_data: { ...(value !== undefined ? { value, currency } : {}) },
          },
        ],
        ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
      }),
    })
  } else skipped.push('meta')

  // Snap Conversions API (v3)
  if (env.SNAP_PIXEL_ID && env.SNAP_CAPI_TOKEN && p.consentMarketing && map?.snap) {
    requests.push({
      destination: 'snap',
      url: `https://tr.snapchat.com/v3/${env.SNAP_PIXEL_ID}/events?access_token=${encodeURIComponent(env.SNAP_CAPI_TOKEN)}`,
      init: json({
        data: [
          {
            event_name: map.snap,
            event_time: seconds,
            event_id: eventId,
            action_source: 'WEBSITE',
            ...(p.pageUrl ? { event_source_url: p.pageUrl } : {}),
            user_data: {
              ...(em ? { em: [em] } : {}),
              ...(ph ? { ph: [ph] } : {}),
              ...(p.ip ? { client_ip_address: p.ip } : {}),
              ...(p.userAgent ? { client_user_agent: p.userAgent } : {}),
              ...(p.clickIds?.ScCid ? { sc_click_id: p.clickIds.ScCid } : {}),
            },
            custom_data: { ...(value !== undefined ? { value, currency } : {}) },
          },
        ],
      }),
    })
  } else skipped.push('snap')

  // TikTok Events API (v1.3)
  if (env.TIKTOK_PIXEL_ID && env.TIKTOK_EVENTS_TOKEN && p.consentMarketing && map?.tiktok) {
    requests.push({
      destination: 'tiktok',
      url: 'https://business-api.tiktok.com/open_api/v1.3/event/track/',
      init: json(
        {
          event_source: 'web',
          event_source_id: env.TIKTOK_PIXEL_ID,
          data: [
            {
              event: map.tiktok,
              event_time: seconds,
              event_id: eventId,
              user: {
                ...(em ? { email: em } : {}),
                ...(ph ? { phone: ph } : {}),
                ...(p.clickIds?.ttclid ? { ttclid: p.clickIds.ttclid } : {}),
                ...(p.ip ? { ip: p.ip } : {}),
                ...(p.userAgent ? { user_agent: p.userAgent } : {}),
              },
              ...(p.pageUrl ? { page: { url: p.pageUrl } } : {}),
              properties: { ...(value !== undefined ? { value, currency } : {}) },
            },
          ],
        },
        { 'Access-Token': env.TIKTOK_EVENTS_TOKEN },
      ),
    })
  } else skipped.push('tiktok')

  return { requests, skipped }
}

/**
 * Send a conversion event server-side. Never throws; failures are logged.
 * Usage: `await sendServerEvent('generate_lead', { eventId, email, phone, consentMarketing: lead.consent.marketing, tier })`
 */
export async function sendServerEvent(name: string, params: ServerEventParams): Promise<ServerEventResult> {
  const eventId = params.eventId || randomUUID()
  const { requests, skipped } = buildServerRequests(name, params, eventId)
  const dryRun = process.env.SITE_ENV !== 'production'

  if (dryRun) {
    if (requests.length) {
      console.info(`[analytics-server] dry run "${name}" (${eventId}) →`, requests.map((r) => r.destination).join(', '))
    }
    return { eventId, sent: [], skipped: [...skipped, ...requests.map((r) => r.destination)], dryRun }
  }

  const results = await Promise.allSettled(
    requests.map(async (r) => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 5000)
      try {
        const res = await fetch(r.url, { ...r.init, signal: ctrl.signal })
        if (!res.ok) throw new Error(`${r.destination} ${res.status}`)
        return r.destination
      } finally {
        clearTimeout(timer)
      }
    }),
  )
  const sent: string[] = []
  results.forEach((res, i) => {
    if (res.status === 'fulfilled') sent.push(res.value)
    else {
      skipped.push(requests[i].destination)
      console.error(`[analytics-server] ${requests[i].destination} failed for "${name}":`, res.reason)
    }
  })
  return { eventId, sent, skipped, dryRun }
}
