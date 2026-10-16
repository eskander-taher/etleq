import type { CollectionConfig } from 'payload'

import { contentAccess, contentHooks, contentVersions, isSampleField, previewAdmin, slugField, translatedField } from './shared'

export const Solutions: CollectionConfig = {
  slug: 'solutions',
  typescript: { interface: 'Solution' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'vertical', '_status'], ...previewAdmin('solutions') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: contentHooks(['title', 'summary']),
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    {
      name: 'vertical',
      type: 'select',
      options: [
        { label: 'Clinics', value: 'clinics' },
        { label: 'Gyms', value: 'gyms' },
        { label: 'Salons', value: 'salons' },
        { label: 'Restaurants', value: 'restaurants' },
        { label: 'Training centres', value: 'training-centres' },
      ],
    },
    { name: 'summary', type: 'textarea', localized: true },
    { name: 'buyerProblems', type: 'array', fields: [{ name: 'problem', type: 'text', localized: true }] },
    {
      name: 'features',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'icon', type: 'text', admin: { description: 'lucide-react icon name' } },
      ],
    },
    {
      name: 'integrations',
      type: 'array',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'description', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'video',
      type: 'group',
      fields: [
        { name: 'url', type: 'text' },
        { name: 'posterImage', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'priceFrom', type: 'number', admin: { description: 'USD, excluding VAT.' } },
    {
      name: 'steps',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
      ],
    },
    { name: 'caseStudies', type: 'relationship', relationTo: 'projects', hasMany: true },
    { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
    translatedField(),
    isSampleField(),
  ],
}
