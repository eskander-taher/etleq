import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Briefcase, MapPin } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { ContentSection, EmptyState, FilterLink, ForwardArrow, PageHero } from '@/components/content/parts'
import { jobLocation } from '@/components/content/jobs'
import { firstParam, withQuery, type Loc } from '@/components/content/lib'
import { JOB_TEAMS, JOB_WORKPLACES, isJobTeam, isJobWorkplace, listOpenJobs } from '@/lib/queries/jobs'
import { buildMetadata } from '@/lib/seo'
import type { Job } from '@/payload-types'

export const revalidate = 3600

type Props = { params: Promise<{ locale: Loc }>; searchParams: Promise<{ team?: string; workplace?: string }> }

const HIRING_STEPS = ['apply', 'call', 'task', 'meet', 'offer'] as const
const LIFE_POINTS = ['ownership', 'craft', 'arabic', 'cycles', 'small', 'honest'] as const

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const sp = await searchParams
  const t = await getTranslations({ locale, namespace: 'careers' })
  const filtered = !!(sp.team || sp.workplace)
  return buildMetadata({
    locale,
    path: '/careers',
    title: t('list.title'),
    description: t('list.lead'),
    alternates: { ar: true, en: true },
    // Filtered views duplicate the list: keep only the unfiltered page in the index.
    noindex: filtered,
  })
}

export default async function CareersPage({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const teamParam = firstParam(sp.team)
  const workplaceParam = firstParam(sp.workplace)
  const team = isJobTeam(teamParam) ? teamParam : undefined
  const workplace = isJobWorkplace(workplaceParam) ? workplaceParam : undefined
  const [t, tc, result] = await Promise.all([
    getTranslations({ locale, namespace: 'careers' }),
    getTranslations({ locale, namespace: 'content' }),
    listOpenJobs(locale, { team, workplace }).catch(() => ({ docs: [] as Job[] })),
  ])

  const groups = JOB_TEAMS.map((key) => ({ key, jobs: result.docs.filter((j) => j.team === key) })).filter((g) => g.jobs.length)

  return (
    <>
      <PageHero
        crumbs={[
          { label: tc('nav.home'), href: '/' },
          { label: t('list.crumb'), href: '/careers' },
        ]}
        title={t('list.title')}
        lead={t('list.lead')}
      />

      <ContentSection id="open-roles" title={t('list.openRoles')}>
        <div className="mb-8 flex flex-col gap-3">
          <nav aria-label={t('list.filterTeam')} className="flex flex-wrap gap-2">
            <FilterLink href={withQuery('/careers', { workplace })} active={!team} label={t('list.allTeams')} />
            {JOB_TEAMS.map((k) => (
              <FilterLink key={k} href={withQuery('/careers', { team: k, workplace })} active={team === k} label={t(`teams.${k}`)} />
            ))}
          </nav>
          <nav aria-label={t('list.filterWorkplace')} className="flex flex-wrap gap-2">
            <FilterLink href={withQuery('/careers', { team })} active={!workplace} label={t('list.anyWorkplace')} />
            {JOB_WORKPLACES.map((k) => (
              <FilterLink key={k} href={withQuery('/careers', { team, workplace: k })} active={workplace === k} label={t(`workplace.${k}`)} />
            ))}
          </nav>
        </div>

        {groups.length ? (
          <div className="space-y-10">
            {groups.map((g) => (
              <section key={g.key} aria-labelledby={`team-${g.key}`}>
                <h3 id={`team-${g.key}`} className="mb-4 text-xl font-semibold">
                  {t(`teams.${g.key}`)}
                </h3>
                <ul className="divide-y divide-sand-300 rounded-[var(--radius-card)] border border-sand-300 bg-white">
                  {g.jobs.map((job) => (
                    <li key={job.id} className="relative flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <Link href={`/careers/${job.slug}`} className="text-lg font-semibold after:absolute after:inset-0 hover:underline">
                          {job.title}
                        </Link>
                        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600">
                          {(job.city || job.country) && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin aria-hidden className="size-4" />
                              {jobLocation(job, locale)}
                            </span>
                          )}
                          {job.workplace && <span>{t(`workplace.${job.workplace}`)}</span>}
                          {job.employmentType && (
                            <span className="inline-flex items-center gap-1">
                              <Briefcase aria-hidden className="size-4" />
                              {t(`employmentType.${job.employmentType}`)}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-ignition-700">
                        {t('list.viewRole')}
                        <ForwardArrow />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState title={team || workplace ? t('list.noMatch') : t('list.empty')} body={t('list.emptyBody')}>
            {(team || workplace) && (
              <Link href="/careers" className="font-semibold underline">
                {t('list.clearFilters')}
              </Link>
            )}
          </EmptyState>
        )}
      </ContentSection>

      <ContentSection id="how-we-hire" title={t('hiring.title')} tone="alt">
        <ol className="grid gap-4 md:grid-cols-5">
          {HIRING_STEPS.map((k, i) => (
            <li key={k} className="rounded-[var(--radius-card)] bg-white p-5">
              <span className="num text-sm font-semibold text-ignition-700">
                <bdi>{String(i + 1).padStart(2, '0')}</bdi>
              </span>
              <h3 className="mt-1 font-semibold">{t(`hiring.steps.${k}.title`)}</h3>
              <p className="mt-1 text-sm text-ink-600">{t(`hiring.steps.${k}.body`)}</p>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection id="working-here" title={t('life.title')}>
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {LIFE_POINTS.map((k) => (
            <li key={k} className="rounded-[var(--radius-card)] border border-sand-300 p-5">
              <h3 className="font-semibold">{t(`life.points.${k}.title`)}</h3>
              <p className="mt-1 text-ink-600">{t(`life.points.${k}.body`)}</p>
            </li>
          ))}
        </ul>
      </ContentSection>
    </>
  )
}
