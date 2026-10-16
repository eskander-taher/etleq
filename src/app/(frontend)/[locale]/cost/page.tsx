import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { GuideIndex, guideIndexMetadata } from '@/components/content/GuideView'
import type { Loc } from '@/components/content/lib'

export const revalidate = 3600

type Props = { params: Promise<{ locale: Loc }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  return guideIndexMetadata('cost', locale)
}

export default async function CostIndex({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <GuideIndex type="cost" locale={locale} />
}
