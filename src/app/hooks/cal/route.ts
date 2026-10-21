import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sendServerEvent } from '@/lib/analytics-server'
import { POLICY_VERSION } from '@/lib/consent'
import { createLead, findLatestLeadByEmail, findLeadById, setLeadStatus, type LeadInput, type StoredLead } from '@/lib/leads'
import { notifyNewLead } from '@/lib/notify'
import { getSiteSettings } from '@/components/sections/offer/data'

// Cal.com webhook: BOOKING_CREATED → the matching lead moves to `booked`. The lead is found by the
// `leadId` the embed put in the booking metadata, then by attendee email; a booking with no lead
// (e.g. straight from /book) creates one with source `booking` and alerts the founders.
// `booking_scheduled` goes to ad platforms only when the visitor's cookie-banner marketing consent
// was granted when they opened the calendar (metadata.adConsent), sharing the browser's event id.
// Signature: hex HMAC-SHA256 of the raw body with CAL_WEBHOOK_SECRET, in `X-Cal-Signature-256`.

export const dynamic = 'force-dynamic'

function verifyCalSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'))
  const given = Buffer.from(signature.trim().toLowerCase())
  return expected.length === given.length && timingSafeEqual(expected, given)
}

type ResponseValue = { value?: unknown } | string | undefined

interface CalPayload {
  triggerEvent?: string
  payload?: {
    type?: string
    eventTypeId?: number
    title?: string
    startTime?: string
    attendees?: { email?: string; name?: string; phoneNumber?: string; language?: { locale?: string } }[]
    responses?: { email?: ResponseValue; name?: ResponseValue; attendeePhoneNumber?: ResponseValue }
    metadata?: Record<string, unknown>
  }
}

const responseText = (v: ResponseValue) => {
  const raw = typeof v === 'string' ? v : v?.value
  return typeof raw === 'string' ? raw.trim() : ''
}
const metaText = (m: Record<string, unknown> | undefined, key: string, max = 64) => {
  const v = m?.[key]
  return typeof v === 'string' && v.length <= max ? v : ''
}

export async function POST(req: Request) {
  const secret = process.env.CAL_WEBHOOK_SECRET
  if (!secret) {
    console.error('[cal-webhook] CAL_WEBHOOK_SECRET is not set')
    return NextResponse.json({ ok: false }, { status: 503 })
  }

  const raw = await req.text()
  if (!verifyCalSignature(raw, req.headers.get('x-cal-signature-256'), secret)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let body: CalPayload
  try {
    body = JSON.parse(raw) as CalPayload
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  // Cal.com sends a ping on setup; acknowledge anything we don't handle.
  if (body.triggerEvent !== 'BOOKING_CREATED') return NextResponse.json({ ok: true, ignored: body.triggerEvent ?? null })

  const p = body.payload ?? {}
  const attendee = p.attendees?.[0]
  const email = (attendee?.email || responseText(p.responses?.email)).trim().toLowerCase()
  const name = (attendee?.name || responseText(p.responses?.name)).slice(0, 80)
  const phoneRaw = attendee?.phoneNumber || responseText(p.responses?.attendeePhoneNumber)
  const phone = /^\+[1-9]\d{6,14}$/.test(phoneRaw.replace(/[\s-]/g, '')) ? phoneRaw.replace(/[\s-]/g, '') : undefined
  const leadId = metaText(p.metadata, 'leadId')
  const adConsent = metaText(p.metadata, 'adConsent') === 'yes'
  const eventId = metaText(p.metadata, 'eventId') || undefined
  if (!email && !leadId) return NextResponse.json({ ok: true, matched: false })

  try {
    let lead: StoredLead | null = leadId ? await findLeadById(leadId) : null
    if (!lead && email) lead = await findLatestLeadByEmail(email)
    const created = !lead
    let locale: 'ar' | 'en' = lead?.locale === 'en' ? 'en' : attendee?.language?.locale?.startsWith('en') ? 'en' : 'ar'

    if (lead) {
      await setLeadStatus(String(lead.id), 'booked')
    } else {
      // Booked without a scorecard or form: still a lead the founders should see straight away.
      const site = await getSiteSettings(locale)
      const input: LeadInput = {
        source: 'booking',
        name: name || undefined,
        email: email || undefined,
        phone,
        locale,
        // No site consent was given here; the booking itself is the request to be contacted.
        consent: { given: false, at: new Date().toISOString(), policyVersion: site.policyVersion || POLICY_VERSION, marketing: false },
      }
      lead = await createLead({ ...input, retentionMonths: site.retention?.leadsMonths ?? 24 })
      await setLeadStatus(String(lead.id), 'booked')
      await notifyNewLead({ lead, input, responseTimePromise: site.responseTimePromise, whatsappNumber: site.whatsappNumber })
      locale = input.locale
    }

    await sendServerEvent('booking_scheduled', {
      eventId,
      event_type: p.type || p.title || 'fit_call',
      email: email || lead.email,
      phone: lead.phone ?? phone,
      consentMarketing: adConsent,
      locale,
      tier: lead.tier ?? undefined,
      score: lead.score ?? undefined,
    }).catch((err: Error) => console.error('[cal-webhook] server event failed:', err.message))
    return NextResponse.json({ ok: true, matched: !created, created })
  } catch (err) {
    console.error('[cal-webhook] failed:', (err as Error).message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
