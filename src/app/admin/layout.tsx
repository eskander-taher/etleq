import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '../(frontend)/globals.css'

export const metadata: Metadata = {
  title: { default: 'Etleq admin', template: '%s — Etleq admin' },
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-dvh bg-sand-50 font-[system-ui] text-ink-950 antialiased">{children}</body>
    </html>
  )
}
