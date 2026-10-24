import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export { siteUrl } from './site-url'

/** Locale-aware path: Arabic has no prefix, English uses /en. `path` starts with '/'. */
export function localePath(locale: 'ar' | 'en', path = '/') {
  const p = path === '/' ? '' : path
  return locale === 'ar' ? p || '/' : `/en${p}`
}
