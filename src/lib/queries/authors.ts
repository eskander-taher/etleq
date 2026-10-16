import { cache } from 'react'
import { getPayloadClient } from '@/lib/payload'
import { publicWhere } from '@/lib/queries/common'
import type { Author } from '@/payload-types'

type Loc = 'ar' | 'en'


export const getAuthor = cache(async (slug: string, locale: Loc): Promise<Author | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'authors',
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

export async function authorSlugs(locale: Loc): Promise<string[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'authors',
      locale,
      fallbackLocale: false,
      draft: false,
      depth: 0,
      limit: 200,
      pagination: false,
      select: { slug: true },
      where: publicWhere(locale),
    })
    return res.docs.map((d) => d.slug).filter(Boolean) as string[]
  } catch {
    return []
  }
}
