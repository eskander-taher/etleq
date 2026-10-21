import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

const L = {
  ar: { source: 'المصدر', newTab: '(يفتح في نافذة جديدة)' },
  en: { source: 'Source', newTab: '(opens in a new tab)' },
} as const

/**
 * Visible citation for every sourced number (guardrail 3): "Source: <label>, <date>".
 * The label is often a Latin brand name, so it is isolated with <bdi> inside Arabic text.
 */
export function SourceCite({
  label,
  url,
  date,
  locale,
  className,
  prefix = true,
}: {
  label: string
  url?: string | null
  date?: string | Date | null
  locale: 'ar' | 'en'
  className?: string
  /** Show the "Source:" prefix. */
  prefix?: boolean
}) {
  const sep = locale === 'ar' ? '، ' : ', '
  const when = date ? formatDate(date, locale) : ''
  const iso = date ? new Date(date).toISOString().slice(0, 10) : undefined
  return (
    <span className={cn('text-xs text-stone-500 in-data-[tone=dark]:text-sand-300', className)}>
      {prefix ? `${L[locale].source}: ` : null}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="relative inline-flex items-center gap-0.5 underline decoration-sand-300 underline-offset-2 hover:text-ink-950 hover:decoration-ink-950 in-data-[tone=dark]:hover:text-sand-50"
        >
          <bdi>{label}</bdi>
          <ExternalLink className="size-3" aria-hidden="true" />
          <span className="sr-only"> {L[locale].newTab}</span>
        </a>
      ) : (
        <bdi>{label}</bdi>
      )}
      {when ? (
        <>
          {sep}
          <time dateTime={iso}>{when}</time>
        </>
      ) : null}
    </span>
  )
}
