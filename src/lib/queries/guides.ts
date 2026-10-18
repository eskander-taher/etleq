import { cache } from 'react'
import { getCms } from '@/lib/cms'
import { publicWhere } from '@/lib/queries/common'
import type { Guide } from '@/cms/content-types'

type Loc = 'ar' | 'en'
export type GuideType = 'cost' | 'comparison'

export async function listGuides(locale: Loc, type: GuideType) {
  const cms = await getCms()
  return cms.find({
    collection: 'guides',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 0,
    limit: 100,
    pagination: false,
    sort: '-publishedAt',
    where: publicWhere(locale, { type: { equals: type } }),
  })
}

/** A guide is only found under its own type's URL (/cost or /compare); the other path 404s. */
export const getGuide = cache(async (slug: string, type: GuideType, locale: Loc): Promise<Guide | null> => {
  const cms = await getCms()
  const res = await cms.find({
    collection: 'guides',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 2,
    limit: 1,
    pagination: false,
    where: publicWhere(locale, { and: [{ slug: { equals: slug } }, { type: { equals: type } }] }),
  })
  return res.docs[0] ?? null
})

export async function guideSlugs(locale: Loc, type: GuideType): Promise<string[]> {
  try {
    const res = await listGuides(locale, type)
    return res.docs.map((d) => d.slug).filter(Boolean) as string[]
  } catch {
    return []
  }
}
