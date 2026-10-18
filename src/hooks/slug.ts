import { localizedPath, PUBLIC_LOCALES } from './paths'

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
  if (!SLUG_PATTERN.test(value))
    return 'Use lowercase Latin letters, numbers and single hyphens only (e.g. clinic-booking-system).'
  return true
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
