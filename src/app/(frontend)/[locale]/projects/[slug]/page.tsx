import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { JsonLd } from '@/components/seo/JsonLd'
import { RichText } from '@/components/RichText'
import { AutoBdi } from '@/components/content/Bdi'
import { VideoFacade } from '@/components/content/VideoFacade'
import { CtaPanel } from '@/components/content/CtaPanel'
import { Alternates, ContentSection, DateLine, PageHero } from '@/components/content/parts'
import { mediaOf, populated, publicRelations, videoMeta, type Loc } from '@/components/content/lib'
import { getProject, projectSlugs } from '@/lib/queries/projects'
import { buildMetadata } from '@/lib/seo'
import { articleNode, graph } from '@/lib/schema'
import { formatNumber } from '@/lib/format'
import type { Model, Testimonial } from '@/payload-types'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }> }

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await projectSlugs(params.locale as Loc)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const p = await getProject(slug, locale).catch(() => null)
  if (!p) return {}
  return buildMetadata({
    locale,
    path: `/projects/${slug}`,
    title: p.meta?.title || p.title || '',
    description: p.meta?.description || p.context,
    image: mediaOf(p.meta?.image)?.url,
    alternates: { ar: !!p.translated?.ar, en: !!p.translated?.en },
    type: 'article',
    publishedTime: p.publishedAt,
    modifiedTime: p.updatedAt,
  })
}

export default async function ProjectPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const p = await getProject(slug, locale)
  if (!p) notFound()
  const t = await getTranslations({ locale, namespace: 'content' })

  const title = p.title ?? ''
  const path = `/projects/${slug}`
  // Unverified results, or results without evidence, are never shown.
  const results = (p.results ?? []).filter((r) => r.verified === true && !!r.evidence && r.label && r.value)
  const gallery = (p.gallery ?? []).map((g) => mediaOf(g.image)).filter((m): m is NonNullable<typeof m> => !!m)
  const testimonial = populated<Testimonial>(p.testimonial as string | Testimonial)
  const showTestimonial = testimonial?.verified === true && !!testimonial.quote
  const relatedModel = publicRelations<Model>(p.relatedModel as string | Model, locale)[0]
  const logo = mediaOf(p.clientLogo)

  const jsonLd = graph(
    articleNode({
      locale,
      path,
      headline: title,
      description: p.context,
      images: gallery.slice(0, 3).map((g) => g.url),
      datePublished: p.publishedAt ?? p.createdAt,
      dateModified: p.updatedAt,
      about: p.clientName ? { '@type': 'Organization', name: p.clientName } : undefined,
    }),
  )

  return (
    <>
      <Alternates path={path} indexPath="/projects" available={p.translated} />
      <JsonLd data={jsonLd} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.projects'), href: '/projects' },
          { label: title, href: path },
        ]}
        title={<AutoBdi text={title} locale={locale} />}
        lead={p.context}
      >
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {logo && <Image src={logo.url} alt={logo.alt ?? p.clientName ?? ''} width={120} height={48} className="h-12 w-auto object-contain" />}
          {p.clientName && (
            <p className="font-semibold">
              {t('projects.client')}: <bdi>{p.clientName}</bdi>
            </p>
          )}
        </div>
        <DateLine locale={locale} published={p.publishedAt} updated={p.updatedAt} />
      </PageHero>

      {p.challenge && (
        <ContentSection id="challenge" title={t('projects.challenge')}>
          <RichText data={p.challenge} locale={locale} className="max-w-3xl" />
        </ContentSection>
      )}

      {p.solution && (
        <ContentSection id="solution" title={t('projects.solution')} tone="alt">
          <RichText data={p.solution} locale={locale} className="max-w-3xl" />
        </ContentSection>
      )}

      {(!!p.scope?.length || !!p.stack?.length) && (
        <ContentSection id="scope" title={t('projects.scope')}>
          <div className="grid gap-8 md:grid-cols-2">
            {!!p.scope?.length && (
              <ul className="space-y-2">
                {p.scope.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <Check aria-hidden className="mt-1 size-4 shrink-0 text-verified-600" />
                    <AutoBdi text={s.item} locale={locale} />
                  </li>
                ))}
              </ul>
            )}
            {!!p.stack?.length && (
              <div>
                <h3 className="text-lg font-semibold">{t('projects.stack')}</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {p.stack.map((s, i) => (
                    <li key={i}>
                      <Badge variant="outline">
                        <bdi>{s.name}</bdi>
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ContentSection>
      )}

      {(typeof p.plannedDays === 'number' || typeof p.actualDays === 'number') && (
        <ContentSection id="timeline" title={t('projects.timeline')} tone="alt">
          <dl className="grid max-w-xl grid-cols-2 gap-4">
            {typeof p.plannedDays === 'number' && (
              <div className="rounded-[var(--radius-card)] bg-white p-5">
                <dt className="text-sm text-ink-600">{t('projects.planned')}</dt>
                <dd className="text-display-3 font-bold">{t('projects.days', { days: formatNumber(p.plannedDays, locale) })}</dd>
              </div>
            )}
            {typeof p.actualDays === 'number' && (
              <div className="rounded-[var(--radius-card)] bg-white p-5">
                <dt className="text-sm text-ink-600">{t('projects.actual')}</dt>
                <dd className="text-display-3 font-bold">{t('projects.days', { days: formatNumber(p.actualDays, locale) })}</dd>
              </div>
            )}
          </dl>
        </ContentSection>
      )}

      {results.length > 0 && (
        <ContentSection id="results" title={t('projects.results')}>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => (
              <div key={i} className="rounded-[var(--radius-card)] border border-sand-300 bg-white p-5">
                <dd className="text-display-3 font-bold">
                  <bdi className="num">{r.value}</bdi>
                </dd>
                <dt className="mt-1 text-ink-600">{r.label}</dt>
                <Badge variant="verified" className="mt-3">
                  {t('projects.verified')}
                </Badge>
              </div>
            ))}
          </dl>
          <p className="mt-4 max-w-3xl text-sm text-ink-600">{t('projects.resultsDisclaimer')}</p>
        </ContentSection>
      )}

      {gallery.length > 0 && (
        <ContentSection id="gallery" title={t('projects.gallery')} tone="alt">
          <ul className="grid gap-4 sm:grid-cols-2">
            {gallery.map((g, i) => (
              <li key={i}>
                <Image
                  src={g.url}
                  alt={g.alt ?? ''}
                  width={g.width ?? 1600}
                  height={g.height ?? 1000}
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="h-auto w-full rounded-[var(--radius-card)] border border-sand-300"
                />
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      {showTestimonial && testimonial && (
        <ContentSection id="testimonial" title={t('projects.testimonial')}>
          <figure className="max-w-3xl">
            {testimonial.videoUrl && (
              <div className="mb-6">
                <VideoFacade
                  url={testimonial.videoUrl}
                  title={testimonial.person ?? ''}
                  poster={mediaOf(testimonial.photo)?.url ?? videoMeta(testimonial.videoUrl).thumbnail}
                  vertical={videoMeta(testimonial.videoUrl).vertical}
                  playLabel={t('common.playVideo')}
                />
              </div>
            )}
            <blockquote className="text-xl leading-relaxed">
              {locale === 'ar' ? `«${testimonial.quote}»` : `“${testimonial.quote}”`}
            </blockquote>
            <figcaption className="mt-4 text-ink-600">
              <bdi className="font-semibold text-ink-950">{testimonial.person}</bdi>
              {testimonial.role && <>{locale === 'ar' ? '، ' : ', '}{testimonial.role}</>}
              {testimonial.company && (
                <>
                  {' — '}
                  <bdi>{testimonial.company}</bdi>
                </>
              )}
            </figcaption>
          </figure>
        </ContentSection>
      )}

      <CtaPanel
        locale={locale}
        title={t('projects.ctaSimilar')}
        body={relatedModel ? t('projects.ctaSimilarModel', { model: relatedModel.title ?? '' }) : undefined}
        href={relatedModel ? `/scorecard?model=${encodeURIComponent(relatedModel.slug ?? '')}` : '/scorecard'}
        label={t('projects.ctaSimilarLabel')}
        ctaId="project_similar"
        whatsappMessage={t('projects.whatsappMessage', { project: title })}
        refCode={`P-${slug}`}
        placement="project_footer"
      />
    </>
  )
}
