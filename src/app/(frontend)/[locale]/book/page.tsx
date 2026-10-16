import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { ButtonLink } from '@/components/ui/button-link'
import { Container } from '@/components/ui/container'
import { PageHeader } from '@/components/ui/page-header'
import { BookingPanel } from '@/components/scorecard/BookingPanel'
import { getSiteSettings } from '@/components/sections/offer/data'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'scorecard' })
  return buildMetadata({ locale, path: '/book', title: t('book.meta.title'), description: t('book.meta.description'), alternates: { ar: true, en: true } })
}

export default async function BookPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [t, tc, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'scorecard' }),
    getTranslations({ locale, namespace: 'common' }),
    getSiteSettings(locale),
  ])

  return (
    <>
      <PageHeader title={t('book.h1')} lead={t('book.lead')} breadcrumbs={<Breadcrumbs items={[{ label: t('book.h1'), href: '/book' }]} />} />
      <Container className="py-12 lg:py-20">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <BookingPanel locale={locale} settings={settings} location="book_page" />
          <div className="rounded-card border border-sand-300 bg-sand-100 p-6">
            <p className="font-semibold">{t('book.scorecardFirst')}</p>
            <ButtonLink href="/scorecard" variant="secondary" className="mt-4">
              {tc('cta.scorecard')}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </>
  )
}
