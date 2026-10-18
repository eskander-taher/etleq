/**
 * Retention: leads are kept `retention.leadsMonths` (default 24) after the
 * last contact, applications `retention.applicationsMonths` (default 12)
 * after the decision. A scheduled job anonymises records past `retainUntil`.
 */

export const DEFAULT_LEADS_MONTHS = 24
export const DEFAULT_APPLICATIONS_MONTHS = 12

/** `from` plus `months` calendar months, as an ISO string. Day overflow clamps to the month's last day. */
export function computeRetainUntil(from: Date, months: number): string {
  const d = new Date(from.getTime())
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d.toISOString()
}

export const DECISIONS = new Set(['hired', 'rejected'])

const ANON = 'anonymised'

/** Field values that replace personal data on an expired lead. */
export const anonymisedLead = () => ({
  name: ANON,
  phone: null,
  email: null,
  company: null,
  answers: null,
  notes: null,
  message: null,
  referrer: null,
  refCode: null,
  clickIds: null,
  firstTouch: null,
  lastTouch: null,
  landingPage: null,
  utm: { source: null, medium: null, campaign: null, content: null, term: null },
  anonymisedAt: new Date().toISOString(),
})

/** Field values that replace personal data on an expired application. */
export const anonymisedApplication = () => ({
  name: ANON,
  email: null,
  phone: null,
  cv: null,
  linkedin: null,
  portfolio: null,
  answers: null,
  notes: null,
  anonymisedAt: new Date().toISOString(),
})
