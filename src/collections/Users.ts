import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminFieldLevel, isAdminOrSelf } from '@/access'

export const Users: CollectionConfig = {
  slug: 'users',
  typescript: { interface: 'User' },
  auth: {
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 minutes
    tokenExpiration: 60 * 60 * 8,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Admin',
  },
  access: {
    read: isAdminOrSelf,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
    unlock: isAdmin,
    admin: ({ req }) => Boolean(req.user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Recruiter', value: 'recruiter' },
        { label: 'Sales', value: 'sales' },
      ],
      access: {
        // Only admins can grant or change roles (a user cannot promote themselves).
        create: isAdminFieldLevel,
        update: isAdminFieldLevel,
      },
      admin: { position: 'sidebar' },
    },
  ],
}
