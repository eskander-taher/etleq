export const env = {
  siteEnv: (process.env.SITE_ENV || 'development') as 'development' | 'staging' | 'production',
  isProd: process.env.SITE_ENV === 'production',
  whatsappNumber: process.env.WHATSAPP_NUMBER || '',
  calBookingUrl: process.env.CAL_BOOKING_URL || '',
  turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
}
