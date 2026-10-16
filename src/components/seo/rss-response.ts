import { buildRss, type FeedItem } from './rss'
import { findPublished, type Loc } from './server-data'

/** Latest published posts + news in a locale (samples excluded in production). */
export async function rssResponse(locale: Loc): Promise<Response> {
  const includeSamples = process.env.SITE_ENV !== 'production'
  const opts = { locale, limit: 30, sort: '-publishedAt' }
  const [posts, news] = await Promise.all([findPublished('posts', opts), findPublished('news', opts)])
  const toItems = (docs: Record<string, unknown>[], base: string, category: string): FeedItem[] =>
    docs
      .filter((d) => typeof d.slug === 'string' && typeof d.title === 'string' && (includeSamples || !d.isSample))
      .map((d) => ({
        title: d.title as string,
        path: `${base}/${d.slug as string}`,
        description: (d.excerpt as string) || null,
        publishedAt: (d.publishedAt as string) || (d.updatedAt as string) || null,
        category,
      }))
  const items = [
    ...toItems(posts, '/blog', locale === 'ar' ? 'المدونة' : 'Blog'),
    ...toItems(news, '/news', locale === 'ar' ? 'الأخبار' : 'News'),
  ]
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, 40)
  return new Response(buildRss(locale, items), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900, stale-while-revalidate=3600',
    },
  })
}
