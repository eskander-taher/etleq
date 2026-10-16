import { cache } from 'react'
import type { Where } from 'payload'
import { getPayloadClient } from '@/lib/payload'
import { publicWhere } from '@/lib/queries/common'
import type { Job } from '@/payload-types'

type Loc = 'ar' | 'en'

export const JOB_TEAMS = ['engineering', 'design', 'growth', 'operations'] as const
export const JOB_WORKPLACES = ['onsite', 'hybrid', 'remote'] as const
export type JobTeam = (typeof JOB_TEAMS)[number]
export type JobWorkplace = (typeof JOB_WORKPLACES)[number]
export const isJobTeam = (v?: string): v is JobTeam => !!v && (JOB_TEAMS as readonly string[]).includes(v)
export const isJobWorkplace = (v?: string): v is JobWorkplace => !!v && (JOB_WORKPLACES as readonly string[]).includes(v)

/** Open = status open and validThrough empty or not yet passed. */
const openWhere = (): Where => ({
  and: [
    { status: { equals: 'open' } },
    {
      or: [
        { validThrough: { exists: false } },
        { validThrough: { equals: null } },
        { validThrough: { greater_than_equal: new Date().toISOString() } },
      ],
    },
  ],
})

export async function listOpenJobs(locale: Loc, { team, workplace }: { team?: JobTeam; workplace?: JobWorkplace } = {}) {
  const payload = await getPayloadClient()
  const and: Where[] = [openWhere()]
  if (team) and.push({ team: { equals: team } })
  if (workplace) and.push({ workplace: { equals: workplace } })
  return payload.find({
    collection: 'jobs',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 0,
    limit: 200,
    pagination: false,
    sort: '-datePosted',
    where: publicWhere(locale, { and }),
  })
}

/** Any published, translated job (open or closed). The page decides what to render for closed roles. */
export const getJob = cache(async (slug: string, locale: Loc): Promise<Job | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'jobs',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 1,
    limit: 1,
    pagination: false,
    where: publicWhere(locale, { slug: { equals: slug } }),
  })
  return res.docs[0] ?? null
})

/** Only open jobs are pre-rendered; closed ones still render on demand as the "role closed" page. */
export async function jobSlugs(locale: Loc): Promise<string[]> {
  try {
    const res = await listOpenJobs(locale)
    return res.docs.map((d) => d.slug).filter(Boolean) as string[]
  } catch {
    return []
  }
}
