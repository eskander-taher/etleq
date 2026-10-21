import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { ConsentManager } from '@/components/analytics/ConsentManager'
import { AlternatePathProvider } from './alternate'
import { AnnouncementBar } from './AnnouncementBar'
import { Header } from './Header'
import { Footer } from './Footer'
import { MinimalFooter } from './MinimalFooter'
import { FocusSwitch } from './FocusSwitch'
import { PageCtaProvider } from './page-cta'
import { StickyMobileBar } from './StickyMobileBar'
import { LanguageBanner } from './LanguageBanner'
import { getShellData } from './shell-data'

export async function SiteShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [data, t] = await Promise.all([getShellData(locale), getTranslations({ locale, namespace: 'common' })])

  return (
    <AlternatePathProvider>
      <PageCtaProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:inline-flex focus:min-h-12 focus:items-center focus:rounded-button focus:bg-ink-950 focus:px-5 focus:font-semibold focus:text-sand-50"
        >
          {t('a11y.skipToContent')}
        </a>
        <FocusSwitch>
          <AnnouncementBar locale={locale} data={data} />
        </FocusSwitch>
        <Header locale={locale} data={data} />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <FocusSwitch focused={<MinimalFooter locale={locale} data={data} />}>
          <Footer locale={locale} data={data} />
        </FocusSwitch>
        <StickyMobileBar
          scorecardLabel={t('cta.scorecard')}
          whatsappNumber={data.settings.whatsappNumber}
          whatsappMessage={t('whatsapp.stickyMessage')}
          whatsappLabel={t('a11y.whatsappIcon')}
        />
        <LanguageBanner />
        <ConsentManager />
      </PageCtaProvider>
    </AlternatePathProvider>
  )
}
