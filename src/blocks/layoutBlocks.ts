import type { Block, Field } from 'payload'

import { richTextBlocks } from './richTextBlocks'

/**
 * Page layout blocks (`pages.layout`). The home page is a page with slug
 * `home` built from these blocks in the order of brief section 7, so the
 * founders can reorder and edit it. Section components (workstream C) render
 * them by `blockType`. Fields are not localized: the whole layout is.
 */

const heading: Field = { name: 'heading', type: 'text' }
const intro: Field = { name: 'intro', type: 'textarea' }
const sourceFields: Field[] = [
  { name: 'sourceName', type: 'text' },
  { name: 'sourceUrl', type: 'text' },
  { name: 'checkedAt', type: 'date' },
]

export const HeroBlock: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
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
}

export const ProofStripBlock: Block = {
  slug: 'proofStrip',
  interfaceName: 'ProofStripBlock',
  fields: [
    heading,
    {
      name: 'items',
      type: 'array',
      admin: { description: 'Only true facts. Each item should link its evidence.' },
      fields: [{ name: 'value', type: 'text' }, { name: 'label', type: 'text', required: true }, ...sourceFields],
    },
  ],
}

export const ProblemBlock: Block = {
  slug: 'problem',
  interfaceName: 'ProblemBlock',
  fields: [
    heading,
    intro,
    {
      name: 'cards',
      type: 'array',
      maxRows: 4,
      fields: [{ name: 'title', type: 'text', required: true }, { name: 'body', type: 'textarea', required: true }, ...sourceFields],
    },
  ],
}

export const MechanismBlock: Block = {
  slug: 'mechanism',
  interfaceName: 'MechanismBlock',
  fields: [
    heading,
    intro,
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'icon', type: 'text', admin: { description: 'lucide-react icon name' } },
      ],
    },
  ],
}

export const ModelsTeaserBlock: Block = {
  slug: 'modelsTeaser',
  interfaceName: 'ModelsTeaserBlock',
  fields: [heading, intro, { name: 'models', type: 'relationship', relationTo: 'models', hasMany: true, maxRows: 6 }],
}

export const OfferStackBlock: Block = {
  slug: 'offerStack',
  interfaceName: 'OfferStackBlock',
  admin: { disableBlockName: true },
  fields: [heading, intro, { name: 'showCarePlans', type: 'checkbox', defaultValue: true }],
}

export const HowItWorksBlock: Block = {
  slug: 'howItWorks',
  interfaceName: 'HowItWorksBlock',
  fields: [
    heading,
    intro,
    {
      name: 'steps',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'when', type: 'text', admin: { description: 'e.g. "Day 10"' } },
      ],
    },
  ],
}

export const GuaranteeBlock: Block = {
  slug: 'guarantee',
  interfaceName: 'GuaranteeBlock',
  admin: { disableBlockName: true },
  fields: [heading, { name: 'note', type: 'textarea', admin: { description: 'Text comes from the Offer global; add an optional note.' } }],
}

export const FoundersBlock: Block = {
  slug: 'founders',
  interfaceName: 'FoundersBlock',
  fields: [heading, intro, { name: 'authors', type: 'relationship', relationTo: 'authors', hasMany: true }, { name: 'videoUrl', type: 'text' }],
}

export const ProjectsProofBlock: Block = {
  slug: 'projectsProof',
  interfaceName: 'ProjectsProofBlock',
  fields: [
    heading,
    intro,
    { name: 'projects', type: 'relationship', relationTo: 'projects', hasMany: true },
    { name: 'testimonials', type: 'relationship', relationTo: 'testimonials', hasMany: true },
    { name: 'foundingOfferText', type: 'textarea', admin: { description: 'Shown while there are no published projects.' } },
  ],
}

export const FaqListBlock: Block = {
  slug: 'faqList',
  interfaceName: 'FaqListBlock',
  fields: [heading, { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true }],
}

export const FinalCtaBlock: Block = {
  slug: 'finalCta',
  interfaceName: 'FinalCtaBlock',
  fields: [heading, intro, { name: 'showBooking', type: 'checkbox', defaultValue: true }, { name: 'showWhatsapp', type: 'checkbox', defaultValue: true }],
}

export const RichContentBlock: Block = {
  slug: 'richContent',
  interfaceName: 'RichContentBlock',
  fields: [{ name: 'content', type: 'richText' }],
}

export const layoutBlocks: Block[] = [
  HeroBlock,
  ProofStripBlock,
  ProblemBlock,
  MechanismBlock,
  ModelsTeaserBlock,
  OfferStackBlock,
  HowItWorksBlock,
  GuaranteeBlock,
  FoundersBlock,
  ProjectsProofBlock,
  FaqListBlock,
  FinalCtaBlock,
  RichContentBlock,
  ...richTextBlocks,
]
