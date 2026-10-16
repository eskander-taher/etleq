import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { ContentCard, ContentSection, EmptyState, PageHero, Pagination } from '@/components/content/parts'
import { pageParam, withQuery, type Loc } from '@/components/content/lib'
import { listNews } from '@/lib/queries/news'
import { buildMetadata } from '@/lib/seo'
import { formatDate } from '@/lib/format'

export const revalidate = 3600

type Props = { params: Promise<{ locale: Loc }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const page = pageParam((await searchParams).page)
  const t = await getTranslations({ locale, namespace: 'content' })
  return buildMetadata({
    locale,
    path: withQuery('/news', { page }),
    title: t('news.indexTitle'),
    description: t('news.indexLead'),
    alternates: { ar: true, en: true },
  })
}

export default async function NewsIndex({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const page = pageParam((await searchParams).page)
  const [t, result] = await Promise.all([getTranslations({ locale, namespace: 'content' }), listNews(locale, { page })])

  return (
    <>
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.news'), href: '/news' },
        ]}
        title={t('news.indexTitle')}
        lead={t('news.indexLead')}
      />
      <ContentSection>
        {result.docs.length ? (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {result.docs.map((n) => (
                <ContentCard
                  key={n.id}
                  locale={locale}
                  href={`/news/${n.slug}`}
                  title={n.title ?? ''}
                  excerpt={n.excerpt}
                  image={n.image}
                  meta={n.publishedAt ? <time dateTime={n.publishedAt}>{formatDate(n.publishedAt, locale)}</time> : undefined}
                />
              ))}
            </div>
            <Pagination locale={locale} basePath="/news" page={page} totalPages={result.totalPages} />
          </>
        ) : (
          <EmptyState title={t('news.empty')} />
        )}
      </ContentSection>
      <ContentSection title={t('news.newsletterTitle')} tone="alt">
        <p className="mb-5 max-w-2xl text-ink-600">{t('news.newsletterBody')}</p>
        <div className="max-w-xl">
          <NewsletterForm locale={locale} source="newsletter" />
        </div>
      </ContentSection>
    </>
  )
}
