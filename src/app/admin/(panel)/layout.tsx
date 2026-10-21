import Link from 'next/link'
import type { ReactNode } from 'react'

import { logoutAction } from '@/app/admin/actions'
import { canRead, requireAdminUser } from '@/cms/auth'
import { getCollectionConfig, getGlobalConfig } from '@/cms/schema'
import { MobileMenu } from '@/components/admin/MobileMenu'
import { NAV } from '@/components/admin/nav'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  editor: 'Editor',
  recruiter: 'Recruiter',
  sales: 'Sales',
}

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminUser()

  const groups = NAV.map((group) => ({
    title: group.title,
    links: group.items.flatMap((item) => {
      if (item.kind === 'collection') {
        const config = getCollectionConfig(item.slug)
        return config && canRead(user, config)
          ? [{ href: `/admin/collections/${config.slug}`, label: config.labels.plural }]
          : []
      }
      const config = getGlobalConfig(item.slug)
      return config && config.access.write.includes(user.role)
        ? [{ href: `/admin/globals/${config.slug}`, label: config.label }]
        : []
    }),
  })).filter((g) => g.links.length)

  const navList = (
    <>
      <Link href="/admin" className="mt-4 block rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-sand-100">
        Home
      </Link>
      {groups.map((group) => (
        <div key={group.title} className="mt-5">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-ink-600">{group.title}</p>
          <ul className="mt-1 space-y-0.5">
            {group.links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="block rounded-md px-2 py-1.5 text-sm hover:bg-sand-100">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="mt-8 border-t border-sand-300 px-2 pt-4 text-xs text-ink-600">
        <p className="truncate">{user.email}</p>
        <p>{ROLE_LABEL[user.role] ?? user.role}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <a href="/" target="_blank" rel="noreferrer" className="underline">
            Open the website
          </a>
          <form action={logoutAction}>
            <button type="submit" className="underline">
              Log out
            </button>
          </form>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-dvh">
      <nav
        aria-label="Admin"
        className="sticky top-0 hidden h-dvh w-60 shrink-0 overflow-y-auto border-e border-sand-300 bg-white p-4 md:block"
      >
        <Link href="/admin" className="block px-2 text-lg font-bold">
          Etleq admin
        </Link>
        {navList}
      </nav>
      <div className="min-w-0 flex-1">
        <MobileMenu>{navList}</MobileMenu>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  )
}
