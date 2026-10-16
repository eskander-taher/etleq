import type { CollectionConfig } from 'payload'

import { translationGate } from '@/hooks/gates'
import { revalidateAfterDelete, revalidateTagOnly } from '@/hooks/revalidate'
import { contentAccess, contentVersions, isSampleField, translatedField } from './shared'

export const Faqs: CollectionConfig = {
  slug: 'faqs',
  typescript: { interface: 'Faq' },
  labels: { singular: 'FAQ', plural: 'FAQs' },
  admin: { group: 'Content', useAsTitle: 'question', defaultColumns: ['question', 'category', 'order', '_status'] },
  access: contentAccess(),
  versions: contentVersions,
  defaultSort: 'order',
  hooks: {
    beforeChange: [translationGate(['question', 'answer'])],
    afterChange: [revalidateTagOnly],
    afterDelete: [revalidateAfterDelete],
  },
  fields: [
    { name: 'question', type: 'text', localized: true },
    { name: 'answer', type: 'textarea', localized: true },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'general',
      options: ['price', 'ownership', 'timeline', 'payments', 'hosting', 'languages', 'equity', 'refunds', 'process', 'general'].map((v) => ({
        label: v,
        value: v,
      })),
    },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    translatedField(),
    isSampleField(),
  ],
}
