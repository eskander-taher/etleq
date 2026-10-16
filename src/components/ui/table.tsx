import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Comparison tables (brief section 6): horizontally scrollable on phones with a sticky first
 * column (`sticky start-0` follows the reading direction). The scroll region is focusable and
 * labelled so keyboard users can scroll it (WCAG 2.1.1).
 */
export function Table({
  label,
  caption,
  tone = 'light',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLTableElement> & { label: string; caption?: string; tone?: 'light' | 'alt' }) {
  return (
    <div
      style={{ ['--table-bg' as string]: tone === 'alt' ? 'var(--color-sand-100)' : 'var(--color-sand-50)' }}
      role="region"
      aria-label={label}
      tabIndex={0}
      className="relative -mx-4 overflow-x-auto overscroll-x-contain px-4 sm:mx-0 sm:px-0"
    >
      <table className={cn('w-full min-w-[40rem] border-separate border-spacing-0 text-start text-sm sm:text-base', className)} {...props}>
        {caption ? <caption className="mb-3 text-start text-sm text-stone-500">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />
export const TR = ({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) => <tr className={className} {...p} />

const stickyCell =
  'sticky start-0 z-10 bg-(--table-bg) shadow-[inset_-1px_0_0_var(--color-sand-300)] rtl:shadow-[inset_1px_0_0_var(--color-sand-300)]'

export function TH({
  className,
  sticky,
  highlight,
  ...p
}: ThHTMLAttributes<HTMLTableCellElement> & { sticky?: boolean; highlight?: boolean }) {
  return (
    <th
      className={cn(
        'border-b border-sand-300 px-4 py-3 text-start align-bottom font-display text-sm font-semibold',
        highlight && 'bg-ink-950 text-sand-50',
        sticky && stickyCell,
        className,
      )}
      {...p}
    />
  )
}

export function TD({
  className,
  sticky,
  highlight,
  ...p
}: TdHTMLAttributes<HTMLTableCellElement> & { sticky?: boolean; highlight?: boolean }) {
  return (
    <td
      className={cn(
        'border-b border-sand-300 px-4 py-3 align-top text-ink-600',
        highlight && 'bg-sand-100 font-medium text-ink-950',
        sticky && cn(stickyCell, 'font-medium text-ink-950'),
        className,
      )}
      {...p}
    />
  )
}
