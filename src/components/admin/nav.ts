import type { CollectionConfig } from '@/cms/schema/types'

/** Admin sidebar, grouped by task rather than by data type. Labels come from the schema. */
export type NavItem = { kind: 'collection' | 'global'; slug: string }
export type NavGroup = { title: string; items: NavItem[] }

const c = (slug: string): NavItem => ({ kind: 'collection', slug })
const g = (slug: string): NavItem => ({ kind: 'global', slug })

export const NAV: NavGroup[] = [
  {
    title: 'Website content',
    items: [
      c('projects'),
      c('models'),
      c('solutions'),
      c('posts'),
      c('guides'),
      c('news'),
      c('faqs'),
      c('testimonials'),
      c('authors'),
      c('media'),
    ],
  },
  { title: 'Sales', items: [c('leads'), c('subscribers')] },
  { title: 'Hiring', items: [c('jobs'), c('applications')] },
  {
    title: 'Settings',
    items: [
      g('site-settings'),
      g('offer'),
      g('announcement-bar'),
      g('scorecard-settings'),
      g('header'),
      g('footer'),
      g('seo-defaults'),
    ],
  },
  {
    title: 'Less often',
    items: [c('pages'), c('categories'), c('tags'), c('short-links'), c('private-files'), c('users')],
  },
]

/** Heading of the "new document" form. */
export const newTitle = (config: CollectionConfig) =>
  config.slug === 'projects'
    ? 'Add a shipped app'
    : config.slug === 'posts'
      ? 'Write a blog post'
      : `New ${config.labels.singular.toLowerCase()}`
