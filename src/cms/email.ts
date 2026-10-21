import nodemailer, { type Transporter } from 'nodemailer'

export type EmailMessage = { to: string | string[]; subject: string; text?: string; html?: string; replyTo?: string }

let transporter: Transporter | null | undefined

function transport(): Transporter | null {
  if (transporter !== undefined) return transporter
  const host = process.env.SMTP_HOST
  transporter = host
    ? nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      })
    : null
  return transporter
}

/** "sara@example.com" → "s***@example.com". Logs never carry full addresses. */
export const redactEmail = (address: string) => address.replace(/^([^@])[^@]*@/, '$1***@')

/** Send an email through SMTP. Without SMTP_HOST the message is logged (development), with recipients redacted. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const t = transport()
  if (!t) {
    // Founder alert subjects end with the lead's name after a colon; keep only the part before it.
    console.log(`[email] SMTP_HOST not set; would send "${message.subject.split(':')[0]}" to ${[message.to].flat().map(redactEmail).join(', ')}`)
    return
  }
  await t.sendMail({ from: process.env.SMTP_FROM || 'Etleq <hello@etleq.com>', ...message })
}
