'use server'

import { cookies, headers } from 'next/headers'
import { after } from 'next/server'
import { z } from 'zod'
import { sendServerEvent } from '@/lib/analytics-server'
import { CONSENT_COOKIE, parseConsent, POLICY_VERSION } from '@/lib/consent'
import { createLead, findLeadById, signResultToken, verifyResultToken, type LeadInput, type LeadSource, type StoredLead } from '@/lib/leads'
import { notifyNewLead, notifySubscribed } from '@/lib/notify'
import { clientIp, isHoneypotTripped, rateLimit } from '@/lib/rate-limit'
import { resolveScorecardSettings, scoreScorecard, type ScorecardTier } from '@/lib/scoring'
import { verifyTurnstile } from '@/lib/turnstile'
import {
  answersSchema,
  contactSchema,
  fieldErrors,
  HONEYPOT_FIELD,
  leadContactSchema,
  subscribeSchema,
  toE164,
  type ContactInput,
  type LeadContactInput,
  type SubscribeInput,
} from '@/lib/validation'
import { getScorecardSettings, getSiteSettings, type SiteSettingsData } from '@/components/sections/offer/data'
import { getCms } from '@/lib/cms'

type Locale = 'ar' | 'en'

export type ActionError = 'invalid' | 'rateLimited' | 'spam' | 'server'
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: ActionError; fieldErrors?: Record<string, string> }

/** Attribution captured in the browser (src/lib/attribution.ts). Sizes are capped; nothing here is trusted. */
const str = (max: number) => z.string().max(max).optional().catch(undefined)
const attributionSchema = z
  .object({
    utm: z.object({ source: str(200), medium: str(200), campaign: str(200), content: str(200), term: str(200) }).partial().optional().catch(undefined),
    clickIds: z.record(z.string().max(20), z.string().max(500)).optional().catch(undefined),
    referrer: str(500),
    landingPage: str(1000),
    firstTouch: z.unknown().optional(),
    lastTouch: z.unknown().optional(),
    refCode: str(64),
  })
  .partial()
  .catch({})

export type AttributionInput = z.input<typeof attributionSchema>

/** Conversion events that have a browser twin; each gets its own id so ad platforms count it once. */
export type DedupEvent = 'generate_lead' | 'qualify_lead' | 'disqualify_lead'
const eventIdsSchema = z
  .object({ generate_lead: str(64), qualify_lead: str(64), disqualify_lead: str(64) })
  .partial()
  .catch({})

interface Common {
  locale: Locale
  turnstileToken?: string | null
  /** Honeypot: must stay empty. */
  [HONEYPOT_FIELD]?: string
  attribution?: AttributionInput
  /** Shared with the browser event for deduplication (single-event forms). */
  eventId?: string
  /** Per-event ids shared with the browser events (scorecard). */
  eventIds?: Partial<Record<DedupEvent, string>>
}

const capJson = (v: unknown, max = 4000) => {
  try {
    const s = JSON.stringify(v ?? null)
    return s && s.length <= max ? JSON.parse(s) : null
  } catch {
    return null
  }
}

async function guard(
  input: Pick<Common, 'turnstileToken' | typeof HONEYPOT_FIELD>,
  bucket: string,
  limit: number,
  { turnstile = true } = {},
): Promise<{ ok: true; ip: string; ua: string; referer: string } | { ok: false; error: ActionError }> {
  const h = await headers()
  const ip = clientIp(h)
  if (isHoneypotTripped(input[HONEYPOT_FIELD])) {
    console.warn(`[forms] ${bucket}: honeypot tripped`)
    return { ok: false, error: 'spam' }
  }
  if (!rateLimit(`${bucket}:${ip}`, { limit, windowMs: 10 * 60_000 }).ok) return { ok: false, error: 'rateLimited' }
  if (turnstile && !(await verifyTurnstile(input.turnstileToken, ip))) return { ok: false, error: 'spam' }
  return { ok: true, ip, ua: h.get('user-agent') || '', referer: h.get('referer') || '' }
}

const asLocale = (l: unknown): Locale => (l === 'en' ? 'en' : 'ar')

function attributionFields(raw: AttributionInput | undefined) {
  const a = attributionSchema.parse(raw ?? {})
  const utm = Object.fromEntries(Object.entries(a.utm ?? {}).filter(([, v]) => v)) as LeadInput['utm']
  return {
    utm,
    clickIds: (a.clickIds ?? {}) as Record<string, string>,
    referrer: a.referrer || undefined,
    landingPage: a.landingPage || undefined,
    firstTouch: capJson(a.firstTouch),
    lastTouch: capJson(a.lastTouch),
    refCode: a.refCode || undefined,
  }
}

/** `marketing` is the email opt-in checkbox ("send me new models and tips"), nothing more. */
function consentRecord(settings: SiteSettingsData, marketing: boolean) {
  return { given: true, at: new Date().toISOString(), policyVersion: settings.policyVersion || POLICY_VERSION, marketing }
}

/**
 * Server-side ad events need the visitor's cookie-banner marketing consent (brief section 13), not the
 * email opt-in. The browser reports it at submit time and the consent cookie on this request must agree.
 */
async function adConsentGranted(claimed: unknown): Promise<boolean> {
  if (claimed !== true) return false
  try {
    return parseConsent((await cookies()).get(CONSENT_COOKIE)?.value)?.categories.marketing === true
  } catch {
    return false
  }
}

async function saveAndNotify(input: LeadInput, settings: SiteSettingsData, resultTokenFor?: (lead: StoredLead) => string) {
  const lead = await createLead({ ...input, retentionMonths: settings.retention?.leadsMonths ?? 24 })
  const resultToken = resultTokenFor?.(lead)
  // Alerts run after the response so they never slow down or fail the visitor's request.
  after(() => notifyNewLead({ lead, input, responseTimePromise: settings.responseTimePromise, whatsappNumber: settings.whatsappNumber, resultToken }))
  return { lead, resultToken }
}

async function fireServerEvents(
  events: { name: string; params: Record<string, unknown>; eventId?: string }[],
  ctx: { email?: string; phone?: string; adConsent: boolean; ip: string; ua: string; referer: string; clickIds?: Record<string, string>; locale: Locale },
) {
  if (!ctx.adConsent) return
  await Promise.allSettled(
    events.map((e) =>
      sendServerEvent(e.name, {
        ...e.params,
        eventId: e.eventId,
        email: ctx.email,
        phone: ctx.phone,
        consentMarketing: true,
        ip: ctx.ip,
        userAgent: ctx.ua,
        pageUrl: ctx.referer || undefined,
        clickIds: ctx.clickIds,
        locale: ctx.locale,
      }),
    ),
  )
}

/* ------------------------------------------------------------------ */
/* Scorecard                                                           */
/* ------------------------------------------------------------------ */

export interface SubmitScorecardInput extends Common {
  answers: Record<string, string>
  contact: LeadContactInput
}

export async function submitScorecard(
  input: SubmitScorecardInput,
): Promise<ActionResult<{ leadId: string; tier: ScorecardTier; score: number; token: string; disqualifiers: string[] }>> {
  const locale = asLocale(input?.locale)
  const g = await guard(input, 'scorecard', 5)
  if (!g.ok) return g

  const contact = leadContactSchema(locale).safeParse(input.contact)
  const answersParsed = answersSchema(locale).safeParse(input.answers ?? {})
  if (!contact.success || !answersParsed.success) {
    return { ok: false, error: 'invalid', fieldErrors: { ...(contact.success ? {} : fieldErrors(contact.error)), ...(answersParsed.success ? {} : { answers: 'invalid' }) } }
  }

  const [rawSettings, site] = await Promise.all([getScorecardSettings(locale), getSiteSettings(locale)])
  const settings = resolveScorecardSettings(rawSettings)

  // Keep only known questions; every single-choice question must have a valid option.
  // A missing answer comes back keyed by the question so the browser can return to it.
  const answers: Record<string, string> = {}
  for (const q of settings.questions) {
    const v = answersParsed.data[q.key]
    if (q.type === 'single' || !q.type) {
      if (!v || !q.options?.some((o) => o.value === v)) return { ok: false, error: 'invalid', fieldErrors: { [q.key]: 'required' } }
      answers[q.key] = v
    } else if (v) {
      answers[q.key] = v.slice(0, q.type === 'model' ? 120 : 1000)
    }
  }

  const result = scoreScorecard(answers, rawSettings)
  const c = contact.data
  const phone = toE164(c.phoneCountry, c.phone)
  const attr = attributionFields(input.attribution)
  const modelSlug = answers.model && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(answers.model) ? answers.model : undefined
  const ids = eventIdsSchema.parse(input.eventIds ?? {})
  const adConsent = await adConsentGranted(c.adConsent)

  const leadInput: LeadInput = {
    source: 'scorecard',
    name: c.name,
    phone,
    email: c.email,
    country: answers.country,
    answers,
    score: result.score,
    tier: result.tier,
    disqualifiers: result.disqualifiers,
    modelSlug,
    locale,
    consent: consentRecord(site, c.marketing),
    ...attr,
  }

  try {
    const { lead, resultToken } = await saveAndNotify(leadInput, site, (l) => signResultToken({ leadId: String(l.id), tier: result.tier, score: result.score }))
    if (c.marketing) after(() => upsertSubscriber(c.email, locale, leadInput.consent))
    const events: { name: string; params: Record<string, unknown>; eventId?: string }[] = [
      { name: 'generate_lead', params: { source: 'scorecard', tier: result.tier, score: result.score }, eventId: ids.generate_lead },
    ]
    // Only a ready lead is qualified: a high score with a disqualifier is not (brief section 9 routing).
    if (result.tier === 'ready') events.push({ name: 'qualify_lead', params: { score: result.score, model_slug: modelSlug }, eventId: ids.qualify_lead })
    if (result.disqualifiers.length) events.push({ name: 'disqualify_lead', params: { reason: result.disqualifiers.join(',') }, eventId: ids.disqualify_lead })
    after(() => fireServerEvents(events, { email: c.email, phone, adConsent, ip: g.ip, ua: g.ua, referer: g.referer, clickIds: attr.clickIds, locale }))

    return { ok: true, leadId: String(lead.id), tier: result.tier, score: result.score, token: resultToken!, disqualifiers: result.disqualifiers }
  } catch (err) {
    console.error('[forms] scorecard lead save failed:', (err as Error).message)
    return { ok: false, error: 'server' }
  }
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

export interface SubmitContactInput extends Common {
  data: ContactInput
}

export async function submitContact(input: SubmitContactInput): Promise<ActionResult<{ leadId: string }>> {
  const locale = asLocale(input?.locale)
  const g = await guard(input, 'contact', 5)
  if (!g.ok) return g

  const parsed = contactSchema(locale).safeParse(input.data)
  if (!parsed.success) return { ok: false, error: 'invalid', fieldErrors: fieldErrors(parsed.error) }
  const d = parsed.data
  const site = await getSiteSettings(locale)
  const phone = toE164(d.phoneCountry, d.phone)
  const attr = attributionFields(input.attribution)
  const consent = consentRecord(site, d.marketing)
  const adConsent = await adConsentGranted(d.adConsent)

  try {
    const { lead } = await saveAndNotify(
      {
        source: 'contact',
        name: d.name,
        phone,
        email: d.email || undefined,
        company: d.company || undefined,
        message: d.message,
        locale,
        consent,
        ...attr,
      },
      site,
    )
    if (d.marketing && d.email) after(() => upsertSubscriber(d.email, locale, consent))
    after(() =>
      fireServerEvents([{ name: 'generate_lead', params: { source: 'contact' }, eventId: input.eventId }], {
        email: d.email || undefined,
        phone,
        adConsent,
        ip: g.ip,
        ua: g.ua,
        referer: g.referer,
        clickIds: attr.clickIds,
        locale,
      }),
    )
    return { ok: true, leadId: String(lead.id) }
  } catch (err) {
    console.error('[forms] contact lead save failed:', (err as Error).message)
    return { ok: false, error: 'server' }
  }
}

/* ------------------------------------------------------------------ */
/* Newsletter / playbook                                               */
/* ------------------------------------------------------------------ */

export interface SubmitSubscribeInput extends Common {
  data: SubscribeInput
}

export async function submitSubscribe(input: SubmitSubscribeInput): Promise<ActionResult<{ leadId: string }>> {
  const locale = asLocale(input?.locale)
  const g = await guard(input, 'subscribe', 5)
  if (!g.ok) return g

  const parsed = subscribeSchema(locale).safeParse(input.data)
  if (!parsed.success) return { ok: false, error: 'invalid', fieldErrors: fieldErrors(parsed.error) }
  const d = parsed.data
  const source: LeadSource = d.source
  const site = await getSiteSettings(locale)
  const consent = consentRecord(site, true)
  const attr = attributionFields(input.attribution)

  try {
    await upsertSubscriber(d.email, locale, consent)
    const { lead } = await saveAndNotify({ source, email: d.email, locale, consent, ...attr }, site)
    // No server-side ad events here: opting in to emails is not consent to ad measurement.
    // The browser fires newsletter_signup / playbook_download on the thank-you page under cookie consent.
    return { ok: true, leadId: String(lead.id) }
  } catch (err) {
    console.error('[forms] subscribe failed:', (err as Error).message)
    return { ok: false, error: 'server' }
  }
}

/**
 * One-tap sign-up from the scorecard result page. The signed result token identifies the lead, so the
 * visitor never retypes an email address; tapping the button (with its consent line) is the opt-in.
 */
export async function subscribeFromResult(input: { locale: Locale; token: string; source: 'newsletter' | 'playbook' }): Promise<ActionResult> {
  const locale = asLocale(input?.locale)
  const g = await guard({}, 'subscribe', 5, { turnstile: false })
  if (!g.ok) return g
  const result = verifyResultToken(input?.token)
  const source = input?.source === 'playbook' ? 'playbook' : 'newsletter'
  if (!result) return { ok: false, error: 'invalid' }

  try {
    const [lead, site] = await Promise.all([findLeadById(result.leadId), getSiteSettings(locale)])
    if (!lead?.email) return { ok: false, error: 'invalid' }
    const email = lead.email
    await upsertSubscriber(email, locale, consentRecord(site, true))
    after(() =>
      notifySubscribed({ email, name: lead.name, locale, source }).catch((err: Error) => console.error(`[notify] subscribe reply failed for lead ${lead.id}:`, err.message)),
    )
    return { ok: true }
  } catch (err) {
    console.error('[forms] one-tap subscribe failed:', (err as Error).message)
    return { ok: false, error: 'server' }
  }
}

async function upsertSubscriber(email: string, locale: Locale, consent: { given: boolean; at: string; policyVersion: string }) {
  try {
    const cms = await getCms()
    const existing = await cms.find({ collection: 'subscribers', where: { email: { equals: email } }, limit: 1, depth: 0, overrideAccess: true })
    const data = { email, locale, consent: { given: consent.given, at: consent.at, policyVersion: consent.policyVersion } }
    if (existing.docs[0]) {
      await cms.update({ collection: 'subscribers', id: existing.docs[0].id, data: data as never, overrideAccess: true })
    } else {
      await cms.create({ collection: 'subscribers', data: { ...data, status: 'pending' } as never, overrideAccess: true })
    }
  } catch (err) {
    // The lead record still captures the sign-up.
    console.error('[forms] subscriber upsert failed:', (err as Error).message)
  }
}
