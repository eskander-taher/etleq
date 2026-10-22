import { createHash } from 'node:crypto'
import { getCms } from '@/lib/cms'
import { siteUrl, localePath } from '@/lib/utils'
import type { LeadInput, StoredLead } from '@/lib/leads'
import { whatsappLink } from '@/lib/whatsapp'
import enScorecard from '@/messages/en/scorecard.json'

// Speed to lead (brief section 9): alert the founders by email + webhook, auto-reply to the lead in their language.
// Never log form bodies or personal data: only lead ids and error messages.

type L = 'ar' | 'en'

export interface NotifyContext {
  lead: StoredLead
  input: LeadInput
  responseTimePromise?: string | null
  whatsappNumber?: string | null
  /** Signed scorecard result token; the auto-reply links to the result page with it. */
  resultToken?: string | null
}

const ENTITIES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c])

export async function notifyNewLead(ctx: NotifyContext) {
  const steps = ['email', 'webhook', 'autoreply']
  const results = await Promise.allSettled([alertFoundersByEmail(ctx), alertFoundersByWebhook(ctx), autoReply(ctx)])
  results.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[notify] ${steps[i]} failed for lead ${ctx.lead.id}:`, (r.reason as Error)?.message)
  })
}

/** Absolute result page URL for a signed token. */
export function resultUrl(locale: L, token: string) {
  return `${siteUrl()}${localePath(locale, '/scorecard/result')}?t=${encodeURIComponent(token)}`
}

export const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || ''

/** First WhatsApp message a founder sends the lead, in the lead's language and fitting their tier. */
export function founderFirstMessage(input: Pick<LeadInput, 'name' | 'locale' | 'source' | 'tier' | 'score'>): string {
  const name = firstName(input.name)
  const score = `${input.score ?? 0}/100`
  if (input.locale === 'ar') {
    const hi = name ? `أهلًا ${name}، معك فريق اطلق.` : 'أهلًا، معك فريق اطلق.'
    if (input.source === 'scorecard' && input.tier === 'ready') return `${hi} رأينا نتيجتك (${score}) وفكرتك مناسبة للإطلاق. متى يناسبك أن نتحدّث ربع ساعة؟`
    if (input.source === 'scorecard' && input.tier === 'almost') return `${hi} رأينا نتيجتك (${score})، هل تودّ أن نراجع معًا ما ينقص للإطلاق؟`
    if (input.source === 'scorecard') return `${hi} شكرًا لإكمالك التقييم. إن كان لديك سؤال عن فكرتك فنحن هنا.`
    if (input.source === 'booking') return `${hi} وصلنا حجزك لمكالمة التعارف، ونتطلّع إلى الحديث معك.`
    return `${hi} وصلتنا رسالتك، ويسعدنا أن نكمل الحديث هنا.`
  }
  const hi = name ? `Hi ${name}, this is the Etleq team.` : 'Hi, this is the Etleq team.'
  if (input.source === 'scorecard' && input.tier === 'ready') return `${hi} We saw your result (${score}) and your idea looks ready to launch. When suits you for a 15-minute call?`
  if (input.source === 'scorecard' && input.tier === 'almost') return `${hi} We saw your result (${score}). Would you like to go through what's missing before launch together?`
  if (input.source === 'scorecard') return `${hi} Thanks for taking the scorecard. If you have a question about your idea, we're here.`
  if (input.source === 'booking') return `${hi} We got your fit call booking and look forward to speaking with you.`
  return `${hi} We got your message and are happy to continue the conversation here.`
}

/** One-tap wa.me link to the lead with the first message prefilled; undefined without a phone number. */
export function founderWhatsappLink(input: LeadInput): string | undefined {
  const digits = (input.phone || '').replace(/\D/g, '')
  if (!digits || input.source === 'newsletter' || input.source === 'playbook') return undefined
  return whatsappLink({ number: digits, message: founderFirstMessage(input) })
}

type QuestionMessages = Record<string, { options?: Record<string, string> } | undefined>
const QUALIFYING: [key: string, label: string][] = [
  ['budget', 'Budget (60 days)'],
  ['timeline', 'Launch'],
  ['decisionMaker', 'Decision-maker'],
  ['marketer', 'Marketing by'],
  ['country', 'Country'],
]

/** Qualifying answers in plain English for the founders (falls back to the stored option value). */
function qualifyingLines(answers: Record<string, string> | undefined): [string, string | undefined][] {
  const q = enScorecard.questions as QuestionMessages
  return QUALIFYING.map(([key, label]) => {
    const v = answers?.[key]
    return [label, v ? (q[key]?.options?.[v] ?? v) : undefined]
  })
}

export function summaryLines({ lead, input }: NotifyContext): [string, string][] {
  const utm = input.utm
    ? Object.entries(input.utm)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join(' ')
    : ''
  const rows: [string, string | undefined][] = [
    ['Source', input.source],
    ['Tier', input.tier ? `${input.tier} (${input.score ?? 0}/100)` : ''],
    ['Disqualifiers', input.disqualifiers?.join(', ')],
    ['Name', input.name],
    ['Phone', input.phone],
    ['WhatsApp them', founderWhatsappLink(input)],
    ['Email', input.email],
    ['Company', input.company],
    ...qualifyingLines(input.answers),
    ['Model', input.modelSlug],
    ['Locale', input.locale],
    ['Landing page', input.landingPage],
    ['UTM', utm],
    ['Ref', input.refCode],
    ['Message', input.message],
    ['Success in 6 months', input.answers?.success],
    ['Admin', `${siteUrl()}/admin/collections/leads/${lead.id}`],
  ]
  return rows.filter((r): r is [string, string] => !!r[1])
}

async function alertFoundersByEmail(ctx: NotifyContext) {
  const to = (process.env.LEAD_ALERT_EMAILS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!to.length) return
  const cms = await getCms()
  const lines = summaryLines(ctx)
  const tierTag = ctx.input.tier ? ` [${ctx.input.tier.toUpperCase()} ${ctx.input.score}]` : ''
  await cms.sendEmail({
    to,
    // Founders can answer the lead straight from the alert.
    replyTo: ctx.input.email || undefined,
    idempotencyKey: `alert/${ctx.lead.id}`,
    subject: `New ${ctx.input.source} lead${tierTag}: ${ctx.input.name || ctx.input.email || ctx.lead.id}`,
    text: lines.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: `<table cellpadding="6">${lines
      .map(([k, v]) => `<tr><th align="left">${esc(k)}</th><td dir="auto">${/^https:\/\//.test(v) ? `<a href="${esc(v)}">${esc(v)}</a>` : esc(v)}</td></tr>`)
      .join('')}</table>`,
  })
}

async function alertFoundersByWebhook(ctx: NotifyContext) {
  const url = process.env.LEAD_ALERT_WEBHOOK
  if (!url) return
  const lines = summaryLines(ctx)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // `text` suits Slack-compatible receivers; the structured fields suit everything else.
    body: JSON.stringify({ text: lines.map(([k, v]) => `${k}: ${v}`).join('\n'), lead: Object.fromEntries(lines), leadId: ctx.lead.id }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) throw new Error(`webhook responded ${res.status}`)
}

type Reply = { subject: string; paragraphs: string[] }

const replies: Record<L, (ctx: NotifyContext) => Reply> = {
  ar: ({ input, responseTimePromise }) => {
    const hello = input.name ? `أهلًا ${input.name}،` : 'أهلًا بك،'
    const when = responseTimePromise ? `سنتواصل معك ${responseTimePromise}.` : 'سنتواصل معك قريبًا عبر واتساب أو البريد.'
    if (input.source === 'scorecard' && input.tier === 'ready')
      return {
        subject: 'نتيجتك في تقييم اطلق: جاهز للإطلاق',
        paragraphs: [
          hello,
          `حصلت على ${input.score} من 100 في التقييم، وفكرتك مناسبة للإطلاق.`,
          'الخطوة التالية مكالمة تعارف مجانية مدتها 15 دقيقة. إن لم تحجز موعدًا بعد، تجد نتيجتك وجدول المواعيد في الرابط أدناه.',
          when,
        ],
      }
    if (input.source === 'scorecard')
      return {
        subject: 'نتيجتك في تقييم اطلق',
        paragraphs: [
          hello,
          `حصلت على ${input.score} من 100 في التقييم.`,
          'جمعنا لك في صفحة النتيجة (الرابط أدناه) خطوات عملية تساعدك على تجهيز فكرتك، ويمكنك إعادة التقييم متى شئت.',
          'إن كان لديك سؤال، ردّ على هذه الرسالة أو راسلنا عبر واتساب.',
        ],
      }
    if (input.source === 'contact')
      return { subject: 'وصلتنا رسالتك', paragraphs: [hello, 'شكرًا لتواصلك مع اطلق. وصلتنا رسالتك، وسيقرؤها أحد المؤسّسين بنفسه.', when] }
    if (input.source === 'playbook')
      return { subject: 'سجّلناك لاستلام دليل الإطلاق', paragraphs: [hello, 'شكرًا لاهتمامك بدليل الإطلاق. سنرسله إلى بريدك فور جاهزيته.'] }
    return {
      subject: 'أهلًا بك في نشرة اطلق',
      paragraphs: [hello, 'شكرًا لاشتراكك. سنرسل لك نماذج SaaS مجرّبة وأرقامًا موثّقة المصدر، دون إزعاج. يمكنك إلغاء الاشتراك في أي وقت.'],
    }
  },
  en: ({ input, responseTimePromise }) => {
    const hello = input.name ? `Hi ${input.name},` : 'Hi,'
    const when = responseTimePromise ? `We'll get back to you ${responseTimePromise}.` : "We'll get back to you soon on WhatsApp or by email."
    if (input.source === 'scorecard' && input.tier === 'ready')
      return {
        subject: 'Your Etleq scorecard result: ready to launch',
        paragraphs: [
          hello,
          `You scored ${input.score} out of 100. Your idea looks ready to launch.`,
          "Next step: a free 15-minute fit call. If you haven't booked a time yet, your result and the booking calendar are at the link below.",
          when,
        ],
      }
    if (input.source === 'scorecard')
      return {
        subject: 'Your Etleq scorecard result',
        paragraphs: [
          hello,
          `You scored ${input.score} out of 100.`,
          'Your result page (link below) has practical next steps to get your idea ready. You can retake the scorecard any time.',
          'Questions? Reply to this email or message us on WhatsApp.',
        ],
      }
    if (input.source === 'contact')
      return { subject: 'We got your message', paragraphs: [hello, 'Thanks for contacting Etleq. A founder will read your message personally.', when] }
    if (input.source === 'playbook')
      return { subject: "You're on the list for the Launch Playbook", paragraphs: [hello, "Thanks for your interest in the Launch Playbook. We'll email it to you as soon as it's ready."] }
    return { subject: 'Welcome to the Etleq newsletter', paragraphs: [hello, 'Thanks for subscribing. Expect proven SaaS models and sourced numbers, no spam. Unsubscribe any time.'] }
  },
}

type Cta = { label: string; url: string }
type ReplyContent = Reply & { links: string[]; cta: Cta }

const CTA_LABELS = {
  ar: { ready: 'اعرض نتيجتك واحجز مكالمتك', result: 'اعرض نتيجتك', whatsapp: 'راسلنا على واتساب', models: 'تصفّح النماذج' },
  en: { ready: 'See your result and book your call', result: 'See your result', whatsapp: 'Message us on WhatsApp', models: 'Browse the models' },
}

/** Subject, paragraphs, links and the main button of the lead's auto-reply (pure; exported for tests). */
export function autoReplyContent(ctx: NotifyContext): ReplyContent {
  const locale = ctx.input.locale
  const labels = CTA_LABELS[locale]
  const { subject, paragraphs } = replies[locale](ctx)
  const links: string[] = []
  // For ready leads the result page carries the booking calendar, pre-filled, so it replaces /book.
  if (ctx.input.source === 'scorecard') links.push(ctx.resultToken ? resultUrl(locale, ctx.resultToken) : `${siteUrl()}${localePath(locale, '/book')}`)
  const wa = ctx.whatsappNumber ? `https://wa.me/${ctx.whatsappNumber.replace(/\D/g, '')}` : null
  if (wa) links.push(wa)
  const cta: Cta =
    ctx.input.source === 'scorecard'
      ? { label: ctx.input.tier === 'ready' ? labels.ready : labels.result, url: links[0] }
      : wa
        ? { label: labels.whatsapp, url: wa }
        : { label: labels.models, url: `${siteUrl()}${localePath(locale, '/models')}` }
  return { subject, paragraphs, links, cta }
}

async function autoReply(ctx: NotifyContext) {
  const to = ctx.input.email
  // Cal.com already confirms bookings; a booking-only lead gets no second email.
  if (!to || ctx.input.source === 'booking') return
  await sendReply(to, ctx.input.locale, autoReplyContent(ctx), `reply/${ctx.lead.id}`)
}

/**
 * Confirmation for a one-tap sign-up from the result page. No founder alert: the lead already exists
 * and the founders were alerted when it was created.
 */
export async function notifySubscribed({ email, name, locale, source }: { email: string; name?: string | null; locale: L; source: 'newsletter' | 'playbook' }) {
  const { subject, paragraphs } = replies[locale]({ lead: { id: '' }, input: { source, name: name || undefined, email, locale, consent: { given: true, at: '', policyVersion: '', marketing: true } } })
  const cta = { label: CTA_LABELS[locale].models, url: `${siteUrl()}${localePath(locale, '/models')}` }
  const key = createHash('sha256').update(`${source}:${email.toLowerCase()}`).digest('hex').slice(0, 32)
  await sendReply(email, locale, { subject, paragraphs, links: [], cta }, `subscribed/${key}`)
}

/**
 * The lead's email. With Resend it uses the branded `notification-<locale>` template (title, message,
 * one button); if that send fails, or without Resend, a plain HTML version goes out instead.
 */
async function sendReply(to: string, locale: L, { subject, paragraphs, links, cta }: ReplyContent, idempotencyKey: string) {
  const replyTo = process.env.EMAIL_REPLY_TO || undefined
  if (process.env.RESEND_API_KEY) {
    const { sendTemplateEmail } = await import('@/lib/email/send')
    const res = await sendTemplateEmail({
      template: 'notification',
      locale,
      to,
      subject,
      replyTo,
      variables: { TITLE: subject, MESSAGE: paragraphs.join('\n\n'), CTA_LABEL: cta.label, CTA_URL: cta.url },
      idempotencyKey,
    })
    if (res.ok) return
  }
  const signature = locale === 'ar' ? 'فريق اطلق' : 'The Etleq team'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const cms = await getCms()
  await cms.sendEmail({
    to,
    replyTo,
    // A different key: the template attempt may have reserved the first one.
    idempotencyKey: `${idempotencyKey}/html`,
    subject,
    text: [...paragraphs, ...links, signature].join('\n\n'),
    html: `<div dir="${dir}" lang="${locale}" style="font-family:sans-serif;line-height:1.7">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${links
      .map((l) => `<p><a href="${esc(l)}" dir="ltr">${esc(l)}</a></p>`)
      .join('')}<p>${esc(signature)}</p></div>`,
  })
}
