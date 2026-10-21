'use client'

import type { ReactNode } from 'react'
import { usePathname } from '@/i18n/navigation'
import { isFocusedPath } from './nav-config'

/**
 * Renders `focused` on focused-flow pages (the scorecard and its result) and `children` elsewhere.
 * Both are server-rendered; only the choice runs on the client.
 */
export function FocusSwitch({ children, focused = null }: { children: ReactNode; focused?: ReactNode }) {
  const pathname = usePathname() || '/'
  return <>{isFocusedPath(pathname) ? focused : children}</>
}
