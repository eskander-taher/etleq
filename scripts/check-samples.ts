/**
 * Build guard: the production build fails while any published document is a
 * sample (`isSample: true`). Runs before `next build` (see package.json).
 *
 * It also reports founder placeholders in the globals ("[SAMPLE]", "[CR number]", "[اسم الكيان …]",
 * the dummy WhatsApp number) and an unconfirmed offer. These only warn: the site scrubs placeholder
 * values when it reads globals (src/lib/placeholders.ts), so the owner can deploy and fill them later.
 *
 * - SITE_ENV=production: exit 1 if samples are published or the database cannot be reached
 *   (the guard must not silently pass).
 * - Otherwise: print warnings and exit 0.
 */
import 'dotenv/config'

import { sampleVerdict, SAMPLE_COLLECTIONS } from '../src/hooks/samples'
import { placeholderIn } from '../src/lib/placeholders'

process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS = '5000'

const isProduction = process.env.SITE_ENV === 'production'


/** Every string value in a stored global, with its dotted path (localized values are `{ ar, en }`). */
function* strings(value: unknown, path: string): Generator<[string, string]> {
  if (typeof value === 'string') yield [path, value]
  else if (Array.isArray(value)) for (let i = 0; i < value.length; i++) yield* strings(value[i], `${path}[${i}]`)
  else if (value && typeof value === 'object')
    for (const [k, v] of Object.entries(value)) if (k !== '_id') yield* strings(v, path ? `${path}.${k}` : k)
}

/** Problems found in the stored globals: placeholder text and an unconfirmed offer. */
export function globalProblems(docs: Record<string, unknown>[], envWhatsapp = process.env.WHATSAPP_NUMBER): string[] {
  const problems: string[] = []
  for (const doc of docs) {
    const slug = String(doc.globalType ?? doc._id ?? 'unknown')
    for (const [path, text] of strings(doc, '')) {
      const hit = placeholderIn(text)
      if (hit) problems.push(`${slug}.${path} contains placeholder "${hit}"`)
    }
  }
  const offer = docs.find((d) => d.globalType === 'offer' || d._id === 'offer')
  if (offer?.confirmed !== true) problems.push('offer.confirmed is not ticked: the founders have not confirmed prices and terms')
  if (envWhatsapp?.includes('966500000000')) problems.push('WHATSAPP_NUMBER is the dummy 966500000000')
  return problems
}

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
  const { closeDb, getDb, GLOBALS_COLLECTION } = await import('../src/cms/db')

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
  const globals = (await db.collection(GLOBALS_COLLECTION).find({}).toArray()) as Record<string, unknown>[]
  await closeDb()

  const { exitCode, message } = sampleVerdict(total)
  ;(exitCode ? console.error : console.log)(`[check-samples] ${message}`)

  const problems = globalProblems(globals)
  for (const p of problems) console.warn(`[check-samples] Warning: ${p}`)
  if (!problems.length) console.log('[check-samples] Globals hold no placeholders and the offer is confirmed.')
  else console.warn(`[check-samples] ${problems.length} global problem(s): hidden on the site until the founders fill them in.`)

  process.exit(exitCode)
}

main()
