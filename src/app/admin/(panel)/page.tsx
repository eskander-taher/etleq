import Link from 'next/link'

import { canRead, requireAdminUser } from '@/cms/auth'
import { getDb } from '@/cms/db'
import { cms } from '@/cms/local'
import { collections } from '@/cms/schema'

export const metadata = { title: 'Dashboard' }

type Bucket = { _id: string | null; count: number }

async function leadBuckets(field: string): Promise<Bucket[]> {
  const db = await getDb()
  return (await db
    .collection('leads')
    .aggregate([{ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }])
    .toArray()) as Bucket[]
}

export default async function Dashboard() {
  const user = await requireAdminUser()
  const showLeads = user.role === 'admin' || user.role === 'sales'

  let pipeline: { label: string; buckets: Bucket[] }[] = []
  let recent: {
    id: string
    name?: string | null
    source?: string | null
    tier?: string | null
    status?: string | null
    createdAt: string
  }[] = []
  let dbError = ''
  try {
    if (showLeads) {
      const [status, tier, source, locale] = await Promise.all([
        leadBuckets('status'),
        leadBuckets('tier'),
        leadBuckets('source'),
        leadBuckets('locale'),
      ])
      pipeline = [
        { label: 'Status', buckets: status },
        { label: 'Tier', buckets: tier },
        { label: 'Source', buckets: source },
        { label: 'Language', buckets: locale },
      ]
      recent = (await cms.find({ collection: 'leads', locale: 'all', limit: 8, sort: '-createdAt' })).docs
    }
  } catch (error) {
    dbError = (error as Error).message
  }

  const visible = collections.filter((c) => canRead(user, c))

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      {dbError && (
        <p className="rounded-lg border border-[#B42318]/40 p-3 text-sm text-[#B42318]">
          Database unavailable: {dbError}
        </p>
      )}

      {showLeads && (
        <section>
          <h2 className="text-lg font-semibold">Lead pipeline</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {pipeline.map((p) => (
              <div key={p.label} className="rounded-xl border border-sand-300 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-ink-600">{p.label}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {p.buckets.length === 0 && <li className="text-ink-600">No leads yet</li>}
                  {p.buckets.map((b) => (
                    <li key={String(b._id)} className="flex justify-between">
                      <span>{b._id ?? '—'}</span>
                      <span className="font-semibold">{b.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {recent.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl border border-sand-300 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-sand-100 text-start text-xs uppercase text-ink-600">
                  <tr>
                    {['Name', 'Source', 'Tier', 'Status', 'Created'].map((h) => (
                      <th key={h} className="px-3 py-2 text-start">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((l) => (
                    <tr key={l.id} className="border-t border-sand-300">
                      <td className="px-3 py-2">
                        <Link className="underline" href={`/admin/collections/leads/${l.id}`}>
                          {l.name || l.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2">{l.source}</td>
                      <td className="px-3 py-2">{l.tier}</td>
                      <td className="px-3 py-2">{l.status}</td>
                      <td className="px-3 py-2">{String(l.createdAt).slice(0, 16).replace('T', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Collections</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {visible.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/admin/collections/${c.slug}`}
                className="block rounded-xl border border-sand-300 bg-white p-4 hover:border-ink-600"
              >
                <span className="font-semibold">{c.labels.plural}</span>
                <span className="block text-xs text-ink-600">{c.group}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
