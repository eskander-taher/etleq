import { cache } from 'react'
import type { Where } from '@/cms/types'
import { getCms } from '@/lib/cms'
import { publicWhere } from '@/lib/queries/common'
import type { Project } from '@/cms/content-types'

type Loc = 'ar' | 'en'

// Belt and braces: the CMS blocks publishing without consent, and public queries also require it.
const consented: Where = { consentGiven: { equals: true } }

export async function listProjects(locale: Loc, { page = 1, limit = 12 }: { page?: number; limit?: number } = {}) {
  const cms = await getCms()
  return cms.find({
    collection: 'projects',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 1,
    page,
    limit,
    sort: '-publishedAt',
    where: publicWhere(locale, consented),
  })
}

export const getProject = cache(async (slug: string, locale: Loc): Promise<Project | null> => {
  const cms = await getCms()
  const res = await cms.find({
    collection: 'projects',
    locale,
    fallbackLocale: false,
    draft: false,
    depth: 2,
    limit: 1,
    pagination: false,
    where: publicWhere(locale, { and: [{ slug: { equals: slug } }, consented] }),
  })
  return res.docs[0] ?? null
})

export async function projectSlugs(locale: Loc): Promise<string[]> {
  try {
    const cms = await getCms()
    const res = await cms.find({
      collection: 'projects',
      locale,
      fallbackLocale: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      select: { slug: true },
      where: publicWhere(locale, consented),
    })
    return res.docs.map((d) => d.slug).filter(Boolean) as string[]
  } catch {
    return []
  }
}
