import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/** Locale-aware path: Arabic has no prefix, English uses /en. `path` starts with '/'. */
export function localePath(locale: 'ar' | 'en', path = '/') {
  const p = path === '/' ? '' : path
  return locale === 'ar' ? p || '/' : `/en${p}`
}
