import { z } from 'zod'

export const emailLocaleSchema = z.enum(['ar', 'en'])
export type EmailLocale = z.infer<typeof emailLocaleSchema>

/**
 * Variable schemas of the published Resend templates (aliases `<name>-<locale>`, e.g. `notification-ar`).
 * Keys must match the template variables in Resend exactly. `from` and `subject` are template defaults.
 * The site sends `notification` today; the others are ready for client-app flows (sign-up, OTP, receipts).
 */
export const templateSchemas = {
  welcome: z.object({
    NAME: z.string().min(1),
    DASHBOARD_URL: z.string().url(),
  }),
  'verify-otp': z.object({
    CODE: z.string().min(4).max(10),
    EXPIRES_MINUTES: z.number().int().positive(),
  }),
  'password-reset': z.object({
    RESET_URL: z.string().url(),
    EXPIRES_MINUTES: z.number().int().positive(),
  }),
  receipt: z.object({
    ORDER_ID: z.string().min(1),
    AMOUNT: z.string().min(1), // pre-formatted, e.g. "1,250.00"
    CURRENCY: z.string().min(1),
    DATE: z.string().min(1), // pre-formatted for the locale
    RECEIPT_URL: z.string().url(),
  }),
  notification: z.object({
    TITLE: z.string().min(1),
    MESSAGE: z.string().min(1),
    CTA_LABEL: z.string().min(1),
    CTA_URL: z.string().url(),
  }),
} as const

export type TemplateName = keyof typeof templateSchemas
export type TemplateVars<T extends TemplateName> = z.infer<(typeof templateSchemas)[T]>

export const templateAlias = (name: TemplateName, locale: EmailLocale) => `${name}-${locale}`
