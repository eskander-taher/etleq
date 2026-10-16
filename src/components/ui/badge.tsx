import type { HTMLAttributes, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { BadgeCheck, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Contrast: verified-600 is 4.34:1 on sand-100 (fails AA as small text), so "verified" is a solid
 * badge with white text (5.02:1) and "source" uses ink text with a verified border/icon.
 */
export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold leading-5 whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-sand-100 text-ink-950 ring-1 ring-sand-300 ring-inset',
        accent: 'bg-ignition-500 text-ink-950',
        dark: 'bg-ink-950 text-sand-50',
        outline: 'text-ink-950 ring-1 ring-ink-950/20 ring-inset',
        verified: 'bg-verified-600 text-white',
        source: 'bg-sand-50 text-ink-950 ring-1 ring-verified-600 ring-inset',
        sample: 'bg-ink-950 text-ignition-500 ring-1 ring-ignition-500 ring-inset',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
)

export function Badge({
  className,
  variant,
  icon,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { icon?: ReactNode }) {
  const auto =
    icon ??
    (variant === 'verified' ? (
      <BadgeCheck className="size-4" aria-hidden="true" />
    ) : variant === 'source' ? (
      <Link2 className="size-4 text-verified-600" aria-hidden="true" />
    ) : null)
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {auto}
      {children}
    </span>
  )
}
