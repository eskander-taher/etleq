import { layoutBlocks } from './blocks'
import { type Access, type CollectionConfig, type Field, opts, type Role, type Validate } from './types'

/*
 * Admin copy rule: every field gets a plain-English `label` and, where it is not
 * obvious, a one-line `description`. Technical fields go in `section: 'advanced'`,
 * optional extras in `section: 'more'` (both collapsed in the form).
 */

/* ------------------------------------------------------------------ */
/* Shared fields                                                       */
/* ------------------------------------------------------------------ */

const ISO2: Validate = (v) =>
  !v || (typeof v === 'string' && /^[A-Z]{2}$/.test(v)) || 'Use a 2-letter country code in capitals, e.g. SA.'

/** Absolute http(s) URL (the site passes these to `new URL()`, so a bad value would break a page). */
export const HTTP_URL: Validate = (v) => {
  if (v === undefined || v === null || v === '') return true
  try {
    const u = new URL(String(v))
    if (u.protocol === 'http:' || u.protocol === 'https:') return true
  } catch {
    /* fall through */
  }
  return 'Paste the full web address, starting with https:// (copy it from the browser’s address bar).'
}

/** `translated.ar` / `translated.en`: a locale is public only when ticked. */
export const translatedField = (): Field => ({
  name: 'translated',
  type: 'group',
  label: 'Show on the site in',
  sidebar: true,
  description: 'Untick a language to hide this page in that language. Each ticked language needs its texts filled in.',
  fields: [
    { name: 'ar', type: 'checkbox', label: 'Arabic (العربية)', defaultValue: false },
    { name: 'en', type: 'checkbox', label: 'English', defaultValue: false },
  ],
})

export const isSampleField = (): Field => ({
  name: 'isSample',
  type: 'checkbox',
  label: 'Sample content (for testing only)',
  defaultValue: false,
  sidebar: true,
  section: 'advanced',
  description: 'Never tick this for real content. Samples cannot go live on the real site.',
})

export const slugField = (): Field => ({
  name: 'slug',
  type: 'text',
  label: 'Web address (slug)',
  sidebar: true,
  section: 'advanced',
  description: 'The last part of the page address. Leave empty: it is made from the English name.',
})

/** SEO meta per locale. `buildMetadata` prefers these over generated values. */
export const metaField = (): Field => ({
  name: 'meta',
  type: 'group',
  label: 'Search engines and sharing',
  section: 'advanced',
  description: 'Optional. Leave empty to use the name and summary.',
  fields: [
    { name: 'title', type: 'text', localized: true, label: 'Title in Google results' },
    { name: 'description', type: 'textarea', localized: true, label: 'Description in Google results' },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Image when shared',
      description: 'Shown when the link is shared on WhatsApp, X or LinkedIn.',
    },
  ],
})

const publishedAtField = (): Field => ({
  name: 'publishedAt',
  type: 'date',
  label: 'Publish date',
  sidebar: true,
  description: 'Filled in automatically the first time you publish.',
})

const sourcesField = (): Field => ({
  name: 'sources',
  type: 'array',
  label: 'Sources',
  rowLabel: 'source',
  ui: 'inline',
  description: 'Every number in the text needs a source: its name, link and the date you checked it.',
  fields: [
    { name: 'label', type: 'text', required: true, label: 'Source name' },
    { name: 'url', type: 'text', required: true, label: 'Link', validate: HTTP_URL },
    { name: 'accessedAt', type: 'date', label: 'Checked on' },
  ],
})

const consentGroup = (marketing = false): Field => ({
  name: 'consent',
  type: 'group',
  label: 'Privacy consent (recorded by the form)',
  section: 'advanced',
  fields: [
    { name: 'given', type: 'checkbox', defaultValue: false, label: 'Agreed to the privacy policy' },
    { name: 'at', type: 'date', time: true, label: 'Agreed at' },
    { name: 'policyVersion', type: 'text', label: 'Policy version' },
    ...(marketing
      ? [
          {
            name: 'marketing',
            type: 'checkbox',
            defaultValue: false,
            label: 'Agreed to marketing messages',
            description: 'Separate opt-in, unticked by default.',
          } as Field,
        ]
      : []),
  ],
})

const textRows = (name: string, sub: string, label: string, rowLabel: string, extra: Partial<Field> = {}): Field =>
  ({
    name,
    type: 'array',
    label,
    rowLabel,
    ui: 'inline',
    fields: [{ name: sub, type: 'text', localized: true, label: rowLabel.charAt(0).toUpperCase() + rowLabel.slice(1) }],
    ...extra,
  }) as Field

const access = (write: Role[], read: Role[] = write, del: Role[] = write): Access => ({ read, write, delete: del })
const EDITORS: Role[] = ['admin', 'editor']

/** Public content: drafts, translation gate, revalidation. */
const content = (
  config: Omit<CollectionConfig, 'group' | 'drafts' | 'access' | 'hooks'> & {
    group?: CollectionConfig['group']
    access?: Access
    hooks?: CollectionConfig['hooks']
    seo?: boolean
  },
): CollectionConfig => ({
  group: 'Content',
  drafts: true,
  access: access(EDITORS),
  ...config,
  hooks: { revalidate: 'doc', ...config.hooks },
  fields: [...config.fields, ...(config.seo === false ? [] : [metaField()]), translatedField(), isSampleField()],
})

const authorsField = (): Field => ({
  name: 'authors',
  type: 'relationship',
  relationTo: 'authors',
  hasMany: true,
  sidebar: true,
  label: 'Written by',
})

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

const articleFields = (): Field[] => [
  { name: 'title', type: 'text', localized: true, label: 'Title' },
  slugField(),
  {
    name: 'excerpt',
    type: 'textarea',
    localized: true,
    label: 'Short summary',
    description: 'One or two sentences shown on cards and in Google.',
  },
  textRows('keyTakeaways', 'text', 'Key points', 'point', {
    section: 'more',
    description: 'Optional bullet summary shown at the top.',
  }),
  { name: 'content', type: 'richText', localized: true, label: 'Article text' },
  { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Cover image' },
  authorsField(),
  {
    name: 'categories',
    type: 'relationship',
    relationTo: 'categories',
    hasMany: true,
    sidebar: true,
    label: 'Categories',
  },
  { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, sidebar: true, label: 'Tags' },
  publishedAtField(),
  {
    name: 'lastReviewedAt',
    type: 'date',
    sidebar: true,
    label: 'Last checked',
    description: 'When you last checked the facts are still true.',
  },
  sourcesField(),
  {
    name: 'faqs',
    type: 'relationship',
    relationTo: 'faqs',
    hasMany: true,
    label: 'Questions shown at the end',
    section: 'more',
  },
  {
    name: 'relatedPosts',
    type: 'relationship',
    relationTo: 'posts',
    hasMany: true,
    label: 'Related posts',
    section: 'more',
  },
]

const Pages = content({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  description: 'Free-form pages built from blocks. The home page is the one with web address "home".',
  useAsTitle: 'title',
  defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  hooks: { requiredLocalized: ['title'] },
  fields: [
    { name: 'title', type: 'text', localized: true, label: 'Page name' },
    slugField(),
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      blocks: layoutBlocks,
      label: 'Page sections',
      description: 'Add sections from top to bottom. Each language has its own list.',
    },
  ],
})

const Models = content({
  slug: 'models',
  labels: { singular: 'App model', plural: 'App models' },
  description: 'Proven app ideas (e.g. a barber booking app) with real numbers and sources.',
  useAsTitle: 'title',
  defaultColumns: ['title', 'category', 'tier', '_status'],
  hooks: { requiredLocalized: ['title', 'answerBox', 'whatItDoes'], evidence: 'model' },
  fields: [
    { name: 'title', type: 'text', localized: true, label: 'Model name', placeholder: 'e.g. Barber booking app' },
    slugField(),
    {
      name: 'answerBox',
      type: 'textarea',
      localized: true,
      label: 'Short answer (top of page)',
      description: '40–60 words that answer “what is this and why does it work?” directly.',
    },
    {
      name: 'category',
      type: 'select',
      label: 'Category',
      options: opts('booking', 'membership', 'marketplace', 'directory', 'b2b', 'vertical', 'creator', 'other'),
    },
    { name: 'whatItDoes', type: 'textarea', localized: true, label: 'What the app does' },
    { name: 'whoPays', type: 'textarea', localized: true, label: 'Who pays' },
    { name: 'pricingModel', type: 'textarea', localized: true, label: 'How it charges' },
    {
      name: 'tier',
      type: 'select',
      label: 'Our package',
      sidebar: true,
      options: opts('core', 'pro', 'vertical'),
    },
    { name: 'priceFrom', type: 'number', label: 'Our price from (USD)', sidebar: true, description: 'Without VAT.' },
    { name: 'buildDays', type: 'number', defaultValue: 30, label: 'Days to build', sidebar: true },
    textRows('mvpFeatures', 'feature', 'First-version features', 'feature'),
    textRows('fitCriteria', 'criterion', 'Good fit if…', 'criterion', {
      description: 'Who this model suits. At least one is needed to publish.',
    }),
    {
      name: 'whyItWorks',
      type: 'richText',
      localized: true,
      label: 'Why it works',
      description: 'Needed to publish.',
    },
    {
      name: 'gulfVersion',
      type: 'richText',
      localized: true,
      label: 'The Gulf version',
      description: 'How it would work in Saudi Arabia and the Gulf. Needed to publish.',
    },
    {
      name: 'factSources',
      type: 'array',
      label: 'Facts and their sources',
      rowLabel: 'fact',
      description: 'At least 3, each with a link and the date you checked it, to publish.',
      fields: [
        { name: 'label', type: 'text', localized: true, label: 'Fact', placeholder: 'e.g. Monthly revenue' },
        { name: 'value', type: 'text', localized: true, label: 'Value', placeholder: 'e.g. $40k' },
        { name: 'url', type: 'text', validate: HTTP_URL, label: 'Source link' },
        { name: 'checkedAt', type: 'date', label: 'Checked on' },
      ],
    },
    {
      name: 'mrr',
      type: 'group',
      label: 'Reported monthly revenue',
      section: 'more',
      description: 'Optional. Shown with its source and date, and a note that it is not a promise.',
      fields: [
        { name: 'amount', type: 'number', label: 'Amount' },
        { name: 'currency', type: 'text', defaultValue: 'USD', label: 'Currency' },
        { name: 'sourceName', type: 'text', label: 'Source name' },
        { name: 'sourceUrl', type: 'text', validate: HTTP_URL, label: 'Source link' },
        { name: 'reportedAt', type: 'date', label: 'Reported on' },
      ],
    },
    { name: 'teamSize', type: 'number', label: 'Team size', section: 'more' },
    { name: 'yearFounded', type: 'number', label: 'Year founded', section: 'more' },
    {
      name: 'runningCosts',
      type: 'array',
      label: 'Monthly running costs',
      rowLabel: 'cost',
      section: 'more',
      fields: [
        { name: 'item', type: 'text', localized: true, label: 'What' },
        { name: 'monthlyCost', type: 'number', label: 'Per month' },
        { name: 'currency', type: 'text', defaultValue: 'USD', label: 'Currency' },
        { name: 'sourceUrl', type: 'text', validate: HTTP_URL, label: 'Source link' },
        { name: 'checkedAt', type: 'date', label: 'Checked on' },
      ],
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media', label: 'Cover image', section: 'more' },
    {
      name: 'reel',
      type: 'group',
      label: 'Short video',
      section: 'more',
      fields: [
        { name: 'url', type: 'text', label: 'Video link', validate: HTTP_URL },
        { name: 'platform', type: 'select', label: 'Platform', options: opts('youtube', 'instagram') },
        { name: 'posterImage', type: 'upload', relationTo: 'media', label: 'Cover frame' },
      ],
    },
    {
      name: 'transcript',
      type: 'textarea',
      localized: true,
      label: 'Video transcript',
      section: 'more',
    },
    {
      name: 'faqs',
      type: 'relationship',
      relationTo: 'faqs',
      hasMany: true,
      label: 'Questions shown on the page',
      section: 'more',
    },
    {
      name: 'relatedModels',
      type: 'relationship',
      relationTo: 'models',
      hasMany: true,
      maxRows: 2,
      label: 'Similar models (up to 2)',
      section: 'more',
    },
    {
      name: 'relatedSolution',
      type: 'relationship',
      relationTo: 'solutions',
      label: 'Related industry page',
      section: 'more',
    },
    {
      name: 'relatedPosts',
      type: 'relationship',
      relationTo: 'posts',
      hasMany: true,
      label: 'Related blog posts',
      section: 'more',
    },
    {
      name: 'reviewer',
      type: 'relationship',
      relationTo: 'authors',
      sidebar: true,
      label: 'Fact-checked by',
      description: 'Needed to publish.',
    },
    {
      name: 'lastReviewedAt',
      type: 'date',
      sidebar: true,
      label: 'Last checked',
      description: 'Needed to publish.',
    },
    authorsField(),
  ],
})

const Solutions = content({
  slug: 'solutions',
  labels: { singular: 'Industry page', plural: 'Industry pages' },
  description: 'One page per industry we serve: clinics, gyms, salons…',
  useAsTitle: 'title',
  defaultColumns: ['title', 'vertical', '_status'],
  hooks: { requiredLocalized: ['title', 'summary'] },
  fields: [
    { name: 'title', type: 'text', localized: true, label: 'Page title' },
    slugField(),
    {
      name: 'vertical',
      type: 'select',
      label: 'Industry',
      options: opts('clinics', 'gyms', 'salons', 'restaurants', 'training-centres'),
    },
    { name: 'summary', type: 'textarea', localized: true, label: 'Short summary' },
    textRows('buyerProblems', 'problem', 'Problems the owner has', 'problem'),
    {
      name: 'features',
      type: 'array',
      label: 'Features',
      rowLabel: 'feature',
      fields: [
        { name: 'title', type: 'text', localized: true, label: 'Feature' },
        { name: 'description', type: 'textarea', localized: true, label: 'Explanation' },
        {
          name: 'icon',
          type: 'text',
          label: 'Icon name',
          section: 'advanced',
          description: 'Optional. A name from lucide.dev/icons, e.g. calendar.',
        },
      ],
    },
    { name: 'priceFrom', type: 'number', label: 'Price from (USD)', sidebar: true, description: 'Without VAT.' },
    {
      name: 'steps',
      type: 'array',
      label: 'How it works (steps)',
      rowLabel: 'step',
      section: 'more',
      fields: [
        { name: 'title', type: 'text', localized: true, label: 'Step' },
        { name: 'description', type: 'textarea', localized: true, label: 'Explanation' },
      ],
    },
    {
      name: 'integrations',
      type: 'array',
      label: 'Works with',
      rowLabel: 'integration',
      section: 'more',
      fields: [
        { name: 'name', type: 'text', label: 'Name', placeholder: 'e.g. Tabby' },
        { name: 'description', type: 'textarea', localized: true, label: 'What it does' },
      ],
    },
    {
      name: 'video',
      type: 'group',
      label: 'Video',
      section: 'more',
      fields: [
        { name: 'url', type: 'text', label: 'Video link', validate: HTTP_URL },
        { name: 'posterImage', type: 'upload', relationTo: 'media', label: 'Cover frame' },
      ],
    },
    {
      name: 'caseStudies',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
      label: 'Client projects to show',
      section: 'more',
    },
    {
      name: 'faqs',
      type: 'relationship',
      relationTo: 'faqs',
      hasMany: true,
      label: 'Questions shown on the page',
      section: 'more',
    },
  ],
})

const isClient = { field: 'kind', equals: 'client' }

const Projects = content({
  slug: 'projects',
  labels: { singular: 'Project', plural: 'Projects' },
  description:
    'Apps you have shipped. Add your own products freely; a client’s project needs their written permission before it goes live.',
  useAsTitle: 'title',
  defaultColumns: ['title', 'kind', 'clientName', '_status'],
  hooks: { requiredLocalized: ['title', 'context'], projectConsent: true },
  fields: [
    {
      name: 'kind',
      type: 'select',
      label: 'Whose app is it?',
      ui: 'radio',
      defaultValue: 'own',
      options: [
        { label: 'Our own product', value: 'own' },
        { label: 'Built for a client', value: 'client' },
      ],
    },
    { name: 'title', type: 'text', localized: true, label: 'App name', placeholder: 'e.g. Qasr Booking' },
    slugField(),
    {
      name: 'context',
      type: 'textarea',
      localized: true,
      label: 'One-line summary',
      description: 'What the app is and who it is for, in one sentence.',
      placeholder: 'e.g. A booking app for barbershops in Riyadh.',
    },
    {
      name: 'links',
      type: 'array',
      label: 'Where people can see it',
      rowLabel: 'link',
      ui: 'inline',
      description: 'Paste the website, App Store or Google Play link. We name the button for you.',
      fields: [
        {
          name: 'url',
          type: 'text',
          required: true,
          label: 'Link',
          placeholder: 'https://apps.apple.com/…',
          validate: HTTP_URL,
        },
        {
          name: 'label',
          type: 'text',
          label: 'Button text (optional)',
          placeholder: 'Leave empty: automatic',
        },
      ],
    },
    {
      name: 'clientName',
      type: 'text',
      label: 'Client name',
      showIf: isClient,
    },
    {
      name: 'consentGiven',
      type: 'checkbox',
      defaultValue: false,
      label: 'The client agreed in writing that we can show this',
      description: 'Needed to publish a client project.',
      showIf: isClient,
    },
    {
      name: 'consentFile',
      type: 'upload',
      relationTo: 'private-files',
      filter: { purpose: 'consent' },
      label: 'Signed permission (PDF)',
      description: 'Stays private. Needed to publish a client project.',
      showIf: isClient,
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Screenshots',
      rowLabel: 'screenshot',
      ui: 'gallery',
      description: 'Drop several images at once. The first one is the cover.',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', label: 'Image' }],
    },
    {
      name: 'solution',
      type: 'richText',
      localized: true,
      label: 'What we built',
      description: 'A few lines or bullet points: the main features and anything you are proud of.',
    },
    {
      name: 'stack',
      type: 'array',
      label: 'Built with',
      rowLabel: 'technology',
      ui: 'tags',
      description: 'Type a technology and press Enter, e.g. Next.js, Flutter, Firebase.',
      fields: [{ name: 'name', type: 'text', label: 'Technology' }],
    },
    {
      name: 'plannedDays',
      type: 'number',
      min: 0,
      label: 'Planned days (optional)',
    },
    {
      name: 'actualDays',
      type: 'number',
      min: 0,
      label: 'Actual days (optional)',
      description: 'How long it really took from start to launch.',
    },
    {
      name: 'relatedModel',
      type: 'relationship',
      relationTo: 'models',
      label: 'Based on app model (optional)',
    },
    {
      name: 'clientLogo',
      type: 'upload',
      relationTo: 'media',
      label: 'Client logo',
      section: 'more',
      showIf: isClient,
    },
    {
      name: 'challenge',
      type: 'richText',
      localized: true,
      label: 'The problem it solves',
      section: 'more',
    },
    textRows('scope', 'item', 'What was included', 'item', { section: 'more' }),
    {
      name: 'results',
      type: 'array',
      label: 'Results',
      rowLabel: 'result',
      section: 'more',
      description: 'Only results ticked as checked, with proof, appear on the site.',
      fields: [
        { name: 'label', type: 'text', localized: true, label: 'What', placeholder: 'e.g. Bookings in month one' },
        { name: 'value', type: 'text', label: 'Number', placeholder: 'e.g. 1,200' },
        { name: 'verified', type: 'checkbox', defaultValue: false, label: 'We checked this number' },
        { name: 'evidence', type: 'text', label: 'Proof (private)', description: 'A link or note. Not shown publicly.' },
      ],
    },
    {
      name: 'testimonial',
      type: 'relationship',
      relationTo: 'testimonials',
      label: 'Client quote',
      section: 'more',
      showIf: isClient,
    },
    publishedAtField(),
  ],
})

const Posts = content({
  slug: 'posts',
  labels: { singular: 'Blog post', plural: 'Blog posts' },
  description: 'Articles for the blog.',
  useAsTitle: 'title',
  defaultColumns: ['title', 'publishedAt', '_status'],
  defaultSort: '-publishedAt',
  hooks: { requiredLocalized: ['title', 'excerpt', 'content'] },
  fields: articleFields(),
})

const News = content({
  slug: 'news',
  labels: { singular: 'News item', plural: 'News' },
  description: 'Short company news: launches, partnerships, milestones.',
  useAsTitle: 'title',
  defaultColumns: ['title', 'publishedAt', '_status'],
  defaultSort: '-publishedAt',
  hooks: { requiredLocalized: ['title', 'excerpt'] },
  fields: [
    { name: 'title', type: 'text', localized: true, label: 'Headline' },
    slugField(),
    { name: 'excerpt', type: 'textarea', localized: true, label: 'Short summary' },
    { name: 'content', type: 'richText', localized: true, label: 'Full text', section: 'more' },
    { name: 'image', type: 'upload', relationTo: 'media', label: 'Image' },
    publishedAtField(),
    {
      name: 'sourceLinks',
      type: 'array',
      label: 'Links',
      rowLabel: 'link',
      ui: 'inline',
      section: 'more',
      fields: [
        { name: 'label', type: 'text', label: 'Text' },
        { name: 'url', type: 'text', label: 'Link', validate: HTTP_URL },
      ],
    },
  ],
})

const Guides = content({
  slug: 'guides',
  labels: { singular: 'Guide', plural: 'Cost & comparison guides' },
  description: 'Long answers to “how much does it cost?” and “X or Y?”, with sourced numbers.',
  useAsTitle: 'title',
  defaultColumns: ['title', 'type', '_status'],
  defaultSort: '-publishedAt',
  hooks: { requiredLocalized: ['title', 'excerpt', 'answerBox', 'content'], evidence: 'guide' },
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'cost',
      sidebar: true,
      label: 'Kind of guide',
      options: [
        { label: 'Cost guide', value: 'cost' },
        { label: 'Comparison', value: 'comparison' },
      ],
    },
    ...articleFields().flatMap((field): Field[] =>
      field.name === 'excerpt'
        ? [
            field,
            {
              name: 'answerBox',
              type: 'textarea',
              localized: true,
              label: 'Short answer (top of page)',
              description: '40–60 words that answer the question directly. Needed to publish.',
            },
          ]
        : [field],
    ),
    {
      name: 'comparisonTable',
      type: 'group',
      label: 'Comparison table',
      section: 'more',
      fields: [
        {
          name: 'columns',
          type: 'array',
          label: 'Columns',
          rowLabel: 'column',
          ui: 'inline',
          fields: [{ name: 'label', type: 'text', localized: true, label: 'Column title' }],
        },
        {
          name: 'rows',
          type: 'array',
          label: 'Rows',
          rowLabel: 'row',
          fields: [
            { name: 'label', type: 'text', localized: true, label: 'Row title' },
            {
              name: 'cells',
              type: 'array',
              label: 'Cells (one per column)',
              rowLabel: 'cell',
              fields: [
                { name: 'value', type: 'text', localized: true, label: 'Value' },
                { name: 'sourceUrl', type: 'text', label: 'Source link', validate: HTTP_URL },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'reviewer',
      type: 'relationship',
      relationTo: 'authors',
      sidebar: true,
      label: 'Fact-checked by',
      description: 'Needed to publish.',
    },
  ],
})

const Faqs = content({
  slug: 'faqs',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  description: 'Questions and answers shown on the FAQ page and on other pages.',
  useAsTitle: 'question',
  defaultColumns: ['question', 'category', 'order', '_status'],
  defaultSort: 'order',
  seo: false,
  hooks: { requiredLocalized: ['question', 'answer'], revalidate: 'tag' },
  fields: [
    { name: 'question', type: 'text', localized: true, label: 'Question' },
    { name: 'answer', type: 'textarea', localized: true, label: 'Answer' },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'general',
      label: 'Topic',
      options: opts(
        'price',
        'ownership',
        'timeline',
        'payments',
        'hosting',
        'languages',
        'equity',
        'refunds',
        'process',
        'general',
      ),
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      sidebar: true,
      section: 'advanced',
      label: 'Position',
      description: 'Lower numbers show first.',
    },
  ],
})

const Authors = content({
  slug: 'authors',
  labels: { singular: 'Team member', plural: 'Team & authors' },
  description: 'People shown as founders, team members and article authors.',
  useAsTitle: 'name',
  defaultColumns: ['name', 'role', '_status'],
  seo: false,
  hooks: { requiredLocalized: ['name', 'role', 'bio'], slugFrom: 'name' },
  fields: [
    { name: 'name', type: 'text', localized: true, label: 'Name' },
    slugField(),
    { name: 'role', type: 'text', localized: true, label: 'Job title' },
    { name: 'bio', type: 'textarea', localized: true, label: 'Short bio' },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo' },
    textRows('credentials', 'text', 'Experience highlights', 'highlight', { section: 'more' }),
    {
      name: 'sameAs',
      type: 'array',
      label: 'Profile links',
      rowLabel: 'link',
      ui: 'inline',
      description: 'LinkedIn, X, GitHub…',
      fields: [{ name: 'url', type: 'text', validate: HTTP_URL, label: 'Link' }],
    },
    {
      name: 'isFounder',
      type: 'checkbox',
      defaultValue: false,
      sidebar: true,
      label: 'Founder',
      description: 'Shown in the founders sections on Home and About.',
    },
    {
      name: 'order',
      type: 'number',
      sidebar: true,
      section: 'advanced',
      label: 'Position',
      description: 'Lower numbers show first.',
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      sidebar: true,
      section: 'advanced',
      label: 'Admin login',
    },
  ],
})

const taxonomy = (slug: 'categories' | 'tags', singular: string, plural: string) =>
  content({
    slug,
    labels: { singular, plural },
    description: slug === 'categories' ? 'Main topics for grouping blog posts.' : 'Small labels for blog posts.',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', '_status'],
    seo: false,
    hooks: { requiredLocalized: ['name'], revalidate: 'tag', slugFrom: 'name' },
    fields: [
      { name: 'name', type: 'text', localized: true, label: 'Name' },
      slugField(),
      { name: 'description', type: 'textarea', localized: true, label: 'Description', section: 'more' },
    ],
  })

const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Client quote', plural: 'Client quotes' },
  description: 'Real quotes from clients. Only quotes with a signed permission file appear on the site.',
  group: 'Content',
  useAsTitle: 'person',
  defaultColumns: ['person', 'company', 'verified'],
  access: access(EDITORS),
  hooks: { revalidate: 'tag' },
  fields: [
    { name: 'person', type: 'text', required: true, label: 'Person’s name' },
    { name: 'role', type: 'text', localized: true, label: 'Their job title' },
    { name: 'company', type: 'text', label: 'Company' },
    { name: 'quote', type: 'textarea', localized: true, label: 'What they said' },
    { name: 'photo', type: 'upload', relationTo: 'media', label: 'Photo' },
    { name: 'videoUrl', type: 'text', label: 'Video link (optional)', validate: HTTP_URL },
    {
      name: 'consentFile',
      type: 'upload',
      relationTo: 'private-files',
      filter: { purpose: 'consent' },
      label: 'Signed permission (PDF)',
      description: 'Stays private.',
    },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      sidebar: true,
      label: 'Show on the site',
      description: 'Only possible once the signed permission file is attached.',
      validate: (value, sibling) =>
        !value ||
        Boolean(sibling?.consentFile) ||
        'Attach the signed permission (PDF) first, then tick “Show on the site”.',
    },
    { name: 'relatedProject', type: 'relationship', relationTo: 'projects', label: 'Project' },
  ],
}

const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Images' },
  description: 'Every image used on the site. You can also upload images straight from any form.',
  group: 'Content',
  useAsTitle: 'alt',
  defaultColumns: ['filename', 'alt', 'createdAt'],
  access: access(EDITORS),
  upload: 'media',
  fields: [
    {
      name: 'alt',
      type: 'text',
      localized: true,
      label: 'Description for blind visitors',
      description: 'Say what the image shows, in a few words.',
    },
    { name: 'caption', type: 'text', localized: true, label: 'Caption (optional)' },
    { name: 'credit', type: 'text', label: 'Photo credit (optional)' },
    { name: 'filename', type: 'text', readOnly: true, label: 'File name', section: 'advanced' },
    { name: 'mimeType', type: 'text', readOnly: true, hidden: true },
    { name: 'filesize', type: 'number', readOnly: true, hidden: true },
    { name: 'width', type: 'number', readOnly: true, hidden: true },
    { name: 'height', type: 'number', readOnly: true, hidden: true },
    { name: 'url', type: 'text', readOnly: true, label: 'Address', section: 'advanced' },
  ],
}

const ShortLinks: CollectionConfig = {
  slug: 'short-links',
  labels: { singular: 'Short link', plural: 'Short links' },
  description: 'Short addresses like etleq.com/go/barber for bios, ads and QR codes.',
  group: 'Marketing',
  useAsTitle: 'code',
  defaultColumns: ['code', 'target'],
  access: access(EDITORS),
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      label: 'Short code',
      description: 'The part after /go/. Lowercase letters, numbers and hyphens.',
      validate: (v) =>
        (typeof v === 'string' && /^[a-z0-9-]{1,32}$/.test(v)) ||
        'Use only lowercase English letters, numbers and hyphens (up to 32).',
    },
    {
      name: 'target',
      type: 'text',
      required: true,
      label: 'Goes to',
      placeholder: '/models/barber-booking-app',
      validate: (v) =>
        (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//')) ||
        'Use a page of this site starting with "/", e.g. /models/barber-booking-app.',
    },
    {
      name: 'utm',
      type: 'group',
      label: 'Campaign tracking (UTM)',
      section: 'advanced',
      fields: ['source', 'medium', 'campaign', 'content'].map((name): Field => ({ name, type: 'text' })),
    },
    {
      name: 'isSample',
      type: 'checkbox',
      defaultValue: false,
      sidebar: true,
      section: 'advanced',
      label: 'Sample (for testing only)',
    },
  ],
}

const Jobs = content({
  slug: 'jobs',
  labels: { singular: 'Job', plural: 'Jobs' },
  description: 'Open roles shown on the careers page.',
  group: 'Careers',
  useAsTitle: 'title',
  defaultColumns: ['title', 'team', 'status', '_status'],
  defaultSort: '-datePosted',
  access: access(['admin', 'recruiter']),
  hooks: { requiredLocalized: ['title', 'description'] },
  fields: [
    { name: 'title', type: 'text', localized: true, label: 'Job title' },
    slugField(),
    { name: 'team', type: 'select', label: 'Team', options: opts('engineering', 'design', 'growth', 'operations') },
    {
      name: 'employmentType',
      type: 'select',
      label: 'Type',
      options: opts('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN'),
    },
    { name: 'workplace', type: 'select', label: 'Where', options: opts('onsite', 'hybrid', 'remote') },
    { name: 'city', type: 'text', label: 'City' },
    { name: 'country', type: 'text', validate: ISO2, label: 'Country code', placeholder: 'SA' },
    { name: 'description', type: 'richText', localized: true, label: 'About the role' },
    textRows('responsibilities', 'item', 'What you will do', 'responsibility'),
    textRows('requirements', 'item', 'What we need', 'requirement'),
    textRows('roleQuestions', 'question', 'Extra questions for applicants', 'question', { section: 'more' }),
    {
      name: 'salary',
      type: 'group',
      label: 'Salary',
      section: 'more',
      fields: [
        { name: 'min', type: 'number', label: 'From' },
        { name: 'max', type: 'number', label: 'To' },
        { name: 'currency', type: 'text', defaultValue: 'SAR', label: 'Currency' },
        { name: 'unit', type: 'select', defaultValue: 'MONTH', label: 'Per', options: opts('HOUR', 'MONTH', 'YEAR') },
        { name: 'show', type: 'checkbox', defaultValue: false, label: 'Show the salary on the site' },
      ],
    },
    {
      name: 'applicantLocationRequirements',
      type: 'array',
      label: 'Remote: allowed countries',
      rowLabel: 'country',
      ui: 'inline',
      section: 'more',
      description: '2-letter country codes, e.g. SA, AE.',
      fields: [{ name: 'country', type: 'text', validate: ISO2, label: 'Country code' }],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'open',
      sidebar: true,
      label: 'Accepting applications',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    { name: 'datePosted', type: 'date', sidebar: true, label: 'Posted on' },
    { name: 'validThrough', type: 'date', sidebar: true, label: 'Closes on (optional)' },
  ],
})

const Applications: CollectionConfig = {
  slug: 'applications',
  labels: { singular: 'Application', plural: 'Applications' },
  description: 'People who applied to a job.',
  group: 'Careers',
  useAsTitle: 'name',
  defaultColumns: ['name', 'job', 'status', 'rating', 'createdAt'],
  access: access(['admin', 'recruiter'], ['admin', 'recruiter'], ['admin']),
  hooks: { retention: 'application' },
  fields: [
    { name: 'job', type: 'relationship', relationTo: 'jobs', required: true, label: 'Job' },
    { name: 'name', type: 'text', required: true, label: 'Name' },
    { name: 'email', type: 'email', label: 'Email' },
    { name: 'phone', type: 'text', label: 'Phone' },
    { name: 'cv', type: 'upload', relationTo: 'private-files', filter: { purpose: 'cv' }, label: 'CV (PDF)' },
    { name: 'linkedin', type: 'text', label: 'LinkedIn' },
    { name: 'portfolio', type: 'text', label: 'Portfolio' },
    { name: 'answers', type: 'json', label: 'Answers to extra questions', section: 'advanced' },
    consentGroup(),
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      sidebar: true,
      label: 'Stage',
      options: opts('new', 'screening', 'interview', 'offer', 'hired', 'rejected'),
    },
    { name: 'rating', type: 'number', min: 1, max: 5, sidebar: true, label: 'Rating (1–5)' },
    { name: 'notes', type: 'textarea', label: 'Private notes' },
    {
      name: 'retainUntil',
      type: 'date',
      sidebar: true,
      readOnly: true,
      section: 'advanced',
      label: 'Delete personal data after',
      description: 'Set automatically.',
    },
    { name: 'anonymisedAt', type: 'date', sidebar: true, readOnly: true, section: 'advanced', label: 'Anonymised on' },
    { name: 'locale', type: 'select', options: opts('ar', 'en'), label: 'Site language', section: 'advanced' },
  ],
}

const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Lead', plural: 'Leads' },
  description: 'People who filled in the scorecard, contact form or booked a call.',
  group: 'Sales',
  useAsTitle: 'name',
  defaultColumns: ['name', 'source', 'score', 'tier', 'status', 'createdAt'],
  defaultSort: '-createdAt',
  access: access(['admin', 'sales'], ['admin', 'sales'], ['admin']),
  hooks: { retention: 'lead' },
  fields: [
    { name: 'name', type: 'text', label: 'Name' },
    {
      name: 'phone',
      type: 'text',
      label: 'WhatsApp number',
      placeholder: '+966500000000',
      validate: (v) =>
        !v ||
        (typeof v === 'string' && /^\+[1-9]\d{6,14}$/.test(v)) ||
        'Write the number with + and the country code, no spaces, e.g. +966500000000.',
    },
    { name: 'email', type: 'email', label: 'Email' },
    { name: 'company', type: 'text', label: 'Company' },
    { name: 'country', type: 'text', label: 'Country' },
    { name: 'message', type: 'textarea', label: 'Their message' },
    { name: 'notes', type: 'textarea', label: 'Private notes', description: 'Only the team sees these.' },
    {
      name: 'source',
      type: 'select',
      label: 'Came from',
      options: opts('scorecard', 'contact', 'booking', 'newsletter', 'playbook', 'whatsapp'),
    },
    { name: 'score', type: 'number', label: 'Scorecard score' },
    {
      name: 'tier',
      type: 'select',
      label: 'Scorecard result',
      options: [
        { label: 'Ready to launch', value: 'ready' },
        { label: 'Almost ready', value: 'almost' },
        { label: 'Explore first', value: 'explore' },
      ],
    },
    { name: 'modelSlug', type: 'text', label: 'App model they looked at' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      sidebar: true,
      label: 'Stage',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Contacted', value: 'contacted' },
        { label: 'Call booked', value: 'booked' },
        { label: 'Blueprint', value: 'blueprint' },
        { label: 'Won', value: 'won' },
        { label: 'Lost', value: 'lost' },
      ],
    },
    { name: 'owner', type: 'relationship', relationTo: 'users', sidebar: true, label: 'Handled by' },
    { name: 'answers', type: 'json', label: 'Scorecard answers', section: 'advanced' },
    {
      name: 'disqualifiers',
      type: 'json',
      label: 'Reasons it may not fit',
      description: 'List of codes.',
      section: 'advanced',
    },
    { name: 'landingPage', type: 'text', label: 'First page they saw', section: 'advanced' },
    {
      name: 'utm',
      type: 'group',
      label: 'Campaign tracking (UTM)',
      section: 'advanced',
      fields: ['source', 'medium', 'campaign', 'content', 'term'].map((name): Field => ({ name, type: 'text' })),
    },
    { name: 'clickIds', type: 'json', label: 'Ad click ids', section: 'advanced' },
    { name: 'firstTouch', type: 'json', label: 'First visit', section: 'advanced' },
    { name: 'lastTouch', type: 'json', label: 'Last visit', section: 'advanced' },
    { name: 'referrer', type: 'text', label: 'Referring site', section: 'advanced' },
    { name: 'refCode', type: 'text', label: 'Referral code', section: 'advanced' },
    consentGroup(true),
    { name: 'locale', type: 'select', options: opts('ar', 'en'), label: 'Site language', section: 'advanced' },
    {
      name: 'retainUntil',
      type: 'date',
      sidebar: true,
      readOnly: true,
      section: 'advanced',
      label: 'Delete personal data after',
      description: 'Set automatically.',
    },
    { name: 'anonymisedAt', type: 'date', sidebar: true, readOnly: true, section: 'advanced', label: 'Anonymised on' },
  ],
}

const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Subscriber', plural: 'Subscribers' },
  description: 'People on the email list.',
  group: 'Sales',
  useAsTitle: 'email',
  defaultColumns: ['email', 'locale', 'status', 'createdAt'],
  defaultSort: '-createdAt',
  access: access(['admin', 'sales'], ['admin', 'sales'], ['admin']),
  fields: [
    { name: 'email', type: 'email', required: true, label: 'Email' },
    { name: 'locale', type: 'select', options: opts('ar', 'en'), label: 'Language' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      label: 'Status',
      options: [
        { label: 'Waiting for email confirmation', value: 'pending' },
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Unsubscribed', value: 'unsubscribed' },
      ],
    },
    consentGroup(),
    { name: 'confirmToken', type: 'text', hidden: true },
  ],
}

const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  labels: { singular: 'Private file', plural: 'Private files' },
  description: 'CVs and signed permission letters. Never public.',
  group: 'Private',
  useAsTitle: 'filename',
  defaultColumns: ['filename', 'purpose', 'createdAt'],
  access: access(['admin', 'recruiter', 'editor'], ['admin', 'recruiter', 'editor'], ['admin']),
  upload: 'private',
  fields: [
    {
      name: 'purpose',
      type: 'select',
      required: true,
      defaultValue: 'cv',
      label: 'What it is',
      options: [
        { label: 'CV', value: 'cv' },
        { label: 'Signed permission', value: 'consent' },
      ],
      description: 'Recruiters see CVs, editors see permission letters.',
    },
    { name: 'note', type: 'text', label: 'Note' },
    { name: 'filename', type: 'text', readOnly: true, label: 'File name' },
    { name: 'mimeType', type: 'text', readOnly: true, hidden: true },
    { name: 'filesize', type: 'number', readOnly: true, hidden: true },
  ],
}

const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Admin user', plural: 'Admin users' },
  description: 'People who can log in here.',
  group: 'Admin',
  useAsTitle: 'email',
  defaultColumns: ['name', 'email', 'role'],
  access: access(['admin']),
  auth: true,
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Name' },
    { name: 'email', type: 'email', required: true, label: 'Email' },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      sidebar: true,
      label: 'What they can do',
      options: [
        { label: 'Admin (everything)', value: 'admin' },
        { label: 'Editor (website content)', value: 'editor' },
        { label: 'Recruiter (jobs and applications)', value: 'recruiter' },
        { label: 'Sales (leads and subscribers)', value: 'sales' },
      ],
    },
  ],
}

export const collections: CollectionConfig[] = [
  Pages,
  Models,
  Solutions,
  Projects,
  Posts,
  News,
  Guides,
  Faqs,
  Authors,
  taxonomy('categories', 'Category', 'Categories'),
  taxonomy('tags', 'Tag', 'Tags'),
  Testimonials,
  Media,
  ShortLinks,
  Jobs,
  Applications,
  Leads,
  Subscribers,
  PrivateFiles,
  Users,
]
