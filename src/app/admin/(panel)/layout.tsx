import Link from 'next/link'
import type { ReactNode } from 'react'

import { logoutAction } from '@/app/admin/actions'
import { canRead, requireAdminUser } from '@/cms/auth'
import { collections, globals } from '@/cms/schema'

export const dynamic = 'force-dynamic'

const GROUPS = ['Content', 'Careers', 'Sales', 'Marketing', 'Private', 'Admin'] as const

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser()
  const visibleGlobals = globals.filter((g) => g.access.write.includes(user.role))

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label="Admin"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-e border-sand-300 bg-white p-4 md:block"
      >
        <Link href="/admin" className="block text-lg font-bold">
          Etleq admin
        </Link>
        <p className="mt-1 truncate text-xs text-ink-600">
          {user.email} · {user.role}
        </p>
        {GROUPS.map((group) => {
          const items = collections.filter((c) => c.group === group && canRead(user, c))
          if (!items.length) return null
          return (
            <div key={group} className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{group}</p>
              <ul className="mt-1 space-y-0.5">
                {items.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/admin/collections/${c.slug}`}
                      className="block rounded-md px-2 py-1 text-sm hover:bg-sand-100"
                    >
                      {c.labels.plural}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {visibleGlobals.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">Site</p>
            <ul className="mt-1 space-y-0.5">
              {visibleGlobals.map((g) => (
                <li key={g.slug}>
                  <Link
                    href={`/admin/globals/${g.slug}`}
                    className="block rounded-md px-2 py-1 text-sm hover:bg-sand-100"
                  >
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <form action={logoutAction} className="mt-8">
          <button type="submit" className="text-sm text-ink-600 underline">
            Log out
          </button>
        </form>
      </nav>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between border-b border-sand-300 bg-white px-6 py-3 md:hidden">
          <Link href="/admin" className="font-bold">
            Etleq admin
          </Link>
          <details className="relative">
            <summary className="cursor-pointer text-sm">Menu</summary>
            <ul className="absolute end-0 z-20 mt-2 w-56 space-y-1 rounded-lg border border-sand-300 bg-white p-2 shadow">
              {collections
                .filter((c) => canRead(user, c))
                .map((c) => (
                  <li key={c.slug}>
                    <Link href={`/admin/collections/${c.slug}`} className="block px-2 py-1 text-sm">
                      {c.labels.plural}
                    </Link>
                  </li>
                ))}
              {visibleGlobals.map((g) => (
                <li key={g.slug}>
                  <Link href={`/admin/globals/${g.slug}`} className="block px-2 py-1 text-sm">
                    {g.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
        <main className="px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
