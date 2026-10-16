import type { CollectionConfig } from 'payload'

import { translationGate } from '@/hooks/gates'
import { revalidateTagOnly } from '@/hooks/revalidate'
import { contentAccess, isSampleField, slugField, translatedField } from './shared'

/**
 * Categories and tags. They carry `_status` (drafts) like other public content
 * so that `publicWhere()` works for them too.
 */
const taxonomy = (slug: 'categories' | 'tags', singular: string, plural: string, iface: string): CollectionConfig => ({
  slug,
  typescript: { interface: iface },
  labels: { singular, plural },
  admin: { group: 'Content', useAsTitle: 'name', defaultColumns: ['name', 'slug', '_status'] },
  access: contentAccess(),
  versions: { drafts: true },
  hooks: { beforeChange: [translationGate(['name'])], afterChange: [revalidateTagOnly] },
  fields: [
    { name: 'name', type: 'text', localized: true },
    slugField({ from: 'name' }),
    { name: 'description', type: 'textarea', localized: true },
    translatedField(),
    isSampleField(),
  ],
})

export const Categories = taxonomy('categories', 'Category', 'Categories', 'Category')
export const Tags = taxonomy('tags', 'Tag', 'Tags', 'Tag')
