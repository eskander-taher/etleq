import type { CollectionConfig } from 'payload'

import { hasRole, hiddenUnless, isAdmin, privateFilesAccess } from '@/access'
import { validatePrivateUpload } from '@/hooks/privateFiles'

/**
 * Private PDFs: CVs (recruiters) and consent files (editors). Never public.
 * In production they live in the private bucket and are opened through
 * short-lived signed URLs. PDF only (checked by file signature), max 5 MB.
 */
export const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  typescript: { interface: 'PrivateFile' },
  labels: { singular: 'Private file', plural: 'Private files' },
  admin: { group: 'Private', useAsTitle: 'filename', hidden: hiddenUnless('admin', 'recruiter', 'editor') },
  access: {
    read: privateFilesAccess,
    create: ({ req }) => hasRole(req.user as { role?: string } | null, 'admin', 'recruiter', 'editor'),
    update: privateFilesAccess,
    delete: isAdmin,
  },
  upload: {
    staticDir: 'private-media',
    mimeTypes: ['application/pdf'],
    // Local disk fallback: files are only served through Payload's access-controlled route.
  },
  hooks: {
    beforeValidate: [validatePrivateUpload],
  },
  fields: [
    {
      name: 'purpose',
      type: 'select',
      required: true,
      defaultValue: 'cv',
      index: true,
      options: [
        { label: 'CV', value: 'cv' },
        { label: 'Consent record', value: 'consent' },
      ],
      admin: { description: 'Decides who can open the file: recruiters see CVs, editors see consent records.' },
    },
    { name: 'note', type: 'text' },
  ],
}
