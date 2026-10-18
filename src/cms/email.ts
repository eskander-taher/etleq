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

/** Send an email through SMTP. Without SMTP_HOST the message is logged (development). */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const t = transport()
  if (!t) {
    console.log(`[email] SMTP_HOST not set; would send "${message.subject}" to ${[message.to].flat().join(', ')}`)
    return
  }
  await t.sendMail({ from: process.env.SMTP_FROM || 'Etleq <hello@etleq.com>', ...message })
}
