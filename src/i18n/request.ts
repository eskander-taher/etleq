import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

const namespaces = ['common', 'home', 'scorecard', 'forms', 'content', 'careers', 'consent'] as const

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  const entries = await Promise.all(
    namespaces.map(async (ns) => [ns, (await import(`../messages/${locale}/${ns}.json`)).default] as const),
  )
  return { locale, messages: Object.fromEntries(entries), timeZone: 'Asia/Riyadh' }
})
