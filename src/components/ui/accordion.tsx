import type { HTMLAttributes, ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Native <details>/<summary>: answers are in the server HTML (indexable, works without JS),
 * keyboard and screen-reader support come from the browser.
 */
export function Accordion({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('divide-y divide-sand-300 border-y border-sand-300 in-data-[tone=dark]:divide-ink-800 in-data-[tone=dark]:border-ink-800', className)} {...props} />
}

export function AccordionItem({
  title,
  children,
  open,
  name,
  id,
  className,
  headingLevel = 3,
}: {
  title: ReactNode
  children: ReactNode
  open?: boolean
  /** Same `name` on several items makes them exclusive (only one open). */
  name?: string
  id?: string
  className?: string
  headingLevel?: 2 | 3 | 4
}) {
  const H = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
  return (
    <details id={id} name={name} open={open} className={cn('group', className)}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
        <H className="font-display text-lg font-semibold">{title}</H>
        <ChevronDown
          className="size-5 shrink-0 text-stone-500 transition-transform duration-200 ease-out group-open:rotate-180 in-data-[tone=dark]:text-sand-300"
          aria-hidden="true"
        />
      </summary>
      <div className="pb-6 text-ink-600 in-data-[tone=dark]:text-sand-300 [&_p+p]:mt-3">{children}</div>
    </details>
  )
}
