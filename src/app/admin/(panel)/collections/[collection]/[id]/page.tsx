import Link from 'next/link'
import { notFound } from 'next/navigation'

import { clientFields, editableDoc, relationOptions, titleOf } from '@/cms/admin-data'
import { canDelete, canRead, canWrite, privateFileVisible, requireAdminUser } from '@/cms/auth'
import type { Doc } from '@/cms/fields'
import { cms } from '@/cms/local'
import { type Field, getCollectionConfig } from '@/cms/schema'
import type { CollectionSlug } from '@/cms/types'
import { DeleteButton } from '@/components/admin/DeleteButton'
import { DocumentForm } from '@/components/admin/DocumentForm'
import { basePath, localizedPath } from '@/hooks/paths'

export const metadata = { title: 'Edit' }

export default async function EditPage({ params }: { params: Promise<{ collection: string; id: string }> }) {
  const user = await requireAdminUser()
  const { collection, id } = await params
  const config = getCollectionConfig(collection)
  if (!config || !canRead(user, config)) notFound()
  const isNew = id === 'new'
  if (isNew && (config.upload || !canWrite(user, config))) notFound()

  let doc: Doc = {}
  if (!isNew) {
    try {
      doc = (await cms.findByID({ collection: config.slug as CollectionSlug, id, locale: 'all', depth: 0 })) as Doc
    } catch {
      notFound()
    }
    if (config.slug === 'private-files' && !privateFileVisible(user, doc.purpose)) notFound()
  }

  const fields: Field[] = config.auth
    ? [
        ...config.fields,
        {
          name: 'password',
          type: 'text',
          label: isNew ? 'Password' : 'New password',
          description: isNew ? undefined : 'Leave empty to keep the current password.',
        },
      ]
    : config.fields
  const writable = canWrite(user, config)
  const formFields = clientFields(writable ? fields : (fields.map((f) => ({ ...f, readOnly: true })) as Field[]))

  const path = !isNew ? basePath(config.slug, doc) : null
  const viewUrls = path
    ? {
        ar: doc.translated?.ar ? localizedPath(path, 'ar') : undefined,
        en: doc.translated?.en ? localizedPath(path, 'en') : undefined,
      }
    : undefined

  return (
    <div>
      <p className="text-sm">
        <Link href={`/admin/collections/${config.slug}`} className="text-ink-600 underline">
          {config.labels.plural}
        </Link>
      </p>
      <h1 className="mb-4 mt-1 text-2xl font-bold">
        {isNew ? `New ${config.labels.singular.toLowerCase()}` : titleOf(config, doc) || config.labels.singular}
      </h1>

      {config.upload === 'media' && doc.url && (
        // eslint-disable-next-line @next/next/no-img-element -- admin preview
        <img src={doc.url} alt="" className="mb-6 max-h-64 rounded-lg border border-sand-300 bg-white object-contain" />
      )}
      {config.upload === 'private' && !isNew && (
        <a
          href={`/admin/files/${doc.id}`}
          target="_blank"
          rel="noreferrer"
          className="mb-6 inline-block rounded-lg border border-ink-950 px-3 py-1.5 text-sm font-medium"
        >
          Open PDF
        </a>
      )}

      <DocumentForm
        target={{ kind: 'collection', slug: config.slug, id: isNew ? null : String(doc.id) }}
        fields={formFields}
        initial={editableDoc(config.fields, doc)}
        options={await relationOptions(config.fields)}
        drafts={config.drafts}
        viewUrls={viewUrls}
        extraActions={
          !isNew && canDelete(user, config) ? <DeleteButton collection={config.slug} id={String(doc.id)} /> : null
        }
      />

      {!isNew && (
        <p className="mt-8 text-xs text-ink-600">
          Created{' '}
          {String(doc.createdAt ?? '')
            .slice(0, 16)
            .replace('T', ' ')}{' '}
          · Updated{' '}
          {String(doc.updatedAt ?? '')
            .slice(0, 16)
            .replace('T', ' ')}
        </p>
      )}
    </div>
  )
}
