import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

export const isExternalHref = (href: string) => /^(https?:|mailto:|tel:|\/\/)/i.test(href)

/** Strip an explicit /en prefix so next-intl re-applies the current locale. */
export function normalizeInternalHref(href: string) {
  if (href === '/en') return '/'
  if (href.startsWith('/en/')) return href.slice(3)
  return href.startsWith('/') || href.startsWith('#') ? href : `/${href}`
}

/**
 * Link that accepts CMS hrefs: internal paths go through next-intl (locale prefix applied),
 * external URLs become a plain anchor opening in a new tab.
 */
export function SmartLink({
  href,
  children,
  newTabLabel,
  className,
  ...props
}: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string
  children: ReactNode
  newTabLabel?: string
}) {
  if (isExternalHref(href)) {
    const web = /^https?:|^\/\//i.test(href)
    // `relative` keeps the absolutely positioned sr-only note inside the link, so it can never
    // escape a scrolling ancestor and widen the page.
    return (
      <a
        href={href}
        {...(web ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={cn(web && newTabLabel && 'relative', className)}
        {...props}
      >
        {children}
        {web && newTabLabel ? <span className="sr-only"> {newTabLabel}</span> : null}
      </a>
    )
  }
  return (
    <Link href={normalizeInternalHref(href)} className={className} {...props}>
      {children}
    </Link>
  )
}
