/**
 * Canonical origin for every absolute URL the site emits (canonicals, hreflang,
 * sitemaps, robots, OG, RSS, JSON-LD, llms.txt, IndexNow). Built from
 * NEXT_PUBLIC_SITE_URL; defaults to the production host.
 */
export const DEFAULT_SITE_URL = 'https://www.etleq.com'

/**
 * Normalise a configured origin: trim, drop trailing slashes, path, query and hash.
 * The bare apex `etleq.com` is upgraded to `https://www.etleq.com`, so a stale env
 * value can never point canonicals at the host that redirects.
 */
export function normalizeSiteUrl(raw: string | null | undefined): string {
  const value = (raw || '').trim()
  if (!value) return DEFAULT_SITE_URL
  let url: URL
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`)
  } catch {
    return DEFAULT_SITE_URL
  }
  if (url.hostname === 'etleq.com' || url.hostname === 'www.etleq.com') return DEFAULT_SITE_URL
  return url.origin
}

export const siteUrl = () => normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL)
