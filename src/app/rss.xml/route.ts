import { rssResponse } from '@/components/seo/rss-response'

// Arabic feed at /rss.xml. The English feed is src/app/(frontend)/[locale]/rss.xml/route.ts.
export const revalidate = 900

export function GET() {
  return rssResponse('ar')
}
