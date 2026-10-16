import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '@/access'

/**
 * Public images. In production files go to the public S3/R2 bucket and are
 * served from its CDN domain (`disablePayloadAccessControl`), so nothing
 * public depends on `/api`.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  typescript: { interface: 'Media' },
  admin: { group: 'Content', useAsTitle: 'alt' },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*'],
    focalPoint: true,
    crop: true,
    imageSizes: [
      { name: 'thumbnail', width: 400 },
      { name: 'card', width: 800 },
      { name: 'hero', width: 1600 },
      { name: 'og', width: 1200, height: 630, position: 'centre' },
    ],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      required: true,
      admin: { description: 'Describe the image for screen readers, in this language.' },
    },
    { name: 'caption', type: 'text', localized: true },
    { name: 'credit', type: 'text' },
  ],
}
