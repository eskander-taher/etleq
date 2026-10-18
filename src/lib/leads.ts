import { createHmac, timingSafeEqual } from 'node:crypto'
import { appSecret } from '@/cms/auth-crypto'
import { getCms } from '@/lib/cms'
import type { ScorecardTier } from '@/lib/scoring'

export type LeadSource = 'scorecard' | 'contact' | 'booking' | 'newsletter' | 'playbook' | 'whatsapp'
export type LeadStatus = 'new' | 'contacted' | 'booked' | 'blueprint' | 'won' | 'lost'

export interface LeadInput {
  name?: string
  phone?: string
  email?: string
  country?: string
  company?: string
  message?: string
  source: LeadSource
  answers?: Record<string, string>
  score?: number
  tier?: ScorecardTier
  disqualifiers?: string[]
  modelSlug?: string
  landingPage?: string
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string }
  clickIds?: Record<string, string>
  firstTouch?: unknown
  lastTouch?: unknown
  referrer?: string
  refCode?: string
  locale: 'ar' | 'en'
  consent: { given: boolean; at: string; policyVersion: string; marketing: boolean }
  retentionMonths?: number
}

export interface StoredLead {
  id: string
  name?: string | null
  email?: string | null
  phone?: string | null
  locale?: 'ar' | 'en' | null
  status?: LeadStatus | null
  tier?: ScorecardTier | null
  score?: number | null
  modelSlug?: string | null
  disqualifiers?: string[] | null
  consent?: { marketing?: boolean | null } | null
}

/** Creates a lead through the Local API (server only; bypasses access control on purpose). */
export async function createLead({ retentionMonths = 24, ...data }: LeadInput): Promise<StoredLead> {
  const cms = await getCms()
  const retainUntil = new Date()
  retainUntil.setMonth(retainUntil.getMonth() + retentionMonths)
  const doc = await cms.create({
    collection: 'leads',
    overrideAccess: true,
    // The generated Lead type is the source of truth; LeadInput mirrors docs/schema-contract.md.
    data: { ...data, status: 'new', retainUntil: retainUntil.toISOString() } as never,
  })
  return doc as unknown as StoredLead
}

export async function findLeadById(id: string): Promise<StoredLead | null> {
  try {
    const cms = await getCms()
    return (await cms.findByID({ collection: 'leads', id, overrideAccess: true, depth: 0 })) as unknown as StoredLead
  } catch {
    return null
  }
}

/** Most recent lead for an email address (used by the booking webhook). */
export async function findLatestLeadByEmail(email: string): Promise<StoredLead | null> {
  const cms = await getCms()
  const res = await cms.find({
    collection: 'leads',
    where: { email: { equals: email.trim().toLowerCase() } },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return (res.docs[0] as unknown as StoredLead) ?? null
}

export async function setLeadStatus(id: string, status: LeadStatus) {
  const cms = await getCms()
  await cms.update({ collection: 'leads', id, data: { status } as never, overrideAccess: true })
}

/* ---------- Signed result token: lets /scorecard/result render one lead's result without exposing others. ---------- */

export interface ResultTokenData {
  leadId: string
  tier: ScorecardTier
  score: number
}

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

const secret = appSecret

const b64url = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const sign = (body: string) => createHmac('sha256', `${secret()}:scorecard-result`).update(body).digest('base64url')

export function signResultToken(data: ResultTokenData, now = Date.now()) {
  const body = b64url(JSON.stringify({ l: data.leadId, t: data.tier, s: data.score, e: now + TOKEN_TTL_MS }))
  return `${body}.${sign(body)}`
}

export function verifyResultToken(token: string | null | undefined, now = Date.now()): ResultTokenData | null {
  if (!token || typeof token !== 'string' || token.length > 512) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      l: string
      t: ScorecardTier
      s: number
      e: number
    }
    if (typeof p.e !== 'number' || p.e < now) return null
    if (!['ready', 'almost', 'explore'].includes(p.t)) return null
    return { leadId: String(p.l), tier: p.t, score: Number(p.s) }
  } catch {
    return null
  }
}
