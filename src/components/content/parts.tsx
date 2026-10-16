import type { ReactNode } from 'react'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, BadgeCheck, CalendarDays } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Container } from '@/components/ui/container'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { SetAlternatePath } from '@/components/layout/alternate'
import { cn, localePath } from '@/lib/utils'
import { formatDate, formatMoney, formatPrice, formatUSD } from '@/lib/format'
import { AutoBdi } from './Bdi'
import { hostOf, mediaOf, mrrShowable, populated, withQuery, type Loc, type MrrData } from './lib'

export type Crumb = { label: string; href: string }

/**
 * Tells the language switcher where this document lives in the other locale.
 * `available` = translated flags; when the other locale is missing, it points to that locale's section index.
 */
export function Alternates({
  path,
  indexPath,
  available,
}: {
  path: string
  indexPath: string
  available: { ar?: boolean | null; en?: boolean | null } | null | undefined
}) {
  const ar = available?.ar ? localePath('ar', path) : localePath('ar', indexPath)
  const en = available?.en ? localePath('en', path) : localePath('en', indexPath)
  return <SetAlternatePath ar={ar} en={en} note={!(available?.ar && available?.en)} />
}

/** Page header: breadcrumbs, H1, optional lead and extra content (dates, badges). */
export function PageHero({
  crumbs,
  title,
  lead,
  children,
  className,
}: {
  crumbs: Crumb[]
  title: ReactNode
  lead?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <header className={cn('bg-sand-100 pb-10 pt-6 lg:pb-14', className)}>
      <Container>
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-6 max-w-4xl text-display-1 font-bold">{title}</h1>
        {lead && <div className="mt-4 max-w-3xl text-lg text-ink-600">{lead}</div>}
        {children}
      </Container>
    </header>
  )
}

/** Section wrapper with an H2. Content sections share spacing and an anchor id. */
export function ContentSection({
  id,
  title,
  children,
  className,
  tone = 'light',
}: {
  id?: string
  title?: ReactNode
  children: ReactNode
  className?: string
  tone?: 'light' | 'alt'
}) {
  return (
    <section id={id} className={cn('scroll-mt-28 py-10 lg:py-14', tone === 'alt' && 'bg-sand-100', className)}>
      <Container>
        {title && <h2 className="mb-6 text-display-3 font-bold">{title}</h2>}
        {children}
      </Container>
    </section>
  )
}

/** The 40–60 word answer that opens models, guides and posts (GEO rule 1). */
export function AnswerBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-6 max-w-3xl rounded-[var(--radius-card)] border-s-4 border-ignition-500 bg-white p-5 shadow-sm">
      <p className="mb-2 text-sm font-semibold text-ignition-700">{label}</p>
      <div className="text-lg leading-relaxed">{children}</div>
    </div>
  )
}

export { mrrShowable, type MrrData, type ShowableMrr } from './lib'

/**
 * Reported MRR with company, source link, reported date and the disclaimer, always together (brief section 2).
 * Renders nothing if any part is missing: an unsourced figure is never shown.
 */
export async function MrrFigure({
  mrr,
  company,
  locale,
  compact = false,
}: {
  mrr: MrrData | null | undefined
  company: string
  locale: Loc
  compact?: boolean
}) {
  if (!mrrShowable(mrr)) return null
  const t = await getTranslations({ locale, namespace: 'content' })
  const amount = formatMoney(mrr.amount, mrr.currency || 'USD', locale)
  return (
    <div className={cn('rounded-[var(--radius-card)] bg-ink-950 text-sand-50', compact ? 'p-4' : 'p-5')}>
      <p className="text-sm text-sand-300">{t('mrr.label')}</p>
      <p className={cn('font-bold', compact ? 'text-2xl' : 'text-display-3')}>
        <bdi className="num">{amount}</bdi> <span className="text-base font-normal">{t('mrr.perMonth')}</span>
      </p>
      <p className="mt-2 text-sm text-sand-300">
        {t('mrr.company')}: <AutoBdi text={company} locale={locale} /> · {t('mrr.source')}:{' '}
        <a href={mrr.sourceUrl} rel="noopener nofollow" target="_blank" className="underline">
          <AutoBdi text={mrr.sourceName || hostOf(mrr.sourceUrl)} locale={locale} />
        </a>{' '}
        · {t('mrr.reported')}: <time dateTime={mrr.reportedAt}>{formatDate(mrr.reportedAt, locale)}</time>
      </p>
      <p className="mt-3 border-t border-white/15 pt-3 text-xs text-sand-300">
        {t('mrr.disclaimer', { company })}{' '}
        <Link href="/disclaimer" className="underline">
          {t('mrr.disclaimerLink')}
        </Link>
      </p>
    </div>
  )
}

/** "From {price}" in SAR (with USD) on Arabic pages and USD on English pages. Prices exclude VAT. */
export async function PriceFrom({ usd, locale, className }: { usd: number | null | undefined; locale: Loc; className?: string }) {
  if (typeof usd !== 'number' || usd <= 0) return null
  const t = await getTranslations({ locale, namespace: 'content' })
  return (
    <span className={className}>
      {t('common.from')} <bdi className="num font-bold">{formatPrice(usd, locale)}</bdi>
      {locale === 'ar' && (
        <span className="text-sm text-ink-600">
          {' '}
          (<bdi className="num">{formatUSD(usd, 'ar')}</bdi>)
        </span>
      )}{' '}
      <span className="text-sm text-ink-600">{t('common.exVat')}</span>
    </span>
  )
}

/** Published / updated / last-reviewed dates, always visible (GEO rule 4). */
export async function DateLine({
  locale,
  published,
  updated,
  reviewed,
  reviewer,
}: {
  locale: Loc
  published?: string | null
  updated?: string | null
  reviewed?: string | null
  reviewer?: { name?: string | null; slug?: string | null } | null
}) {
  const t = await getTranslations({ locale, namespace: 'content' })
  const items: ReactNode[] = []
  if (published)
    items.push(
      <span key="p">
        {t('common.published')}: <time dateTime={published}>{formatDate(published, locale)}</time>
      </span>,
    )
  if (updated && updated !== published)
    items.push(
      <span key="u">
        {t('common.updated')}: <time dateTime={updated}>{formatDate(updated, locale)}</time>
      </span>,
    )
  if (reviewed)
    items.push(
      <span key="r">
        {t('common.lastReviewed')}: <time dateTime={reviewed}>{formatDate(reviewed, locale)}</time>
        {reviewer?.name && (
          <>
            {' · '}
            {t('common.reviewedBy')}{' '}
            {reviewer.slug ? (
              <Link href={`/authors/${reviewer.slug}`} className="underline">
                {reviewer.name}
              </Link>
            ) : (
              reviewer.name
            )}
          </>
        )}
      </span>,
    )
  if (!items.length) return null
  return (
    <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
      <CalendarDays aria-hidden className="size-4" />
      {items}
    </p>
  )
}

export type SourceItem = { label?: string | null; url?: string | null; accessedAt?: string | null; checkedAt?: string | null }

/** Numbered sources list with links and access dates. */
export async function SourcesList({ sources, locale }: { sources: SourceItem[] | null | undefined; locale: Loc }) {
  const list = (sources ?? []).filter((s) => s.url)
  if (!list.length) return null
  const t = await getTranslations({ locale, namespace: 'content' })
  return (
    <ContentSection id="sources" title={t('common.sources')}>
      <ol className="list-decimal space-y-2 ps-6 text-sm">
        {list.map((s, i) => {
          const date = s.accessedAt ?? s.checkedAt
          return (
            <li key={i}>
              <a href={s.url!} rel="noopener nofollow" target="_blank" className="text-ignition-700 underline">
                <AutoBdi text={s.label || s.url} locale={locale} />
              </a>
              {date && (
                <span className="text-ink-600">
                  {' '}
                  — {t('common.accessed')} <time dateTime={date}>{formatDate(date, locale)}</time>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </ContentSection>
  )
}

type AuthorLike = {
  name?: string | null
  slug?: string | null
  role?: string | null
  bio?: string | null
  photo?: unknown
  credentials?: { text?: string | null }[] | null
  sameAs?: { url?: string | null }[] | null
}

/** Author box with credentials and profile links (E-E-A-T). */
export async function AuthorBox({ authors, locale }: { authors: AuthorLike[]; locale: Loc }) {
  if (!authors.length) return null
  const t = await getTranslations({ locale, namespace: 'content' })
  return (
    <ContentSection title={authors.length > 1 ? t('author.titlePlural') : t('author.title')}>
      <div className="grid gap-4 md:grid-cols-2">
        {authors.map((a) => {
          const photo = mediaOf(a.photo)
          return (
            <div key={a.slug ?? a.name} className="flex gap-4 rounded-[var(--radius-card)] border border-sand-300 bg-white p-5">
              {photo && (
                <Image src={photo.url} alt={photo.alt ?? a.name ?? ''} width={72} height={72} className="size-18 shrink-0 rounded-full object-cover" />
              )}
              <div>
                <p className="text-lg font-semibold">
                  {a.slug ? (
                    <Link href={`/authors/${a.slug}`} className="hover:underline">
                      {a.name}
                    </Link>
                  ) : (
                    a.name
                  )}
                </p>
                {a.role && <p className="text-sm text-ink-600">{a.role}</p>}
                {a.bio && <p className="mt-2 text-sm">{a.bio}</p>}
                {!!a.credentials?.length && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {a.credentials.map((c, i) => (
                      <li key={i} className="flex gap-1.5">
                        <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-verified-600" />
                        {c.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ContentSection>
  )
}

/** Crawlable pagination: real links to ?page=N, keeping other query params. */
export async function Pagination({
  locale,
  basePath,
  page,
  totalPages,
  query = {},
}: {
  locale: Loc
  basePath: string
  page: number
  totalPages: number
  query?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null
  const t = await getTranslations({ locale, namespace: 'content' })
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
  )
  return (
    <nav aria-label={t('common.pagination')} className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {page > 1 && (
        <Link href={withQuery(basePath, { ...query, page: page - 1 })} rel="prev" className="min-h-12 rounded-[12px] px-4 py-3 hover:bg-sand-100">
          {t('common.previous')}
        </Link>
      )}
      {pages.map((p, i) => (
        <span key={p} className="contents">
          {i > 0 && pages[i - 1] !== p - 1 && <span aria-hidden>…</span>}
          <Link
            href={withQuery(basePath, { ...query, page: p })}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-12 min-w-12 items-center justify-center rounded-[12px] px-3',
              p === page ? 'bg-ink-950 text-sand-50' : 'hover:bg-sand-100',
            )}
          >
            <bdi className="num">{p}</bdi>
          </Link>
        </span>
      ))}
      {page < totalPages && (
        <Link href={withQuery(basePath, { ...query, page: page + 1 })} rel="next" className="min-h-12 rounded-[12px] px-4 py-3 hover:bg-sand-100">
          {t('common.next')}
        </Link>
      )}
    </nav>
  )
}

/** Generic content card used by every list page. */
export function ContentCard({
  href,
  title,
  excerpt,
  meta,
  image,
  footer,
  locale,
}: {
  href: string
  title: string
  excerpt?: string | null
  meta?: ReactNode
  image?: unknown
  footer?: ReactNode
  locale: Loc
}) {
  const img = mediaOf(image)
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-sand-300 bg-white transition-shadow hover:shadow-md">
      {img && (
        <Image
          src={img.url}
          alt={img.alt ?? ''}
          width={800}
          height={450}
          sizes="(min-width: 1024px) 380px, 100vw"
          className="aspect-video w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-5">
        {meta && <div className="mb-2 text-sm text-ink-600">{meta}</div>}
        <h3 className="text-xl font-semibold">
          <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
            <AutoBdi text={title} locale={locale} />
          </Link>
        </h3>
        {excerpt && <p className="mt-2 line-clamp-3 text-ink-600">{excerpt}</p>}
        {footer && <div className="mt-auto pt-4">{footer}</div>}
      </div>
    </article>
  )
}

/** Arrow that points forward in reading direction. */
export function ForwardArrow({ className }: { className?: string }) {
  return <ArrowRight aria-hidden className={cn('size-4 rtl:rotate-180', className)} />
}

/** Empty state for lists. */
export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-sand-300 p-8 text-center">
      <p className="text-xl font-semibold">{title}</p>
      {body && <p className="mx-auto mt-2 max-w-xl text-ink-600">{body}</p>}
      {children && <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  )
}

/** Resolve populated author docs into the shape AuthorBox and schema builders need. */
export function authorList(values: unknown, locale: Loc): AuthorLike[] {
  const list = Array.isArray(values) ? values : values ? [values] : []
  return list
    .map((v) => populated(v as { id: string } | string))
    .filter((a): a is { id: string } & AuthorLike & { translated?: { ar?: boolean; en?: boolean } } => !!a)
    .filter((a) => (a as { translated?: Record<string, boolean> }).translated?.[locale] === true)
}
/** Server-rendered filter chip (crawlable link, aria-current on the active one). */
export function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold',
        active ? 'border-ink-950 bg-ink-950 text-sand-50' : 'border-sand-300 hover:border-ink-950',
      )}
    >
      {label}
    </Link>
  )
}
