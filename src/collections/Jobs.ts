import type { CollectionConfig } from 'payload'

import { hiddenUnless } from '@/access'
import { contentAccess, contentHooks, contentVersions, isSampleField, previewAdmin, sidebarDate, slugField, translatedField } from './shared'

const ISO2 = { validate: (v: unknown) => !v || (typeof v === 'string' && /^[A-Z]{2}$/.test(v)) || 'Use a 2-letter ISO country code, e.g. SA.' }

/** Job postings. Edited by admins and recruiters. Publishing notifies Google's Indexing API. */
export const Jobs: CollectionConfig = {
  slug: 'jobs',
  typescript: { interface: 'Job' },
  admin: {
    group: 'Careers',
    useAsTitle: 'title',
    defaultColumns: ['title', 'team', 'status', '_status'],
    hidden: hiddenUnless('admin', 'recruiter'),
    ...previewAdmin('jobs'),
  },
  access: contentAccess('admin', 'recruiter'),
  versions: contentVersions,
  hooks: contentHooks(['title', 'description']),
  defaultSort: '-datePosted',
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    {
      name: 'team',
      type: 'select',
      options: ['engineering', 'design', 'growth', 'operations'].map((v) => ({ label: v, value: v })),
    },
    {
      name: 'employmentType',
      type: 'select',
      options: ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN'].map((v) => ({ label: v, value: v })),
    },
    { name: 'city', type: 'text' },
    { name: 'country', type: 'text', ...ISO2 },
    {
      name: 'workplace',
      type: 'select',
      options: ['onsite', 'hybrid', 'remote'].map((v) => ({ label: v, value: v })),
    },
    {
      name: 'applicantLocationRequirements',
      type: 'array',
      admin: { description: 'For remote roles: countries applicants must be in (ISO2).' },
      fields: [{ name: 'country', type: 'text', ...ISO2 }],
    },
    { name: 'description', type: 'richText', localized: true },
    { name: 'responsibilities', type: 'array', fields: [{ name: 'item', type: 'text', localized: true }] },
    { name: 'requirements', type: 'array', fields: [{ name: 'item', type: 'text', localized: true }] },
    {
      name: 'salary',
      type: 'group',
      fields: [
        { name: 'min', type: 'number' },
        { name: 'max', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'SAR' },
        {
          name: 'unit',
          type: 'select',
          defaultValue: 'MONTH',
          options: ['HOUR', 'MONTH', 'YEAR'].map((v) => ({ label: v, value: v })),
        },
        { name: 'show', type: 'checkbox', defaultValue: false },
      ],
    },
    sidebarDate('datePosted'),
    sidebarDate('validThrough'),
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
      admin: { position: 'sidebar' },
    },
    { name: 'roleQuestions', type: 'array', fields: [{ name: 'question', type: 'text', localized: true }] },
    translatedField(),
    isSampleField(),
  ],
}
