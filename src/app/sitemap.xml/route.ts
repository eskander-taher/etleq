import { SITEMAP_SECTIONS } from '@/components/seo/sitemap-entries'
import { siteUrl } from '@/lib/utils'

// Sitemap index. Next's generateSitemaps does not emit one, so it lives here.
export const revalidate = 3600

export function GET() {
  const base = siteUrl()
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${SITEMAP_SECTIONS.map((s) => `  <sitemap><loc>${base}/sitemaps/sitemap/${s}.xml</loc></sitemap>`).join('\n')}
</sitemapindex>
`
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
