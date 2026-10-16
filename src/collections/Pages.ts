import type { CollectionConfig } from 'payload'

import { layoutBlocks } from '@/blocks/layoutBlocks'
import { contentAccess, contentHooks, contentVersions, isSampleField, previewAdmin, slugField, translatedField } from './shared'

/** Editable pages. The home page is the page with slug `home`. */
export const Pages: CollectionConfig = {
  slug: 'pages',
  typescript: { interface: 'Page' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'slug', '_status', 'updatedAt'], ...previewAdmin('pages') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: contentHooks(['title']),
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    { name: 'layout', type: 'blocks', localized: true, blocks: layoutBlocks },
    translatedField(),
    isSampleField(),
  ],
}
