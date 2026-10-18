import Link from 'next/link'
import { notFound } from 'next/navigation'

import { titleOf } from '@/cms/admin-data'
import { canRead, canWrite, requireAdminUser } from '@/cms/auth'
import { type Doc, isLocaleMap } from '@/cms/fields'
import { cms } from '@/cms/local'
import { type Field, getCollectionConfig } from '@/cms/schema'
import type { CollectionSlug, Where } from '@/cms/types'
import { UploadButton } from '@/components/admin/UploadButton'

const PER_PAGE = 25

export async function generateMetadata({ params }: { params: Promise<{ collection: string }> }) {
  const config = getCollectionConfig((await params).collection)
  return { title: config?.labels.plural ?? 'Not found' }
}

function cell(value: unknown, field: Field | undefined, labels: Map<string, string>): string {
  if (value == null || value === '') return '—'
  if (isLocaleMap(value)) return cell(value.ar ?? value.en, field, labels)
  if (field?.type === 'relationship' || field?.type === 'upload') {
    const ids = Array.isArray(value) ? value : [value]
    return ids.map((id) => labels.get(String(id)) ?? String(id)).join(', ')
  }
  if (field?.type === 'checkbox' || typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (field?.type === 'date' || /^\d{4}-\d{2}-\d{2}T/.test(String(value))) return String(value).slice(0, 10)
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 60)
  return String(value).slice(0, 80)
}

export default async function ListPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>
  searchParams: Promise<{ q?: string; page?: string; status?: string }>
}) {
  const user = await requireAdminUser()
  const config = getCollectionConfig((await params).collection)
  if (!config || !canRead(user, config)) notFound()
  const { q, page: pageParam, status } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam || '1', 10) || 1)

  const and: Where[] = []
  if (q) {
    const titleField = config.fields.find((f) => f.name === config.useAsTitle)
    and.push(
      titleField?.localized
        ? { or: [{ [`${config.useAsTitle}.ar`]: { like: q } }, { [`${config.useAsTitle}.en`]: { like: q } }] }
        : { [config.useAsTitle]: { like: q } },
    )
  }
  if (config.drafts && (status === 'draft' || status === 'published')) and.push({ _status: { equals: status } })
  if (config.slug === 'private-files' && user.role !== 'admin')
    and.push({ purpose: { equals: user.role === 'recruiter' ? 'cv' : 'consent' } })

  const res = await cms.find({
    collection: config.slug as CollectionSlug,
    locale: 'all',
    where: and.length ? { and } : undefined,
    limit: PER_PAGE,
    page,
    sort: config.defaultSort ?? '-updatedAt',
  })
  const docs = res.docs as Doc[]

  const columns = [config.useAsTitle, ...config.defaultColumns.filter((c) => c !== config.useAsTitle)]
  const fieldOf = (name: string) => config.fields.find((f) => f.name === name)

  // Labels for relation columns (e.g. the job of an application).
  const labels = new Map<string, string>()
  for (const name of columns) {
    const field = fieldOf(name)
    if (field?.type !== 'relationship' && field?.type !== 'upload') continue
    const target = getCollectionConfig(field.relationTo)
    const ids = [
      ...new Set(docs.flatMap((d) => (Array.isArray(d[name]) ? d[name] : d[name] ? [d[name]] : [])).map(String)),
    ]
    if (!target || !ids.length) continue
    const related = await cms.find({
      collection: target.slug as CollectionSlug,
      locale: 'all',
      where: { id: { in: ids } },
      limit: 0,
      pagination: false,
    })
    for (const r of related.docs as Doc[]) labels.set(String(r.id), titleOf(target, r))
  }

  const query = (extra: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams()
    const all = { q, status, page, ...extra }
    for (const [k, v] of Object.entries(all)) if (v && !(k === 'page' && Number(v) === 1)) p.set(k, String(v))
    const s = p.toString()
    return `/admin/collections/${config.slug}${s ? `?${s}` : ''}`
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{config.labels.plural}</h1>
        <span className="text-sm text-ink-600">{res.totalDocs} total</span>
        <div className="ms-auto">
          {canWrite(user, config) &&
            (config.upload ? (
              <UploadButton
                collection={config.slug}
                purpose={config.upload === 'private' ? (user.role === 'editor' ? 'consent' : 'cv') : undefined}
              />
            ) : (
              <Link
                href={`/admin/collections/${config.slug}/new`}
                className="rounded-lg bg-ignition-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-[#ff7343]"
              >
                New {config.labels.singular.toLowerCase()}
              </Link>
            ))}
        </div>
      </div>

      <form className="mt-4 flex flex-wrap gap-2" action={`/admin/collections/${config.slug}`}>
        <input
          name="q"
          defaultValue={q}
          placeholder={`Search ${config.useAsTitle}…`}
          className="w-64 rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-sm"
        />
        {config.drafts && (
          <select
            name="status"
            defaultValue={status ?? ''}
            className="rounded-lg border border-sand-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        )}
        <button type="submit" className="rounded-lg border border-ink-950 px-3 py-1.5 text-sm font-medium">
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-sand-300 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-sand-100 text-xs uppercase text-ink-600">
            <tr>
              {config.upload === 'media' && <th className="w-14 px-3 py-2" />}
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 text-start">
                  {c === '_status' ? 'Status' : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-8 text-center text-ink-600">
                  Nothing here yet.
                </td>
              </tr>
            )}
            {docs.map((doc) => (
              <tr key={doc.id} className="border-t border-sand-300 hover:bg-sand-50">
                {config.upload === 'media' && (
                  <td className="px-3 py-2">
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin thumbnail */}
                    {doc.url && <img src={doc.url} alt="" className="size-10 rounded object-cover" />}
                  </td>
                )}
                {columns.map((c, i) => (
                  <td key={c} className="px-3 py-2">
                    {i === 0 ? (
                      <Link href={`/admin/collections/${config.slug}/${doc.id}`} className="font-medium underline">
                        {c === config.useAsTitle ? titleOf(config, doc) || doc.id : cell(doc[c], fieldOf(c), labels)}
                      </Link>
                    ) : c === '_status' ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${doc._status === 'published' ? 'bg-verified-600 text-white' : 'bg-sand-300'}`}
                      >
                        {doc._status ?? 'draft'}
                      </span>
                    ) : (
                      cell(doc[c], fieldOf(c), labels)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {res.totalPages > 1 && (
        <nav className="mt-4 flex items-center gap-3 text-sm" aria-label="Pagination">
          {res.hasPrevPage && (
            <Link href={query({ page: page - 1 })} className="underline">
              Previous
            </Link>
          )}
          <span>
            Page {res.page} of {res.totalPages}
          </span>
          {res.hasNextPage && (
            <Link href={query({ page: page + 1 })} className="underline">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
