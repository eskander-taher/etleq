import { type Field, type GlobalConfig, opts, type Validate } from './types'

const write = { write: ['admin', 'editor'] as GlobalConfig['access']['write'] }

const link = (): Field[] => [
  { name: 'label', type: 'text', localized: true, required: true, label: 'Text' },
  {
    name: 'href',
    type: 'text',
    required: true,
    label: 'Goes to',
    placeholder: '/models',
    description: 'A page of this site starting with "/", or a full https:// address.',
  },
]

const textRows = (name: string, label: string, rowLabel: string): Field => ({
  name,
  type: 'array',
  label,
  rowLabel,
  ui: 'inline',
  fields: [{ name: 'text', type: 'text', localized: true, label: rowLabel.charAt(0).toUpperCase() + rowLabel.slice(1) }],
})

const ISO2: Validate = (v) =>
  !v || (typeof v === 'string' && /^[A-Z]{2}$/.test(v)) || 'Use a 2-letter country code in capitals, e.g. SA.'

export const globals: GlobalConfig[] = [
  {
    slug: 'site-settings',
    label: 'Site settings',
    description: 'Launch slots, founding price, WhatsApp number and company details.',
    access: write,
    fields: [
      {
        name: 'slotsLeft',
        type: 'number',
        min: 0,
        defaultValue: 4,
        label: 'Launch slots left this month',
        description: 'Shown on the site. Real numbers only.',
      },
      {
        name: 'slotsTotal',
        type: 'number',
        min: 0,
        defaultValue: 4,
        label: 'Launch slots this month (total)',
        description: 'Your real capacity this month.',
      },
      {
        name: 'slotsMonth',
        type: 'text',
        label: 'Month these slots are for',
        placeholder: '2026-11',
        description:
          'As YYYY-MM. The counter hides once that month is over, so it never shows stale numbers. Leave empty to always show.',
        validate: (v) =>
          !v ||
          (typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)) ||
          'Write the year and month as YYYY-MM, e.g. 2026-11.',
      },
      {
        name: 'foundingPriceActive',
        type: 'checkbox',
        defaultValue: false,
        label: 'Offer the founding-client price',
      },
      { name: 'foundingPrice', type: 'number', label: 'Founding price (USD)' },
      { name: 'foundingSlots', type: 'number', label: 'How many founding clients' },
      {
        name: 'whatsappNumber',
        type: 'text',
        label: 'WhatsApp number',
        placeholder: '966500000000',
        description: 'Country code and number, digits only, no + or spaces.',
        validate: (v) =>
          !v ||
          (typeof v === 'string' && /^[1-9]\d{6,14}$/.test(v)) ||
          'Write the country code and number as digits only, no + or spaces, e.g. 966500000000.',
      },
      {
        name: 'responseTimePromise',
        type: 'text',
        localized: true,
        label: 'How fast we reply',
        placeholder: 'e.g. within 2 working hours',
      },
      {
        name: 'bookingUrls',
        type: 'group',
        label: 'Booking calendar links',
        fields: [
          { name: 'ar', type: 'text', label: 'Arabic booking link' },
          { name: 'en', type: 'text', label: 'English booking link' },
        ],
      },
      { name: 'contactEmail', type: 'email', label: 'Contact email' },
      {
        name: 'legalEntities',
        type: 'array',
        label: 'Company details (legal)',
        rowLabel: 'company',
        section: 'more',
        fields: [
          { name: 'legalName', type: 'text', localized: true, label: 'Legal name' },
          { name: 'country', type: 'text', validate: ISO2, label: 'Country code', placeholder: 'SA' },
          { name: 'crNumber', type: 'text', label: 'Commercial registration no.' },
          { name: 'vatNumber', type: 'text', label: 'VAT no.' },
          { name: 'address', type: 'textarea', localized: true, label: 'Address' },
        ],
      },
      {
        name: 'retention',
        type: 'group',
        label: 'How long we keep personal data',
        section: 'advanced',
        description: 'Defaults for the founders and lawyer to confirm.',
        fields: [
          { name: 'leadsMonths', type: 'number', defaultValue: 24, min: 1, label: 'Leads (months)' },
          { name: 'applicationsMonths', type: 'number', defaultValue: 12, min: 1, label: 'Job applications (months)' },
        ],
      },
      {
        name: 'policyVersion',
        type: 'text',
        defaultValue: '2026-10-draft',
        label: 'Privacy policy version',
        section: 'advanced',
      },
    ],
  },
  {
    slug: 'offer',
    label: 'Offer & prices',
    description: 'Packages, prices, bonuses, care plans and the guarantee.',
    access: write,
    fields: [
      {
        name: 'confirmed',
        type: 'checkbox',
        defaultValue: false,
        label: 'Prices and terms confirmed by the founders',
        description: 'Tick once you have checked everything on this page.',
      },
      {
        name: 'tiers',
        type: 'array',
        label: 'Packages',
        rowLabel: 'package',
        fields: [
          { name: 'key', type: 'select', required: true, options: opts('core', 'pro', 'vertical'), label: 'Package' },
          { name: 'name', type: 'text', localized: true, label: 'Name' },
          { name: 'priceFrom', type: 'number', label: 'Price from (USD)' },
          { name: 'description', type: 'textarea', localized: true, label: 'Description' },
          textRows('features', 'What is included', 'feature'),
        ],
      },
      {
        name: 'blueprint',
        type: 'group',
        label: 'Blueprint (paid planning session)',
        fields: [
          { name: 'name', type: 'text', localized: true, label: 'Name' },
          { name: 'price', type: 'number', defaultValue: 390, label: 'Price (USD)' },
          { name: 'description', type: 'textarea', localized: true, label: 'Description' },
        ],
      },
      {
        name: 'bonuses',
        type: 'array',
        label: 'Bonuses',
        rowLabel: 'bonus',
        fields: [
          { name: 'name', type: 'text', localized: true, label: 'Name' },
          { name: 'statedValue', type: 'number', label: 'Value (USD)' },
          { name: 'description', type: 'textarea', localized: true, label: 'Description' },
        ],
      },
      {
        name: 'carePlans',
        type: 'array',
        label: 'Care plans (after launch)',
        rowLabel: 'care plan',
        fields: [
          { name: 'name', type: 'text', localized: true, label: 'Name' },
          { name: 'monthlyPrice', type: 'number', label: 'Per month (USD)' },
          textRows('features', 'What is included', 'feature'),
        ],
      },
      { name: 'guarantee', type: 'textarea', localized: true, label: 'Guarantee' },
      {
        name: 'guaranteeHonestLine',
        type: 'text',
        localized: true,
        label: 'Guarantee: the honest limit',
        description: 'One line on what the guarantee does not cover.',
      },
      { name: 'paymentTerms', type: 'textarea', localized: true, label: 'Payment terms' },
      textRows('notIncluded', 'Not included', 'item'),
    ],
  },
  {
    slug: 'announcement-bar',
    label: 'Announcement bar',
    description: 'The thin bar at the very top of every page.',
    access: write,
    fields: [
      { name: 'enabled', type: 'checkbox', defaultValue: false, label: 'Show the bar' },
      {
        name: 'text',
        type: 'text',
        localized: true,
        label: 'Text',
        description: 'You can write {n} for slots left and {total} for total slots.',
      },
      { name: 'link', type: 'text', label: 'Link (optional)', placeholder: '/launch-30' },
    ],
  },
  {
    slug: 'scorecard-settings',
    label: 'Scorecard questions',
    description: 'The questions, answers and points of the readiness scorecard.',
    access: write,
    fields: [
      {
        name: 'questions',
        type: 'array',
        label: 'Questions',
        rowLabel: 'question',
        fields: [
          { name: 'prompt', type: 'text', localized: true, label: 'Question' },
          {
            name: 'type',
            type: 'select',
            defaultValue: 'single',
            label: 'Answer type',
            options: [
              { label: 'Pick one', value: 'single' },
              { label: 'Free text', value: 'text' },
              { label: 'App model (routing only)', value: 'model' },
            ],
          },
          {
            name: 'key',
            type: 'text',
            required: true,
            label: 'Internal key',
            section: 'advanced',
            description: 'Do not change after leads have answered.',
          },
          {
            name: 'options',
            type: 'array',
            label: 'Answers',
            rowLabel: 'answer',
            fields: [
              { name: 'label', type: 'text', localized: true, label: 'Answer' },
              { name: 'points', type: 'number', defaultValue: 0, label: 'Points' },
              {
                name: 'value',
                type: 'text',
                required: true,
                label: 'Internal value',
                section: 'advanced',
                description: 'Do not change after leads have answered.',
              },
            ],
          },
        ],
      },
      {
        name: 'thresholds',
        type: 'group',
        label: 'Result thresholds',
        fields: [
          { name: 'ready', type: 'number', defaultValue: 60, label: '“Ready to launch” from (points)' },
          { name: 'almost', type: 'number', defaultValue: 40, label: '“Almost ready” from (points)' },
        ],
      },
      {
        name: 'disqualifiers',
        type: 'array',
        label: 'Answers that mean “not a fit”',
        rowLabel: 'rule',
        section: 'more',
        fields: [
          { name: 'questionKey', type: 'text', required: true, label: 'Question key' },
          { name: 'optionValue', type: 'text', required: true, label: 'Answer value' },
          { name: 'reason', type: 'text', localized: true, label: 'Reason shown' },
        ],
      },
    ],
  },
  {
    slug: 'header',
    label: 'Top menu',
    description: 'The links at the top of every page.',
    access: write,
    fields: [
      { name: 'nav', type: 'array', label: 'Menu links', rowLabel: 'link', fields: link() },
      { name: 'ctaLabel', type: 'text', localized: true, label: 'Main button text' },
    ],
  },
  {
    slug: 'footer',
    label: 'Footer',
    description: 'The links at the bottom of every page.',
    access: write,
    fields: [
      {
        name: 'columns',
        type: 'array',
        label: 'Columns',
        rowLabel: 'column',
        fields: [
          { name: 'title', type: 'text', localized: true, label: 'Column title' },
          { name: 'links', type: 'array', label: 'Links', rowLabel: 'link', fields: link() },
        ],
      },
      {
        name: 'social',
        type: 'array',
        label: 'Social media',
        rowLabel: 'account',
        ui: 'inline',
        fields: [
          { name: 'platform', type: 'text', required: true, label: 'Platform', placeholder: 'LinkedIn' },
          { name: 'url', type: 'text', required: true, label: 'Link' },
        ],
      },
      { name: 'legalLinks', type: 'array', label: 'Legal links', rowLabel: 'link', fields: link() },
    ],
  },
  {
    slug: 'seo-defaults',
    label: 'Search & sharing',
    description: 'Defaults for Google results and link previews.',
    access: write,
    fields: [
      {
        name: 'titleTemplate',
        type: 'text',
        localized: true,
        label: 'Page title pattern',
        description: 'Use %s for the page title, e.g. "%s — اطلق".',
      },
      { name: 'defaultDescription', type: 'textarea', localized: true, label: 'Default description' },
      { name: 'oneLiner', type: 'text', localized: true, label: 'What Etleq does, in one line' },
      {
        name: 'ogImage',
        type: 'group',
        label: 'Default sharing image',
        fields: [
          { name: 'ar', type: 'upload', relationTo: 'media', label: 'Arabic' },
          { name: 'en', type: 'upload', relationTo: 'media', label: 'English' },
        ],
      },
      {
        name: 'sameAs',
        type: 'array',
        label: 'Company profiles',
        rowLabel: 'link',
        ui: 'inline',
        fields: [{ name: 'url', type: 'text', label: 'Link' }],
      },
      {
        name: 'aiCrawlers',
        type: 'group',
        label: 'AI crawlers',
        section: 'advanced',
        fields: [
          { name: 'allowTraining', type: 'checkbox', defaultValue: true, label: 'Allow AI training' },
          { name: 'allowSearch', type: 'checkbox', defaultValue: true, label: 'Allow AI search' },
          { name: 'allowUser', type: 'checkbox', defaultValue: true, label: 'Allow AI assistants fetching pages' },
        ],
      },
    ],
  },
]
