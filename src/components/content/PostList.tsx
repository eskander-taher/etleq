import { getTranslations } from 'next-intl/server'
import { Search } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { localePath } from '@/lib/utils'
import type { Category, Post } from '@/cms/content-types'
import { ContentCard, EmptyState, FilterLink, Pagination } from './parts'
import type { Loc } from './lib'

/** Post grid + crawlable pagination. Shared by /blog, /blog/category/[slug] and author pages. */
export async function PostGrid({
  posts,
  locale,
  page,
  totalPages,
  basePath,
  query,
  emptyTitle,
}: {
  posts: Post[]
  locale: Loc
  page: number
  totalPages: number
  basePath: string
  query?: Record<string, string | undefined>
  emptyTitle: string
}) {
  if (!posts.length) return <EmptyState title={emptyTitle} />
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <ContentCard
            key={p.id}
            locale={locale}
            href={`/blog/${p.slug}`}
            title={p.title ?? ''}
            excerpt={p.excerpt}
            image={p.heroImage}
            meta={p.publishedAt ? <time dateTime={p.publishedAt}>{formatDate(p.publishedAt, locale)}</time> : undefined}
          />
        ))}
      </div>
      <Pagination locale={locale} basePath={basePath} page={page} totalPages={totalPages} query={query} />
    </>
  )
}

/** Category chips and a plain GET search form (works without JavaScript). */
export async function BlogFilters({
  locale,
  categories,
  activeSlug,
  q,
}: {
  locale: Loc
  categories: Category[]
  activeSlug?: string
  q?: string
}) {
  const t = await getTranslations({ locale, namespace: 'content' })
  return (
    <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {categories.length > 0 && (
        <nav aria-label={t('blog.categories')} className="flex flex-wrap gap-2">
          <FilterLink href="/blog" active={!activeSlug && !q} label={t('common.all')} />
          {categories.map((c) => (
            <FilterLink key={c.id} href={`/blog/category/${c.slug}`} active={activeSlug === c.slug} label={c.name ?? ''} />
          ))}
        </nav>
      )}
      <form role="search" method="get" action={localePath(locale, '/blog')} className="flex w-full max-w-sm items-center gap-2">
        <label htmlFor="blog-q" className="sr-only">
          {t('blog.searchLabel')}
        </label>
        <input
          id="blog-q"
          name="q"
          type="search"
          dir="auto"
          defaultValue={q}
          maxLength={80}
          placeholder={t('blog.searchPlaceholder')}
          className="min-h-12 w-full rounded-[12px] border border-sand-300 bg-white px-4"
        />
        <button type="submit" className="inline-flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-ink-950 text-sand-50" aria-label={t('blog.searchSubmit')}>
          <Search aria-hidden className="size-5" />
        </button>
      </form>
    </div>
  )
}
