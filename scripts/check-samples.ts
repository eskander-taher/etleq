/**
 * Build guard: the production build fails while any published document is a
 * sample (`isSample: true`). Runs before `next build` (see package.json).
 *
 * - SITE_ENV=production: exit 1 if samples are published, or if the database
 *   cannot be reached (the guard must not silently pass).
 * - Otherwise: print a warning and exit 0.
 */
import 'dotenv/config'

import { sampleVerdict, SAMPLE_COLLECTIONS } from '../src/hooks/samples'

process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS = '5000'

const isProduction = process.env.SITE_ENV === 'production'

function unreachable(reason: string): never {
  if (isProduction) {
    console.error(`[check-samples] Database unreachable (${reason}). Cannot verify samples in production.`)
    process.exit(1)
  }
  console.warn(`[check-samples] Warning: database unreachable (${reason}); sample check skipped outside production.`)
  process.exit(0)
}

async function main() {
  if (!process.env.DATABASE_URL) unreachable('DATABASE_URL is not set')
  const { closeDb, getDb } = await import('../src/cms/db')

  let db: Awaited<ReturnType<typeof getDb>>
  try {
    db = await getDb()
    await db.command({ ping: 1 })
  } catch (error) {
    unreachable((error as Error).message)
  }

  let total = 0
  for (const collection of SAMPLE_COLLECTIONS) {
    const count = await db.collection(collection).countDocuments({ isSample: true, _status: 'published' })
    if (count) console.log(`[check-samples] ${collection}: ${count}`)
    total += count
  }
  await closeDb()

  const { exitCode, message } = sampleVerdict(total)
  ;(exitCode ? console.error : console.log)(`[check-samples] ${message}`)
  process.exit(exitCode)
}

main()
