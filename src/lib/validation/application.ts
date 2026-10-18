import { z } from 'zod'
import { messages as common, type ValidationLocale } from './messages'
import { DEFAULT_DIAL_CODE, checkE164, toE164 } from './phone'

// Job application schema, shared by the apply form (client) and src/actions/apply.ts (server).
// Messages are written by hand in each language; Arabic first.

export const CV_MAX_BYTES = 4 * 1024 * 1024 // Vercel request bodies are capped at 4.5 MB
export const CV_MIME = 'application/pdf'
export const MAX_ROLE_QUESTIONS = 5

const own = {
  ar: {
    cvRequired: 'أرفق سيرتك الذاتية بصيغة PDF.',
    cvType: 'نقبل السيرة الذاتية بصيغة PDF فقط. احفظ الملف بصيغة PDF ثم أعد رفعه.',
    cvSize: 'حجم الملف أكبر من 4 ميغابايت. صغّر الملف ثم أعد رفعه.',
    urlInvalid: 'تأكّد من الرابط، ويجب أن يبدأ بـ https://',
    linkedinInvalid: 'هذا لا يبدو رابط ملف على LinkedIn، مثل https://www.linkedin.com/in/name',
    answerRequired: 'أجب عن هذا السؤال باختصار.',
    answerTooLong: 'الإجابة طويلة جدًا، اختصرها إلى 2000 حرف أو أقل.',
    consentRequired: 'نحتاج موافقتك على معالجة بياناتك لنراجع طلبك.',
  },
  en: {
    cvRequired: 'Please attach your CV as a PDF.',
    cvType: 'We only accept CVs as PDF files. Save your CV as a PDF and upload it again.',
    cvSize: 'That file is larger than 4 MB. Please make it smaller and upload it again.',
    urlInvalid: 'Please check the link. It should start with https://',
    linkedinInvalid: "That doesn't look like a LinkedIn profile link, e.g. https://www.linkedin.com/in/name",
    answerRequired: 'Please answer this question briefly.',
    answerTooLong: 'Please keep your answer under 2,000 characters.',
    consentRequired: 'We need your consent to process your data so we can review your application.',
  },
} as const

export type ApplicationMessages = (typeof own)[ValidationLocale]
export const applicationMessages = (locale: ValidationLocale) => ({ ...common[locale], ...own[locale] })

const optionalUrl = (message: string, host?: RegExp) =>
  z
    .string()
    .trim()
    .max(300)
    .default('')
    .refine((v) => {
      if (!v) return true
      try {
        const u = new URL(v)
        if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
        return host ? host.test(u.hostname) : true
      } catch {
        return false
      }
    }, message)

export function applicationSchema(locale: ValidationLocale, questionCount = 0) {
  const m = applicationMessages(locale)
  const count = Math.min(Math.max(questionCount, 0), MAX_ROLE_QUESTIONS)
  return z
    .object({
      name: z.string({ error: m.nameRequired }).trim().min(1, m.nameRequired).min(2, m.nameTooShort).max(80, m.nameTooLong),
      email: z
        .string({ error: m.emailRequired })
        .trim()
        .min(1, m.emailRequired)
        .pipe(z.email(m.emailInvalid))
        .transform((v) => v.toLowerCase()),
      phoneCountry: z.string().regex(/^\d{1,4}$/).default(DEFAULT_DIAL_CODE),
      phone: z.string().max(32).default(''),
      linkedin: optionalUrl(m.linkedinInvalid, /(^|\.)linkedin\.com$/i),
      portfolio: optionalUrl(m.urlInvalid),
      answers: z
        .array(z.string().trim().min(2, m.answerRequired).max(2000, m.answerTooLong))
        .length(count),
      consent: z.literal(true, { error: m.consentRequired }),
    })
    .superRefine((val, ctx) => {
      const raw = val.phone.trim()
      if (!raw) {
        ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneRequired })
        return
      }
      const problem = checkE164(toE164(val.phoneCountry || DEFAULT_DIAL_CODE, raw))
      if (problem === 'saudi') ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneSaudi })
      else if (problem === 'uae') ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneUae })
      else if (problem) ctx.addIssue({ code: 'custom', path: ['phone'], message: m.phoneInvalid })
    })
}

export type ApplicationInput = z.input<ReturnType<typeof applicationSchema>>
export type ApplicationData = z.output<ReturnType<typeof applicationSchema>>

/** Client-side CV check (type and size). The server re-checks the file signature. Returns an error message or null. */
export function checkCvFile(file: { name: string; size: number; type: string } | null | undefined, locale: ValidationLocale): string | null {
  const m = own[locale]
  if (!file || !file.size) return m.cvRequired
  const pdfName = /\.pdf$/i.test(file.name)
  if (!(file.type === CV_MIME || (file.type === '' && pdfName))) return m.cvType
  if (file.size > CV_MAX_BYTES) return m.cvSize
  return null
}

/** True when the bytes start with the PDF signature "%PDF-". */
export function isPdfSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
}
