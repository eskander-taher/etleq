import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { Alexandria, IBM_Plex_Sans, IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from 'next/font/google'
import { routing, dirOf, type Locale } from '@/i18n/routing'
import { SiteShell } from '@/components/layout/SiteShell'
import '../globals.css'

const alexandria = Alexandria({ subsets: ['arabic', 'latin'], variable: '--font-alexandria', display: 'swap' })
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
})
const plexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-plex-sans', display: 'swap' })
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      dir={dirOf(locale as Locale)}
      className={`${alexandria.variable} ${plexArabic.variable} ${plexSans.variable} ${plexMono.variable}`}
    >
      <body className="min-h-dvh bg-sand-50 text-ink-950 antialiased">
        <NextIntlClientProvider>
          <SiteShell locale={locale as Locale}>{children}</SiteShell>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
