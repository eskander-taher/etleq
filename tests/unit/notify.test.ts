import { describe, expect, it, vi } from 'vitest'

// notify.ts only touches the CMS to send email; these tests cover the pure content builders.
vi.mock('@/lib/cms', () => ({ getCms: async () => ({ sendEmail: async () => undefined }) }))

const { autoReplyContent, founderFirstMessage, founderWhatsappLink, summaryLines, resultUrl } = await import('@/lib/notify')
const { redactEmail } = await import('@/cms/email')

import type { LeadInput } from '@/lib/leads'

const consent = { given: true, at: '2026-10-22T00:00:00Z', policyVersion: 'x', marketing: false }
const scorecardLead = (over: Partial<LeadInput> = {}): LeadInput => ({
  source: 'scorecard',
  name: 'سارة العتيبي',
  phone: '+966551234567',
  email: 'sara@example.com',
  locale: 'ar',
  tier: 'almost',
  score: 52,
  answers: { budget: '5to10k', timeline: '1to3', decisionMaker: 'yes', marketer: 'me', country: 'ksa_uae' },
  consent,
  ...over,
})
const lead = { id: 'abc123def456' }

describe('auto-reply', () => {
  it('links every scorecard reply to the signed result page, not /book', () => {
    for (const tier of ['ready', 'almost', 'explore'] as const) {
      const { links } = autoReplyContent({ lead, input: scorecardLead({ tier }), resultToken: 'tok.sig' })
      expect(links[0]).toBe(resultUrl('ar', 'tok.sig'))
      expect(links[0]).toContain('/scorecard/result?t=tok.sig')
      expect(links.some((l) => l.endsWith('/book'))).toBe(false)
    }
  })
  it('uses the English path for English leads', () => {
    expect(autoReplyContent({ lead, input: scorecardLead({ locale: 'en' }), resultToken: 't' }).links[0]).toContain('/en/scorecard/result?t=t')
  })
  it('does not imply a two-person company', () => {
    const en = autoReplyContent({ lead, input: { source: 'contact', name: 'Sam', locale: 'en', consent } })
    expect(en.paragraphs.join(' ')).toContain('A founder will read your message personally.')
    expect(en.paragraphs.join(' ')).not.toMatch(/two founders/)
    const ar = autoReplyContent({ lead, input: { source: 'contact', name: 'سام', locale: 'ar', consent } })
    expect(ar.paragraphs.join(' ')).not.toContain('المؤسّسَين')
  })
})

describe('founder alert', () => {
  it('writes the first WhatsApp message in the lead language, by tier', () => {
    expect(founderFirstMessage(scorecardLead())).toBe('أهلًا سارة، معك فريق اطلق. رأينا نتيجتك (52/100)، هل تودّ أن نراجع معًا ما ينقص للإطلاق؟')
    expect(founderFirstMessage(scorecardLead({ locale: 'en', name: 'Sam Lee', tier: 'ready', score: 81 }))).toMatch(/^Hi Sam, .*\(81\/100\)/)
  })
  it('builds a one-tap wa.me link to the lead, none without a phone', () => {
    const link = founderWhatsappLink(scorecardLead())!
    expect(link.startsWith('https://wa.me/966551234567?text=')).toBe(true)
    expect(decodeURIComponent(link.split('text=')[1])).toContain('أهلًا سارة')
    expect(founderWhatsappLink(scorecardLead({ phone: undefined }))).toBeUndefined()
  })
  it('includes the qualifying answers in plain English', () => {
    const rows = Object.fromEntries(summaryLines({ lead, input: scorecardLead() }))
    expect(rows['Budget (60 days)']).toBe('$5,000–10,000')
    expect(rows['Decision-maker']).toBe('Yes')
    expect(rows['Marketing by']).toBe('Me or my team')
    expect(rows['Country']).toBe('Saudi Arabia or the UAE')
    expect(rows['Launch']).toBe('In 1–3 months')
    expect(rows['WhatsApp them']).toMatch(/^https:\/\/wa\.me\//)
  })
})

describe('email logging', () => {
  it('redacts recipient addresses', () => {
    expect(redactEmail('sara@example.com')).toBe('s***@example.com')
  })
})

describe('auto-reply button', () => {
  const lead = { id: 'lead1' }
  const consent = { given: true, at: '', policyVersion: '', marketing: false }

  it('sends ready scorecard leads to their result page to book', () => {
    const { cta } = autoReplyContent({ lead, input: { source: 'scorecard', tier: 'ready', score: 80, locale: 'ar', consent }, resultToken: 'tok' })
    expect(cta.label).toBe('اعرض نتيجتك واحجز مكالمتك')
    expect(cta.url).toContain('/scorecard/result?t=tok')
  })

  it('falls back to WhatsApp, then the models page, for other leads', () => {
    expect(autoReplyContent({ lead, input: { source: 'contact', locale: 'en', consent }, whatsappNumber: '+966 55 123 4567' }).cta.url).toBe('https://wa.me/966551234567')
    expect(autoReplyContent({ lead, input: { source: 'contact', locale: 'en', consent } }).cta.url).toMatch(/\/en\/models$/)
  })
})
