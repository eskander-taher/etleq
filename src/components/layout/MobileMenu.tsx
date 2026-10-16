'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from '@/i18n/navigation'
import { NavLink } from './NavLink'
import { LanguageSwitcher } from './LanguageSwitcher'

/**
 * Mobile disclosure menu built on a native modal <dialog>: the browser traps focus inside it,
 * makes the page behind inert and closes it on Esc. Focus returns to the toggle on close.
 */
export function MobileMenu({
  items,
  labels,
  logo,
  cta,
  whatsapp,
}: {
  items: { label: string; href: string }[]
  labels: { open: string; close: string; nav: string }
  logo: ReactNode
  cta: ReactNode
  whatsapp?: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  const close = useCallback(() => {
    dialogRef.current?.close()
  }, [])

  const show = () => {
    dialogRef.current?.showModal()
    setOpen(true)
  }

  // Close when the route changes (link inside the menu was followed).
  useEffect(() => {
    close()
  }, [pathname, close])

  // Lock page scroll while open.
  useEffect(() => {
    const root = document.documentElement
    if (open) root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex size-12 items-center justify-center rounded-button text-ink-950 hover:bg-sand-100"
      >
        <Menu className="size-6" aria-hidden="true" />
        <span className="sr-only">{labels.open}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={labels.nav}
        onClose={() => {
          setOpen(false)
          toggleRef.current?.focus()
        }}
        onClick={(e) => {
          // Close when a link inside is activated (same-page links don't change the pathname).
          if ((e.target as HTMLElement).closest('a')) close()
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none bg-sand-50 p-0 text-ink-950 backdrop:bg-ink-950/50 open:flex open:flex-col"
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-sand-300 px-4">
          {logo}
          <button
            type="button"
            onClick={close}
            autoFocus
            className="inline-flex size-12 items-center justify-center rounded-button hover:bg-sand-100"
          >
            <X className="size-6" aria-hidden="true" />
            <span className="sr-only">{labels.close}</span>
          </button>
        </div>
        <nav aria-label={labels.nav} className="flex-1 overflow-y-auto px-4 py-6">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href} className="border-b border-sand-300/70">
                <NavLink
                  href={item.href}
                  className="flex min-h-14 items-center font-display text-xl font-semibold"
                  activeClassName="text-ignition-700"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            <LanguageSwitcher showNote />
          </div>
        </nav>
        <div className="grid shrink-0 gap-3 border-t border-sand-300 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {cta}
          {whatsapp}
        </div>
      </dialog>
    </>
  )
}
