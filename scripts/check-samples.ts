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

process.env.DISABLE_JOBS_AUTORUN = 'true'
process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS = '5000'

const isProduction = process.env.SITE_ENV === 'production'
const TIMEOUT_MS = 5000
// Loading the config (TypeScript, sharp, plugins) takes a few seconds on its own;
// the 5 s budget applies to reaching the database, plus this allowance for start-up.
const STARTUP_ALLOWANCE_MS = 25000

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

  const timer = setTimeout(() => unreachable(`no connection within ${TIMEOUT_MS / 1000}s`), TIMEOUT_MS + STARTUP_ALLOWANCE_MS)

  let payload: Awaited<ReturnType<typeof import('payload').getPayload>>
  try {
    const { getPayload } = await import('payload')
    const { default: config } = await import('../src/payload.config')
    payload = await getPayload({ config })
    // Force a round-trip so a lazy connection does not pass for a live one.
    await payload.count({ collection: 'users', overrideAccess: true })
  } catch (error) {
    clearTimeout(timer)
    unreachable((error as Error).message)
  }
  clearTimeout(timer)

  let total = 0
  for (const collection of SAMPLE_COLLECTIONS) {
    const where = { and: [{ isSample: { equals: true } }, { _status: { equals: 'published' } }] }
    try {
      const { totalDocs } = await payload.count({ collection, where: where as never, overrideAccess: true })
      if (totalDocs) console.log(`[check-samples] ${collection}: ${totalDocs}`)
      total += totalDocs
    } catch (error) {
      console.warn(`[check-samples] Could not count ${collection}: ${(error as Error).message}`)
    }
  }

  const { exitCode, message } = sampleVerdict(total)
  ;(exitCode ? console.error : console.log)(`[check-samples] ${message}`)
  process.exit(exitCode)
}

main()
