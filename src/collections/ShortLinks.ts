import type { CollectionConfig } from 'payload'

import { anyone, isAdminOrEditor } from '@/access'

/** Short links used in reels and bios: `/go/<code>` → target path with UTM parameters. */
export const ShortLinks: CollectionConfig = {
  slug: 'short-links',
  typescript: { interface: 'ShortLink' },
  labels: { singular: 'Short link', plural: 'Short links' },
  admin: { group: 'Marketing', useAsTitle: 'code', defaultColumns: ['code', 'target', 'utm.campaign'] },
  access: {
    read: anyone,
    create: isAdminOrEditor,
    update: isAdminOrEditor,
    delete: isAdminOrEditor,
  },
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]{1,32}$/.test(v)) || 'Lowercase letters, numbers and hyphens only.',
    },
    {
      name: 'target',
      type: 'text',
      required: true,
      validate: (v: unknown) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//')) || 'Use a site path starting with "/", e.g. /models/barber-booking-app.',
    },
    {
      name: 'utm',
      type: 'group',
      fields: ['source', 'medium', 'campaign', 'content'].map((name) => ({ name, type: 'text' as const })),
    },
    { name: 'isSample', type: 'checkbox', defaultValue: false, admin: { position: 'sidebar' } },
  ],
}
