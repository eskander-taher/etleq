import { describe, expect, it } from 'vitest'
import {
  answersSchema,
  contactSchema,
  dialCodeForCountryAnswer,
  fieldErrors,
  flagEmoji,
  leadContactSchema,
  messages,
  mobileExample,
  subscribeSchema,
  toE164,
  checkE164,
  westernDigits,
} from '@/lib/validation'

const good = { name: 'سارة', phoneCountry: '966', phone: '0551234567', email: 'Sara@Example.com', consent: true }

describe('phone helpers', () => {
  it('builds E.164 from national numbers', () => {
    expect(toE164('966', '0551234567')).toBe('+966551234567')
    expect(toE164('966', '55 123 4567')).toBe('+966551234567')
    expect(toE164('971', '050-123-4567')).toBe('+971501234567')
  })
  it('accepts numbers already in international form', () => {
    expect(toE164('966', '+971 50 123 4567')).toBe('+971501234567')
    expect(toE164('966', '00971501234567')).toBe('+971501234567')
    expect(toE164('966', '966551234567')).toBe('+966551234567')
  })
  it('converts Arabic-Indic digits', () => {
    expect(westernDigits('٠٥٥١٢٣٤٥٦٧')).toBe('0551234567')
    expect(toE164('966', '٠٥٥١٢٣٤٥٦٧')).toBe('+966551234567')
  })
  it('checks Saudi and UAE mobiles', () => {
    expect(checkE164('+966551234567')).toBeNull()
    expect(checkE164('+966112345678')).toBe('saudi')
    expect(checkE164('+97155123456')).toBe('uae')
    expect(checkE164('+12')).toBe('invalid')
    expect(checkE164('+201001234567')).toBeNull()
  })
})

describe('leadContactSchema', () => {
  it('accepts a valid contact and lowercases email; marketing defaults to false', () => {
    const r = leadContactSchema('ar').parse(good)
    expect(r.email).toBe('sara@example.com')
    expect(r.marketing).toBe(false)
  })
  it('defaults the country code to +966', () => {
    const r = leadContactSchema('en').parse({ ...good, phoneCountry: undefined })
    expect(r.phoneCountry).toBe('966')
  })
  it('rejects an invalid Saudi number with the Arabic message', () => {
    const r = leadContactSchema('ar').safeParse({ ...good, phone: '12345' })
    expect(r.success).toBe(false)
    expect(fieldErrors(r.error!).phone).toBe(messages.ar.phoneSaudi)
  })
  it('rejects an invalid number with the English message', () => {
    const r = leadContactSchema('en').safeParse({ ...good, phoneCountry: '20', phone: '12' })
    expect(fieldErrors(r.error!).phone).toBe(messages.en.phoneInvalid)
  })
  it('reports phone errors together with other field errors', () => {
    const r = leadContactSchema('ar').safeParse({ ...good, name: '', phone: '' })
    const e = fieldErrors(r.error!)
    expect(e.name).toBe(messages.ar.nameRequired)
    expect(e.phone).toBe(messages.ar.phoneRequiredResult)
  })
  it('requires consent and a valid email', () => {
    const r = leadContactSchema('en').safeParse({ ...good, consent: false, email: 'nope' })
    const e = fieldErrors(r.error!)
    expect(e.consent).toBe(messages.en.consentRequired)
    expect(e.email).toBe(messages.en.emailInvalid)
  })
})

describe('contactSchema', () => {
  it('allows an empty email', () => {
    const r = contactSchema('ar').safeParse({ ...good, email: '', message: 'أريد منصة حجوزات لعيادتي' })
    expect(r.success).toBe(true)
  })
  it('requires a meaningful message', () => {
    const r = contactSchema('ar').safeParse({ ...good, message: 'مرحبا' })
    expect(fieldErrors(r.error!).message).toBe(messages.ar.messageTooShort)
  })
})

describe('subscribeSchema', () => {
  it('accepts email + consent and defaults source', () => {
    expect(subscribeSchema('en').parse({ email: 'a@b.co', consent: true }).source).toBe('newsletter')
  })
  it('rejects unknown sources and missing consent', () => {
    expect(subscribeSchema('en').safeParse({ email: 'a@b.co', consent: true, source: 'x' }).success).toBe(false)
    expect(fieldErrors(subscribeSchema('ar').safeParse({ email: 'a@b.co' }).error!).consent).toBe(messages.ar.consentRequired)
  })
})

describe('phone picker helpers', () => {
  it('derives the example number from the dial code', () => {
    expect(mobileExample('966')).toBe('5X XXX XXXX')
    expect(mobileExample('965')).toBe('XXXX XXXX')
    expect(mobileExample(undefined)).toBe('5X XXX XXXX')
    expect(mobileExample('999')).toBe('XXX XXX XXXX')
  })
  it('pre-selects a dial code only for an unambiguous country answer', () => {
    expect(dialCodeForCountryAnswer('ksa_uae')).toBeNull()
    expect(dialCodeForCountryAnswer('gcc')).toBeNull()
    expect(dialCodeForCountryAnswer('other')).toBeNull()
    expect(dialCodeForCountryAnswer('ksa')).toBe('966')
    expect(dialCodeForCountryAnswer('ae')).toBe('971')
  })
  it('builds flag emoji from ISO codes', () => {
    expect(flagEmoji('SA')).toBe('\u{1F1F8}\u{1F1E6}')
  })
})

describe('phone required wording', () => {
  it('ties the scorecard message to the result and keeps the contact form neutral', () => {
    expect(fieldErrors(leadContactSchema('en').safeParse({ ...good, phone: '' }).error!).phone).toBe(messages.en.phoneRequiredResult)
    const r = contactSchema('en').safeParse({ ...good, phone: '', message: 'I want a booking platform' })
    expect(fieldErrors(r.error!).phone).toBe(messages.en.phoneRequired)
  })
  it('defaults ad consent to false', () => {
    expect(leadContactSchema('ar').parse(good).adConsent).toBe(false)
    expect(leadContactSchema('ar').parse({ ...good, adConsent: true }).adConsent).toBe(true)
  })
})

describe('messages', () => {
  it('has the same keys in both languages and no empty strings', () => {
    expect(Object.keys(messages.ar).sort()).toEqual(Object.keys(messages.en).sort())
    for (const l of ['ar', 'en'] as const) for (const v of Object.values(messages[l])) expect(v.length).toBeGreaterThan(5)
  })
})

describe('answersSchema', () => {
  it('accepts the new decision-maker answer and keeps legacy free text readable', () => {
    const r = answersSchema('en').safeParse({ decisionMaker: 'partner', budget: '5to10k', success: '50 paying customers' })
    expect(r.success).toBe(true)
  })

  it('rejects malformed keys and over-long text with a localized message', () => {
    expect(answersSchema('en').safeParse({ 'bad key!': 'x' }).success).toBe(false)
    const r = answersSchema('ar').safeParse({ note: 'x'.repeat(1001) })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].message).toBe(messages.ar.textTooLong)
  })
})
