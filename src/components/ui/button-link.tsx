import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariantProps } from './button'
import { SmartLink } from './smart-link'

/** A link styled as a button (CTAs are navigation, so they stay anchors). */
export function ButtonLink({
  href,
  className,
  variant,
  size,
  block,
  children,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & ButtonVariantProps & { href: string; children: ReactNode }) {
  return (
    <SmartLink href={href} className={cn(buttonVariants({ variant, size, block }), className)} {...props}>
      {children}
    </SmartLink>
  )
}
