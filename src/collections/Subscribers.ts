import type { CollectionConfig } from 'payload'

import { hiddenUnless, isAdmin, isAdminOrSales } from '@/access'

/** Newsletter subscribers with double opt-in. Admins and sales only. */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  typescript: { interface: 'Subscriber' },
  admin: { group: 'Sales', useAsTitle: 'email', defaultColumns: ['email', 'locale', 'status', 'createdAt'], hidden: hiddenUnless('admin', 'sales') },
  access: {
    read: isAdminOrSales,
    create: isAdminOrSales,
    update: isAdminOrSales,
    delete: isAdmin,
  },
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'locale', type: 'select', options: ['ar', 'en'].map((v) => ({ label: v, value: v })) },
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
      defaultValue: 'pending',
      options: ['pending', 'confirmed', 'unsubscribed'].map((v) => ({ label: v, value: v })),
    },
    {
      name: 'confirmToken',
      type: 'text',
      index: true,
      admin: { readOnly: true },
      // Never expose the token through the API, even to staff.
      access: { read: () => false },
    },
  ],
}
