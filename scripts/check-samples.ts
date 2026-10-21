/**
 * Build guard: the production build fails while any published document is a
 * sample (`isSample: true`). Runs before `next build` (see package.json).
 *
 * It also scans the globals (site-settings, offer, footer, header, …) for founder placeholders
 * ("[SAMPLE]", "[CR number]", "[اسم الكيان …]", the dummy WhatsApp number) and requires the offer
 * global's `confirmed` flag, so unconfirmed prices and fake legal details never reach production.
 *
 * - SITE_ENV=production: exit 1 if samples are published, a global holds a placeholder, the offer
 *   is not confirmed, or the database cannot be reached (the guard must not silently pass).
 * - Otherwise: print warnings and exit 0.
 */
import 'dotenv/config'

import { sampleVerdict, SAMPLE_COLLECTIONS } from '../src/hooks/samples'

process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS = '5000'

const isProduction = process.env.SITE_ENV === 'production'

/** Placeholder markers the seed and the founders' drafts use. Any hit in a global blocks production. */
const PLACEHOLDERS = ['[SAMPLE]', '[عينة]', '[CR', '[VAT', '[TRN', '[Licence', '[اسم', '[العنوان', '966500000000'] as const

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
      const hit = PLACEHOLDERS.find((p) => text.includes(p))
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
  for (const p of problems) (isProduction ? console.error : console.warn)(`[check-samples] ${isProduction ? '' : 'Warning: '}${p}`)
  if (!problems.length) console.log('[check-samples] Globals hold no placeholders and the offer is confirmed.')
  else if (!isProduction) console.warn(`[check-samples] ${problems.length} global problem(s) (allowed outside production).`)

  process.exit(exitCode || (isProduction && problems.length ? 1 : 0))
}

main()
