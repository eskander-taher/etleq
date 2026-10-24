import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import type { Author, Media } from '@/cms/content-types'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { env } from '@/lib/env'
import { buildMetadata } from '@/lib/seo'
import { aboutPageNode, graph, organizationNode, personNode, type SchemaNode } from '@/lib/schema'
import { findPublic, getGlobal } from '@/lib/queries/common'
import { JsonLd } from '@/components/seo/JsonLd'
import { getShellData } from '@/components/layout/shell-data'
import { EntityDetails, isReal } from '@/components/layout/Footer'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card } from '@/components/ui/card'
import { CtaBand } from '@/components/ui/cta-band'
import { PageHeader } from '@/components/ui/page-header'
import { Section, SectionHeading } from '@/components/ui/section'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'common' })
  return buildMetadata({
    locale,
    path: '/about',
    title: t('about.metaTitle'),
    description: t('about.metaDescription'),
    alternates: { ar: true, en: true },
  })
}

async function getFounders(locale: Locale): Promise<Author[]> {
  try {
    const res = await findPublic('authors', locale, {
      where: { isFounder: { equals: true } },
      limit: 12,
      sort: 'order',
      depth: 1,
    })
    return res.docs.filter((a) => a.name && a.slug)
  } catch {
    return []
  }
}

const mediaOf = (m: Author['photo']): Media | null => (m && typeof m === 'object' ? m : null)
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export default async function AboutPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)

  const [t, data, founders, seo] = await Promise.all([
    getTranslations({ locale, namespace: 'common' }),
    getShellData(locale),
    getFounders(locale),
    getGlobal('seo-defaults', locale).catch(() => null),
  ])
  const story = t.raw('about.story') as string[]
  const values = t.raw('about.values') as { title: string; text: string }[]
  const entities = data.settings.legalEntities.filter((e) => isReal(e.legalName))

  const jsonLd = graph(
    aboutPageNode({ locale, name: t('about.metaTitle'), description: t('about.metaDescription') }),
    organizationNode({
      full: true,
      locale,
      settings: { ...data.settings, whatsappNumber: data.settings.whatsappNumber ?? undefined },
      seo: seo as { sameAs?: { url?: string | null }[] | null; oneLiner?: string | null } | null,
      founders: founders.map((f) => ({
        name: f.name as string,
        jobTitle: f.role,
        slug: f.slug,
        sameAs: (f.sameAs || []).map((s) => s.url).filter((u): u is string => Boolean(u)),
      })),
    }) as SchemaNode,
    ...founders.map(
      (f) =>
        personNode(
          {
            slug: f.slug as string,
            name: f.name as string,
            role: f.role,
            bio: f.bio,
            photoUrl: mediaOf(f.photo)?.url,
            credentials: f.credentials,
            sameAs: f.sameAs,
          },
          locale,
        ) as SchemaNode,
    ),
  )

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        lead={t('about.lead')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('about.metaTitle'), href: '/about' }]} />}
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="text-display-2 font-bold">{t('about.storyTitle')}</h2>
            <div className="mt-6 space-y-4 text-lg text-ink-600">
              {story.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <Link
              href="/how-it-works"
              className="mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-ink-950 underline underline-offset-4 hover:text-ignition-700"
            >
              {t('about.howItWorksLink')}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
          <aside className="lg:col-span-5">
            <Card tone="alt" className="h-full">
              <h2 className="font-display text-xl font-semibold">{t('about.missionTitle')}</h2>
              <p className="mt-4 font-display text-display-3 leading-snug font-semibold">{t('about.mission')}</p>
            </Card>
          </aside>
        </div>
      </Section>

      {founders.length || !env.isProd ? (
        <Section tone="alt">
          <SectionHeading title={t('about.foundersTitle')} lead={t('about.foundersLead')} />
          {founders.length ? (
            <ul className="mt-10 grid gap-6 md:grid-cols-2">
              {founders.map((f) => {
                const photo = mediaOf(f.photo)
                const links = (f.sameAs || []).map((s) => s.url).filter((u): u is string => Boolean(u))
                return (
                  <li key={f.id}>
                    <Card className="flex h-full flex-col gap-5 sm:flex-row">
                      {photo?.url ? (
                        <Image
                          src={photo.url}
                          alt={photo.alt || ''}
                          width={160}
                          height={160}
                          className="size-28 shrink-0 rounded-card object-cover sm:size-36"
                        />
                      ) : null}
                      <div className="flex flex-1 flex-col">
                        <h3 className="font-display text-xl font-semibold">
                          <Link
                            href={`/authors/${f.slug}`}
                            className="inline-flex min-h-11 items-center hover:underline hover:underline-offset-4"
                          >
                            {f.name}
                          </Link>
                        </h3>
                        {f.role ? <p className="text-sm font-medium text-ink-600">{f.role}</p> : null}
                        {f.bio ? <p className="mt-3 text-ink-600">{f.bio}</p> : null}
                        {f.credentials?.length ? (
                          <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-ink-600">
                            {f.credentials.map((c, i) => (c.text ? <li key={c.id || i}>{c.text}</li> : null))}
                          </ul>
                        ) : null}
                        {links.length ? (
                          <ul className="mt-4 flex flex-wrap gap-x-4 text-sm">
                            {links.map((u) => (
                              <li key={u}>
                                <a
                                  href={u}
                                  target="_blank"
                                  rel="noopener noreferrer me"
                                  className="relative inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                                >
                                  <bdi>{hostOf(u)}</bdi>
                                  <span className="sr-only"> {t('a11y.opensNewTab')}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <Link
                          href={`/authors/${f.slug}`}
                          className="mt-auto inline-flex min-h-11 items-center gap-1 pt-4 text-sm font-semibold text-ink-950 hover:underline hover:underline-offset-4"
                        >
                          {t('cta.readMore')}
                          <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                        </Link>
                      </div>
                    </Card>
                  </li>
                )
              })}
            </ul>
          ) : (
            // Non-production only: a clearly marked gap, never invented people.
            <div className="mt-10 rounded-card border border-dashed border-stone-500 p-8 text-ink-600">
              <Badge variant="sample">{t('placeholder.devOnly')}</Badge>
              <p className="mt-4">{t('about.foundersPlaceholder')}</p>
            </div>
          )}
        </Section>
      ) : null}

      <Section aria-labelledby="values-h">
        <h2 id="values-h" className="text-display-2 font-bold">
          {t('about.valuesTitle')}
        </h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <li key={v.title} className="border-t-2 border-ink-950 pt-5">
              <h3 className="font-display text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-ink-600">{v.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      {entities.length ? (
        <Section tone="alt" aria-labelledby="entities-h">
          <h2 id="entities-h" className="text-display-3 font-bold">
            {t('about.entitiesTitle')}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entities.map((e, i) => (
              <Card key={`${e.legalName}-${i}`}>
                <EntityDetails entity={e} locale={locale} tone="light" />
              </Card>
            ))}
          </div>
        </Section>
      ) : null}

      <Section aria-labelledby="team-h">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <h2 id="team-h" className="text-display-2 font-bold">
              {t('about.teamTitle')}
            </h2>
            <p className="mt-4 text-lg text-ink-600">{t('about.teamText')}</p>
          </div>
          <div className="lg:col-span-4 lg:text-end">
            <Link
              href="/careers"
              className="inline-flex min-h-12 items-center gap-2 rounded-button border border-ink-950 px-6 font-semibold hover:bg-ink-950 hover:text-sand-50"
            >
              {t('about.teamCta')}
              <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Section>

      <CtaBand
        locale={locale}
        title={t('about.ctaTitle')}
        text={t('about.ctaText')}
        placement="about_cta"
        ctaId="about_scorecard"
        whatsappNumber={data.settings.whatsappNumber}
        refCode="ABOUT"
      />
    </>
  )
}
