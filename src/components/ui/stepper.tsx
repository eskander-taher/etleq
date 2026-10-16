import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format'

export type Step = { title: ReactNode; description?: ReactNode; meta?: ReactNode }

/**
 * Ordered process (e.g. Scorecard → Fit call → … → Care). A real <ol> so the order is announced.
 * Vertical with a connecting line on phones; `layout="grid"` spreads it into columns on desktop.
 */
export function Stepper({
  steps,
  locale,
  layout = 'vertical',
  className,
}: {
  steps: Step[]
  locale: 'ar' | 'en'
  layout?: 'vertical' | 'grid'
  className?: string
}) {
  return (
    <ol className={cn(layout === 'grid' ? 'grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4' : 'flex flex-col', className)}>
      {steps.map((s, i) => {
        const last = i === steps.length - 1
        return (
          <li key={i} className={cn('relative flex gap-4', layout === 'vertical' && !last && 'pb-8')}>
            {layout === 'vertical' && !last ? (
              <span aria-hidden="true" className="absolute start-5 top-12 bottom-1 w-px -translate-x-1/2 rtl:translate-x-1/2 bg-sand-300 in-data-[tone=dark]:bg-ink-800" />
            ) : null}
            <span
              aria-hidden="true"
              className="num relative z-[1] inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-ink-950 bg-sand-50 text-sm font-medium text-ink-950 in-data-[tone=dark]:border-sand-300 in-data-[tone=dark]:bg-ink-950 in-data-[tone=dark]:text-sand-50"
            >
              {formatNumber(i + 1, locale).padStart(2, '0')}
            </span>
            <div className="pt-1.5">
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              {s.meta ? <p className="mt-1 text-sm font-semibold text-ink-950 in-data-[tone=dark]:text-ignition-500">{s.meta}</p> : null}
              {s.description ? <div className="mt-1 text-ink-600 in-data-[tone=dark]:text-sand-300">{s.description}</div> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
