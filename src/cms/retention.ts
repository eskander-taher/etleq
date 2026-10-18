import { anonymisedApplication, anonymisedLead } from '@/hooks/retention'

import { cms } from './local'
import type { Where } from './types'

/** Anonymise leads and applications whose `retainUntil` has passed, and delete expired CVs. */
export async function runRetention(): Promise<{ leads: number; applications: number }> {
  const expired: Where = {
    and: [{ retainUntil: { less_than: new Date().toISOString() } }, { anonymisedAt: { exists: false } }],
  }
  const context = { retentionJob: true }

  const leads = await cms.find({ collection: 'leads', where: expired, limit: 500, locale: 'all' })
  for (const lead of leads.docs) await cms.update({ collection: 'leads', id: lead.id, data: anonymisedLead(), context })

  const apps = await cms.find({ collection: 'applications', where: expired, limit: 500, locale: 'all' })
  for (const app of apps.docs) {
    const cv = (app as { cv?: string | null }).cv
    await cms.update({ collection: 'applications', id: app.id, data: anonymisedApplication(), context })
    if (cv) {
      try {
        await cms.delete({ collection: 'private-files', id: cv })
      } catch (error) {
        console.error(`[retention] could not delete CV ${cv}:`, (error as Error).message)
      }
    }
  }
  console.log(`[retention] anonymised ${leads.docs.length} leads and ${apps.docs.length} applications`)
  return { leads: leads.docs.length, applications: apps.docs.length }
}
