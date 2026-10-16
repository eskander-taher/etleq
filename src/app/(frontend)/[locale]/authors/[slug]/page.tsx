import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BadgeCheck, ExternalLink } from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import { PostGrid } from '@/components/content/PostList'
import { Alternates, ContentSection, PageHero } from '@/components/content/parts'
import { hostOf, mediaOf, pageParam, withQuery, type Loc } from '@/components/content/lib'
import { authorSlugs, getAuthor } from '@/lib/queries/authors'
import { listPosts } from '@/lib/queries/posts'
import { buildMetadata } from '@/lib/seo'
import { graph, personNode, profilePageNode } from '@/lib/schema'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }>; searchParams: Promise<{ page?: string }> }

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await authorSlugs(params.locale as Loc)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const page = pageParam((await searchParams).page)
  const a = await getAuthor(slug, locale).catch(() => null)
  if (!a) return {}
  return buildMetadata({
    locale,
    path: withQuery(`/authors/${slug}`, { page }),
    title: [a.name, a.role].filter(Boolean).join(' — '),
    description: a.bio,
    image: mediaOf(a.photo)?.url,
    alternates: { ar: !!a.translated?.ar, en: !!a.translated?.en },
    type: 'profile',
  })
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const page = pageParam((await searchParams).page)
  const author = await getAuthor(slug, locale)
  if (!author) notFound()
  const [t, posts] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    listPosts(locale, { authorId: author.id, page }),
  ])

  const name = author.name ?? ''
  const path = `/authors/${slug}`
  const photo = mediaOf(author.photo)
  const sameAs = (author.sameAs ?? []).map((s) => s.url).filter((u): u is string => !!u)
  const person = personNode(
    {
      slug,
      name,
      role: author.role,
      bio: author.bio,
      photoUrl: photo?.url,
      credentials: author.credentials ?? [],
      sameAs: author.sameAs ?? [],
    },
    locale,
  )
  const jsonLd = graph(profilePageNode({ path, locale, person, dateCreated: author.createdAt, dateModified: author.updatedAt }))

  return (
    <>
      <Alternates path={path} indexPath="/about" available={author.translated} />
      <JsonLd data={jsonLd} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.about'), href: '/about' },
          { label: name, href: path },
        ]}
        title={name}
        lead={author.role}
      >
        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
          {photo && (
            <Image src={photo.url} alt={photo.alt ?? name} width={160} height={160} priority className="size-40 shrink-0 rounded-[var(--radius-card)] object-cover" />
          )}
          <div className="max-w-2xl">
            {author.bio && <p className="whitespace-pre-line text-lg">{author.bio}</p>}
            {!!author.credentials?.length && (
              <>
                <h2 className="mt-6 text-lg font-semibold">{t('author.credentials')}</h2>
                <ul className="mt-2 space-y-1">
                  {author.credentials.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <BadgeCheck aria-hidden className="mt-1 size-4 shrink-0 text-verified-600" />
                      {c.text}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {sameAs.length > 0 && (
              <ul className="mt-5 flex flex-wrap gap-3" aria-label={t('author.profiles')}>
                {sameAs.map((url) => (
                  <li key={url}>
                    <a href={url} rel="me noopener" target="_blank" className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-sand-300 px-4 text-sm font-semibold hover:border-ink-950">
                      <bdi>{hostOf(url)}</bdi>
                      <ExternalLink aria-hidden className="size-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </PageHero>

      <ContentSection title={t('author.posts', { name })}>
        <PostGrid posts={posts.docs} locale={locale} page={page} totalPages={posts.totalPages} basePath={path} emptyTitle={t('author.noPosts')} />
      </ContentSection>
    </>
  )
}
