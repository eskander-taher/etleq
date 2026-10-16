import { z } from 'zod'
import { messages, type ValidationLocale } from './messages'
import { DEFAULT_DIAL_CODE, checkE164, toE164 } from './phone'

export const SUBSCRIBE_SOURCES = ['newsletter', 'playbook'] as const
export type SubscribeSource = (typeof SUBSCRIBE_SOURCES)[number]

/** Honeypot field name. Real visitors never see or fill it. */
export const HONEYPOT_FIELD = 'website'

function fields(locale: ValidationLocale) {
  const m = messages[locale]
  const name = z
    .string({ error: m.nameRequired })
    .trim()
    .min(1, m.nameRequired)
    .min(2, m.nameTooShort)
    .max(80, m.nameTooLong)
  const email = z.string({ error: m.emailRequired }).trim().min(1, m.emailRequired).pipe(z.email(m.emailInvalid)).transform((v) => v.toLowerCase())
  const consent = z.literal(true, { error: m.consentRequired })
  const marketing = z.boolean().default(false)
  return { m, name, email, consent, marketing }
}

/** Adds an E.164 phone check across `phoneCountry` + `phone`. */
function phoneRefine(locale: ValidationLocale, optional = false) {
  const m = messages[locale]
  return (val: { phoneCountry?: string; phone?: string }, ctx: z.RefinementCtx) => {
    const raw = (val.phone ?? '').trim()
    if (!raw) {
      if (!optional) ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneRequired })
      return
    }
    const problem = checkE164(toE164(val.phoneCountry || DEFAULT_DIAL_CODE, raw))
    if (problem === 'saudi') ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneSaudi })
    else if (problem === 'uae') ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneUae })
    else if (problem) ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneInvalid })
  }
}

const phoneFields = {
  phoneCountry: z.string().regex(/^\d{1,4}$/).default(DEFAULT_DIAL_CODE),
  phone: z.string().max(32).default(''),
}

/** Contact step of the scorecard: name, WhatsApp number, email, consent. */
export function leadContactSchema(locale: ValidationLocale) {
  const f = fields(locale)
  return z
    .object({ name: f.name, ...phoneFields, email: f.email, consent: f.consent, marketing: f.marketing })
    .superRefine(phoneRefine(locale))
}

/** Contact page form. WhatsApp number required, email optional. */
export function contactSchema(locale: ValidationLocale) {
  const f = fields(locale)
  return z
    .object({
      name: f.name,
      ...phoneFields,
      email: z.union([z.literal(''), f.email]).default(''),
      company: z.string().trim().max(120).default(''),
      message: z.string({ error: f.m.messageRequired }).trim().min(1, f.m.messageRequired).min(10, f.m.messageTooShort).max(2000, f.m.messageTooLong),
      consent: f.consent,
      marketing: f.marketing,
    })
    .superRefine(phoneRefine(locale))
}

/** Newsletter and playbook email capture. */
export function subscribeSchema(locale: ValidationLocale) {
  const f = fields(locale)
  return z.object({ email: f.email, consent: f.consent, source: z.enum(SUBSCRIBE_SOURCES).default('newsletter') })
}

/** Scorecard answers: a flat map of question key → option value or free text. */
export function answersSchema(locale: ValidationLocale) {
  const m = messages[locale]
  return z.record(z.string().regex(/^[A-Za-z0-9_]{1,40}$/), z.string().trim().max(1000, m.textTooLong))
}

export type LeadContactInput = z.input<ReturnType<typeof leadContactSchema>>
export type LeadContact = z.output<ReturnType<typeof leadContactSchema>>
export type ContactInput = z.input<ReturnType<typeof contactSchema>>
export type ContactData = z.output<ReturnType<typeof contactSchema>>
export type SubscribeInput = z.input<ReturnType<typeof subscribeSchema>>
export type SubscribeData = z.output<ReturnType<typeof subscribeSchema>>

/** Flattens a Zod error into { field: message } (first message per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
