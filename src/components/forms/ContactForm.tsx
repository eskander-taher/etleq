import { env } from '@/lib/env'
import { ContactFormClient } from './ContactFormClient'

/** Contact page form (used by workstream B's /contact page). */
export function ContactForm({ locale }: { locale: 'ar' | 'en' }) {
  return <ContactFormClient locale={locale} turnstileSiteKey={env.turnstileSiteKey || null} />
}

export default ContactForm
