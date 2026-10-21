import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { JsonLd } from '@/components/seo/JsonLd'
import { RichText } from '@/components/RichText'
import { AutoBdi } from '@/components/content/Bdi'
import { CtaPanel } from '@/components/content/CtaPanel'
import { getSiteSettings } from '@/components/content/globals'
import { SetPageCta } from '@/components/layout/page-cta'
import { FaqList } from '@/components/content/FaqList'
import { KeyTakeaways } from '@/components/content/GuideView'
import { Toc } from '@/components/content/Toc'
import {
  Alternates,
  AuthorBox,
  ContentCard,
  ContentSection,
  DateLine,
  ForwardArrow,
  PageHero,
  SourcesList,
  authorList,
} from '@/components/content/parts'
import { collectHeadings, mediaOf, publicRelations, scorecardFrom, type Loc } from '@/components/content/lib'
import { getPost, postSlugs, relatedPosts } from '@/lib/queries/posts'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { blogPostingNode, faqPageNode, graph, personNode } from '@/lib/schema'
import type { Category, Faq, Post } from '@/cms/content-types'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }> }

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await postSlugs(params.locale as Loc)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const post = await getPost(slug, locale).catch(() => null)
  if (!post) return {}
  return buildMetadata({
    locale,
    path: `/blog/${slug}`,
    title: post.meta?.title || post.title || '',
    description: post.meta?.description || post.excerpt,
    image: mediaOf(post.meta?.image)?.url ?? mediaOf(post.heroImage)?.url,
    alternates: { ar: !!post.translated?.ar, en: !!post.translated?.en },
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.lastReviewedAt ?? post.updatedAt,
  })
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const post = await getPost(slug, locale)
  if (!post) notFound()
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'content' }), getSiteSettings(locale)])

  const title = post.title ?? ''
  const path = `/blog/${slug}`
  const scorecardHref = scorecardFrom(path)
  const refCode = `B-${slug}`
  const waMessage = t('blog.whatsappMessage', { title })
  const pageUrl = absoluteUrl(locale, path)
  const authors = authorList(post.authors, locale)
  const faqs = publicRelations<Faq>(post.faqs as (string | Faq)[], locale).filter((f) => f.question && f.answer)
  const categories = publicRelations<Category>(post.categories as (string | Category)[], locale)
  let related = publicRelations<Post>(post.relatedPosts as (string | Post)[], locale).slice(0, 3)
  if (!related.length) related = await relatedPosts(post, locale).catch(() => [])
  const { toc } = collectHeadings(post.content as never)
  const hero = mediaOf(post.heroImage)
  const updated = post.lastReviewedAt ?? post.updatedAt

  const jsonLd = graph(
    blogPostingNode({
      locale,
      path,
      headline: title,
      description: post.excerpt,
      images: [hero?.url],
      datePublished: post.publishedAt ?? post.createdAt,
      dateModified: updated,
      authors: authors.map((a) => a.slug).filter((s): s is string => !!s),
      keywords: categories.map((c) => c.name ?? '').filter(Boolean),
    }),
    ...authors
      .filter((a) => a.slug && a.name)
      .map((a) => personNode({ ...a, slug: a.slug!, name: a.name!, photoUrl: mediaOf(a.photo)?.url }, locale)),
    faqs.length
      ? faqPageNode(
          faqs.map((f) => ({ question: f.question!, answer: f.answer! })),
          { url: pageUrl, locale },
        )
      : null,
  )

  return (
    <>
      <Alternates path={path} indexPath="/blog" available={post.translated} />
      <SetPageCta scorecardHref={scorecardHref} waMessage={waMessage} refCode={refCode} />
      <JsonLd data={jsonLd} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.blog'), href: '/blog' },
          ...(categories[0] ? [{ label: categories[0].name ?? '', href: `/blog/category/${categories[0].slug}` }] : []),
          { label: title, href: path },
        ]}
        title={<AutoBdi text={title} locale={locale} />}
        lead={post.excerpt}
      >
        <p className="mt-4 text-sm text-ink-600">
          {authors.length > 0 && (
            <>
              {t('common.by')}{' '}
              {authors.map((a, i) => (
                <span key={a.slug ?? i}>
                  {i > 0 && (locale === 'ar' ? '، ' : ', ')}
                  {a.slug ? (
                    <Link
                      href={`/authors/${a.slug}`}
                      className="inline-flex min-h-11 items-center font-semibold underline md:min-h-0"
                    >
                      {a.name}
                    </Link>
                  ) : (
                    a.name
                  )}
                </span>
              ))}
            </>
          )}
        </p>
        <DateLine locale={locale} published={post.publishedAt} updated={updated} />
      </PageHero>

      {hero && (
        <div className="mx-auto max-w-[1200px] px-4 pt-8 sm:px-6 lg:px-8">
          <Image
            src={hero.url}
            alt={hero.alt ?? ''}
            width={hero.width ?? 1600}
            height={hero.height ?? 900}
            priority
            sizes="(min-width: 1200px) 1200px, 100vw"
            className="h-auto w-full rounded-[var(--radius-card)]"
          />
        </div>
      )}

      {!!post.keyTakeaways?.length && (
        <ContentSection className="pb-0 lg:pb-0">
          <KeyTakeaways
            title={t('common.keyTakeaways')}
            items={post.keyTakeaways.map((k) => k.text ?? '')}
            locale={locale}
          />
        </ContentSection>
      )}

      {post.content && (
        <ContentSection>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
            <RichText
              data={post.content}
              locale={locale}
              className="max-w-3xl"
              ctx={{ scorecardHref, from: path, whatsappNumber: settings?.whatsappNumber, refCode, waMessage }}
            />
            <Toc items={toc} title={t('common.toc')} />
          </div>
        </ContentSection>
      )}

      {faqs.length > 0 && (
        <ContentSection id="faq" title={t('common.faq')} tone="alt">
          <div className="max-w-3xl">
            <FaqList items={faqs.map((f) => ({ question: f.question!, answer: f.answer! }))} />
          </div>
        </ContentSection>
      )}

      <SourcesList sources={post.sources} locale={locale} />
      <AuthorBox authors={authors} locale={locale} />

      <CtaPanel
        locale={locale}
        title={t('blog.ctaTitle')}
        body={t('blog.ctaBody')}
        href={scorecardHref}
        ctaId="blog_post_scorecard"
        whatsappMessage={waMessage}
        refCode={refCode}
        placement="blog_post_footer"
      />

      <ContentSection title={related.length > 0 ? t('blog.relatedPosts') : t('blog.nextStep')}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {related.map((p) => (
            <ContentCard
              key={p.id}
              locale={locale}
              href={`/blog/${p.slug}`}
              title={p.title ?? ''}
              excerpt={p.excerpt}
              image={p.heroImage}
            />
          ))}
          {/* Next step beside the reading list: the offer, for readers who are ready to act. */}
          <article
            className="relative flex flex-col rounded-[var(--radius-card)] bg-ink-950 p-5 text-sand-50"
            data-tone="dark"
          >
            <p className="mb-2 text-sm text-sand-300">{t('blog.nextStep')}</p>
            <h3 className="text-xl font-semibold">
              <Link href="/launch-30" className="after:absolute after:inset-0 after:rounded-[var(--radius-card)]">
                {t('blog.nextStepTitle')}
              </Link>
            </h3>
            <p className="mt-2 text-sand-300">{t('blog.nextStepBody')}</p>
            <span className="mt-auto flex justify-end pt-4">
              <ForwardArrow className="size-5" />
            </span>
          </article>
        </div>
      </ContentSection>
    </>
  )
}
