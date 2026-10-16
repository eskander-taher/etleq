import { cache } from 'react'
import { getPayloadClient } from '@/lib/payload'
import { publicWhere } from '@/lib/queries/common'
import type { News } from '@/payload-types'

type Loc = 'ar' | 'en'

export const NEWS_PER_PAGE = 12

export async function listNews(locale: Loc, { page = 1, limit = NEWS_PER_PAGE }: { page?: number; limit?: number } = {}) {
  const payload = await getPayloadClient()
  return payload.find({
    collection: 'news',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 1,
    page,
    limit,
    sort: '-publishedAt',
    where: publicWhere(locale),
  })
}

export const getNews = cache(async (slug: string, locale: Loc): Promise<News | null> => {
  const payload = await getPayloadClient()
  const res = await payload.find({
    collection: 'news',
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

export async function newsSlugs(locale: Loc): Promise<string[]> {
  try {
    const payload = await getPayloadClient()
    const res = await payload.find({
      collection: 'news',
      locale,
      fallbackLocale: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      select: { slug: true },
      where: publicWhere(locale),
    })
    return res.docs.map((d) => d.slug).filter(Boolean) as string[]
  } catch {
    return []
  }
}
