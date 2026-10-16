export const SAR_PEG = 3.75
type L = 'ar' | 'en'

const nf = (locale: L, opts?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', opts)

export const formatNumber = (n: number, locale: L) => nf(locale, { maximumFractionDigits: 0 }).format(n)

export const toSAR = (usd: number) => Math.round(usd * SAR_PEG)

/** AR: "22,125 ر.س" — EN: "SAR 22,125" */
export function formatSAR(sar: number, locale: L) {
  const n = nf(locale, { maximumFractionDigits: 0 }).format(sar)
  return locale === 'ar' ? `${n} ر.س` : `SAR ${n}`
}

/** EN: "$5,900" — AR: "5,900 دولار" */
export function formatUSD(usd: number, locale: L) {
  const n = nf(locale, { maximumFractionDigits: 0 }).format(usd)
  return locale === 'ar' ? `${n} دولار` : `$${n}`
}

/** Default price display: SAR on Arabic pages, USD on English pages. */
export const formatPrice = (usd: number, locale: L) => (locale === 'ar' ? formatSAR(toSAR(usd), 'ar') : formatUSD(usd, 'en'))

export function formatMoney(amount: number, currency: string, locale: L) {
  if (currency === 'SAR') return formatSAR(amount, locale)
  if (currency === 'USD') return formatUSD(amount, locale)
  return `${nf(locale, { maximumFractionDigits: 0 }).format(amount)} ${currency}`
}

export function formatDate(iso: string | Date | null | undefined, locale: L) {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso))
}
