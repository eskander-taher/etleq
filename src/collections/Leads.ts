import type { CollectionConfig } from 'payload'

import { hiddenUnless, isAdmin, isAdminOrSales } from '@/access'
import { leadRetention } from '@/hooks/retention'

/**
 * Leads from the scorecard, contact form, booking, newsletter, playbook and
 * WhatsApp. Personal data: admins and sales only, never public. Public forms
 * create leads through server actions using the Local API.
 */
export const Leads: CollectionConfig = {
  slug: 'leads',
  typescript: { interface: 'Lead' },
  admin: {
    group: 'Sales',
    useAsTitle: 'name',
    defaultColumns: ['name', 'source', 'score', 'tier', 'status', 'createdAt'],
    hidden: hiddenUnless('admin', 'sales'),
  },
  access: {
    read: isAdminOrSales,
    create: isAdminOrSales,
    update: isAdminOrSales,
    delete: isAdmin,
    readVersions: isAdmin,
  },
  hooks: { beforeChange: [leadRetention] },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'phone',
      type: 'text',
      validate: (v: unknown) => !v || (typeof v === 'string' && /^\+[1-9]\d{6,14}$/.test(v)) || 'Use E.164 format, e.g. +966500000000.',
      admin: { description: 'WhatsApp number in E.164 format.' },
    },
    { name: 'email', type: 'email' },
    { name: 'country', type: 'text' },
    { name: 'company', type: 'text' },
    {
      name: 'source',
      type: 'select',
      options: ['scorecard', 'contact', 'booking', 'newsletter', 'playbook', 'whatsapp'].map((v) => ({ label: v, value: v })),
    },
    { name: 'answers', type: 'json' },
    { name: 'score', type: 'number' },
    {
      name: 'tier',
      type: 'select',
      options: [
        { label: 'Ready to launch', value: 'ready' },
        { label: 'Almost ready', value: 'almost' },
        { label: 'Explore first', value: 'explore' },
      ],
    },
    { name: 'disqualifiers', type: 'json', admin: { description: 'Array of disqualifier reasons (string[]).' } },
    { name: 'modelSlug', type: 'text' },
    { name: 'landingPage', type: 'text' },
    {
      name: 'utm',
      type: 'group',
      fields: ['source', 'medium', 'campaign', 'content', 'term'].map((name) => ({ name, type: 'text' as const })),
    },
    { name: 'clickIds', type: 'json' },
    { name: 'firstTouch', type: 'json' },
    { name: 'lastTouch', type: 'json' },
    { name: 'referrer', type: 'text' },
    { name: 'refCode', type: 'text' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      options: ['new', 'contacted', 'booked', 'blueprint', 'won', 'lost'].map((v) => ({ label: v, value: v })),
      admin: { position: 'sidebar' },
    },
    { name: 'owner', type: 'relationship', relationTo: 'users', admin: { position: 'sidebar' } },
    { name: 'notes', type: 'textarea' },
    { name: 'message', type: 'textarea' },
    {
      name: 'consent',
      type: 'group',
      fields: [
        { name: 'given', type: 'checkbox', defaultValue: false },
        { name: 'at', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        { name: 'policyVersion', type: 'text' },
        { name: 'marketing', type: 'checkbox', defaultValue: false, admin: { description: 'Separate, unticked-by-default marketing opt-in.' } },
      ],
    },
    {
      name: 'locale',
      type: 'select',
      options: [
        { label: 'العربية', value: 'ar' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'retainUntil',
      type: 'date',
      admin: { position: 'sidebar', readOnly: true, description: 'Set automatically; the record is anonymised after this date.' },
    },
    { name: 'anonymisedAt', type: 'date', admin: { position: 'sidebar', readOnly: true } },
  ],
}
