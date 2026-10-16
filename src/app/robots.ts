import type { MetadataRoute } from 'next'
import { buildRobotsPolicy } from '@/components/seo/robots-policy'
import { getSeoDefaults } from '@/components/seo/server-data'
import { SITEMAP_SECTIONS } from '@/components/seo/sitemap-entries'
import { siteUrl } from '@/lib/utils'

// Re-read the AI crawler toggles from SeoDefaults every 5 minutes (no deploy needed).
export const revalidate = 300

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoDefaults('ar')
  const base = siteUrl()
  return buildRobotsPolicy({
    siteUrl: base,
    aiCrawlers: seo?.aiCrawlers,
    staging: process.env.SITE_ENV === 'staging',
    sitemaps: [`${base}/sitemap.xml`, ...SITEMAP_SECTIONS.map((s) => `${base}/sitemaps/sitemap/${s}.xml`)],
  })
}
