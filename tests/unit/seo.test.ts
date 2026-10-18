import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { absoluteUrl, applyTitleTemplate, buildMetadata, ogImageUrl } from '@/lib/seo'

const SITE = 'https://etleq.com'

describe('seo', () => {
  const env = { ...process.env }
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = SITE
    process.env.SITE_ENV = 'production'
  })
  afterEach(() => {
    process.env = { ...env }
  })

  it('absoluteUrl: Arabic at root, English under /en', () => {
    expect(absoluteUrl('ar', '/')).toBe(SITE)
    expect(absoluteUrl('en', '/')).toBe(`${SITE}/en`)
    expect(absoluteUrl('ar', '/models/x')).toBe(`${SITE}/models/x`)
    expect(absoluteUrl('en', '/models/x')).toBe(`${SITE}/en/models/x`)
  })

  it('applies the title template with locale fallbacks', () => {
    expect(applyTitleTemplate('تكلفة نظام حجز', 'ar')).toBe('تكلفة نظام حجز — اطلق')
    expect(applyTitleTemplate('Cost guide', 'en')).toBe('Cost guide — Etleq')
    expect(applyTitleTemplate('Cost guide', 'en', '%s | Etleq')).toBe('Cost guide | Etleq')
    expect(applyTitleTemplate('Cost guide', 'en', 'no placeholder')).toBe('Cost guide — Etleq')
  })

  it('self canonical per locale and hreflang only when both locales exist', () => {
    const both = buildMetadata({
      locale: 'en',
      path: '/models/x',
      title: 'X',
      description: 'd',
      alternates: { ar: true, en: true },
    })
    expect(both.alternates?.canonical).toBe(`${SITE}/en/models/x`)
    expect(both.alternates?.languages).toEqual({
      ar: `${SITE}/models/x`,
      en: `${SITE}/en/models/x`,
      'x-default': `${SITE}/models/x`,
    })

    const one = buildMetadata({ locale: 'ar', path: '/models/x', title: 'X', alternates: { ar: true } })
    expect(one.alternates?.canonical).toBe(`${SITE}/models/x`)
    expect(one.alternates?.languages).toBeUndefined()
    expect(one.robots).toBeUndefined()
  })

  it('open graph locale and default image', () => {
    const m = buildMetadata({ locale: 'ar', path: '/', title: 'اطلق', absoluteTitle: true })
    const og = m.openGraph as Record<string, unknown>
    expect(og.locale).toBe('ar_SA')
    const img = (og.images as Array<{ url: string }>)[0]
    expect(img.url).toBe(ogImageUrl('ar', 'اطلق'))
    expect(img.url.startsWith(`${SITE}/og.png?`)).toBe(true)
    expect(m.title).toEqual({ absolute: 'اطلق' })
  })

  it('noindex on request and always on staging', () => {
    const a = buildMetadata({ locale: 'en', path: '/thank-you/lead', title: 'Thanks', noindex: true })
    expect(a.robots).toMatchObject({ index: false })
    process.env.SITE_ENV = 'staging'
    const b = buildMetadata({ locale: 'en', path: '/', title: 'Home' })
    expect(b.robots).toMatchObject({ index: false, follow: false })
  })
})

describe('consent, attribution and server events (pure parts)', () => {
  it('parseConsent rejects other policy versions and malformed values', async () => {
    const { parseConsent, POLICY_VERSION } = await import('@/lib/consent')
    const ok = encodeURIComponent(
      JSON.stringify({ categories: { analytics: true, marketing: false }, at: 'x', policyVersion: POLICY_VERSION }),
    )
    expect(parseConsent(ok)?.categories).toEqual({ necessary: true, analytics: true, marketing: false })
    const old = encodeURIComponent(JSON.stringify({ categories: { analytics: true }, policyVersion: 'old' }))
    expect(parseConsent(old)).toBeNull()
    expect(parseConsent('%%%')).toBeNull()
    expect(parseConsent(undefined)).toBeNull()
  })

  it('touchFromUrl captures UTM, click ids, external referrer and ref code', async () => {
    const { touchFromUrl } = await import('@/lib/attribution')
    const r = touchFromUrl(
      'https://etleq.com/models/x?utm_source=ig&utm_campaign=reel1&fbclid=abc&ScCid=sc1&ref=wa7',
      'https://instagram.com/',
    )
    expect(r.touch.utm).toEqual({ source: 'ig', campaign: 'reel1' })
    expect(r.touch.clickIds).toEqual({ fbclid: 'abc', ScCid: 'sc1' })
    expect(r.touch.referrer).toBe('https://instagram.com/')
    expect(r.touch.landingPage).toBe('https://etleq.com/models/x?utm_source=ig&utm_campaign=reel1')
    expect(r.refCode).toBe('wa7')
    expect(touchFromUrl('https://etleq.com/a', 'https://etleq.com/b').meaningful).toBe(false)
  })

  it('server events respect env and consent, and hash PII', async () => {
    const { buildServerRequests, sha256 } = await import('@/lib/analytics-server')
    process.env.GA4_ID = 'G-TEST'
    process.env.GA4_API_SECRET = 'secret'
    process.env.META_PIXEL_ID = '123'
    process.env.META_CAPI_TOKEN = 'tok'
    delete process.env.SNAP_PIXEL_ID
    const none = buildServerRequests('generate_lead', { consentMarketing: false }, 'e1')
    expect(none.requests).toEqual([])
    const analyticsOnly = buildServerRequests(
      'generate_lead',
      { consentMarketing: false, consentAnalytics: true },
      'e1',
    )
    expect(analyticsOnly.requests.map((r) => r.destination)).toEqual(['ga4'])
    const all = buildServerRequests(
      'generate_lead',
      { consentMarketing: true, email: ' Sara@Example.com ', phone: '+966 50 123 4567', tier: 'ready' },
      'e2',
    )
    expect(all.requests.map((r) => r.destination)).toEqual(['ga4', 'meta'])
    const meta = JSON.parse(all.requests[1].init.body as string)
    expect(meta.data[0].event_name).toBe('Lead')
    expect(meta.data[0].event_id).toBe('e2')
    expect(meta.data[0].user_data.em).toEqual([sha256('sara@example.com')])
    expect(meta.data[0].user_data.ph).toEqual([sha256('966501234567')])
    const ga = JSON.parse(all.requests[0].init.body as string)
    expect(ga.events[0].params).toMatchObject({ tier: 'ready', event_id: 'e2' })
    expect(JSON.stringify(ga)).not.toContain('Sara')
  })
})
