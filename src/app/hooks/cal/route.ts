import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sendServerEvent } from '@/lib/analytics-server'
import { findLatestLeadByEmail, setLeadStatus } from '@/lib/leads'

// Cal.com webhook: BOOKING_CREATED → the matching lead (latest by attendee email) moves to `booked`
// and a `booking_scheduled` server event is sent when the lead accepted marketing.
// Signature: hex HMAC-SHA256 of the raw body with CAL_WEBHOOK_SECRET, in `X-Cal-Signature-256`.

export const dynamic = 'force-dynamic'

function verifyCalSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'))
  const given = Buffer.from(signature.trim().toLowerCase())
  return expected.length === given.length && timingSafeEqual(expected, given)
}

interface CalPayload {
  triggerEvent?: string
  payload?: {
    type?: string
    eventTypeId?: number
    title?: string
    startTime?: string
    attendees?: { email?: string; name?: string }[]
    responses?: { email?: { value?: string } | string }
  }
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
  const responseEmail = typeof p.responses?.email === 'string' ? p.responses.email : p.responses?.email?.value
  const email = (p.attendees?.[0]?.email || responseEmail || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ ok: true, matched: false })

  try {
    const lead = await findLatestLeadByEmail(email)
    if (!lead) {
      console.warn('[cal-webhook] booking without a matching lead')
      return NextResponse.json({ ok: true, matched: false })
    }
    await setLeadStatus(String(lead.id), 'booked')
    await sendServerEvent('booking_scheduled', {
      event_type: p.type || p.title || 'fit_call',
      email,
      phone: lead.phone ?? undefined,
      consentMarketing: Boolean(lead.consent?.marketing),
      locale: lead.locale ?? undefined,
      tier: lead.tier ?? undefined,
      score: lead.score ?? undefined,
    }).catch((err: Error) => console.error('[cal-webhook] server event failed:', err.message))
    return NextResponse.json({ ok: true, matched: true })
  } catch (err) {
    console.error('[cal-webhook] failed:', (err as Error).message)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
