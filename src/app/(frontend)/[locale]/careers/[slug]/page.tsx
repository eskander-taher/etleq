import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Briefcase, Building2, CalendarDays, Check, MapPin, Wallet } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { buttonVariants } from '@/components/ui/button'
import { JsonLd } from '@/components/seo/JsonLd'
import { RichText } from '@/components/RichText'
import { ApplyForm } from '@/components/content/ApplyForm'
import { TrackView } from '@/components/content/TrackView'
import { Alternates, ContentSection, PageHero } from '@/components/content/parts'
import { jobLocation, salaryRange } from '@/components/content/jobs'
import { isJobClosed, type Loc } from '@/components/content/lib'
import { getJob, jobSlugs, listOpenJobs } from '@/lib/queries/jobs'
import { buildMetadata } from '@/lib/seo'
import { graph, jobPostingNode } from '@/lib/schema'
import { env } from '@/lib/env'
import { formatDate } from '@/lib/format'
import type { Job } from '@/cms/content-types'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }> }

const HIRING_STEPS = ['apply', 'call', 'task', 'meet', 'offer'] as const

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await jobSlugs(params.locale as Loc)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const job = await getJob(slug, locale).catch(() => null)
  if (!job) return {}
  const t = await getTranslations({ locale, namespace: 'careers' })
  const closed = isJobClosed(job)
  return buildMetadata({
    locale,
    path: `/careers/${slug}`,
    title: closed ? t('closed.metaTitle', { title: job.title ?? '' }) : job.meta?.title || job.title || '',
    description: job.meta?.description || t('job.metaDescription', { title: job.title ?? '', location: jobLocation(job, locale) }),
    alternates: { ar: !!job.translated?.ar, en: !!job.translated?.en },
    // A closed role keeps a page for people with the link, but drops out of the index (stand-in for HTTP 410).
    noindex: closed,
  })
}

export default async function JobPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const job = await getJob(slug, locale)
  if (!job) notFound()
  const [t, tc] = await Promise.all([
    getTranslations({ locale, namespace: 'careers' }),
    getTranslations({ locale, namespace: 'content' }),
  ])
  const path = `/careers/${slug}`
  const title = job.title ?? ''
  const crumbs = [
    { label: tc('nav.home'), href: '/' },
    { label: t('list.crumb'), href: '/careers' },
    { label: title, href: path },
  ]

  if (isJobClosed(job)) return <ClosedRole job={job} locale={locale} crumbs={crumbs} />

  const salary = salaryRange(job.salary, locale)
  const questions = (job.roleQuestions ?? []).map((q) => q.question ?? '').filter(Boolean)
  const location = jobLocation(job, locale)

  return (
    <>
      <Alternates path={path} indexPath="/careers" available={job.translated} />
      <JsonLd data={graph(jobPostingNode({ ...job, slug, title }, locale))} />
      <TrackView event="job_view" params={{ job_slug: slug, team: job.team ?? undefined }} />

      <PageHero crumbs={crumbs} title={title}>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {location && (
            <Meta icon={<MapPin aria-hidden className="size-4" />} label={t('job.location')}>
              {location}
              {job.workplace && <> · {t(`workplace.${job.workplace}`)}</>}
            </Meta>
          )}
          {job.employmentType && (
            <Meta icon={<Briefcase aria-hidden className="size-4" />} label={t('job.employmentType')}>
              {t(`employmentType.${job.employmentType}`)}
            </Meta>
          )}
          {job.team && (
            <Meta icon={<Building2 aria-hidden className="size-4" />} label={t('job.team')}>
              {t(`teams.${job.team}`)}
            </Meta>
          )}
          {salary && (
            <Meta icon={<Wallet aria-hidden className="size-4" />} label={t('job.salary')}>
              <bdi className="num">{salary}</bdi> {t(`salaryUnit.${job.salary?.unit ?? 'MONTH'}`)}
            </Meta>
          )}
        </dl>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
          <CalendarDays aria-hidden className="size-4" />
          {job.datePosted && (
            <span>
              {t('job.posted')}: <time dateTime={job.datePosted}>{formatDate(job.datePosted, locale)}</time>
            </span>
          )}
          {job.validThrough && (
            <span>
              {t('job.closes')}: <time dateTime={job.validThrough}>{formatDate(job.validThrough, locale)}</time>
            </span>
          )}
        </p>
        <a href="#apply" className={`${buttonVariants({ size: 'lg' })} mt-6`}>
          {t('job.applyNow')}
        </a>
      </PageHero>

      {job.description && (
        <ContentSection id="about-role" title={t('job.about')}>
          <RichText data={job.description} locale={locale} className="max-w-3xl" />
        </ContentSection>
      )}

      {!!job.responsibilities?.length && (
        <ContentSection id="responsibilities" title={t('job.responsibilities')} tone="alt">
          <CheckList items={job.responsibilities.map((r) => r.item ?? '')} />
        </ContentSection>
      )}

      {!!job.requirements?.length && (
        <ContentSection id="requirements" title={t('job.requirements')}>
          <CheckList items={job.requirements.map((r) => r.item ?? '')} />
        </ContentSection>
      )}

      <ContentSection id="hiring-steps" title={t('hiring.title')} tone="alt">
        <ol className="grid max-w-3xl gap-3">
          {HIRING_STEPS.map((k, i) => (
            <li key={k} className="flex gap-4 rounded-[12px] bg-white p-4">
              <span className="num font-semibold text-ignition-700">
                <bdi>{String(i + 1).padStart(2, '0')}</bdi>
              </span>
              <div>
                <p className="font-semibold">{t(`hiring.steps.${k}.title`)}</p>
                <p className="text-sm text-ink-600">{t(`hiring.steps.${k}.body`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </ContentSection>

      <ContentSection id="apply" title={t('form.title', { title })}>
        <div className="max-w-2xl">
          <p className="mb-6 text-ink-600">{t('form.lead')}</p>
          <ApplyForm locale={locale} jobSlug={slug} questions={questions} turnstileSiteKey={env.turnstileSiteKey || null} />
        </div>
      </ContentSection>
    </>
  )
}

function Meta({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="rounded-[12px] bg-white p-3">
      <dt className="flex items-center gap-1.5 text-ink-600">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-semibold">{children}</dd>
    </div>
  )
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="grid max-w-3xl gap-2">
      {items.filter(Boolean).map((text, i) => (
        <li key={i} className="flex gap-2">
          <Check aria-hidden className="mt-1 size-4 shrink-0 text-verified-600" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Closed role (status closed or validThrough passed). App Router pages cannot send HTTP 410, so this
 * renders a "role closed" page with noindex, no JobPosting markup, and links to the open roles.
 * See docs/decisions.md (Content, workstream D) for the proxy-level 410 follow-up.
 */
async function ClosedRole({ job, locale, crumbs }: { job: Job; locale: Loc; crumbs: { label: string; href: string }[] }) {
  const t = await getTranslations({ locale, namespace: 'careers' })
  const open = await listOpenJobs(locale).catch(() => ({ docs: [] as Job[] }))
  return (
    <>
      <Alternates path={`/careers/${job.slug}`} indexPath="/careers" available={job.translated} />
      <PageHero crumbs={crumbs} title={t('closed.title', { title: job.title ?? '' })} lead={t('closed.body')} />
      <ContentSection title={open.docs.length ? t('closed.openRoles') : undefined}>
        {open.docs.length ? (
          <ul className="grid max-w-3xl gap-2">
            {open.docs.slice(0, 10).map((j) => (
              <li key={j.id}>
                <Link href={`/careers/${j.slug}`} className="font-semibold text-ignition-700 underline">
                  {j.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-600">{t('closed.noneOpen')}</p>
        )}
        <Link href="/careers" className={`${buttonVariants({ variant: 'secondary' })} mt-8`}>
          {t('closed.allRoles')}
        </Link>
      </ContentSection>
    </>
  )
}
