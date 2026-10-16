import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { SourceCite } from './source-cite'

/**
 * Big mono numeral + label + visible source (guardrail 3: every statistic is sourced).
 * `value` is pre-formatted with Western digits (lib/format); it is isolated with <bdi>.
 */
export function Stat({
  value,
  label,
  source,
  locale,
  className,
  size = 'lg',
}: {
  value: ReactNode
  label: ReactNode
  source?: { label: string; url?: string | null; date?: string | Date | null } | null
  locale: 'ar' | 'en'
  className?: string
  size?: 'md' | 'lg'
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <bdi className={cn('num block font-medium leading-none tracking-tight', size === 'lg' ? 'text-5xl sm:text-6xl' : 'text-3xl sm:text-4xl')}>
        {value}
      </bdi>
      <span className="text-ink-600 in-data-[tone=dark]:text-sand-300">{label}</span>
      {source ? <SourceCite locale={locale} {...source} /> : null}
    </div>
  )
}
