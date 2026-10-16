import type { CollectionAfterChangeHook, CollectionSlug, FieldHook, TextField } from 'payload'

import { basePath, localizedPath, PUBLIC_LOCALES } from './paths'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const DRAFT_PREFIX = 'draft-'

/**
 * Turn any title into a lowercase Latin slug. Accents are stripped, everything
 * that is not a-z or 0-9 becomes a single hyphen. Arabic (or any non-Latin)
 * text produces an empty string; callers decide the fallback.
 */
export function slugify(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

/** Placeholder slug used when only an Arabic title exists yet. Replaced once an English title arrives (before first publish). */
export const draftSlug = () => `${DRAFT_PREFIX}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

export const isDraftSlug = (slug: unknown) => typeof slug === 'string' && slug.startsWith(DRAFT_PREFIX)

export function validateSlug(value: unknown): true | string {
  if (typeof value !== 'string' || !value) return 'Slug is required.'
  if (!SLUG_PATTERN.test(value)) return 'Use lowercase Latin letters, numbers and single hyphens only (e.g. clinic-booking-system).'
  return true
}

type SlugFieldOptions = {
  /** Field that holds the (localized) title. Defaults to `title`. */
  from?: string
}

/**
 * Slug field factory. The slug is not localized: one slug serves both locales.
 * It is generated from the English title (falling back to any Latin title),
 * stays editable, and is made unique by appending -2, -3, …
 */
export function slugField({ from = 'title' }: SlugFieldOptions = {}): TextField {
  const generate: FieldHook = async ({ value, data, originalDoc, req, collection }) => {
    const current = typeof value === 'string' ? value.trim() : ''

    // An editor typed a slug: normalise it and keep it.
    if (current && !isDraftSlug(current)) return slugify(current) || current

    // Only regenerate a placeholder while the document has never been published.
    if (isDraftSlug(current) && originalDoc?._status === 'published') return current

    const title = data?.[from] ?? originalDoc?.[from]
    let candidate = ''

    if (req.locale === 'en') candidate = slugify(typeof title === 'string' ? title : '')

    if (!candidate && collection && originalDoc?.id && req.locale !== 'en') {
      try {
        const en = await req.payload.findByID({
          collection: collection.slug as CollectionSlug,
          id: originalDoc.id,
          locale: 'en',
          fallbackLocale: false,
          draft: true,
          depth: 0,
          overrideAccess: true,
          req,
        })
        candidate = slugify((en as unknown as Record<string, unknown>)?.[from] as string)
      } catch {
        // Missing doc or no English title yet: fall through.
      }
    }

    if (!candidate) candidate = slugify(typeof title === 'string' ? title : '')
    if (!candidate) return current || draftSlug()

    if (!collection) return candidate
    return uniqueSlug(candidate, async (slug) => {
      const found = await req.payload.find({
        collection: collection.slug as CollectionSlug,
        where: originalDoc?.id
          ? { and: [{ slug: { equals: slug } }, { id: { not_equals: originalDoc.id } }] }
          : { slug: { equals: slug } },
        limit: 1,
        depth: 0,
        draft: true,
        overrideAccess: true,
        pagination: false,
        req,
      })
      return found.docs.length > 0
    })
  }

  return {
    name: 'slug',
    type: 'text',
    index: true,
    unique: true,
    localized: false,
    validate: (value: unknown) => {
      if (value === undefined || value === null || value === '') return true // filled by the hook
      return validateSlug(value)
    },
    admin: {
      position: 'sidebar',
      description: 'Generated from the English title. Lowercase Latin only. Changing it after publishing creates a 301 redirect.',
    },
    hooks: { beforeValidate: [generate] },
  }
}

/** Append -2, -3, … until `taken` says the slug is free. */
export async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = base
  let n = 2
  while (await taken(slug)) {
    slug = `${base}-${n}`
    n += 1
    if (n > 200) return `${base}-${Date.now().toString(36)}`
  }
  return slug
}

/** Build the redirect rows needed when a published document's path changes. */
export function redirectsForPathChange(oldPath: string | null, newPath: string | null): { from: string; to: string }[] {
  if (!oldPath || !newPath || oldPath === newPath) return []
  return PUBLIC_LOCALES.map((locale) => ({ from: localizedPath(oldPath, locale), to: localizedPath(newPath, locale) }))
}

/**
 * After a published document changes slug (or section, e.g. a guide switching
 * type), add 301s from the old paths to the new ones in both locales.
 */
export const createSlugRedirects: CollectionAfterChangeHook = async ({ doc, previousDoc, collection, req, context }) => {
  if (context?.seed || context?.skipSlugRedirects) return doc
  if (!previousDoc || previousDoc._status !== 'published' || doc._status !== 'published') return doc

  const pairs = redirectsForPathChange(basePath(collection.slug, previousDoc), basePath(collection.slug, doc))
  for (const { from, to } of pairs) {
    try {
      // Avoid loops: a redirect away from the new path must go.
      await req.payload.delete({ collection: 'redirects', where: { from: { equals: to } }, overrideAccess: true, req })

      // Point older redirects that targeted the old path straight at the new one.
      await req.payload.update({
        collection: 'redirects',
        where: { 'to.url': { equals: from } },
        data: { to: { type: 'custom', url: to } },
        overrideAccess: true,
        req,
      })

      const existing = await req.payload.find({
        collection: 'redirects',
        where: { from: { equals: from } },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        req,
      })
      const data = { from, to: { type: 'custom' as const, url: to }, type: '301' as const }
      if (existing.docs[0]) {
        await req.payload.update({ collection: 'redirects', id: existing.docs[0].id, data, overrideAccess: true, req })
      } else {
        await req.payload.create({ collection: 'redirects', data, overrideAccess: true, req })
      }
    } catch (error) {
      req.payload.logger.error({ err: error, msg: `Could not create redirect ${from} -> ${to}` })
    }
  }
  return doc
}
