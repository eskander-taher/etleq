import type { HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/** Cards: 20px radius, 1px sand-300 border, no heavy shadows (brief section 6). */
export const cardVariants = cva('rounded-card border p-6 sm:p-8', {
  variants: {
    tone: {
      light: 'border-sand-300 bg-sand-50 text-ink-950',
      alt: 'border-sand-300 bg-sand-100 text-ink-950',
      dark: 'border-ink-800 bg-ink-950 text-sand-50',
    },
    interactive: {
      true: 'transition-colors duration-200 ease-out hover:border-ink-600 focus-within:border-ink-600',
    },
  },
  defaultVariants: { tone: 'light' },
})

export function Card({
  className,
  tone,
  interactive,
  ...props
}: HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ tone, interactive }), className)} {...props} />
}

export function CardTitle({ className, as: As = 'h3', ...props }: HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }) {
  return <As className={cn('font-display text-xl font-semibold', className)} {...props} />
}

export function CardText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('mt-2 text-ink-600 in-data-[tone=dark]:text-sand-300', className)} {...props} />
}
