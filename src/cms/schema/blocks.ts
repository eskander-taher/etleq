import { type Block, type Field, opts } from './types'

/**
 * Rich-text blocks (written as fenced ```blockType JSON fences inside Markdown)
 * and page layout blocks (`pages.layout`). Block fields are not localized:
 * they live inside localized fields, so each locale has its own copy.
 */

export const richTextBlocks: Block[] = [
  {
    slug: 'callout',
    label: 'Callout',
    fields: [
      { name: 'tone', type: 'select', defaultValue: 'info', options: opts('info', 'tip', 'warning', 'disclaimer') },
      { name: 'title', type: 'text' },
      { name: 'body', type: 'textarea', required: true },
    ],
  },
  {
    slug: 'statWithSource',
    label: 'Statistic with source',
    fields: [
      { name: 'value', type: 'text', required: true, description: 'The figure as shown, e.g. "6.6%".' },
      { name: 'label', type: 'text', required: true },
      { name: 'sourceName', type: 'text', required: true },
      { name: 'sourceUrl', type: 'text', required: true },
      { name: 'checkedAt', type: 'date', required: true },
    ],
  },
  {
    slug: 'comparisonTable',
    label: 'Comparison table',
    fields: [
      { name: 'caption', type: 'text' },
      {
        name: 'columns',
        type: 'array',
        fields: [
          { name: 'label', type: 'text', required: true },
          { name: 'highlight', type: 'checkbox', defaultValue: false },
        ],
      },
      {
        name: 'rows',
        type: 'array',
        fields: [
          { name: 'label', type: 'text', required: true },
          {
            name: 'cells',
            type: 'array',
            fields: [
              { name: 'value', type: 'text', required: true },
              { name: 'sourceUrl', type: 'text' },
            ],
          },
        ],
      },
    ],
  },
  {
    slug: 'faq',
    label: 'FAQ',
    fields: [
      { name: 'title', type: 'text' },
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'question', type: 'text', required: true },
          { name: 'answer', type: 'textarea', required: true },
        ],
      },
      { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
    ],
  },
  {
    slug: 'cta',
    label: 'Call to action',
    fields: [
      { name: 'heading', type: 'text', required: true },
      { name: 'body', type: 'textarea' },
      {
        name: 'action',
        type: 'select',
        defaultValue: 'scorecard',
        options: opts('scorecard', 'book', 'whatsapp', 'playbook', 'custom'),
      },
      { name: 'label', type: 'text', description: 'Leave empty to use the site-wide label for this action.' },
      { name: 'href', type: 'text', description: 'Only for the "custom" action.' },
    ],
  },
  {
    slug: 'video',
    label: 'Video',
    fields: [
      { name: 'url', type: 'text', required: true },
      {
        name: 'platform',
        type: 'select',
        defaultValue: 'youtube',
        options: opts('youtube', 'instagram', 'tiktok', 'file'),
      },
      { name: 'title', type: 'text', required: true },
      { name: 'posterImage', type: 'upload', relationTo: 'media' },
      { name: 'transcript', type: 'textarea' },
      { name: 'durationSeconds', type: 'number' },
    ],
  },
]

export const RICH_TEXT_BLOCK_SLUGS = richTextBlocks.map((b) => b.slug)

const heading: Field = { name: 'heading', type: 'text' }
const intro: Field = { name: 'intro', type: 'textarea' }
const sourceFields: Field[] = [
  { name: 'sourceName', type: 'text' },
  { name: 'sourceUrl', type: 'text' },
  { name: 'checkedAt', type: 'date' },
]

export const layoutBlocks: Block[] = [
  {
    slug: 'hero',
    label: 'Hero',
    fields: [
      { name: 'eyebrow', type: 'text' },
      { name: 'heading', type: 'text', required: true },
      { name: 'subheading', type: 'textarea' },
      { name: 'primaryLabel', type: 'text' },
      { name: 'secondaryLabel', type: 'text' },
      { name: 'videoUrl', type: 'text' },
      { name: 'microcopy', type: 'text' },
      { name: 'trustItems', type: 'array', fields: [{ name: 'text', type: 'text', required: true }] },
      { name: 'image', type: 'upload', relationTo: 'media' },
    ],
  },
  {
    slug: 'proofStrip',
    label: 'Proof strip',
    fields: [
      heading,
      {
        name: 'items',
        type: 'array',
        fields: [{ name: 'value', type: 'text' }, { name: 'label', type: 'text', required: true }, ...sourceFields],
      },
    ],
  },
  {
    slug: 'problem',
    label: 'Problem',
    fields: [
      heading,
      intro,
      {
        name: 'cards',
        type: 'array',
        maxRows: 4,
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'body', type: 'textarea', required: true },
          ...sourceFields,
        ],
      },
    ],
  },
  {
    slug: 'mechanism',
    label: 'Mechanism',
    fields: [
      heading,
      intro,
      {
        name: 'items',
        type: 'array',
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'textarea' },
          { name: 'icon', type: 'text', description: 'lucide-react icon name' },
        ],
      },
    ],
  },
  {
    slug: 'modelsTeaser',
    label: 'Models teaser',
    fields: [heading, intro, { name: 'models', type: 'relationship', relationTo: 'models', hasMany: true, maxRows: 6 }],
  },
  {
    slug: 'offerStack',
    label: 'Offer stack',
    fields: [heading, intro, { name: 'showCarePlans', type: 'checkbox', defaultValue: true }],
  },
  {
    slug: 'howItWorks',
    label: 'How it works',
    fields: [
      heading,
      intro,
      {
        name: 'steps',
        type: 'array',
        fields: [
          { name: 'title', type: 'text', required: true },
          { name: 'description', type: 'textarea' },
          { name: 'when', type: 'text', description: 'e.g. "Day 10"' },
        ],
      },
    ],
  },
  {
    slug: 'guarantee',
    label: 'Guarantee',
    fields: [
      heading,
      { name: 'note', type: 'textarea', description: 'Text comes from the Offer global; add an optional note.' },
    ],
  },
  {
    slug: 'founders',
    label: 'Founders',
    fields: [
      heading,
      intro,
      { name: 'authors', type: 'relationship', relationTo: 'authors', hasMany: true },
      { name: 'videoUrl', type: 'text' },
    ],
  },
  {
    slug: 'projectsProof',
    label: 'Projects proof',
    fields: [
      heading,
      intro,
      { name: 'projects', type: 'relationship', relationTo: 'projects', hasMany: true },
      { name: 'testimonials', type: 'relationship', relationTo: 'testimonials', hasMany: true },
      { name: 'foundingOfferText', type: 'textarea', description: 'Shown while there are no published projects.' },
    ],
  },
  {
    slug: 'faqList',
    label: 'FAQ list',
    fields: [heading, { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true }],
  },
  {
    slug: 'finalCta',
    label: 'Final CTA',
    fields: [
      heading,
      intro,
      { name: 'showBooking', type: 'checkbox', defaultValue: true },
      { name: 'showWhatsapp', type: 'checkbox', defaultValue: true },
    ],
  },
  { slug: 'richContent', label: 'Rich content', fields: [{ name: 'content', type: 'richText' }] },
  ...richTextBlocks,
]
