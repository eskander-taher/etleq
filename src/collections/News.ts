import type { CollectionConfig } from 'payload'

import { contentAccess, contentHooks, contentVersions, isSampleField, previewAdmin, sidebarDate, slugField, translatedField } from './shared'

export const News: CollectionConfig = {
  slug: 'news',
  typescript: { interface: 'News' },
  labels: { singular: 'News item', plural: 'News' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'publishedAt', '_status'], ...previewAdmin('news') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: contentHooks(['title', 'excerpt']),
  defaultSort: '-publishedAt',
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'content', type: 'richText', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    sidebarDate('publishedAt'),
    {
      name: 'sourceLinks',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url', type: 'text' },
      ],
    },
    translatedField(),
    isSampleField(),
  ],
}
