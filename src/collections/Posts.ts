import type { CollectionConfig, Field } from 'payload'

import {
  contentAccess,
  contentHooks,
  contentVersions,
  isSampleField,
  previewAdmin,
  sidebarDate,
  slugField,
  sourcesField,
  translatedField,
} from './shared'

/** Fields shared by posts and guides (guides add type, answerBox, comparisonTable, reviewer). */
export const articleFields = (): Field[] => [
  { name: 'title', type: 'text', localized: true },
  slugField(),
  { name: 'excerpt', type: 'textarea', localized: true },
  { name: 'keyTakeaways', type: 'array', fields: [{ name: 'text', type: 'text', localized: true }] },
  { name: 'content', type: 'richText', localized: true },
  { name: 'heroImage', type: 'upload', relationTo: 'media' },
  { name: 'authors', type: 'relationship', relationTo: 'authors', hasMany: true, admin: { position: 'sidebar' } },
  { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, admin: { position: 'sidebar' } },
  { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, admin: { position: 'sidebar' } },
  sidebarDate('publishedAt'),
  sidebarDate('lastReviewedAt'),
  sourcesField(),
  { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
  { name: 'relatedPosts', type: 'relationship', relationTo: 'posts', hasMany: true },
  translatedField(),
  isSampleField(),
]

export const Posts: CollectionConfig = {
  slug: 'posts',
  typescript: { interface: 'Post' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'publishedAt', '_status'], ...previewAdmin('posts') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: contentHooks(['title', 'excerpt', 'content']),
  defaultSort: '-publishedAt',
  fields: articleFields(),
}
