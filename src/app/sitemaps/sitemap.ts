import type { MetadataRoute } from 'next'
import { findPublished } from '@/components/seo/server-data'
import {
  SECTION_COLLECTION,
  SITEMAP_SECTIONS,
  buildSitemapEntries,
  type SitemapDoc,
  type SitemapSection,
} from '@/components/seo/sitemap-entries'

// Served at /sitemaps/sitemap/<section>.xml; /sitemap.xml is the index (src/app/sitemap.xml/route.ts).
export const revalidate = 3600

export async function generateSitemaps() {
  return SITEMAP_SECTIONS.map((id) => ({ id }))
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = (await props.id) as SitemapSection
  if (!SITEMAP_SECTIONS.includes(id)) return []
  if (id === 'static') return buildSitemapEntries([], 'static')
  const docs = (await findPublished(SECTION_COLLECTION[id], {
    ...(id === 'jobs' ? { where: { status: { equals: 'open' } } } : {}),
  })) as SitemapDoc[]
  return buildSitemapEntries(docs, id, { includeSamples: process.env.SITE_ENV !== 'production' })
}
