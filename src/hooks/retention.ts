import type { CollectionBeforeChangeHook, PayloadRequest, TaskConfig, Where } from 'payload'

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

async function retentionMonths(req: PayloadRequest, key: 'leadsMonths' | 'applicationsMonths', fallback: number) {
  try {
    const settings = (await req.payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true, req })) as {
      retention?: Record<string, number | null | undefined>
    }
    const value = settings?.retention?.[key]
    return typeof value === 'number' && value > 0 ? value : fallback
  } catch {
    return fallback
  }
}

/** Leads: set on create, and refresh whenever the status changes (a new contact). */
export const leadRetention: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const statusChanged = operation === 'update' && data?.status && data.status !== originalDoc?.status
  if (operation === 'create' || statusChanged || !originalDoc?.retainUntil) {
    const months = await retentionMonths(req, 'leadsMonths', DEFAULT_LEADS_MONTHS)
    data.retainUntil = computeRetainUntil(new Date(), months)
  }
  return data
}

const DECISIONS = new Set(['hired', 'rejected'])

/** Applications: set on create, and restart the clock when a decision (hired/rejected) is recorded. */
export const applicationRetention: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  const decided = operation === 'update' && data?.status && DECISIONS.has(data.status) && data.status !== originalDoc?.status
  if (operation === 'create' || decided || !originalDoc?.retainUntil) {
    const months = await retentionMonths(req, 'applicationsMonths', DEFAULT_APPLICATIONS_MONTHS)
    data.retainUntil = computeRetainUntil(new Date(), months)
  }
  return data
}

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

/**
 * Scheduled task: anonymise leads and applications whose `retainUntil` has
 * passed, and delete the CV files of expired applications.
 */
export const anonymiseExpiredTask: TaskConfig<{ input: object; output: { leads: number; applications: number } }> = {
  slug: 'anonymiseExpired',
  label: 'Anonymise expired leads and applications',
  schedule: [{ cron: '0 30 2 * * *', queue: 'retention' }],
  retries: 2,
  outputSchema: [
    { name: 'leads', type: 'number', required: true },
    { name: 'applications', type: 'number', required: true },
  ],
  handler: async ({ req }) => {
    const now = new Date().toISOString()
    const expired: Where = { and: [{ retainUntil: { less_than: now } }, { anonymisedAt: { exists: false } }] }

    const leads = await req.payload.find({ collection: 'leads', where: expired, limit: 500, depth: 0, overrideAccess: true, req })
    for (const lead of leads.docs) {
      await req.payload.update({ collection: 'leads', id: lead.id, data: anonymisedLead() as never, overrideAccess: true, req, context: { retentionJob: true } })
    }

    const apps = await req.payload.find({ collection: 'applications', where: expired, limit: 500, depth: 0, overrideAccess: true, req })
    for (const app of apps.docs) {
      const cv = (app as { cv?: string | { id: string } | null }).cv
      const cvId = typeof cv === 'object' && cv ? cv.id : cv
      await req.payload.update({ collection: 'applications', id: app.id, data: anonymisedApplication() as never, overrideAccess: true, req, context: { retentionJob: true } })
      if (cvId) {
        try {
          await req.payload.delete({ collection: 'private-files', id: cvId, overrideAccess: true, req })
        } catch (error) {
          req.payload.logger.error({ err: error, msg: `Retention job could not delete CV ${cvId}` })
        }
      }
    }

    req.payload.logger.info(`Retention job anonymised ${leads.docs.length} leads and ${apps.docs.length} applications.`)
    return { output: { leads: leads.docs.length, applications: apps.docs.length } }
  },
}
