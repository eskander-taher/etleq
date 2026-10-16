import { formatMoney } from '@/lib/format'
import type { Loc } from './lib'

/** Country name in the page language from an ISO2 code (e.g. SA → السعودية / Saudi Arabia). */
export function countryName(code: string | null | undefined, locale: Loc): string {
  if (!code) return ''
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/** "Riyadh, Saudi Arabia" in the page language. */
export function jobLocation(job: { city?: string | null; country?: string | null }, locale: Loc): string {
  const parts = [job.city, countryName(job.country, locale)].filter(Boolean)
  return parts.join(locale === 'ar' ? '، ' : ', ')
}

/** Salary range string, or null when hidden or incomplete. Unit label is passed in (translated). */
export function salaryRange(
  salary: { min?: number | null; max?: number | null; currency?: string | null; show?: boolean | null } | null | undefined,
  locale: Loc,
): string | null {
  if (!salary?.show) return null
  const currency = salary.currency || 'SAR'
  const { min, max } = salary
  if (typeof min === 'number' && typeof max === 'number') return `${formatMoney(min, currency, locale)} – ${formatMoney(max, currency, locale)}`
  if (typeof min === 'number') return formatMoney(min, currency, locale)
  if (typeof max === 'number') return formatMoney(max, currency, locale)
  return null
}
