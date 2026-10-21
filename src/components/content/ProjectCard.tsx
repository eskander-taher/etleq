import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { ExternalLink } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { TrackedAnchor } from '@/components/ui/tracked-link'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AutoBdi } from './Bdi'
import { mediaOf, type Loc } from './lib'
import { isOwnProject, type ProjectLink, projectLinks } from './project-links'

/** The fields a project card reads (home and /projects pass populated documents). */
export type ProjectCardData = {
  id: string
  slug?: string | null
  title?: string | null
  kind?: string | null
  clientName?: string | null
  context?: string | null
  plannedDays?: number | null
  actualDays?: number | null
  stack?: { name?: string | null }[] | null
  links?: { url?: string | null; label?: string | null }[] | null
  gallery?: { image?: unknown }[] | null
}

/** "Built by Etleq" for our own products (never implying a client), the client's name otherwise. */
export async function ProjectKindBadge({ locale, project }: { locale: Loc; project: ProjectCardData }) {
  const t = await getTranslations({ locale, namespace: 'projects' })
  if (isOwnProject(project)) return <Badge variant="dark">{t('kindOwn')}</Badge>
  return (
    <Badge variant="neutral">
      {t('kindClient')}
      {project.clientName ? (
        <>
          {locale === 'ar' ? ': ' : ': '}
          <bdi>{project.clientName}</bdi>
        </>
      ) : null}
    </Badge>
  )
}

/** Outbound buttons: App Store, Google Play, website. */
export async function ProjectLinkButtons({
  locale,
  links,
  slug,
  placement,
  size = 'md',
  className,
}: {
  locale: Loc
  links: ProjectLink[]
  slug: string
  placement: string
  size?: 'sm' | 'md'
  className?: string
}) {
  if (!links.length) return null
  const t = await getTranslations({ locale, namespace: 'projects' })
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {links.map((l, i) => (
        <li key={`${l.url}-${i}`}>
          <TrackedAnchor
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            event="cta_click"
            params={{ cta_id: `project_link_${l.kind}`, location: placement, project: slug }}
            className={cn(
              buttonVariants({ variant: i === 0 ? 'primary' : 'secondary', size }),
              'relative z-10 gap-2',
            )}
          >
            <bdi>{l.label || t(`links.${l.kind}`)}</bdi>
            <ExternalLink className="size-4" aria-hidden="true" />
            <span className="sr-only">{t('newTab')}</span>
          </TrackedAnchor>
        </li>
      ))}
    </ul>
  )
}

export async function ProjectCard({
  locale,
  project,
  placement,
  headingLevel = 'h3',
}: {
  locale: Loc
  project: ProjectCardData
  placement: string
  headingLevel?: 'h2' | 'h3'
}) {
  const t = await getTranslations({ locale, namespace: 'projects' })
  const title = project.title ?? ''
  const cover = mediaOf(project.gallery?.[0]?.image)
  const links = projectLinks(project.links)
  const stack = (project.stack ?? []).map((s) => s?.name).filter(Boolean).slice(0, 4) as string[]
  const days = typeof project.actualDays === 'number' && project.actualDays > 0 ? project.actualDays : null
  const H = headingLevel

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-sand-300 bg-white transition-shadow hover:shadow-md">
      {cover && (
        <div className="bg-sand-100">
          <Image
            src={cover.url}
            alt={cover.alt || t('screenshotAlt', { n: 1, title })}
            width={cover.width ?? 800}
            height={cover.height ?? 450}
            sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw"
            className="aspect-video w-full object-contain"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <ProjectKindBadge locale={locale} project={project} />
        </div>
        <H className="text-xl font-semibold">
          <Link href={`/projects/${project.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            <AutoBdi text={title} locale={locale} />
          </Link>
        </H>
        {project.context && <p className="line-clamp-3 text-ink-600">{project.context}</p>}
        {stack.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {stack.map((s) => (
              <li key={s}>
                <Badge variant="outline">
                  <bdi>{s}</bdi>
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {(days || links.length > 0) && (
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
            {links.length > 0 && (
              <ProjectLinkButtons
                locale={locale}
                links={links.slice(0, 2)}
                slug={project.slug ?? ''}
                placement={placement}
                size="sm"
              />
            )}
            {days && (
              <p className="text-sm text-ink-600">{t('builtIn', { days: formatNumber(days, locale) })}</p>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
