import { cn } from '@/lib/utils'
import { formatPrice, formatUSD } from '@/lib/format'

const L = {
  ar: { from: 'يبدأ من', vat: 'غير شامل ضريبة القيمة المضافة' },
  en: { from: 'From', vat: 'excl. VAT' },
} as const

/**
 * Price display. Arabic pages show SAR at the 3.75 peg ("22,125 ر.س"), English pages USD
 * ("$5,900"). Prices exclude VAT (brief section 2), so the note is on by default.
 */
export function Price({
  usd,
  locale,
  from = false,
  vatNote = true,
  showUsdOnArabic = false,
  size = 'lg',
  className,
}: {
  /** Amount in USD as stored in the CMS. */
  usd: number
  locale: 'ar' | 'en'
  from?: boolean
  vatNote?: boolean
  /** Arabic pages: add the USD amount as a secondary line. */
  showUsdOnArabic?: boolean
  size?: 'md' | 'lg' | 'xl'
  className?: string
}) {
  const t = L[locale]
  return (
    <div className={cn('inline-flex flex-col gap-1', className)}>
      {from ? <span className="text-sm font-medium text-ink-600 in-data-[tone=dark]:text-sand-300">{t.from}</span> : null}
      <bdi
        className={cn(
          'num block font-medium leading-none',
          size === 'xl' ? 'text-5xl sm:text-6xl' : size === 'lg' ? 'text-4xl' : 'text-2xl',
        )}
      >
        {formatPrice(usd, locale)}
      </bdi>
      {locale === 'ar' && showUsdOnArabic ? (
        <span className="text-sm text-stone-500 in-data-[tone=dark]:text-sand-300">
          ≈ <bdi className="num">{formatUSD(usd, 'en')}</bdi>
        </span>
      ) : null}
      {vatNote ? <span className="text-xs text-stone-500 in-data-[tone=dark]:text-sand-300">{t.vat}</span> : null}
    </div>
  )
}
