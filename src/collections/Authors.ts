import type { CollectionConfig } from 'payload'

import { contentAccess, contentHooks, contentVersions, isSampleField, previewAdmin, slugField, translatedField } from './shared'

/** Founders and contributors (`/authors/[slug]`). Used for E-E-A-T and Person schema. */
export const Authors: CollectionConfig = {
  slug: 'authors',
  typescript: { interface: 'Author' },
  admin: { group: 'Content', useAsTitle: 'name', defaultColumns: ['name', 'role', '_status'], ...previewAdmin('authors') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: contentHooks(['name', 'role', 'bio']),
  fields: [
    { name: 'name', type: 'text', localized: true },
    slugField({ from: 'name' }),
    { name: 'role', type: 'text', localized: true },
    { name: 'bio', type: 'textarea', localized: true },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'credentials', type: 'array', fields: [{ name: 'text', type: 'text', localized: true }] },
    { name: 'sameAs', type: 'array', admin: { description: 'Profile links (LinkedIn, X, GitHub…).' }, fields: [{ name: 'url', type: 'text' }] },
    { name: 'user', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
    translatedField(),
    isSampleField(),
  ],
}
