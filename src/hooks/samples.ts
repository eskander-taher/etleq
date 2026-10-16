import type { CheckboxField } from 'payload'

/** Collections that can hold public sample content (checked by scripts/check-samples.ts). */
export const SAMPLE_COLLECTIONS = [
  'pages',
  'models',
  'solutions',
  'projects',
  'posts',
  'news',
  'guides',
  'jobs',
  'faqs',
  'authors',
  'categories',
  'tags',
] as const

/** Sidebar flag marking development sample content. The production build fails while any published doc carries it. */
export const isSampleField = (): CheckboxField => ({
  name: 'isSample',
  type: 'checkbox',
  defaultValue: false,
  index: true,
  admin: {
    position: 'sidebar',
    description: 'Sample content for development only. The production build fails if a published document is a sample.',
  },
})

/** Production guard: samples are only allowed outside production. */
export const samplesAllowed = (siteEnv = process.env.SITE_ENV) => siteEnv !== 'production'

/**
 * Decide what check-samples should do with a count of published samples.
 * Returns the exit code and the message to print.
 */
export function sampleVerdict(count: number, siteEnv = process.env.SITE_ENV): { exitCode: 0 | 1; message: string } {
  if (count === 0) return { exitCode: 0, message: 'No published sample documents.' }
  if (!samplesAllowed(siteEnv)) {
    return { exitCode: 1, message: `${count} published sample document(s) found. Remove or unpublish them before a production build.` }
  }
  return { exitCode: 0, message: `Warning: ${count} published sample document(s) found (allowed outside production).` }
}
