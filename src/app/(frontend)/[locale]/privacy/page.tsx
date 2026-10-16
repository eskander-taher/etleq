import { setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { LegalPage, legalMetadata } from '@/components/layout/LegalPage'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  return legalMetadata(locale as Locale, 'privacy')
}

export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale as Locale)
  return <LegalPage locale={locale as Locale} kind="privacy" />
}
