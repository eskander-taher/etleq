'use server'

import { headers } from 'next/headers'
import { after } from 'next/server'
import { getPayloadClient } from '@/lib/payload'
import { POLICY_VERSION } from '@/lib/consent'
import { clientIp, isHoneypotTripped, rateLimit } from '@/lib/rate-limit'
import { verifyTurnstile } from '@/lib/turnstile'
import { siteUrl } from '@/lib/utils'
import { HONEYPOT_FIELD, fieldErrors, toE164 } from '@/lib/validation'
import { CV_MAX_BYTES, applicationMessages, applicationSchema, isPdfSignature } from '@/lib/validation/application'
import { getJob } from '@/lib/queries/jobs'
import { getSiteSettings } from '@/components/content/globals'
import { isJobClosed } from '@/components/content/lib'

type Locale = 'ar' | 'en'

export type ApplyError = 'invalid' | 'rateLimited' | 'spam' | 'closed' | 'server'
export type ApplyResult = { ok: true } | { ok: false; error: ApplyError; fieldErrors?: Record<string, string> }

const asLocale = (v: FormDataEntryValue | null): Locale => (v === 'en' ? 'en' : 'ar')
const text = (fd: FormData, key: string) => {
  const v = fd.get(key)
  return typeof v === 'string' ? v : ''
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c])

/**
 * Job application (brief sections 8 and 14). Receives multipart FormData from the apply form:
 * validates with the shared schema, rate-limits per IP, verifies Turnstile and the honeypot,
 * checks the CV by file signature (PDF, max 5 MB), stores it in `private-files`, creates the
 * `applications` record with the consent record, and alerts recruiters by email.
 * The client then queues `job_apply_submit` and navigates to /thank-you/application.
 */
export async function submitApplication(formData: FormData): Promise<ApplyResult> {
  const locale = asLocale(formData.get('locale'))
  const m = applicationMessages(locale)
  const h = await headers()
  const ip = clientIp(h)

  if (isHoneypotTripped(text(formData, HONEYPOT_FIELD))) {
    console.warn('[careers] honeypot tripped')
    return { ok: false, error: 'spam' }
  }
  if (!rateLimit(`apply:${ip}`, { limit: 5, windowMs: 10 * 60_000 }).ok) return { ok: false, error: 'rateLimited' }
  if (!(await verifyTurnstile(text(formData, 'turnstileToken') || null, ip))) return { ok: false, error: 'spam' }

  const slug = text(formData, 'jobSlug')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, error: 'invalid' }
  const job = await getJob(slug, locale).catch(() => null)
  if (!job || isJobClosed(job)) return { ok: false, error: 'closed' }
  const questions = (job.roleQuestions ?? []).map((q) => q.question ?? '').filter(Boolean)

  let answers: unknown = []
  try {
    answers = JSON.parse(text(formData, 'answers') || '[]')
  } catch {
    answers = []
  }

  const parsed = applicationSchema(locale, questions.length).safeParse({
    name: text(formData, 'name'),
    email: text(formData, 'email'),
    phoneCountry: text(formData, 'phoneCountry') || undefined,
    phone: text(formData, 'phone'),
    linkedin: text(formData, 'linkedin'),
    portfolio: text(formData, 'portfolio'),
    answers,
    consent: formData.get('consent') === 'true',
  })
  const errors = parsed.success ? {} : fieldErrors(parsed.error)

  // CV: size first, then the file signature. Extension and MIME type are not trusted.
  const cv = formData.get('cv')
  let cvBuffer: Buffer | null = null
  if (!(cv instanceof File) || cv.size === 0) errors.cv = m.cvRequired
  else if (cv.size > CV_MAX_BYTES) errors.cv = m.cvSize
  else {
    const buf = Buffer.from(await cv.arrayBuffer())
    if (!isPdfSignature(buf.subarray(0, 5))) errors.cv = m.cvType
    else cvBuffer = buf
  }

  if (!parsed.success || !cvBuffer || Object.keys(errors).length) return { ok: false, error: 'invalid', fieldErrors: errors }
  const d = parsed.data

  try {
    const payload = await getPayloadClient()
    const settings = await getSiteSettings(locale)
    const phone = toE164(d.phoneCountry, d.phone)

    const file = await payload.create({
      collection: 'private-files',
      data: { purpose: 'cv', note: `CV: ${job.slug}` },
      file: {
        data: cvBuffer,
        mimetype: 'application/pdf',
        name: `cv-${job.slug}-${Date.now()}.pdf`,
        size: cvBuffer.length,
      },
      overrideAccess: true,
    })

    const application = await payload.create({
      collection: 'applications',
      data: {
        job: job.id,
        name: d.name,
        email: d.email,
        phone,
        cv: file.id,
        linkedin: d.linkedin || undefined,
        portfolio: d.portfolio || undefined,
        answers: questions.map((question, i) => ({ question, answer: d.answers[i] ?? '' })),
        consent: { given: true, at: new Date().toISOString(), policyVersion: settings?.policyVersion || POLICY_VERSION },
        status: 'new',
        locale,
      },
      overrideAccess: true,
    })

    // Alert recruiters after the response. No personal data in logs.
    after(async () => {
      const to = (process.env.LEAD_ALERT_EMAILS || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (!to.length) return
      try {
        const admin = `${siteUrl()}/admin/collections/applications/${application.id}`
        await payload.sendEmail({
          to,
          subject: `New application: ${job.title ?? job.slug} — ${d.name}`,
          html: [
            `<p><strong>Role:</strong> ${esc(job.title ?? job.slug)}</p>`,
            `<p><strong>Name:</strong> ${esc(d.name)}</p>`,
            `<p><strong>Language:</strong> ${locale}</p>`,
            `<p><a href="${esc(admin)}">Open in admin</a> (CV is available to recruiters and admins only).</p>`,
          ].join(''),
        })
      } catch (err) {
        console.error(`[careers] alert email failed for application ${application.id}:`, (err as Error).message)
      }
    })

    return { ok: true }
  } catch (err) {
    console.error('[careers] application save failed:', (err as Error).message)
    return { ok: false, error: 'server' }
  }
}
