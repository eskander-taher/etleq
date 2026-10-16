import type { CollectionSlug, DataFromCollectionSlug, DataFromGlobalSlug, GlobalSlug, PaginatedDocs, Sort, Where } from 'payload'

// Loaded lazily so `publicWhere` can be imported without booting Payload (tests, edge code).
const getPayloadClient = async () => (await import('@/lib/payload')).getPayloadClient()

/**
 * Shared public query helpers. Every public read goes through these so the
 * rules never drift:
 * - `locale` set, `fallbackLocale: false` (never show the other language)
 * - `draft: false`, `_status = published`
 * - `translated.<locale> = true`
 * - in production (`SITE_ENV=production`) sample documents are excluded too
 */

export type PublicLocale = 'ar' | 'en'

const isProductionSite = () => process.env.SITE_ENV === 'production'

/** Where clause for public documents in a locale, optionally AND-ed with `extra`. */
export function publicWhere(locale: PublicLocale, extra?: Where): Where {
  const and: Where[] = [{ _status: { equals: 'published' } }, { [`translated.${locale}`]: { equals: true } }]
  if (isProductionSite()) and.push({ isSample: { not_equals: true } })
  if (extra && Object.keys(extra).length) and.push(extra)
  return { and }
}

/** Read a global in one locale with no fallback. Returns null when the database is unreachable. */
export async function getGlobal<S extends GlobalSlug>(slug: S, locale: PublicLocale, depth = 1): Promise<DataFromGlobalSlug<S> | null> {
  try {
    const payload = await getPayloadClient()
    return (await payload.findGlobal({ slug, locale, fallbackLocale: false, depth, draft: false })) as DataFromGlobalSlug<S>
  } catch (error) {
    console.error(`[cms] getGlobal(${slug}, ${locale}) failed:`, (error as Error).message)
    return null
  }
}

export type FindPublicOptions = {
  where?: Where
  limit?: number
  page?: number
  sort?: Sort
  depth?: number
  pagination?: boolean
  select?: Record<string, unknown>
}

/** Find public documents of a collection in a locale. */
export async function findPublic<C extends CollectionSlug>(
  collection: C,
  locale: PublicLocale,
  opts: FindPublicOptions = {},
): Promise<PaginatedDocs<DataFromCollectionSlug<C>>> {
  const payload = await getPayloadClient()
  // The generic collection union is too large for TS to check inline; the result is typed below.
  const find = payload.find.bind(payload) as unknown as (args: Record<string, unknown>) => Promise<unknown>
  return (await find({
    collection,
    locale,
    fallbackLocale: false,
    draft: false,
    // The where clause already enforces the public rules. (With overrideAccess: false,
    // Payload rejects a user `where` on `translated.ar`/`translated.en` because it reads
    // the trailing locale code as a locale-specific path.)
    overrideAccess: true,
    where: publicWhere(locale, opts.where),
    limit: opts.limit ?? 50,
    page: opts.page,
    sort: opts.sort,
    depth: opts.depth ?? 1,
    pagination: opts.pagination,
    ...(opts.select ? { select: opts.select } : {}),
  })) as PaginatedDocs<DataFromCollectionSlug<C>>
}

/** One public document by slug, or null when missing, unpublished, untranslated or (in production) a sample. */
export async function findBySlug<C extends CollectionSlug>(
  collection: C,
  slug: string,
  locale: PublicLocale,
  opts: { depth?: number } = {},
): Promise<DataFromCollectionSlug<C> | null> {
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null
  const result = await findPublic(collection, locale, { where: { slug: { equals: slug } }, limit: 1, depth: opts.depth ?? 2, pagination: false })
  return result.docs[0] ?? null
}
