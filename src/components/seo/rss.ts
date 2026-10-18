import { absoluteUrl } from '@/lib/seo'
import type { Loc } from './server-data'

export interface FeedItem {
  title: string
  /** Locale-less path, e.g. '/blog/x'. */
  path: string
  description?: string | null
  publishedAt?: string | null
  category?: string
}

// Control characters that are illegal in XML 1.0.
const ILLEGAL_XML = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]', 'g')

const xml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(ILLEGAL_XML, '')

/** Pure RSS 2.0 builder. */
export function buildRss(locale: Loc, items: FeedItem[], now = new Date()): string {
  const home = absoluteUrl(locale, '/')
  const self = absoluteUrl(locale, '/rss.xml')
  const title = locale === 'ar' ? 'اطلق — المدونة والأخبار' : 'Etleq — Blog and news'
  const description =
    locale === 'ar'
      ? 'مقالات وأخبار اطلق عن بناء وإطلاق منصات SaaS في الخليج.'
      : 'Etleq articles and news on building and launching SaaS in the Gulf.'
  const entries = items
    .map((it) => {
      const url = absoluteUrl(locale, it.path)
      const parts = [
        `      <title>${xml(it.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        it.description ? `      <description>${xml(it.description)}</description>` : '',
        it.publishedAt ? `      <pubDate>${new Date(it.publishedAt).toUTCString()}</pubDate>` : '',
        it.category ? `      <category>${xml(it.category)}</category>` : '',
      ].filter(Boolean)
      return `    <item>\n${parts.join('\n')}\n    </item>`
    })
    .join('\n')
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(title)}</title>`,
    `    <link>${home}</link>`,
    `    <description>${xml(description)}</description>`,
    `    <language>${locale}</language>`,
    `    <lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    `    <atom:link href="${self}" rel="self" type="application/rss+xml" />`,
    entries,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
