import Link from 'next/link'

import { titleOf } from '@/cms/admin-data'
import { canRead, canWrite, requireAdminUser } from '@/cms/auth'
import { getDb } from '@/cms/db'
import type { Doc } from '@/cms/fields'
import { cms } from '@/cms/local'
import { getCollectionConfig, getGlobalConfig } from '@/cms/schema'
import type { CollectionSlug } from '@/cms/types'
import { SlotsForm } from '@/components/admin/SlotsForm'

export const metadata = { title: 'Home' }

type Bucket = { _id: string | null; count: number }

async function leadBuckets(field: string): Promise<Bucket[]> {
  const db = await getDb()
  return (await db
    .collection('leads')
    .aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray()) as Bucket[]
}

const count = (collection: CollectionSlug, where?: Record<string, unknown>) =>
  cms.count({ collection, where: where as never }).then((r) => r.totalDocs)

const STAGE: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  booked: 'Call booked',
  blueprint: 'Blueprint',
  won: 'Won',
  lost: 'Lost',
}

export default async function Dashboard() {
  const user = await requireAdminUser()
  const can = (slug: string, mode: 'read' | 'write' = 'read') => {
    const config = getCollectionConfig(slug)
    return Boolean(config && (mode === 'read' ? canRead(user, config) : canWrite(user, config)))
  }
  const settingsConfig = getGlobalConfig('site-settings')
  const canSettings = Boolean(settingsConfig?.access.write.includes(user.role))
  const showLeads = can('leads')

  let dbError = ''
  let projects = { live: 0, drafts: 0 }
  let posts = { live: 0, drafts: 0 }
  let newLeads = 0
  let openApplications = 0
  let stages: Bucket[] = []
  let recentLeads: Doc[] = []
  let recentProjects: Doc[] = []
  let slots = { left: 0, total: 0 }
  try {
    const tasks: Promise<unknown>[] = []
    if (can('projects'))
      tasks.push(
        Promise.all([
          count('projects', { _status: { equals: 'published' } }),
          count('projects', { _status: { equals: 'draft' } }),
          cms.find({ collection: 'projects', locale: 'all', limit: 5, sort: '-updatedAt', depth: 0 }),
        ]).then(([live, drafts, recent]) => {
          projects = { live, drafts }
          recentProjects = recent.docs as Doc[]
        }),
      )
    if (can('posts'))
      tasks.push(
        Promise.all([
          count('posts', { _status: { equals: 'published' } }),
          count('posts', { _status: { equals: 'draft' } }),
        ]).then(([live, drafts]) => {
          posts = { live, drafts }
        }),
      )
    if (showLeads)
      tasks.push(
        Promise.all([
          count('leads', { status: { equals: 'new' } }),
          leadBuckets('status'),
          cms.find({ collection: 'leads', locale: 'all', limit: 6, sort: '-createdAt' }),
        ]).then(([n, s, recent]) => {
          newLeads = n
          stages = s
          recentLeads = recent.docs as Doc[]
        }),
      )
    if (can('applications'))
      tasks.push(count('applications', { status: { equals: 'new' } }).then((n) => (openApplications = n)))
    if (canSettings)
      tasks.push(
        cms.findGlobal({ slug: 'site-settings', locale: 'all' }).then((s) => {
          const d = s as Doc
          slots = { left: Number(d.slotsLeft ?? 0), total: Number(d.slotsTotal ?? 0) }
        }),
      )
    await Promise.all(tasks)
  } catch (error) {
    dbError = (error as Error).message
  }

  const projectsConfig = getCollectionConfig('projects')
  const actions = [
    can('projects', 'write') && {
      href: '/admin/collections/projects/new',
      title: 'Add a shipped app',
      body: 'Name, link and screenshots. About 2 minutes.',
      primary: true,
    },
    can('posts', 'write') && {
      href: '/admin/collections/posts/new',
      title: 'Write a blog post',
      body: 'Draft it now, publish when ready.',
    },
    showLeads && {
      href: '/admin/collections/leads',
      title: newLeads ? `See ${newLeads} new lead${newLeads > 1 ? 's' : ''}` : 'See leads',
      body: 'People who asked about building an app.',
    },
    can('applications') && {
      href: '/admin/collections/applications',
      title: openApplications ? `${openApplications} new job application${openApplications > 1 ? 's' : ''}` : 'Job applications',
      body: 'Review CVs and move people along.',
    },
  ].filter(Boolean) as { href: string; title: string; body: string; primary?: boolean }[]

  return (
    <div className="max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Hello{user.name ? `, ${String(user.name).split(' ')[0]}` : ''}</h1>
        <p className="mt-1 text-sm text-ink-600">What would you like to do?</p>
      </div>
      {dbError && (
        <p className="rounded-lg border border-[#B42318]/40 p-3 text-sm text-[#B42318]">
          The database is not reachable right now: {dbError}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a) => (
          <li key={a.href}>
            <Link
              href={a.href}
              className={`flex h-full flex-col rounded-xl border p-4 transition-colors ${a.primary ? 'border-ignition-500 bg-ignition-500 text-ink-950 hover:bg-[#ff7343]' : 'border-sand-300 bg-white hover:border-ink-600'}`}
            >
              <span className="text-base font-bold">
                {a.primary ? '+ ' : ''}
                {a.title}
              </span>
              <span className={`mt-1 text-sm ${a.primary ? 'text-ink-950/80' : 'text-ink-600'}`}>{a.body}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-3">
        {canSettings && (
          <section className="rounded-xl border border-sand-300 bg-white p-4">
            <h2 className="font-semibold">Launch slots this month</h2>
            <p className="mb-3 mt-1 text-xs text-ink-600">Shown on the site. Keep it true.</p>
            <SlotsForm left={slots.left} total={slots.total} />
            <Link href="/admin/globals/site-settings" className="mt-3 inline-block text-xs underline">
              More settings
            </Link>
          </section>
        )}
        {projectsConfig && can('projects') && (
          <section className="rounded-xl border border-sand-300 bg-white p-4">
            <h2 className="font-semibold">
              <Link href="/admin/collections/projects" className="hover:underline">
                Projects
              </Link>
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              {projects.live} live · {projects.drafts} draft{projects.drafts === 1 ? '' : 's'}
            </p>
            {recentProjects.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                {recentProjects.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${p._status === 'published' ? 'bg-verified-600' : 'bg-sand-300'}`}
                    />
                    <Link href={`/admin/collections/projects/${p.id}`} className="truncate underline">
                      {titleOf(projectsConfig, p)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm">No projects yet. Add the first app you shipped.</p>
            )}
          </section>
        )}
        {can('posts') && (
          <section className="rounded-xl border border-sand-300 bg-white p-4">
            <h2 className="font-semibold">
              <Link href="/admin/collections/posts" className="hover:underline">
                Blog posts
              </Link>
            </h2>
            <p className="mt-1 text-sm text-ink-600">
              {posts.live} live · {posts.drafts} draft{posts.drafts === 1 ? '' : 's'}
            </p>
          </section>
        )}
      </div>

      {showLeads && (
        <section>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-lg font-semibold">Latest leads</h2>
            <p className="text-sm text-ink-600">
              {stages.length
                ? stages.map((s) => `${STAGE[String(s._id)] ?? s._id ?? 'No stage'}: ${s.count}`).join(' · ')
                : 'No leads yet'}
            </p>
          </div>
          {recentLeads.length > 0 && (
            <ul className="mt-3 divide-y divide-sand-300 overflow-hidden rounded-xl border border-sand-300 bg-white">
              {recentLeads.map((l) => (
                <li key={l.id}>
                  <Link
                    href={`/admin/collections/leads/${l.id}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm hover:bg-sand-50"
                  >
                    <span className="font-semibold">{l.name || 'No name'}</span>
                    <span className="text-ink-600">{l.source}</span>
                    {l.status === 'new' && (
                      <span className="rounded-full bg-ignition-500 px-2 py-0.5 text-xs font-semibold">New</span>
                    )}
                    <span className="ms-auto text-xs text-ink-600">
                      {String(l.createdAt).slice(0, 16).replace('T', ' ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
