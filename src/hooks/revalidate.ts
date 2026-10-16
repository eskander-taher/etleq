import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, GlobalAfterChangeHook } from 'payload'

import { notifyGoogleIndexing, pingIndexNow } from '@/lib/indexnow'
import { revalidateDoc, revalidateGlobal } from '@/lib/revalidate'

/**
 * After publish, unpublish or delete: revalidate both locales, then ping
 * IndexNow (and Google Indexing for jobs). Draft-only saves of a document that
 * was never published change nothing public and are ignored.
 * Disabled with `context.disableRevalidate` (seed script).
 */
export const revalidateAfterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, collection, context, req }) => {
  if (context?.disableRevalidate) return doc
  const isDraftSave = doc?._status === 'draft'
  const wasPublished = previousDoc?._status === 'published'
  // A draft save keeps the published version live; nothing public changed.
  if (isDraftSave && !wasPublished) return doc
  if (isDraftSave && wasPublished) {
    // Either a draft/autosave on top of a live document (nothing public changed)
    // or an unpublish. Only an unpublish changes the main document's status.
    try {
      const main = (await req.payload.findByID({
        collection: collection.slug,
        id: doc.id,
        draft: false,
        depth: 0,
        overrideAccess: true,
        req,
      })) as { _status?: string }
      if (main?._status === 'published') return doc
    } catch {
      // Treat as unpublished.
    }
  }

  const { liveUrls, removedUrls } = revalidateDoc(collection.slug, doc, previousDoc)
  void pingIndexNow([...liveUrls, ...removedUrls])
  if (collection.slug === 'jobs') {
    for (const url of liveUrls) void notifyGoogleIndexing(url, doc?.status === 'closed' ? 'URL_DELETED' : 'URL_UPDATED')
    for (const url of removedUrls) void notifyGoogleIndexing(url, 'URL_DELETED')
  }
  return doc
}

export const revalidateAfterDelete: CollectionAfterDeleteHook = async ({ doc, collection, context }) => {
  if (context?.disableRevalidate) return doc
  const { removedUrls } = revalidateDoc(collection.slug, null, doc)
  void pingIndexNow(removedUrls)
  if (collection.slug === 'jobs') for (const url of removedUrls) void notifyGoogleIndexing(url, 'URL_DELETED')
  return doc
}

export const revalidateGlobalAfterChange: GlobalAfterChangeHook = async ({ doc, global, context }) => {
  if (context?.disableRevalidate) return doc
  revalidateGlobal(global.slug)
  return doc
}

/** Collections without public detail pages (FAQs, testimonials…) only bust their tag and the pages that list them. */
export const revalidateTagOnly: CollectionAfterChangeHook = async ({ doc, collection, context }) => {
  if (context?.disableRevalidate) return doc
  revalidateDoc(collection.slug, null, null)
  return doc
}
