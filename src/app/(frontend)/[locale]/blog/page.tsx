import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CtaPanel } from '@/components/content/CtaPanel'
import { BlogFilters, PostGrid } from '@/components/content/PostList'
import { ContentSection, PageHero } from '@/components/content/parts'
import { firstParam, pageParam, withQuery, type Loc } from '@/components/content/lib'
import { listCategories, listPosts } from '@/lib/queries/posts'
import { buildMetadata } from '@/lib/seo'

export const revalidate = 3600

type Props = { params: Promise<{ locale: Loc }>; searchParams: Promise<{ page?: string; q?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const sp = await searchParams
  const q = firstParam(sp.q)
  const page = pageParam(sp.page)
  const t = await getTranslations({ locale, namespace: 'content' })
  return buildMetadata({
    locale,
    path: withQuery('/blog', { page }),
    title: q ? t('blog.searchTitle', { q }) : t('blog.indexTitle'),
    description: t('blog.indexLead'),
    alternates: { ar: true, en: true },
    // Search result pages are thin and unbounded: keep them out of the index.
    noindex: !!q,
  })
}

export default async function BlogIndex({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const q = firstParam(sp.q)
  const page = pageParam(sp.page)
  const [t, result, categories] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    listPosts(locale, { page, q }),
    listCategories(locale).catch(() => []),
  ])

  return (
    <>
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.blog'), href: '/blog' },
        ]}
        title={q ? t('blog.searchTitle', { q }) : t('blog.indexTitle')}
        lead={q ? undefined : t('blog.indexLead')}
      />
      <ContentSection>
        <BlogFilters locale={locale} categories={categories} q={q} />
        <PostGrid
          posts={result.docs}
          locale={locale}
          page={page}
          totalPages={result.totalPages}
          basePath="/blog"
          query={{ q }}
          emptyTitle={q ? t('blog.noResults') : t('blog.empty')}
        />
      </ContentSection>
      <CtaPanel locale={locale} title={t('blog.ctaTitle')} body={t('blog.ctaBody')} ctaId="blog_index_scorecard" placement="blog_index" refCode="BLOG" />
    </>
  )
}
