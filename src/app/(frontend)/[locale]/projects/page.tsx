import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { buttonVariants } from '@/components/ui/button'
import { TrackedLink } from '@/components/ui/tracked-link'
import { CtaPanel } from '@/components/content/CtaPanel'
import { getSiteSettings } from '@/components/content/globals'
import { ContentSection, EmptyState, PageHero, Pagination } from '@/components/content/parts'
import { ProjectCard } from '@/components/content/ProjectCard'
import { EmptyCtas } from '@/components/content/EmptyCtas'
import { pageParam, withQuery, type Loc } from '@/components/content/lib'
import { listProjects } from '@/lib/queries/projects'
import { buildMetadata } from '@/lib/seo'
import { formatNumber, formatPrice } from '@/lib/format'

export const revalidate = 3600

type Props = { params: Promise<{ locale: Loc }>; searchParams: Promise<{ page?: string }> }

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const page = pageParam((await searchParams).page)
  const [t, tp] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    getTranslations({ locale, namespace: 'projects' }),
  ])
  return buildMetadata({
    locale,
    path: withQuery('/projects', { page }),
    title: t('projects.indexTitle'),
    description: tp('indexLead'),
    alternates: { ar: true, en: true },
  })
}

export default async function ProjectsIndex({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const page = pageParam((await searchParams).page)
  const [t, tp, settings, result] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    getTranslations({ locale, namespace: 'projects' }),
    getSiteSettings(locale),
    listProjects(locale, { page }),
  ])

  const founding = settings?.foundingPriceActive && typeof settings.foundingPrice === 'number'

  return (
    <>
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.projects'), href: '/projects' },
        ]}
        title={t('projects.indexTitle')}
        lead={tp('indexLead')}
      />
      <ContentSection>
        {result.docs.length ? (
          <>
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {result.docs.map((p) => (
                <li key={p.id}>
                  <ProjectCard locale={locale} project={p} placement="projects_index" headingLevel="h2" />
                </li>
              ))}
            </ul>
            <Pagination locale={locale} basePath="/projects" page={page} totalPages={result.totalPages} />
          </>
        ) : (
          // No fake projects: until a client consents to a case study, explain the founding-client offer instead.
          <EmptyState
            title={t('projects.emptyTitle')}
            body={
              founding
                ? t('projects.emptyFounding', {
                    price: formatPrice(settings!.foundingPrice as number, locale),
                    slots: formatNumber(settings!.foundingSlots ?? 0, locale),
                  })
                : t('projects.emptyBody')
            }
          >
            <EmptyCtas locale={locale} path="/projects" placement="projects_index" refCode="PROJECTS">
              <TrackedLink
                href="/demo/clinic"
                event="cta_click"
                params={{ cta_id: 'projects_empty_demo', location: 'projects_index' }}
                className={buttonVariants({ variant: 'ghost' })}
              >
                {t('projects.demoLink')}
              </TrackedLink>
            </EmptyCtas>
            <TrackedLink
              href="/launch-30"
              event="cta_click"
              params={{ cta_id: 'projects_empty_offer', location: 'projects_index' }}
              className={buttonVariants({ variant: 'ghost' })}
            >
              {t('projects.seeOffer')}
            </TrackedLink>
          </EmptyState>
        )}
      </ContentSection>
      <CtaPanel
        locale={locale}
        title={t('projects.ctaTitle')}
        ctaId="projects_index_scorecard"
        placement="projects_index"
        refCode="PROJECTS"
      />
    </>
  )
}
