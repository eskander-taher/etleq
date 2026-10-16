import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { JsonLd } from '@/components/seo/JsonLd'
import { RichText } from '@/components/RichText'
import { AutoBdi } from '@/components/content/Bdi'
import { CtaPanel } from '@/components/content/CtaPanel'
import { NewsletterForm } from '@/components/forms/NewsletterForm'
import { Alternates, ContentSection, DateLine, PageHero, SourcesList } from '@/components/content/parts'
import { mediaOf, type Loc } from '@/components/content/lib'
import { getNews, newsSlugs } from '@/lib/queries/news'
import { buildMetadata } from '@/lib/seo'
import { graph, newsArticleNode } from '@/lib/schema'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }> }

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await newsSlugs(params.locale as Loc)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const n = await getNews(slug, locale).catch(() => null)
  if (!n) return {}
  return buildMetadata({
    locale,
    path: `/news/${slug}`,
    title: n.meta?.title || n.title || '',
    description: n.meta?.description || n.excerpt,
    image: mediaOf(n.meta?.image)?.url ?? mediaOf(n.image)?.url,
    alternates: { ar: !!n.translated?.ar, en: !!n.translated?.en },
    type: 'article',
    publishedTime: n.publishedAt,
    modifiedTime: n.updatedAt,
  })
}

export default async function NewsPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const n = await getNews(slug, locale)
  if (!n) notFound()
  const t = await getTranslations({ locale, namespace: 'content' })
  const title = n.title ?? ''
  const path = `/news/${slug}`
  const image = mediaOf(n.image)

  const jsonLd = graph(
    newsArticleNode({
      locale,
      path,
      headline: title,
      description: n.excerpt,
      images: [image?.url],
      datePublished: n.publishedAt ?? n.createdAt,
      dateModified: n.updatedAt,
    }),
  )

  return (
    <>
      <Alternates path={path} indexPath="/news" available={n.translated} />
      <JsonLd data={jsonLd} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.news'), href: '/news' },
          { label: title, href: path },
        ]}
        title={<AutoBdi text={title} locale={locale} />}
        lead={n.excerpt}
      >
        <DateLine locale={locale} published={n.publishedAt} updated={n.updatedAt} />
      </PageHero>
      {image && (
        <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 lg:px-8">
          <Image
            src={image.url}
            alt={image.alt ?? ''}
            width={image.width ?? 1600}
            height={image.height ?? 900}
            priority
            sizes="(min-width: 1200px) 1200px, 100vw"
            className="h-auto w-full rounded-[var(--radius-card)]"
          />
        </div>
      )}
      {n.content && (
        <ContentSection>
          <RichText data={n.content} locale={locale} className="max-w-3xl" />
        </ContentSection>
      )}
      <SourcesList sources={(n.sourceLinks ?? []).map((s) => ({ label: s.label, url: s.url }))} locale={locale} />
      <ContentSection title={t('news.newsletterTitle')} tone="alt">
        <p className="mb-5 max-w-2xl text-ink-600">{t('news.newsletterBody')}</p>
        <div className="max-w-xl">
          <NewsletterForm locale={locale} source="newsletter" />
        </div>
      </ContentSection>
      <CtaPanel locale={locale} title={t('news.ctaTitle')} ctaId="news_scorecard" placement="news_footer" refCode={`N-${slug}`} />
    </>
  )
}
