import { getTranslations } from 'next-intl/server'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { bookingUrlFor, whatsappNumberFor, type SiteSettingsData } from '@/components/sections/offer/data'
import { BookingEmbed } from './BookingEmbed'

/** Booking step used on the ready result and on /book. Falls back to WhatsApp when no booking URL is configured. */
export async function BookingPanel({
  locale,
  settings,
  name,
  email,
  leadToken,
  location,
}: {
  locale: 'ar' | 'en'
  settings: SiteSettingsData
  name?: string | null
  email?: string | null
  leadToken?: string | null
  location: string
}) {
  const t = await getTranslations({ locale, namespace: 'scorecard' })
  const tc = await getTranslations({ locale, namespace: 'common' })
  const url = bookingUrlFor(settings, locale)
  const whatsapp = whatsappNumberFor(settings)

  return (
    <div className="flex flex-col gap-6">
      {url ? (
        <BookingEmbed bookingUrl={url} locale={locale} name={name} email={email} leadToken={leadToken} location={location} />
      ) : (
        <p className="rounded-card border border-sand-300 bg-sand-100 p-5 text-ink-600">{t('booking.noUrl')}</p>
      )}
      <WhatsAppButton
        number={whatsapp}
        message={t('booking.whatsappMessage')}
        refCode="BOOK"
        placement={`${location}_whatsapp`}
        label={tc('cta.whatsapp')}
        variant={url ? 'secondary' : 'whatsapp'}
        className="self-start"
      />
    </div>
  )
}
