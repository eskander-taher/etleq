import { cache } from 'react'
import { getPayloadClient } from '@/lib/payload'
import { publicWhere } from '@/lib/queries/common'
import type { Solution } from '@/payload-types'

type Loc = 'ar' | 'en'

export async function listSolutions(locale: Loc) {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'solutions',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 0,
    limit: 50,
    pagination: false,
    sort: 'title',
    where: publicWhere(locale),
  })
}

export const getSolution = cache(async (slug: string, locale: Loc): Promise<Solution | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'solutions',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 2,
    limit: 1,
    pagination: false,
    where: publicWhere(locale, { slug: { equals: slug } }),
  })
  return res.docs[0] ?? null
})

export async function solutionSlugs(locale: Loc): Promise<string[]> {
  try {
    const res = await listSolutions(locale)
    return res.docs.map((d) => d.slug).filter(Boolean) as string[]
  } catch {
    return []
  }
}
