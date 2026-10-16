import type { CollectionConfig } from 'payload'

import { evidenceGate } from '@/hooks/gates'
import { contentAccess, contentHooks, contentVersions, isSampleField, previewAdmin, sidebarDate, slugField, translatedField } from './shared'

const hooks = contentHooks(['title', 'answerBox', 'whatItDoes'])

/** SaaS success-story models. The most important template on the site. */
export const Models: CollectionConfig = {
  slug: 'models',
  typescript: { interface: 'Model' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'category', 'tier', '_status'], ...previewAdmin('models') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: { ...hooks, beforeChange: [...(hooks.beforeChange || []), evidenceGate('model')] },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    {
      name: 'answerBox',
      type: 'textarea',
      localized: true,
      admin: { description: '40–60 word direct answer shown at the top of the page (for search and AI assistants).' },
    },
    {
      name: 'category',
      type: 'select',
      options: ['booking', 'membership', 'marketplace', 'directory', 'b2b', 'vertical', 'creator', 'other'].map((v) => ({ label: v, value: v })),
    },
    { name: 'whatItDoes', type: 'textarea', localized: true },
    { name: 'whoPays', type: 'textarea', localized: true },
    { name: 'pricingModel', type: 'textarea', localized: true },
    {
      name: 'mrr',
      type: 'group',
      admin: { description: 'Reported monthly recurring revenue of the success story. Shown with its source, date and a disclaimer.' },
      fields: [
        { name: 'amount', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'USD' },
        { name: 'sourceName', type: 'text' },
        { name: 'sourceUrl', type: 'text' },
        { name: 'reportedAt', type: 'date' },
      ],
    },
    { name: 'teamSize', type: 'number' },
    { name: 'yearFounded', type: 'number' },
    {
      name: 'factSources',
      type: 'array',
      admin: { description: 'At least 3 sources with URL and checked date are required to publish.' },
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'value', type: 'text', localized: true },
        { name: 'url', type: 'text' },
        { name: 'checkedAt', type: 'date' },
      ],
    },
    { name: 'whyItWorks', type: 'richText', localized: true },
    {
      name: 'runningCosts',
      type: 'array',
      fields: [
        { name: 'item', type: 'text', localized: true },
        { name: 'monthlyCost', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'USD' },
        { name: 'sourceUrl', type: 'text' },
        { name: 'checkedAt', type: 'date' },
      ],
    },
    { name: 'gulfVersion', type: 'richText', localized: true },
    { name: 'mvpFeatures', type: 'array', fields: [{ name: 'feature', type: 'text', localized: true }] },
    {
      name: 'tier',
      type: 'select',
      options: [
        { label: 'Core', value: 'core' },
        { label: 'Pro', value: 'pro' },
        { label: 'Vertical', value: 'vertical' },
      ],
    },
    { name: 'priceFrom', type: 'number', admin: { description: 'USD, excluding VAT.' } },
    { name: 'buildDays', type: 'number', defaultValue: 30 },
    { name: 'fitCriteria', type: 'array', fields: [{ name: 'criterion', type: 'text', localized: true }] },
    {
      name: 'reel',
      type: 'group',
      fields: [
        { name: 'url', type: 'text' },
        {
          name: 'platform',
          type: 'select',
          options: [
            { label: 'YouTube', value: 'youtube' },
            { label: 'Instagram', value: 'instagram' },
          ],
        },
        { name: 'posterImage', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'transcript', type: 'textarea', localized: true },
    { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
    { name: 'relatedModels', type: 'relationship', relationTo: 'models', hasMany: true, maxRows: 2 },
    { name: 'relatedSolution', type: 'relationship', relationTo: 'solutions' },
    { name: 'relatedPosts', type: 'relationship', relationTo: 'posts', hasMany: true },
    { name: 'reviewer', type: 'relationship', relationTo: 'authors', admin: { position: 'sidebar' } },
    sidebarDate('lastReviewedAt', 'Required to publish.'),
    { name: 'authors', type: 'relationship', relationTo: 'authors', hasMany: true, admin: { position: 'sidebar' } },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    translatedField(),
    isSampleField(),
  ],
}
