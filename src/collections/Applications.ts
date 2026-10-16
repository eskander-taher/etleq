import type { CollectionConfig } from 'payload'

import { hiddenUnless, isAdmin, isAdminOrRecruiter } from '@/access'
import { applicationRetention } from '@/hooks/retention'

/**
 * Job applications. Personal data: readable by admins and recruiters only,
 * never public. Created by the careers form through the Local API.
 */
export const Applications: CollectionConfig = {
  slug: 'applications',
  typescript: { interface: 'Application' },
  admin: {
    group: 'Careers',
    useAsTitle: 'name',
    defaultColumns: ['name', 'job', 'status', 'rating', 'createdAt'],
    hidden: hiddenUnless('admin', 'recruiter'),
  },
  access: {
    read: isAdminOrRecruiter,
    create: isAdminOrRecruiter,
    update: isAdminOrRecruiter,
    delete: isAdmin,
    readVersions: isAdmin,
  },
  hooks: { beforeChange: [applicationRetention] },
  fields: [
    { name: 'job', type: 'relationship', relationTo: 'jobs', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    {
      name: 'cv',
      type: 'upload',
      relationTo: 'private-files',
      filterOptions: { purpose: { equals: 'cv' } },
      admin: { description: 'PDF only, max 5 MB. Opened through a short-lived signed URL.' },
    },
    { name: 'linkedin', type: 'text' },
    { name: 'portfolio', type: 'text' },
    { name: 'answers', type: 'json' },
    {
      name: 'consent',
      type: 'group',
      fields: [
        { name: 'given', type: 'checkbox', defaultValue: false },
        { name: 'at', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'policyVersion', type: 'text' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: ['new', 'screening', 'interview', 'offer', 'hired', 'rejected'].map((v) => ({ label: v, value: v })),
      admin: { position: 'sidebar' },
    },
    { name: 'rating', type: 'number', min: 1, max: 5, admin: { position: 'sidebar' } },
    { name: 'notes', type: 'textarea' },
    {
      name: 'retainUntil',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, description: 'Set automatically; the record is anonymised after this date.' },
    },
    { name: 'anonymisedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'locale', type: 'select', options: ['ar', 'en'].map((v) => ({ label: v, value: v })) },
  ],
}
