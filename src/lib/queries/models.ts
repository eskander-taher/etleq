import { cache } from 'react'
import type { Where } from '@/cms/types'
import { getCms } from '@/lib/cms'
import { publicWhere } from '@/lib/queries/common'
import type { Model } from '@/cms/content-types'

type Loc = 'ar' | 'en'

export const MODEL_CATEGORIES = [
  'booking',
  'membership',
  'marketplace',
  'directory',
  'b2b',
  'vertical',
  'creator',
  'other',
] as const
export type ModelCategory = (typeof MODEL_CATEGORIES)[number]
export const isModelCategory = (v: string | undefined): v is ModelCategory =>
  !!v && (MODEL_CATEGORIES as readonly string[]).includes(v)

export const MODELS_PER_PAGE = 12

export async function listModels(
  locale: Loc,
  { category, page = 1, limit = MODELS_PER_PAGE }: { category?: ModelCategory; page?: number; limit?: number } = {},
) {
  const cms = await getCms()
  const extra: Where | undefined = category ? { category: { equals: category } } : undefined
  return cms.find({
    collection: 'models',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 1,
    page,
    limit,
    sort: '-createdAt',
    where: publicWhere(locale, extra),
  })
}

/** Full model for the detail page: relations populated (faqs, related models/solution/posts, reviewer, authors, media). */
export const getModel = cache(async (slug: string, locale: Loc): Promise<Model | null> => {
  const cms = await getCms()
  const res = await cms.find({
    collection: 'models',
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

/** Slugs published in `locale`, for generateStaticParams. Never throws (the DB may be unreachable at build). */
export async function modelSlugs(locale: Loc): Promise<string[]> {
  try {
    const cms = await getCms()
    const res = await cms.find({
      collection: 'models',
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
