import { layoutBlocks } from './blocks'
import { type Access, type CollectionConfig, type Field, opts, type Role, type Validate } from './types'

/* ------------------------------------------------------------------ */
/* Shared fields                                                       */
/* ------------------------------------------------------------------ */

const ISO2: Validate = (v) =>
  !v || (typeof v === 'string' && /^[A-Z]{2}$/.test(v)) || 'Use a 2-letter ISO country code, e.g. SA.'

/** `translated.ar` / `translated.en`: a locale is public only when ticked. */
export const translatedField = (): Field => ({
  name: 'translated',
  type: 'group',
  sidebar: true,
  description: 'Tick a language to publish it. Its required fields become mandatory; unticked languages return 404.',
  fields: [
    { name: 'ar', type: 'checkbox', label: 'العربية', defaultValue: false },
    { name: 'en', type: 'checkbox', label: 'English', defaultValue: false },
  ],
})

export const isSampleField = (): Field => ({
  name: 'isSample',
  type: 'checkbox',
  defaultValue: false,
  sidebar: true,
  description: 'Sample content for development only. The production build fails if a published document is a sample.',
})

export const slugField = (): Field => ({
  name: 'slug',
  type: 'text',
  sidebar: true,
  description: 'Generated from the English title when empty. Lowercase Latin letters, numbers and hyphens.',
})

/** SEO meta per locale. `buildMetadata` prefers these over generated values. */
export const metaField = (): Field => ({
  name: 'meta',
  type: 'group',
  label: 'SEO',
  fields: [
    { name: 'title', type: 'text', localized: true },
    { name: 'description', type: 'textarea', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
})

const sidebarDate = (name: string, description?: string): Field => ({ name, type: 'date', sidebar: true, description })

const sourcesField = (): Field => ({
  name: 'sources',
  type: 'array',
  description: 'Every statistic needs a source with URL and date.',
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'url', type: 'text', required: true },
    { name: 'accessedAt', type: 'date' },
  ],
})

const consentGroup = (marketing = false): Field => ({
  name: 'consent',
  type: 'group',
  fields: [
    { name: 'given', type: 'checkbox', defaultValue: false },
    { name: 'at', type: 'date', time: true },
    { name: 'policyVersion', type: 'text' },
    ...(marketing
      ? [
          {
            name: 'marketing',
            type: 'checkbox',
            defaultValue: false,
            description: 'Separate, unticked-by-default marketing opt-in.',
          } as Field,
        ]
      : []),
  ],
})

const textRows = (name: string, sub = 'text'): Field => ({
  name,
  type: 'array',
  fields: [{ name: sub, type: 'text', localized: true }],
})

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

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

const articleFields = (): Field[] => [
  { name: 'title', type: 'text', localized: true },
  slugField(),
  { name: 'excerpt', type: 'textarea', localized: true },
  textRows('keyTakeaways'),
  { name: 'content', type: 'richText', localized: true },
  { name: 'heroImage', type: 'upload', relationTo: 'media' },
  { name: 'authors', type: 'relationship', relationTo: 'authors', hasMany: true, sidebar: true },
  { name: 'categories', type: 'relationship', relationTo: 'categories', hasMany: true, sidebar: true },
  { name: 'tags', type: 'relationship', relationTo: 'tags', hasMany: true, sidebar: true },
  sidebarDate('publishedAt'),
  sidebarDate('lastReviewedAt'),
  sourcesField(),
  { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
  { name: 'relatedPosts', type: 'relationship', relationTo: 'posts', hasMany: true },
]

const Pages = content({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  useAsTitle: 'title',
  defaultColumns: ['title', 'slug', '_status', 'updatedAt'],
  hooks: { requiredLocalized: ['title'] },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      blocks: layoutBlocks,
      description: 'The home page is the page with slug "home".',
    },
  ],
})

const Models = content({
  slug: 'models',
  labels: { singular: 'Model', plural: 'Models' },
  useAsTitle: 'title',
  defaultColumns: ['title', 'category', 'tier', '_status'],
  hooks: { requiredLocalized: ['title', 'answerBox', 'whatItDoes'], evidence: 'model' },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    {
      name: 'answerBox',
      type: 'textarea',
      localized: true,
      description: '40–60 word direct answer shown at the top of the page.',
    },
    {
      name: 'category',
      type: 'select',
      options: opts('booking', 'membership', 'marketplace', 'directory', 'b2b', 'vertical', 'creator', 'other'),
    },
    { name: 'whatItDoes', type: 'textarea', localized: true },
    { name: 'whoPays', type: 'textarea', localized: true },
    { name: 'pricingModel', type: 'textarea', localized: true },
    {
      name: 'mrr',
      type: 'group',
      label: 'Reported MRR',
      description: 'Shown with its source, date and a disclaimer.',
      fields: [
        { name: 'amount', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'USD' },
        { name: 'sourceName', type: 'text' },
        { name: 'sourceUrl', type: 'text' },
        { name: 'reportedAt', type: 'date' },
      ],
    },
    { name: 'teamSize', type: 'number' },
    { name: 'yearFounded', type: 'number' },
    {
      name: 'factSources',
      type: 'array',
      description: 'At least 3 sources with URL and checked date are required to publish.',
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'value', type: 'text', localized: true },
        { name: 'url', type: 'text' },
        { name: 'checkedAt', type: 'date' },
      ],
    },
    { name: 'whyItWorks', type: 'richText', localized: true },
    {
      name: 'runningCosts',
      type: 'array',
      fields: [
        { name: 'item', type: 'text', localized: true },
        { name: 'monthlyCost', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'USD' },
        { name: 'sourceUrl', type: 'text' },
        { name: 'checkedAt', type: 'date' },
      ],
    },
    { name: 'gulfVersion', type: 'richText', localized: true },
    textRows('mvpFeatures', 'feature'),
    { name: 'tier', type: 'select', options: opts('core', 'pro', 'vertical') },
    { name: 'priceFrom', type: 'number', description: 'USD, excluding VAT.' },
    { name: 'buildDays', type: 'number', defaultValue: 30 },
    textRows('fitCriteria', 'criterion'),
    {
      name: 'reel',
      type: 'group',
      fields: [
        { name: 'url', type: 'text' },
        { name: 'platform', type: 'select', options: opts('youtube', 'instagram') },
        { name: 'posterImage', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'transcript', type: 'textarea', localized: true },
    { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
    { name: 'relatedModels', type: 'relationship', relationTo: 'models', hasMany: true, maxRows: 2 },
    { name: 'relatedSolution', type: 'relationship', relationTo: 'solutions' },
    { name: 'relatedPosts', type: 'relationship', relationTo: 'posts', hasMany: true },
    { name: 'reviewer', type: 'relationship', relationTo: 'authors', sidebar: true },
    sidebarDate('lastReviewedAt', 'Required to publish.'),
    { name: 'authors', type: 'relationship', relationTo: 'authors', hasMany: true, sidebar: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
  ],
})

const Solutions = content({
  slug: 'solutions',
  labels: { singular: 'Solution', plural: 'Solutions' },
  useAsTitle: 'title',
  defaultColumns: ['title', 'vertical', '_status'],
  hooks: { requiredLocalized: ['title', 'summary'] },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    { name: 'vertical', type: 'select', options: opts('clinics', 'gyms', 'salons', 'restaurants', 'training-centres') },
    { name: 'summary', type: 'textarea', localized: true },
    textRows('buyerProblems', 'problem'),
    {
      name: 'features',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
        { name: 'icon', type: 'text', description: 'lucide-react icon name' },
      ],
    },
    {
      name: 'integrations',
      type: 'array',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'description', type: 'textarea', localized: true },
      ],
    },
    {
      name: 'video',
      type: 'group',
      fields: [
        { name: 'url', type: 'text' },
        { name: 'posterImage', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'priceFrom', type: 'number', description: 'USD, excluding VAT.' },
    {
      name: 'steps',
      type: 'array',
      fields: [
        { name: 'title', type: 'text', localized: true },
        { name: 'description', type: 'textarea', localized: true },
      ],
    },
    { name: 'caseStudies', type: 'relationship', relationTo: 'projects', hasMany: true },
    { name: 'faqs', type: 'relationship', relationTo: 'faqs', hasMany: true },
  ],
})

const Projects = content({
  slug: 'projects',
  labels: { singular: 'Project', plural: 'Projects' },
  useAsTitle: 'title',
  defaultColumns: ['title', 'clientName', '_status'],
  hooks: { requiredLocalized: ['title', 'context'], projectConsent: true },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    { name: 'clientName', type: 'text' },
    { name: 'clientLogo', type: 'upload', relationTo: 'media' },
    {
      name: 'consentGiven',
      type: 'checkbox',
      defaultValue: false,
      sidebar: true,
      description: 'Required (with the consent file) to publish.',
    },
    { name: 'consentFile', type: 'upload', relationTo: 'private-files', sidebar: true, filter: { purpose: 'consent' } },
    { name: 'context', type: 'textarea', localized: true },
    { name: 'challenge', type: 'richText', localized: true },
    { name: 'solution', type: 'richText', localized: true },
    textRows('scope', 'item'),
    { name: 'stack', type: 'array', fields: [{ name: 'name', type: 'text' }] },
    { name: 'plannedDays', type: 'number' },
    { name: 'actualDays', type: 'number' },
    {
      name: 'results',
      type: 'array',
      description: 'Only verified results are shown on the site.',
      fields: [
        { name: 'label', type: 'text', localized: true },
        { name: 'value', type: 'text' },
        { name: 'verified', type: 'checkbox', defaultValue: false },
        { name: 'evidence', type: 'text', description: 'Link or note proving the result (internal).' },
      ],
    },
    { name: 'gallery', type: 'array', fields: [{ name: 'image', type: 'upload', relationTo: 'media' }] },
    { name: 'testimonial', type: 'relationship', relationTo: 'testimonials' },
    { name: 'relatedModel', type: 'relationship', relationTo: 'models' },
    sidebarDate('publishedAt'),
  ],
})

const Posts = content({
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  useAsTitle: 'title',
  defaultColumns: ['title', 'publishedAt', '_status'],
  defaultSort: '-publishedAt',
  hooks: { requiredLocalized: ['title', 'excerpt', 'content'] },
  fields: articleFields(),
})

const News = content({
  slug: 'news',
  labels: { singular: 'News item', plural: 'News' },
  useAsTitle: 'title',
  defaultColumns: ['title', 'publishedAt', '_status'],
  defaultSort: '-publishedAt',
  hooks: { requiredLocalized: ['title', 'excerpt'] },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    { name: 'excerpt', type: 'textarea', localized: true },
    { name: 'content', type: 'richText', localized: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    sidebarDate('publishedAt'),
    {
      name: 'sourceLinks',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'url', type: 'text' },
      ],
    },
  ],
})

const Guides = content({
  slug: 'guides',
  labels: { singular: 'Guide', plural: 'Guides' },
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
              description: '40–60 word direct answer (required to publish).',
            },
          ]
        : [field],
    ),
    {
      name: 'comparisonTable',
      type: 'group',
      fields: [
        { name: 'columns', type: 'array', fields: [{ name: 'label', type: 'text', localized: true }] },
        {
          name: 'rows',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', localized: true },
            {
              name: 'cells',
              type: 'array',
              fields: [
                { name: 'value', type: 'text', localized: true },
                { name: 'sourceUrl', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
    { name: 'reviewer', type: 'relationship', relationTo: 'authors', sidebar: true },
  ],
})

const Faqs = content({
  slug: 'faqs',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  useAsTitle: 'question',
  defaultColumns: ['question', 'category', 'order', '_status'],
  defaultSort: 'order',
  seo: false,
  hooks: { requiredLocalized: ['question', 'answer'], revalidate: 'tag' },
  fields: [
    { name: 'question', type: 'text', localized: true },
    { name: 'answer', type: 'textarea', localized: true },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'general',
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
    { name: 'order', type: 'number', defaultValue: 0, sidebar: true },
  ],
})

const Authors = content({
  slug: 'authors',
  labels: { singular: 'Author', plural: 'Authors' },
  useAsTitle: 'name',
  defaultColumns: ['name', 'role', '_status'],
  seo: false,
  hooks: { requiredLocalized: ['name', 'role', 'bio'], slugFrom: 'name' },
  fields: [
    { name: 'name', type: 'text', localized: true },
    slugField(),
    { name: 'role', type: 'text', localized: true },
    { name: 'bio', type: 'textarea', localized: true },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    textRows('credentials'),
    {
      name: 'sameAs',
      type: 'array',
      description: 'Profile links (LinkedIn, X, GitHub…).',
      fields: [{ name: 'url', type: 'text' }],
    },
    { name: 'user', type: 'relationship', relationTo: 'users', sidebar: true },
    {
      name: 'isFounder',
      type: 'checkbox',
      defaultValue: false,
      sidebar: true,
      description: 'Shown in the founders sections on Home and About.',
    },
    { name: 'order', type: 'number', sidebar: true, description: 'Display order (lowest first).' },
  ],
})

const taxonomy = (slug: 'categories' | 'tags', singular: string, plural: string) =>
  content({
    slug,
    labels: { singular, plural },
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', '_status'],
    seo: false,
    hooks: { requiredLocalized: ['name'], revalidate: 'tag', slugFrom: 'name' },
    fields: [
      { name: 'name', type: 'text', localized: true },
      slugField(),
      { name: 'description', type: 'textarea', localized: true },
    ],
  })

const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  labels: { singular: 'Testimonial', plural: 'Testimonials' },
  group: 'Content',
  useAsTitle: 'person',
  defaultColumns: ['person', 'company', 'verified'],
  access: access(EDITORS),
  hooks: { revalidate: 'tag' },
  fields: [
    { name: 'person', type: 'text', required: true },
    { name: 'role', type: 'text', localized: true },
    { name: 'company', type: 'text' },
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'quote', type: 'textarea', localized: true },
    { name: 'videoUrl', type: 'text' },
    { name: 'consentFile', type: 'upload', relationTo: 'private-files', filter: { purpose: 'consent' } },
    {
      name: 'verified',
      type: 'checkbox',
      defaultValue: false,
      sidebar: true,
      description: 'Only verified testimonials (with a consent file) are shown on the site.',
      validate: (value, sibling) =>
        !value || Boolean(sibling?.consentFile) || 'Attach the consent file before marking a testimonial as verified.',
    },
    { name: 'relatedProject', type: 'relationship', relationTo: 'projects' },
  ],
}

const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Image', plural: 'Media' },
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
      description: 'Describe the image for screen readers, in this language.',
    },
    { name: 'caption', type: 'text', localized: true },
    { name: 'credit', type: 'text' },
    { name: 'filename', type: 'text', readOnly: true },
    { name: 'mimeType', type: 'text', readOnly: true, hidden: true },
    { name: 'filesize', type: 'number', readOnly: true, hidden: true },
    { name: 'width', type: 'number', readOnly: true, hidden: true },
    { name: 'height', type: 'number', readOnly: true, hidden: true },
    { name: 'url', type: 'text', readOnly: true },
  ],
}

const ShortLinks: CollectionConfig = {
  slug: 'short-links',
  labels: { singular: 'Short link', plural: 'Short links' },
  group: 'Marketing',
  useAsTitle: 'code',
  defaultColumns: ['code', 'target'],
  access: access(EDITORS),
  fields: [
    {
      name: 'code',
      type: 'text',
      required: true,
      validate: (v) =>
        (typeof v === 'string' && /^[a-z0-9-]{1,32}$/.test(v)) || 'Lowercase letters, numbers and hyphens only.',
    },
    {
      name: 'target',
      type: 'text',
      required: true,
      validate: (v) =>
        (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//')) ||
        'Use a site path starting with "/", e.g. /models/barber-booking-app.',
    },
    {
      name: 'utm',
      type: 'group',
      fields: ['source', 'medium', 'campaign', 'content'].map((name): Field => ({ name, type: 'text' })),
    },
    { name: 'isSample', type: 'checkbox', defaultValue: false, sidebar: true },
  ],
}

const Jobs = content({
  slug: 'jobs',
  labels: { singular: 'Job', plural: 'Jobs' },
  group: 'Careers',
  useAsTitle: 'title',
  defaultColumns: ['title', 'team', 'status', '_status'],
  defaultSort: '-datePosted',
  access: access(['admin', 'recruiter']),
  hooks: { requiredLocalized: ['title', 'description'] },
  fields: [
    { name: 'title', type: 'text', localized: true },
    slugField(),
    { name: 'team', type: 'select', options: opts('engineering', 'design', 'growth', 'operations') },
    {
      name: 'employmentType',
      type: 'select',
      options: opts('FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN'),
    },
    { name: 'city', type: 'text' },
    { name: 'country', type: 'text', validate: ISO2 },
    { name: 'workplace', type: 'select', options: opts('onsite', 'hybrid', 'remote') },
    {
      name: 'applicantLocationRequirements',
      type: 'array',
      description: 'For remote roles: countries applicants must be in (ISO2).',
      fields: [{ name: 'country', type: 'text', validate: ISO2 }],
    },
    { name: 'description', type: 'richText', localized: true },
    textRows('responsibilities', 'item'),
    textRows('requirements', 'item'),
    {
      name: 'salary',
      type: 'group',
      fields: [
        { name: 'min', type: 'number' },
        { name: 'max', type: 'number' },
        { name: 'currency', type: 'text', defaultValue: 'SAR' },
        { name: 'unit', type: 'select', defaultValue: 'MONTH', options: opts('HOUR', 'MONTH', 'YEAR') },
        { name: 'show', type: 'checkbox', defaultValue: false },
      ],
    },
    sidebarDate('datePosted'),
    sidebarDate('validThrough'),
    { name: 'status', type: 'select', defaultValue: 'open', sidebar: true, options: opts('open', 'closed') },
    textRows('roleQuestions', 'question'),
  ],
})

const Applications: CollectionConfig = {
  slug: 'applications',
  labels: { singular: 'Application', plural: 'Applications' },
  group: 'Careers',
  useAsTitle: 'name',
  defaultColumns: ['name', 'job', 'status', 'rating', 'createdAt'],
  access: access(['admin', 'recruiter'], ['admin', 'recruiter'], ['admin']),
  hooks: { retention: 'application' },
  fields: [
    { name: 'job', type: 'relationship', relationTo: 'jobs', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email' },
    { name: 'phone', type: 'text' },
    { name: 'cv', type: 'upload', relationTo: 'private-files', filter: { purpose: 'cv' }, description: 'PDF only.' },
    { name: 'linkedin', type: 'text' },
    { name: 'portfolio', type: 'text' },
    { name: 'answers', type: 'json' },
    consentGroup(),
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      sidebar: true,
      options: opts('new', 'screening', 'interview', 'offer', 'hired', 'rejected'),
    },
    { name: 'rating', type: 'number', min: 1, max: 5, sidebar: true },
    { name: 'notes', type: 'textarea' },
    {
      name: 'retainUntil',
      type: 'date',
      sidebar: true,
      readOnly: true,
      description: 'Set automatically; the record is anonymised after this date.',
    },
    { name: 'anonymisedAt', type: 'date', sidebar: true, readOnly: true },
    { name: 'locale', type: 'select', options: opts('ar', 'en') },
  ],
}

const Leads: CollectionConfig = {
  slug: 'leads',
  labels: { singular: 'Lead', plural: 'Leads' },
  group: 'Sales',
  useAsTitle: 'name',
  defaultColumns: ['name', 'source', 'score', 'tier', 'status', 'createdAt'],
  defaultSort: '-createdAt',
  access: access(['admin', 'sales'], ['admin', 'sales'], ['admin']),
  hooks: { retention: 'lead' },
  fields: [
    { name: 'name', type: 'text' },
    {
      name: 'phone',
      type: 'text',
      description: 'WhatsApp number in E.164 format.',
      validate: (v) =>
        !v || (typeof v === 'string' && /^\+[1-9]\d{6,14}$/.test(v)) || 'Use E.164 format, e.g. +966500000000.',
    },
    { name: 'email', type: 'email' },
    { name: 'country', type: 'text' },
    { name: 'company', type: 'text' },
    {
      name: 'source',
      type: 'select',
      options: opts('scorecard', 'contact', 'booking', 'newsletter', 'playbook', 'whatsapp'),
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
    { name: 'disqualifiers', type: 'json', description: 'Array of disqualifier codes.' },
    { name: 'modelSlug', type: 'text' },
    { name: 'landingPage', type: 'text' },
    {
      name: 'utm',
      type: 'group',
      fields: ['source', 'medium', 'campaign', 'content', 'term'].map((name): Field => ({ name, type: 'text' })),
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
      sidebar: true,
      options: opts('new', 'contacted', 'booked', 'blueprint', 'won', 'lost'),
    },
    { name: 'owner', type: 'relationship', relationTo: 'users', sidebar: true },
    { name: 'notes', type: 'textarea' },
    { name: 'message', type: 'textarea' },
    consentGroup(true),
    { name: 'locale', type: 'select', options: opts('ar', 'en') },
    {
      name: 'retainUntil',
      type: 'date',
      sidebar: true,
      readOnly: true,
      description: 'Set automatically; the record is anonymised after this date.',
    },
    { name: 'anonymisedAt', type: 'date', sidebar: true, readOnly: true },
  ],
}

const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Subscriber', plural: 'Subscribers' },
  group: 'Sales',
  useAsTitle: 'email',
  defaultColumns: ['email', 'locale', 'status', 'createdAt'],
  defaultSort: '-createdAt',
  access: access(['admin', 'sales'], ['admin', 'sales'], ['admin']),
  fields: [
    { name: 'email', type: 'email', required: true },
    { name: 'locale', type: 'select', options: opts('ar', 'en') },
    consentGroup(),
    { name: 'status', type: 'select', defaultValue: 'pending', options: opts('pending', 'confirmed', 'unsubscribed') },
    { name: 'confirmToken', type: 'text', hidden: true },
  ],
}

const PrivateFiles: CollectionConfig = {
  slug: 'private-files',
  labels: { singular: 'Private file', plural: 'Private files' },
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
      options: [
        { label: 'CV', value: 'cv' },
        { label: 'Consent record', value: 'consent' },
      ],
      description: 'Recruiters see CVs, editors see consent records.',
    },
    { name: 'note', type: 'text' },
    { name: 'filename', type: 'text', readOnly: true },
    { name: 'mimeType', type: 'text', readOnly: true, hidden: true },
    { name: 'filesize', type: 'number', readOnly: true, hidden: true },
  ],
}

const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  group: 'Admin',
  useAsTitle: 'email',
  defaultColumns: ['name', 'email', 'role'],
  access: access(['admin']),
  auth: true,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      sidebar: true,
      options: opts('admin', 'editor', 'recruiter', 'sales'),
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
