import { cache } from 'react'
import type { Where } from '@/cms/types'
import { getCms } from '@/lib/cms'
import { publicWhere } from '@/lib/queries/common'
import type { Category, Post } from '@/cms/content-types'

type Loc = 'ar' | 'en'

export const POSTS_PER_PAGE = 12

export async function listPosts(
  locale: Loc,
  {
    page = 1,
    limit = POSTS_PER_PAGE,
    q,
    categoryId,
    authorId,
  }: { page?: number; limit?: number; q?: string; categoryId?: string | number; authorId?: string | number } = {},
) {
  const cms = await getCms()
  const and: Where[] = []
  if (q) and.push({ title: { like: q.slice(0, 80) } })
  if (categoryId) and.push({ categories: { in: [categoryId] } })
  if (authorId) and.push({ authors: { in: [authorId] } })
  return cms.find({
    collection: 'posts',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 1,
    page,
    limit,
    sort: '-publishedAt',
    where: publicWhere(locale, and.length ? { and } : undefined),
  })
}

export const getPost = cache(async (slug: string, locale: Loc): Promise<Post | null> => {
  const cms = await getCms()
  const res = await cms.find({
    collection: 'posts',
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

/** Fallback related posts: the latest posts sharing a category, excluding the current one. */
export async function relatedPosts(post: Post, locale: Loc, limit = 3): Promise<Post[]> {
  const cms = await getCms()
  const categoryIds = (post.categories ?? []).map((c) => (typeof c === 'object' ? c.id : c))
  const and: Where[] = [{ id: { not_equals: post.id } }]
  if (categoryIds.length) and.push({ categories: { in: categoryIds } })
  const res = await cms.find({
    collection: 'posts',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 1,
    limit,
    sort: '-publishedAt',
    where: publicWhere(locale, { and }),
  })
  return res.docs
}

export async function postSlugs(locale: Loc): Promise<string[]> {
  try {
    const cms = await getCms()
    const res = await cms.find({
      collection: 'posts',
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

export async function listCategories(locale: Loc): Promise<Category[]> {
  const cms = await getCms()
  const res = await cms.find({
    collection: 'categories',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 0,
    limit: 100,
    pagination: false,
    sort: 'name',
    where: publicWhere(locale),
  })
  return res.docs
}

export const getCategory = cache(async (slug: string, locale: Loc): Promise<Category | null> => {
  const cms = await getCms()
  const res = await cms.find({
    collection: 'categories',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 0,
    limit: 1,
    pagination: false,
    where: publicWhere(locale, { slug: { equals: slug } }),
  })
  return res.docs[0] ?? null
})

export async function categorySlugs(locale: Loc): Promise<string[]> {
  try {
    return (await listCategories(locale)).map((c) => c.slug).filter(Boolean) as string[]
  } catch {
    return []
  }
}
