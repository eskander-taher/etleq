'use client'

import type { ReactNode } from 'react'

/** Reopens the consent banner (workstream E's ConsentManager listens for this event). */
export function CookieSettingsButton({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event('etleq:open-consent'))}>
      {children}
    </button>
  )
}
