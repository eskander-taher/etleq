import { getCms } from '@/lib/cms'
import { siteUrl, localePath } from '@/lib/utils'
import type { LeadInput, StoredLead } from '@/lib/leads'

// Speed to lead (brief section 9): alert the founders by email + webhook, auto-reply to the lead in their language.
// Never log form bodies or personal data: only lead ids and error messages.

type L = 'ar' | 'en'

export interface NotifyContext {
  lead: StoredLead
  input: LeadInput
  responseTimePromise?: string | null
  whatsappNumber?: string | null
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

function summaryLines({ lead, input }: NotifyContext): [string, string][] {
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
    ['Email', input.email],
    ['Company', input.company],
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
    subject: `New ${ctx.input.source} lead${tierTag}: ${ctx.input.name || ctx.input.email || ctx.lead.id}`,
    text: lines.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html: `<table cellpadding="6">${lines.map(([k, v]) => `<tr><th align="left">${esc(k)}</th><td dir="auto">${esc(v)}</td></tr>`).join('')}</table>`,
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
          'الخطوة التالية مكالمة تعارف مجانية مدتها 15 دقيقة. إن لم تحجز موعدًا بعد، احجزه من الرابط أدناه.',
          when,
        ],
      }
    if (input.source === 'scorecard')
      return {
        subject: 'نتيجتك في تقييم اطلق',
        paragraphs: [
          hello,
          `حصلت على ${input.score} من 100 في التقييم.`,
          'جمعنا لك في صفحة النتيجة خطوات عملية تساعدك على تجهيز فكرتك، ويمكنك إعادة التقييم متى شئت.',
          'إن كان لديك سؤال، ردّ على هذه الرسالة أو راسلنا عبر واتساب.',
        ],
      }
    if (input.source === 'contact')
      return { subject: 'وصلتنا رسالتك', paragraphs: [hello, 'شكرًا لتواصلك مع اطلق. وصلتنا رسالتك وسيقرؤها أحد المؤسّسَين بنفسه.', when] }
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
          "Next step: a free 15-minute fit call. If you haven't booked a time yet, use the link below.",
          when,
        ],
      }
    if (input.source === 'scorecard')
      return {
        subject: 'Your Etleq scorecard result',
        paragraphs: [
          hello,
          `You scored ${input.score} out of 100.`,
          'Your result page has practical next steps to get your idea ready. You can retake the scorecard any time.',
          'Questions? Reply to this email or message us on WhatsApp.',
        ],
      }
    if (input.source === 'contact')
      return { subject: 'We got your message', paragraphs: [hello, 'Thanks for contacting Etleq. One of the two founders will read your message personally.', when] }
    if (input.source === 'playbook')
      return { subject: "You're on the list for the Launch Playbook", paragraphs: [hello, "Thanks for your interest in the Launch Playbook. We'll email it to you as soon as it's ready."] }
    return { subject: 'Welcome to the Etleq newsletter', paragraphs: [hello, 'Thanks for subscribing. Expect proven SaaS models and sourced numbers, no spam. Unsubscribe any time.'] }
  },
}

async function autoReply(ctx: NotifyContext) {
  const to = ctx.input.email
  if (!to) return
  const locale = ctx.input.locale
  const { subject, paragraphs } = replies[locale](ctx)
  const links: string[] = []
  if (ctx.input.source === 'scorecard' && ctx.input.tier === 'ready') links.push(`${siteUrl()}${localePath(locale, '/book')}`)
  if (ctx.whatsappNumber) links.push(`https://wa.me/${ctx.whatsappNumber.replace(/\D/g, '')}`)
  const signature = locale === 'ar' ? 'فريق اطلق' : 'The Etleq team'
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const cms = await getCms()
  await cms.sendEmail({
    to,
    subject,
    text: [...paragraphs, ...links, signature].join('\n\n'),
    html: `<div dir="${dir}" lang="${locale}" style="font-family:sans-serif;line-height:1.7">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join('')}${links
      .map((l) => `<p><a href="${esc(l)}" dir="ltr">${esc(l)}</a></p>`)
      .join('')}<p>${esc(signature)}</p></div>`,
  })
}
