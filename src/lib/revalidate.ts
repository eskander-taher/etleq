import { revalidatePath, revalidateTag } from 'next/cache'

import { basePath, localizedPath, PUBLIC_LOCALES, sectionIndexPath, siteUrl } from '@/hooks/paths'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- documents of any collection
type Doc = Record<string, any> | null | undefined

/**
 * Revalidate the public pages that show a document, in both locales.
 *
 * Covers the document path (current and previous, if the slug changed), the
 * section index, the home page, sitemap/feeds, and the collection tag.
 * Returns the absolute URLs that are publicly visible after the change, for
 * search engine pings. Safe to call outside Next.js (scripts): revalidation
 * errors are swallowed.
 */
export function revalidateDoc(collection: string, doc: Doc, prevDoc?: Doc): { paths: string[]; liveUrls: string[]; removedUrls: string[] } {
  const paths = new Set<string>()
  const liveUrls: string[] = []
  const removedUrls: string[] = []
  const site = siteUrl()

  for (const locale of PUBLIC_LOCALES) {
    const current = basePath(collection, doc)
    const previous = basePath(collection, prevDoc)
    const isLive = doc?._status !== 'draft' && doc?.translated?.[locale] === true
    const wasLive = prevDoc?._status === 'published' && prevDoc?.translated?.[locale] === true

    if (current) {
      const p = localizedPath(current, locale)
      paths.add(p)
      if (isLive) liveUrls.push(`${site}${p}`)
      else if (wasLive) removedUrls.push(`${site}${p}`)
    }
    if (previous && previous !== current) {
      const p = localizedPath(previous, locale)
      paths.add(p)
      if (wasLive) removedUrls.push(`${site}${p}`)
    }
    const index = sectionIndexPath(collection, doc)
    if (index) paths.add(localizedPath(index, locale))
    const prevIndex = sectionIndexPath(collection, prevDoc)
    if (prevIndex) paths.add(localizedPath(prevIndex, locale))
    paths.add(localizedPath('/', locale))
  }
  paths.add('/sitemap.xml')
  paths.add('/rss.xml')
  paths.add('/en/rss.xml')
  paths.add('/llms.txt')

  for (const path of paths) safe(() => revalidatePath(path))
  safe(() => revalidateTag(collection, 'max'))
  if (doc?.slug) safe(() => revalidateTag(`${collection}:${doc.slug}`, 'max'))

  return { paths: [...paths], liveUrls, removedUrls }
}

/** Globals appear in the layout of every page: revalidate the whole tree and the global's tag. */
export function revalidateGlobal(slug: string): void {
  safe(() => revalidateTag(`global:${slug}`, 'max'))
  safe(() => revalidatePath('/', 'layout'))
}

function safe(fn: () => void) {
  try {
    fn()
  } catch {
    // Outside a Next.js request (seed script, jobs runner) there is nothing to revalidate.
  }
}
