import type { CollectionConfig } from 'payload'

import { hasRole, isAdminOrEditor } from '@/access'
import { revalidateAfterDelete, revalidateTagOnly } from '@/hooks/revalidate'

/**
 * Real testimonials only: named person, company, photo and recorded consent.
 * Anonymous visitors only see verified testimonials.
 */
export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  typescript: { interface: 'Testimonial' },
  admin: { group: 'Content', useAsTitle: 'person', defaultColumns: ['person', 'company', 'verified'] },
  access: {
    read: ({ req }) => (hasRole(req.user as { role?: string } | null, 'admin', 'editor') ? true : { verified: { equals: true } }),
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  hooks: { afterChange: [revalidateTagOnly], afterDelete: [revalidateAfterDelete] },
  fields: [
    { name: 'person', type: 'text', required: true },
    { name: 'role', type: 'text', localized: true },
    { name: 'company', type: 'text' },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'quote', type: 'textarea', localized: true },
    { name: 'videoUrl', type: 'text' },
    {
      name: 'consentFile',
      type: 'upload',
      relationTo: 'private-files',
      filterOptions: { purpose: { equals: 'consent' } },
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar', description: 'Only verified testimonials (with a consent file) are shown on the site.' },
      validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) =>
        !value || Boolean(siblingData?.consentFile) || 'Attach the consent file before marking a testimonial as verified.',
    },
    { name: 'relatedProject', type: 'relationship', relationTo: 'projects' },
  ],
}
