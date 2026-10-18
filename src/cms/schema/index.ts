import { collections } from './collections'
import { globals } from './globals'
import type { CollectionConfig, GlobalConfig } from './types'

export * from './types'
export { collections, globals }
export { layoutBlocks, richTextBlocks, RICH_TEXT_BLOCK_SLUGS } from './blocks'

const bySlug = new Map(collections.map((c) => [c.slug, c]))
const globalBySlug = new Map(globals.map((g) => [g.slug, g]))

export const getCollectionConfig = (slug: string): CollectionConfig | undefined => bySlug.get(slug)
export const getGlobalConfig = (slug: string): GlobalConfig | undefined => globalBySlug.get(slug)

export function requireCollection(slug: string): CollectionConfig {
  const config = bySlug.get(slug)
  if (!config) throw new Error(`Unknown collection "${slug}"`)
  return config
}
