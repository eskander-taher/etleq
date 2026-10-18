import { FILES_COLLECTION, getDb } from './db'
import { collections } from './schema'

/** Create the indexes the site and admin rely on (idempotent). Run by `pnpm seed` and `pnpm db:indexes`. */
export async function ensureIndexes() {
  const db = await getDb()
  const index = async (collection: string, keys: Record<string, 1 | -1>, options: { unique?: boolean } = {}) => {
    try {
      await db.collection(collection).createIndex(keys, options)
    } catch (error) {
      // An equivalent index with other options already exists (e.g. created by Payload): keep it.
      const code = (error as { code?: number }).code
      if (code !== 85 && code !== 86) throw error
    }
  }
  for (const c of collections) {
    if (c.fields.some((f) => f.name === 'slug')) await index(c.slug, { slug: 1 })
    if (c.drafts) await index(c.slug, { _status: 1, 'translated.ar': 1, 'translated.en': 1 })
  }
  await index('users', { email: 1 }, { unique: true })
  await index('subscribers', { email: 1 })
  await index('short-links', { code: 1 })
  await index('leads', { email: 1, createdAt: -1 })
  await index('leads', { retainUntil: 1 })
  await index('applications', { retainUntil: 1 })
  await index(FILES_COLLECTION, { mimeType: 1 })
}
