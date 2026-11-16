import type { Locale } from '@/i18n/routing'

/** Also accept the internal /ar pathname exposed during production prerendering. */
export function stripLocale(pathname: string) {
  if (pathname === '/en' || pathname === '/ar') return '/'
  if (pathname.startsWith('/en/') || pathname.startsWith('/ar/')) return pathname.slice(3)
  return pathname || '/'
}

/** Same page in the other locale (Arabic at the root, English under /en). */
export function swapLocalePath(pathname: string, target: Locale) {
  const bare = stripLocale(pathname)
  if (target === 'ar') return bare
  return bare === '/' ? '/en' : `/en${bare}`
}
