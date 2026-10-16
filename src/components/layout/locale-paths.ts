import type { Locale } from '@/i18n/routing'

/** Strip the /en prefix from a browser pathname: '/en/blog' → '/blog', '/en' → '/'. */
export function stripLocale(pathname: string) {
  if (pathname === '/en') return '/'
  if (pathname.startsWith('/en/')) return pathname.slice(3)
  return pathname || '/'
}

/** Same page in the other locale (Arabic at the root, English under /en). */
export function swapLocalePath(pathname: string, target: Locale) {
  const bare = stripLocale(pathname)
  if (target === 'ar') return bare
  return bare === '/' ? '/en' : `/en${bare}`
}
