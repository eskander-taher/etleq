import type { Field, GlobalConfig } from 'payload'

import { anyone, isAdminOrEditor } from '@/access'
import { revalidateGlobalAfterChange } from '@/hooks/revalidate'

const access: GlobalConfig['access'] = { read: anyone, update: isAdminOrEditor }
const hooks: GlobalConfig['hooks'] = { afterChange: [revalidateGlobalAfterChange] }

const link = (): Field[] => [
  { name: 'label', type: 'text', localized: true, required: true },
  { name: 'href', type: 'text', required: true },
]

const textRows = (name: string): Field => ({ name, type: 'array', fields: [{ name: 'text', type: 'text', localized: true }] })

const ISO2 = { validate: (v: unknown) => !v || (typeof v === 'string' && /^[A-Z]{2}$/.test(v)) || 'Use a 2-letter ISO country code, e.g. SA.' }

export const Header: GlobalConfig = {
  slug: 'header',
  typescript: { interface: 'Header' },
  admin: { group: 'Site' },
  access,
  hooks,
  fields: [
    { name: 'nav', type: 'array', fields: link() },
    { name: 'ctaLabel', type: 'text', localized: true },
  ],
}

export const Footer: GlobalConfig = {
  slug: 'footer',
  typescript: { interface: 'Footer' },
  admin: { group: 'Site' },
  access,
  hooks,
  fields: [
    {
      name: 'columns',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'links', type: 'array', fields: link() },
      ],
    },
    {
      name: 'social',
      type: 'array',
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    { name: 'legalLinks', type: 'array', fields: link() },
  ],
}

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  typescript: { interface: 'SiteSettings' },
  admin: { group: 'Site' },
  access,
  hooks,
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'slotsTotal', type: 'number', min: 0, defaultValue: 4, admin: { description: 'Launch slots this month (real capacity only).' } },
        { name: 'slotsLeft', type: 'number', min: 0, defaultValue: 4 },
      ],
    },
    { name: 'foundingPriceActive', type: 'checkbox', defaultValue: false },
    { name: 'foundingPrice', type: 'number', admin: { description: 'USD' } },
    { name: 'foundingSlots', type: 'number' },
    {
      name: 'whatsappNumber',
      type: 'text',
      validate: (v: unknown) => !v || (typeof v === 'string' && /^[1-9]\d{6,14}$/.test(v)) || 'E.164 digits without "+", e.g. 966500000000.',
    },
    { name: 'responseTimePromise', type: 'text', localized: true },
    {
      name: 'bookingUrls',
      type: 'group',
      fields: [
        { name: 'ar', type: 'text' },
        { name: 'en', type: 'text' },
      ],
    },
    { name: 'contactEmail', type: 'email' },
    {
      name: 'legalEntities',
      type: 'array',
      fields: [
        { name: 'legalName', type: 'text', localized: true },
        { name: 'country', type: 'text', ...ISO2 },
        { name: 'crNumber', type: 'text' },
        { name: 'vatNumber', type: 'text' },
        { name: 'address', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'retention',
      type: 'group',
      admin: { description: 'Defaults for the founders and lawyer to confirm.' },
      fields: [
        { name: 'leadsMonths', type: 'number', defaultValue: 24, min: 1 },
        { name: 'applicationsMonths', type: 'number', defaultValue: 12, min: 1 },
      ],
    },
    { name: 'policyVersion', type: 'text', defaultValue: '2026-10-draft' },
  ],
}

export const Offer: GlobalConfig = {
  slug: 'offer',
  typescript: { interface: 'Offer' },
  admin: { group: 'Site' },
  access,
  hooks,
  fields: [
    {
      name: 'blueprint',
      type: 'group',
      fields: [
        { name: 'name', type: 'text', localized: true },
        { name: 'price', type: 'number', defaultValue: 390 },
        { name: 'description', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'tiers',
      type: 'array',
      fields: [
        {
          name: 'key',
          type: 'select',
          required: true,
          options: [
            { label: 'Core', value: 'core' },
            { label: 'Pro', value: 'pro' },
            { label: 'Vertical', value: 'vertical' },
          ],
        },
        { name: 'name', type: 'text', localized: true },
        { name: 'priceFrom', type: 'number' },
        { name: 'description', type: 'textarea', localized: true },
        textRows('features'),
      ],
    },
    {
      name: 'bonuses',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', localized: true },
        { name: 'statedValue', type: 'number' },
        { name: 'description', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'carePlans',
      type: 'array',
      fields: [{ name: 'name', type: 'text', localized: true }, { name: 'monthlyPrice', type: 'number' }, textRows('features')],
    },
    { name: 'guarantee', type: 'textarea', localized: true },
    { name: 'guaranteeHonestLine', type: 'text', localized: true },
    { name: 'paymentTerms', type: 'textarea', localized: true },
    textRows('notIncluded'),
    { name: 'confirmed', type: 'checkbox', defaultValue: false, admin: { description: 'Tick once the founders have confirmed prices and terms.' } },
  ],
}

export const ScorecardSettings: GlobalConfig = {
  slug: 'scorecard-settings',
  typescript: { interface: 'ScorecardSettings' },
  admin: { group: 'Site' },
  access,
  hooks,
  fields: [
    {
      name: 'questions',
      type: 'array',
      fields: [
        { name: 'key', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          defaultValue: 'single',
          options: [
            { label: 'Single choice', value: 'single' },
            { label: 'Free text', value: 'text' },
            { label: 'Model (routing only)', value: 'model' },
          ],
        },
        { name: 'prompt', type: 'text', localized: true },
        {
          name: 'options',
          type: 'array',
          fields: [
            { name: 'value', type: 'text', required: true },
            { name: 'label', type: 'text', localized: true },
            { name: 'points', type: 'number', defaultValue: 0 },
          ],
        },
      ],
    },
    {
      name: 'thresholds',
      type: 'group',
      fields: [
        { name: 'ready', type: 'number', defaultValue: 60 },
        { name: 'almost', type: 'number', defaultValue: 40 },
      ],
    },
    {
      name: 'disqualifiers',
      type: 'array',
      fields: [
        { name: 'questionKey', type: 'text', required: true },
        { name: 'optionValue', type: 'text', required: true },
        { name: 'reason', type: 'text', localized: true },
      ],
    },
  ],
}

export const SeoDefaults: GlobalConfig = {
  slug: 'seo-defaults',
  typescript: { interface: 'SeoDefaults' },
  admin: { group: 'Site' },
  access,
  hooks,
  fields: [
    { name: 'titleTemplate', type: 'text', localized: true, admin: { description: 'Use %s for the page title, e.g. "%s — إطلاق".' } },
    { name: 'defaultDescription', type: 'textarea', localized: true },
    { name: 'oneLiner', type: 'text', localized: true },
    {
      name: 'ogImage',
      type: 'group',
      fields: [
        { name: 'ar', type: 'upload', relationTo: 'media' },
        { name: 'en', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'sameAs', type: 'array', fields: [{ name: 'url', type: 'text' }] },
    {
      name: 'aiCrawlers',
      type: 'group',
      fields: [
        { name: 'allowTraining', type: 'checkbox', defaultValue: true },
        { name: 'allowSearch', type: 'checkbox', defaultValue: true },
        { name: 'allowUser', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}

export const AnnouncementBar: GlobalConfig = {
  slug: 'announcement-bar',
  typescript: { interface: 'AnnouncementBar' },
  admin: { group: 'Site' },
  access,
  hooks,
  fields: [
    { name: 'enabled', type: 'checkbox', defaultValue: false },
    { name: 'text', type: 'text', localized: true, admin: { description: 'May contain {n} (slots left) and {total} (slots total).' } },
    { name: 'link', type: 'text' },
  ],
}

export const globals = [Header, Footer, SiteSettings, Offer, ScorecardSettings, SeoDefaults, AnnouncementBar]
