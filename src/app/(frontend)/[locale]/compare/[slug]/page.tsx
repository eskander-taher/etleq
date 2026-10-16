import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { GuideView, guideMetadata } from '@/components/content/GuideView'
import type { Loc } from '@/components/content/lib'
import { guideSlugs } from '@/lib/queries/guides'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }> }

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await guideSlugs(params.locale as Loc, 'comparison')).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  return guideMetadata('comparison', locale, slug)
}

export default async function CompareGuidePage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  return <GuideView type="comparison" locale={locale} slug={slug} />
}
