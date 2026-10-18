/**
 * Server-only data access for machine files (robots, sitemaps, RSS, llms.txt).
 * Talks to the CMS data layer directly with the public-query rules from docs/schema-contract.md
 * and degrades to empty results when the database is unreachable (e.g. at build time in CI).
 */
import { getCms } from '@/lib/cms'

export type Loc = 'ar' | 'en'

const DB_TIMEOUT_MS = 8000

/** Loose CMS surface so these files don't depend on generated collection types. */
interface LooseCms {
  find: (args: Record<string, unknown>) => Promise<{ docs: Record<string, unknown>[] }>
  findGlobal: (args: Record<string, unknown>) => Promise<Record<string, unknown>>
}

function withTimeout<T>(p: Promise<T>, ms = DB_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ])
}

async function client(): Promise<LooseCms | null> {
  try {
    return (await withTimeout(getCms())) as unknown as LooseCms
  } catch (err) {
    console.warn('[seo] CMS unavailable:', (err as Error).message)
    return null
  }
}

export interface SeoDefaultsLike {
  titleTemplate?: string | null
  defaultDescription?: string | null
  oneLiner?: string | null
  sameAs?: Array<{ url?: string | null }> | null
  aiCrawlers?: { allowTraining?: boolean | null; allowSearch?: boolean | null; allowUser?: boolean | null } | null
}

export async function getSeoDefaults(locale: Loc = 'ar'): Promise<SeoDefaultsLike | null> {
  const cms = await client()
  if (!cms) return null
  try {
    return (await withTimeout(
      cms.findGlobal({ slug: 'seo-defaults', locale, fallbackLocale: false, depth: 0 }),
    )) as SeoDefaultsLike
  } catch (err) {
    console.warn('[seo] seo-defaults unavailable:', (err as Error).message)
    return null
  }
}

/**
 * Published docs of a collection visible in at least one locale (or a specific locale).
 * Returns [] when the DB is unreachable.
 */
export async function findPublished(
  collection: string,
  opts: {
    locale?: Loc
    limit?: number
    sort?: string
    depth?: number
    where?: Record<string, unknown>
    select?: Record<string, true>
  } = {},
): Promise<Record<string, unknown>[]> {
  const cms = await client()
  if (!cms) return []
  const and: Record<string, unknown>[] = [{ _status: { equals: 'published' } }]
  if (opts.locale) and.push({ [`translated.${opts.locale}`]: { equals: true } })
  else and.push({ or: [{ 'translated.ar': { equals: true } }, { 'translated.en': { equals: true } }] })
  if (opts.where) and.push(opts.where)
  try {
    const res = await withTimeout(
      cms.find({
        collection,
        locale: opts.locale || 'ar',
        fallbackLocale: false,
        draft: false,
        depth: opts.depth ?? 0,
        limit: opts.limit ?? 5000,
        pagination: false,
        sort: opts.sort || '-updatedAt',
        where: { and },
        ...(opts.select ? { select: opts.select } : {}),
      }),
    )
    return res.docs || []
  } catch (err) {
    console.warn(`[seo] ${collection} query failed:`, (err as Error).message)
    return []
  }
}
