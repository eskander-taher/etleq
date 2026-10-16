import type { CollectionConfig, Field } from 'payload'

import { evidenceGate } from '@/hooks/gates'
import { articleFields } from './Posts'
import { contentAccess, contentHooks, contentVersions, previewAdmin } from './shared'

const hooks = contentHooks(['title', 'excerpt', 'answerBox', 'content'])

/** Cost guides (`/cost/[slug]`) and comparisons (`/compare/[slug]`). */
export const Guides: CollectionConfig = {
  slug: 'guides',
  typescript: { interface: 'Guide' },
  admin: { group: 'Content', useAsTitle: 'title', defaultColumns: ['title', 'type', '_status'], ...previewAdmin('guides') },
  access: contentAccess(),
  versions: contentVersions,
  hooks: { ...hooks, beforeChange: [...(hooks.beforeChange || []), evidenceGate('guide')] },
  defaultSort: '-publishedAt',
  fields: [
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'cost',
      options: [
        { label: 'Cost guide', value: 'cost' },
        { label: 'Comparison', value: 'comparison' },
      ],
      admin: { position: 'sidebar' },
    },
    ...articleFields().flatMap((field): Field[] =>
      // Place answerBox right after the excerpt.
      'name' in field && field.name === 'excerpt'
        ? [
            field,
            {
              name: 'answerBox',
              type: 'textarea',
              localized: true,
              admin: { description: '40–60 word direct answer (required to publish).' },
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
    { name: 'reviewer', type: 'relationship', relationTo: 'authors', admin: { position: 'sidebar' } },
  ],
}
