import { notFound } from 'next/navigation'
import { rssResponse } from '@/components/seo/rss-response'

// English feed at /en/rss.xml. The proxy matcher skips paths with a dot, so the request
// reaches this handler directly with locale = 'en'. Arabic lives at /rss.xml (no prefix),
// so any other locale value 404s.
export const revalidate = 900
export const dynamicParams = false

export function generateStaticParams() {
  return [{ locale: 'en' }]
}

export async function GET(_req: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  if (locale !== 'en') notFound()
  return rssResponse('en')
}
