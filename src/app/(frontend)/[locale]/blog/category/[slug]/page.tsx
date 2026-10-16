import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BlogFilters, PostGrid } from '@/components/content/PostList'
import { Alternates, ContentSection, PageHero } from '@/components/content/parts'
import { pageParam, withQuery, type Loc } from '@/components/content/lib'
import { categorySlugs, getCategory, listCategories, listPosts } from '@/lib/queries/posts'
import { buildMetadata } from '@/lib/seo'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }>; searchParams: Promise<{ page?: string }> }

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await categorySlugs(params.locale as Loc)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const page = pageParam((await searchParams).page)
  const c = await getCategory(slug, locale).catch(() => null)
  if (!c) return {}
  const t = await getTranslations({ locale, namespace: 'content' })
  return buildMetadata({
    locale,
    path: withQuery(`/blog/category/${slug}`, { page }),
    title: t('blog.categoryTitle', { name: c.name ?? '' }),
    description: c.description || t('blog.indexLead'),
    alternates: { ar: !!c.translated?.ar, en: !!c.translated?.en },
  })
}

export default async function BlogCategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const page = pageParam((await searchParams).page)
  const category = await getCategory(slug, locale)
  if (!category) notFound()
  const [t, result, categories] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    listPosts(locale, { page, categoryId: category.id }),
    listCategories(locale).catch(() => []),
  ])
  const path = `/blog/category/${slug}`

  return (
    <>
      <Alternates path={path} indexPath="/blog" available={category.translated} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.blog'), href: '/blog' },
          { label: category.name ?? '', href: path },
        ]}
        title={t('blog.categoryTitle', { name: category.name ?? '' })}
        lead={category.description}
      />
      <ContentSection>
        <BlogFilters locale={locale} categories={categories} activeSlug={slug} />
        <PostGrid posts={result.docs} locale={locale} page={page} totalPages={result.totalPages} basePath={path} emptyTitle={t('blog.empty')} />
      </ContentSection>
    </>
  )
}
