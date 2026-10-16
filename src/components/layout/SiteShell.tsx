// Stub owned by workstream B (design & shell): replace with Header/Footer/AnnouncementBar/StickyMobileBar.
import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/routing'

export function SiteShell({ children }: { locale: Locale; children: ReactNode }) {
  return <>{children}</>
}
