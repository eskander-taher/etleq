import 'server-only'
import { Resend } from 'resend'
import type { CreateEmailOptions } from 'resend'
import { templateAlias, templateSchemas, type EmailLocale, type TemplateName, type TemplateVars } from './templates'

/** Sender on the verified Resend domain. Template sends use the template's own `from`. */
export const RESEND_FROM = process.env.RESEND_FROM || 'Etleq <hello@mail.etleq.com>'

const RETRYABLE = new Set([429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 4
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

let client: Resend | undefined
const resend = () => (client ??= new Resend(process.env.RESEND_API_KEY))

export type SendResult = { ok: true; id: string } | { ok: false; error: string }

/** Send through Resend, retrying rate limits, 5xx and network errors with backoff. `idempotencyKey` is valid for 24h. */
async function send(label: string, payload: CreateEmailOptions, idempotencyKey: string): Promise<SendResult> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // The SDK returns errors instead of throwing.
      const { data, error } = await resend().emails.send(payload, { idempotencyKey })
      if (!error && data) {
        console.info(`[email] sent ${label} id=${data.id}`)
        return { ok: true, id: data.id }
      }
      if (!RETRYABLE.has(Number(error?.statusCode)) || attempt === MAX_ATTEMPTS) {
        console.error(`[email] failed ${label}: ${error?.name} ${error?.message}`)
        return { ok: false, error: error?.message ?? 'unknown error' }
      }
    } catch (err) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`[email] network failure ${label}:`, (err as Error).message)
        return { ok: false, error: 'network error' }
      }
    }
    await sleep(2 ** attempt * 250 + Math.random() * 250) // ~0.5s, 1s, 2s + jitter
  }
  return { ok: false, error: 'unreachable' }
}

/** Send a published Resend template (`<template>-<locale>`). Variables are validated before sending. */
export async function sendTemplateEmail<T extends TemplateName>({
  template,
  locale,
  to,
  variables,
  subject,
  replyTo,
  idempotencyKey,
}: {
  template: T
  locale: EmailLocale
  to: string
  variables: TemplateVars<T>
  /** Overrides the template's default subject. */
  subject?: string
  replyTo?: string
  /** Unique per logical email, e.g. `reply/<leadId>`. */
  idempotencyKey: string
}): Promise<SendResult> {
  const alias = templateAlias(template, locale)
  const vars = templateSchemas[template].parse(variables) as Record<string, string | number>
  return send(alias, { to: [to], subject, replyTo, template: { id: alias, variables: vars } }, idempotencyKey)
}

/** Send a hand-built email (founder alerts, fallbacks) from RESEND_FROM. */
export async function sendRawEmail(
  message: { to: string | string[]; subject: string; text?: string; html?: string; replyTo?: string; from?: string },
  idempotencyKey: string,
): Promise<SendResult> {
  const { from, html, text, ...rest } = message
  const body = html ? { html, text } : { text: text ?? '' }
  return send('raw', { from: from || RESEND_FROM, ...rest, ...body }, idempotencyKey)
}
