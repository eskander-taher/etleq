import type { Block } from 'payload'

/**
 * Blocks available inside Lexical rich text (posts, guides, models…) and in
 * page layouts. They live inside localized fields, so their own fields are not
 * marked localized: each locale stores its own copy of the whole block.
 *
 * Rendered by `src/components/RichText.tsx` (workstream D) by `blockType`.
 */

export const Callout: Block = {
  slug: 'callout',
  interfaceName: 'CalloutBlock',
  labels: { singular: 'Callout', plural: 'Callouts' },
  fields: [
    {
      name: 'tone',
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Tip', value: 'tip' },
        { label: 'Warning', value: 'warning' },
        { label: 'Disclaimer', value: 'disclaimer' },
      ],
    },
    { name: 'title', type: 'text' },
    { name: 'body', type: 'textarea', required: true },
  ],
}

export const StatWithSource: Block = {
  slug: 'statWithSource',
  interfaceName: 'StatWithSourceBlock',
  labels: { singular: 'Statistic with source', plural: 'Statistics with source' },
  fields: [
    { name: 'value', type: 'text', required: true, admin: { description: 'The figure as shown, e.g. "6.6%" or "$34,000/month".' } },
    { name: 'label', type: 'text', required: true },
    { name: 'sourceName', type: 'text', required: true },
    { name: 'sourceUrl', type: 'text', required: true },
    { name: 'checkedAt', type: 'date', required: true, admin: { description: 'Date the source was checked.' } },
  ],
}

export const ComparisonTable: Block = {
  slug: 'comparisonTable',
  interfaceName: 'ComparisonTableBlock',
  labels: { singular: 'Comparison table', plural: 'Comparison tables' },
  fields: [
    { name: 'caption', type: 'text' },
    {
      name: 'columns',
      type: 'array',
      minRows: 1,
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
}

export const FaqBlock: Block = {
  slug: 'faq',
  interfaceName: 'FaqBlock',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  fields: [
    { name: 'title', type: 'text' },
    {
      name: 'items',
      type: 'array',
      admin: { description: 'Inline questions. Use "faqs" to reuse entries from the FAQ collection.' },
      fields: [
        { name: 'question', type: 'text', required: true },
        { name: 'answer', type: 'textarea', required: true },
      ],
    },
    { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
  ],
}

export const CtaBlock: Block = {
  slug: 'cta',
  interfaceName: 'CtaBlock',
  labels: { singular: 'Call to action', plural: 'Calls to action' },
  fields: [
    { name: 'heading', type: 'text', required: true },
    { name: 'body', type: 'textarea' },
    {
      name: 'action',
      type: 'select',
      defaultValue: 'scorecard',
      options: [
        { label: 'Scorecard', value: 'scorecard' },
        { label: 'Book a call', value: 'book' },
        { label: 'WhatsApp', value: 'whatsapp' },
        { label: 'Playbook', value: 'playbook' },
        { label: 'Custom link', value: 'custom' },
      ],
    },
    { name: 'label', type: 'text', admin: { description: 'Leave empty to use the site-wide label for this action.' } },
    { name: 'href', type: 'text', admin: { condition: (_, s) => s?.action === 'custom' } },
  ],
}

export const VideoBlock: Block = {
  slug: 'video',
  interfaceName: 'VideoBlock',
  labels: { singular: 'Video', plural: 'Videos' },
  fields: [
    { name: 'url', type: 'text', required: true },
    {
      name: 'platform',
      type: 'select',
      defaultValue: 'youtube',
      options: [
        { label: 'YouTube', value: 'youtube' },
        { label: 'Instagram', value: 'instagram' },
        { label: 'TikTok', value: 'tiktok' },
        { label: 'File', value: 'file' },
      ],
    },
    { name: 'title', type: 'text', required: true },
    { name: 'posterImage', type: 'upload', relationTo: 'media' },
    { name: 'transcript', type: 'textarea' },
    { name: 'durationSeconds', type: 'number' },
  ],
}

export const richTextBlocks: Block[] = [Callout, StatWithSource, ComparisonTable, FaqBlock, CtaBlock, VideoBlock]
