'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** Phone menu: a disclosure that closes itself after navigating. */
export function MobileMenu({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null)
  const pathname = usePathname()
  useEffect(() => {
    if (ref.current) ref.current.open = false
  }, [pathname])
  return (
    <details ref={ref} className="group relative border-b border-sand-300 bg-white md:hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-bold">Etleq admin</span>
        <span className="rounded-lg border border-sand-300 px-3 py-1.5 text-sm font-medium">
          <span className="group-open:hidden">Menu</span>
          <span className="hidden group-open:inline">Close</span>
        </span>
      </summary>
      <div className="max-h-[80dvh] overflow-y-auto px-2 pb-4">{children}</div>
    </details>
  )
}
