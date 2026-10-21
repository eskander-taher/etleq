import { env } from '@/lib/env'
import { getSiteSettings, whatsappNumberFor } from '@/components/sections/offer/data'
import { ContactFormClient } from './ContactFormClient'

/** Contact page form (used by workstream B's /contact page). */
export async function ContactForm({ locale }: { locale: 'ar' | 'en' }) {
  const settings = await getSiteSettings(locale)
  return <ContactFormClient locale={locale} turnstileSiteKey={env.turnstileSiteKey || null} whatsappNumber={whatsappNumberFor(settings) || null} />
}

export default ContactForm
