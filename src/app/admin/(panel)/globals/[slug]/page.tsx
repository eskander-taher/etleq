import { notFound } from 'next/navigation'

import { clientFields, editableDoc, relationOptions } from '@/cms/admin-data'
import { requireAdminUser } from '@/cms/auth'
import type { Doc } from '@/cms/fields'
import { cms } from '@/cms/local'
import { getGlobalConfig } from '@/cms/schema'
import type { GlobalSlug } from '@/cms/types'
import { DocumentForm } from '@/components/admin/DocumentForm'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return { title: getGlobalConfig((await params).slug)?.label ?? 'Not found' }
}

export default async function GlobalPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireAdminUser()
  const config = getGlobalConfig((await params).slug)
  if (!config || !config.access.write.includes(user.role)) notFound()
  const doc = (await cms.findGlobal({ slug: config.slug as GlobalSlug, locale: 'all' })) as Doc

  return (
    <div>
      <h1 className="text-2xl font-bold">{config.label}</h1>
      {config.description && <p className="mb-4 mt-1 max-w-3xl text-sm text-ink-600">{config.description}</p>}
      <DocumentForm
        target={{ kind: 'global', slug: config.slug }}
        fields={clientFields(config.fields)}
        initial={editableDoc(config.fields, doc)}
        options={await relationOptions(config.fields)}
      />
    </div>
  )
}
