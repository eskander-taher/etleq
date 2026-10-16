import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { whatsappLink } from '@/lib/whatsapp'
import { ConsentManager } from '@/components/analytics/ConsentManager'
import { AlternatePathProvider } from './alternate'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { StickyMobileBar } from './StickyMobileBar'
import { LanguageBanner } from './LanguageBanner'
import { getShellData } from './shell-data'

export async function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [data, t] = await Promise.all([getShellData(locale), getTranslations({ locale, namespace: 'common' })])
  const wa = data.settings.whatsappNumber
    ? whatsappLink({ number: data.settings.whatsappNumber, message: t('whatsapp.stickyMessage'), ref: 'STICKY' })
    : null

  return (
    <AlternatePathProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-button focus:bg-ink-950 focus:px-5 focus:font-semibold focus:text-sand-50"
      >
        {t('a11y.skipToContent')}
      </a>
      <AnnouncementBar locale={locale} data={data} />
      <Header locale={locale} data={data} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer locale={locale} data={data} />
      <StickyMobileBar scorecardLabel={t('cta.scorecard')} whatsappHref={wa} whatsappLabel={t('a11y.whatsappIcon')} />
      <LanguageBanner />
      <ConsentManager />
    </AlternatePathProvider>
  )
}
