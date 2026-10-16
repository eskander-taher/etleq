import type { CollectionConfig } from 'payload'

import { projectConsentGate } from '@/hooks/gates'
import { contentAccess, contentHooks, contentVersions, isSampleField, previewAdmin, sidebarDate, slugField, translatedField } from './shared'

const hooks = contentHooks(['title', 'context'])

/**
 * Real client case studies. Publishing requires the client's consent (checkbox
 * and file). Results with `verified: false` are stored but hidden publicly.
 */
export const Projects: CollectionConfig = {
  slug: 'projects',
  typescript: { interface: 'Project' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'clientName', '_status'], ...previewAdmin('projects') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: { ...hooks, beforeChange: [...(hooks.beforeChange || []), projectConsentGate] },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    { name: 'clientName', type: 'text' },
    { name: 'clientLogo', type: 'upload', relationTo: 'media' },
    {
      name: 'consentGiven',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Required (with the consent file) to publish.' },
    },
    {
      name: 'consentFile',
      type: 'upload',
      relationTo: 'private-files',
      admin: { position: 'sidebar' },
      filterOptions: { purpose: { equals: 'consent' } },
    },
    { name: 'context', type: 'textarea', localized: true },
    { name: 'challenge', type: 'richText', localized: true },
    { name: 'solution', type: 'richText', localized: true },
    { name: 'scope', type: 'array', fields: [{ name: 'item', type: 'text', localized: true }] },
    { name: 'stack', type: 'array', fields: [{ name: 'name', type: 'text' }] },
    { name: 'plannedDays', type: 'number' },
    { name: 'actualDays', type: 'number' },
    {
      name: 'results',
      type: 'array',
      admin: { description: 'Only verified results are shown on the site.' },
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'value', type: 'text' },
        { name: 'verified', type: 'checkbox', defaultValue: false },
        { name: 'evidence', type: 'text', admin: { description: 'Link or note proving the result (internal).' } },
      ],
    },
    { name: 'gallery', type: 'array', fields: [{ name: 'image', type: 'upload', relationTo: 'media' }] },
    { name: 'testimonial', type: 'relationship', relationTo: 'testimonials' },
    { name: 'relatedModel', type: 'relationship', relationTo: 'models' },
    sidebarDate('publishedAt'),
    translatedField(),
    isSampleField(),
  ],
}
