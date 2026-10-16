'use client'

import type { ReactNode } from 'react'
import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { isExternalHref, normalizeInternalHref } from '@/components/ui/smart-link'

/** Nav link that marks the current section with aria-current. */
export function NavLink({
  href,
  children,
  className,
  activeClassName,
  onClick,
}: {
  href: string
  children: ReactNode
  className?: string
  activeClassName?: string
  onClick?: () => void
}) {
  const pathname = usePathname() || '/'
  if (isExternalHref(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    )
  }
  const target = normalizeInternalHref(href)
  const exact = pathname === target
  const section = target !== '/' && pathname.startsWith(`${target}/`)
  return (
    <Link
      href={target}
      aria-current={exact ? 'page' : section ? 'true' : undefined}
      className={cn(className, (exact || section) && activeClassName)}
      onClick={onClick}
    >
      {children}
    </Link>
  )
}
