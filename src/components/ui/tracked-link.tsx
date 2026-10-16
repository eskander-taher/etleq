'use client'

import type { AnchorHTMLAttributes, ComponentProps } from 'react'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'

function safeTrack(event: string, params?: Record<string, unknown>) {
  try {
    trackEvent(event, { page: window.location.pathname, ...params })
  } catch {
    /* analytics must never block navigation */
  }
}

/**
 * Plain anchor that reports an analytics event on click. Server components render it with
 * fully-formed hrefs; only the click handler ships to the client.
 */
export function TrackedAnchor({
  event,
  params,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; params?: Record<string, unknown> }) {
  return (
    <a
      {...props}
      onClick={(e) => {
        safeTrack(event, params)
        onClick?.(e)
      }}
    />
  )
}

/** Locale-aware internal link (next-intl) that reports an event, e.g. cta_click. */
export function TrackedLink({
  event,
  params,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { event: string; params?: Record<string, unknown> }) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        safeTrack(event, params)
        onClick?.(e)
      }}
    />
  )
}
