import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Building2, Check, CreditCard, DatabaseBackup, Globe2, KeyRound, LayoutDashboard, Receipt, Server, UserRound, Users, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatMoney, formatPrice } from '@/lib/format'
import { cn, localePath } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { BentoGrid, BentoItem } from '@/components/ui/bento'
import { Card } from '@/components/ui/card'
import { Section, SectionHeading } from '@/components/ui/section'
import { SourceCite } from '@/components/ui/source-cite'
import { Stepper } from '@/components/ui/stepper'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { TrackedAnchor } from '@/components/ui/tracked-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { mrrShowable } from '@/components/content/lib'
import { ProjectCard as ProjectTile, type ProjectCardData } from '@/components/content/ProjectCard'
import { isOwnProject, isShowableProject } from '@/components/content/project-links'
import { ScorecardCta } from '@/components/sections/offer/ScorecardCta'
import { mediaUrl, type AuthorCard, type FaqItemData, type ModelCard, type ProjectCard, type SiteSettingsData, type TestimonialData } from '@/components/sections/offer/data'
import type { ResolvedOffer } from '@/components/sections/offer/resolve-offer'
import { SOURCES } from './sources'

type L = 'ar' | 'en'

/** Hostname of a CMS-entered URL, or null when it isn't a valid http(s) URL (bad CMS text must not crash the page). */
function safeHost(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.hostname.replace(/^www\./, '') : null
  } catch {
    return null
  }
}

/** Up to two initials for an avatar without a photo ("Eskander Taher" → "ET"). */
function initials(name: string, locale: L) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const words = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  const letters = words.map((w) => Array.from(w)[0])
  return locale === 'ar' ? letters.join(' ') : letters.join('').toUpperCase()
}

/* 3. Proof strip: true facts only. With no live launches yet it renders nothing. */
export async function ProofStrip({ locale, projects: all }: { locale: L; projects: ProjectCard[] }) {
  // Only real, consented projects; our own products are counted apart from client launches.
  const projects = (all as (ProjectCard & { kind?: string | null; consentGiven?: boolean | null })[]).filter(isShowableProject)
  if (!projects.length) return null
  const [t, tp] = await Promise.all([getTranslations({ locale, namespace: 'home' }), getTranslations({ locale, namespace: 'projects' })])
  const own = projects.filter(isOwnProject).length
  const client = projects.length - own
  const onTime = projects.filter((p) => p.plannedDays && p.actualDays && p.actualDays <= p.plannedDays).length
  const facts = [
    ...(client ? [{ n: client, label: t('proof.launches') }] : []),
    ...(own ? [{ n: own, label: tp('ownProducts') }] : []),
    ...(onTime ? [{ n: onTime, label: t('proof.onTime') }] : []),
  ]
  return (
    <section aria-label={t('proof.title')} className="border-y border-sand-300 bg-sand-100 py-8">
      <ul className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-12 gap-y-4 px-4">
        {facts.map((f) => (
          <li key={f.label} className="flex items-baseline gap-3">
            <bdi className="num text-3xl">{f.n}</bdi>
            <span className="text-ink-600">{f.label}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* 4. Problem */
export async function Problem({ locale }: { locale: L }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const cards = [
    { key: 'agency', icon: Building2, source: SOURCES.sendan },
    { key: 'freelancer', icon: UserRound, source: null },
    { key: 'ai', icon: Server, source: SOURCES.eesel },
  ] as const
  return (
    <Section tone="alt" aria-labelledby="problem-title">
      <div id="problem-title">
        <SectionHeading title={t('problem.title')} lead={t('problem.lead')} />
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {cards.map(({ key, icon: Icon, source }) => (
          <Card key={key} className="flex flex-col gap-3">
            <Icon className="size-7 text-ink-600" aria-hidden="true" />
            <h3 className="font-display text-xl font-semibold">{t(`problem.${key}.title`)}</h3>
            <p className={cn('text-2xl font-medium', key !== 'freelancer' && 'num')} dir="auto">
              {t(`problem.${key}.figure`)}
            </p>
            <p className="text-ink-600">{t(`problem.${key}.body`)}</p>
            {source ? <SourceCite label={source.label} url={source.url} date={source.checkedAt} locale={locale} className="mt-auto" /> : null}
          </Card>
        ))}
      </div>
    </Section>
  )
}

/* 5. Mechanism: Etleq Core */
export async function Mechanism({ locale }: { locale: L }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const items = [
    { key: 'arabic', icon: Globe2, span: 'half', tone: 'dark' },
    { key: 'payments', icon: CreditCard, span: 'half', tone: 'accent' },
    { key: 'zatca', icon: Receipt, span: 'third', tone: 'light' },
    { key: 'admin', icon: LayoutDashboard, span: 'third', tone: 'light' },
    { key: 'otp', icon: KeyRound, span: 'third', tone: 'light' },
    { key: 'hosting', icon: Server, span: 'half', tone: 'alt' },
    { key: 'backups', icon: DatabaseBackup, span: 'half', tone: 'alt' },
  ] as const
  return (
    <Section aria-labelledby="mechanism-title">
      <div id="mechanism-title">
        <SectionHeading title={t('mechanism.title')} lead={t('mechanism.lead')} />
      </div>
      <BentoGrid className="mt-10">
        {items.map(({ key, icon: Icon, span, tone }) => (
          <BentoItem key={key} span={span} tone={tone} icon={<Icon className="size-5" />} title={t(`mechanism.items.${key}.title`)}>
            {t(`mechanism.items.${key}.body`)}
          </BentoItem>
        ))}
      </BentoGrid>
    </Section>
  )
}

/* 6. Models teaser */
export async function ModelsTeaser({ locale, models, fallbackPrice }: { locale: L; models: ModelCard[]; fallbackPrice: number }) {
  if (!models.length) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <Section tone="alt" aria-labelledby="models-title">
      <div id="models-title" className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading title={t('models.title')} lead={t('models.lead')} />
        <Link href="/models" className={cn(buttonVariants({ variant: 'secondary' }), 'shrink-0')}>
          {t('models.viewAll')}
          <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {models.slice(0, 6).map((m) => {
          const img = mediaUrl(m.heroImage, 'card')
          // MRR rule: amount, source link and reported date all present, and a usable source URL.
          const mrr = mrrShowable(m.mrr) && safeHost(m.mrr.sourceUrl) ? m.mrr : null
          return (
            <li key={m.id}>
              <Card interactive className="relative flex h-full flex-col gap-3 p-0 sm:p-0">
                {img ? (
                  <Image src={img} alt="" width={800} height={450} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" className="aspect-video w-full rounded-t-card object-cover" />
                ) : null}
                <div className="flex flex-1 flex-col gap-3 p-6">
                  <h3 className="font-display text-xl font-semibold">
                    <Link href={`/models/${m.slug}`} className="after:absolute after:inset-0 after:content-['']">
                      {m.title}
                    </Link>
                  </h3>
                  {m.whatItDoes ? <p className="line-clamp-3 text-ink-600">{m.whatItDoes}</p> : null}
                  {mrr ? (
                    <div className="mt-auto">
                      <p className="text-sm text-ink-600">{t('models.mrr')}</p>
                      <p className="num text-xl">
                        <bdi>{formatMoney(mrr.amount!, mrr.currency || 'USD', locale)}</bdi>
                      </p>
                      {/* Citation sits above the card link so it stays clickable. */}
                      <SourceCite label={mrr.sourceName || safeHost(mrr.sourceUrl) || ''} url={mrr.sourceUrl} date={mrr.reportedAt} locale={locale} className="relative z-10" />
                    </div>
                  ) : null}
                  <p className={cn('flex items-center justify-between gap-3 font-semibold text-ink-950', !mrr && 'mt-auto')}>
                    <span>{t('models.gulf', { price: formatPrice(m.priceFrom || fallbackPrice, locale), days: m.buildDays || 30 })}</span>
                    <ArrowRight className="size-5 shrink-0 text-ignition-700 rtl:rotate-180" aria-hidden="true" />
                  </p>
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
      <p className="mt-6 text-sm text-ink-600">{t('models.disclaimer')}</p>
    </Section>
  )
}

/* 8. How it works */
export async function HowItWorks({ locale }: { locale: L }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const steps = t.raw('how.steps') as { title: string; body: string }[]
  return (
    <Section aria-labelledby="how-title">
      <div id="how-title">
        <SectionHeading title={t('how.title')} lead={t('how.lead')} />
      </div>
      <Stepper className="mt-10" locale={locale} layout="grid" steps={steps.map((s) => ({ title: s.title, description: s.body }))} />
      <ScorecardCta locale={locale} location="how_it_works" long className="mt-10" />
    </Section>
  )
}

/*
 * 10. Comparison table: sourced figures cite their source; other cells are qualitative.
 * We don't compete on raw speed (30 working days is about six weeks). The rows lead with what is fixed
 * for the client: price, a contracted launch date, mada/ZATCA/Arabic built in, code ownership, support.
 */
export async function Comparison({ locale, offer }: { locale: L; offer: ResolvedOffer }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const c = (k: string, v?: Record<string, string>) => t(`comparison.cells.${k}`, v)
  const yes = (label: string) => (
    <span className="inline-flex items-center gap-1.5 font-medium text-ink-950">
      <Check className="size-4 text-verified-600" aria-hidden="true" />
      {label}
    </span>
  )
  const no = (label: string) => (
    <span className="inline-flex items-center gap-1.5">
      <X className="size-4 text-stone-500" aria-hidden="true" />
      {label}
    </span>
  )
  const cite = (s: (typeof SOURCES)[keyof typeof SOURCES]) => <SourceCite label={s.label} url={s.url} date={s.checkedAt} locale={locale} className="mt-1 block" />

  const rows: { key: string; etleq: React.ReactNode; agency: React.ReactNode; freelancer: React.ReactNode; ai: React.ReactNode }[] = [
    {
      key: 'price',
      etleq: c('etleqPrice', { price: formatPrice(offer.priceFrom, locale) }),
      agency: (
        <>
          <bdi className="num">{c('agencyPrice')}</bdi>
          {cite(SOURCES.sendan)}
        </>
      ),
      freelancer: c('freelancerPrice'),
      ai: (
        <>
          {c('aiPrice')}
          {cite(SOURCES.eesel)}
        </>
      ),
    },
    // No source states whether other options guarantee a date, so their cells stay neutral.
    { key: 'launchDate', etleq: yes(c('etleqLaunchDate')), agency: c('byAgreement'), freelancer: c('byAgreement'), ai: c('byAgreement') },
    { key: 'mada', etleq: yes(c('included')), agency: c('extraCost'), freelancer: c('depends'), ai: no(c('notBuiltIn')) },
    { key: 'zatca', etleq: yes(c('included')), agency: c('extraCost'), freelancer: c('depends'), ai: no(c('notBuiltIn')) },
    { key: 'arabic', etleq: yes(c('included')), agency: c('depends'), freelancer: c('depends'), ai: c('depends') },
    { key: 'ownership', etleq: yes(c('etleqOwnership')), agency: c('depends'), freelancer: c('depends'), ai: c('depends') },
    {
      key: 'support',
      etleq: offer.careFrom ? c('etleqSupport', { price: formatPrice(offer.careFrom, locale) }) : yes(c('included')),
      agency: c('extraCost'),
      freelancer: c('freelancerSupport'),
      ai: no(c('selfServe')),
    },
  ]
  const cols = ['etleq', 'agency', 'freelancer', 'ai'] as const

  return (
    <Section tone="alt" aria-labelledby="comparison-title">
      <div id="comparison-title">
        <SectionHeading title={t('comparison.title')} lead={t('comparison.lead')} />
      </div>
      <p className="mt-8 flex items-center gap-2 text-sm text-ink-600 md:hidden" aria-hidden="true">
        {t('comparison.swipe')}
        <ArrowRight className="size-4 rtl:rotate-180" />
      </p>
      <div className="relative mt-3 md:mt-10">
        {/* Fade at the reading end hints that the table scrolls sideways on phones. */}
        <div className="pointer-events-none absolute inset-y-0 -end-4 z-20 w-10 bg-linear-to-l from-sand-100 to-transparent md:hidden rtl:bg-linear-to-r" aria-hidden="true" />
        <Table label={t('comparison.caption')} tone="alt">
          <caption className="sr-only">{t('comparison.caption')}</caption>
          <THead>
            <TR>
              <TH scope="col" sticky>
                {t('comparison.criteria')}
              </TH>
              {cols.map((col) => (
                <TH key={col} scope="col" highlight={col === 'etleq'}>
                  {t(`comparison.columns.${col}`)}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {rows.map((r) => (
              <TR key={r.key}>
                <TH scope="row" sticky className="align-top font-medium">
                  {t(`comparison.rows.${r.key}`)}
                </TH>
                {cols.map((col) => (
                  <TD key={col} highlight={col === 'etleq'}>
                    {r[col]}
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </Section>
  )
}

/* 11. Founders */
export async function Founders({ locale, authors }: { locale: L; authors: AuthorCard[] }) {
  const isProd = process.env.SITE_ENV === 'production'
  if (!authors.length && isProd) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <Section aria-labelledby="founders-title">
      <div id="founders-title">
        <SectionHeading title={t('founders.title')} lead={t('founders.lead')} />
      </div>
      {authors.length ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {authors.slice(0, 2).map((a) => {
            const photo = mediaUrl(a.photo, 'card')
            const links = (a.sameAs ?? []).flatMap((x) => {
              const host = safeHost(x.url)
              return host ? [{ url: x.url!, host }] : []
            })
            return (
              <li key={a.id}>
                <Card className="flex h-full gap-5">
                  {photo ? (
                    <Image src={photo} alt={a.name} width={96} height={96} className="size-24 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="inline-flex size-24 shrink-0 items-center justify-center rounded-full bg-ink-950 font-display text-2xl font-bold text-sand-50" aria-hidden="true">
                      {initials(a.name, locale)}
                    </span>
                  )}
                  <div>
                    <h3 className="font-display text-xl font-semibold">
                      <Link href={`/authors/${a.slug}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </h3>
                    {a.role ? <p className="text-sm font-semibold text-ignition-700">{a.role}</p> : null}
                    {a.bio ? <p className="mt-2 line-clamp-3 text-ink-600">{a.bio}</p> : null}
                    {links.length ? (
                      <ul className="mt-3 flex flex-wrap gap-3 text-sm">
                        {links.map((l) => (
                          <li key={l.url}>
                            <a href={l.url} target="_blank" rel="noopener noreferrer me" className="inline-flex min-h-11 items-center underline underline-offset-2" dir="ltr">
                              {l.host}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-10 rounded-card border border-dashed border-ignition-700 p-6 text-ignition-700" role="note">
          {t('founders.placeholder')}
        </p>
      )}
      {/* The wider team, stated plainly; careers stays in the footer, not as an exit from the sales page. */}
      <p className="mt-6 flex items-center gap-3 rounded-card border border-sand-300 bg-sand-100 p-6 text-ink-600">
        <Users className="size-6 shrink-0" aria-hidden="true" />
        {t('founders.team')}
      </p>
    </Section>
  )
}

/* 12. Projects and testimonials, or the founding-client offer until they exist. */
export async function ProjectsProof({
  locale,
  projects: allProjects,
  testimonials,
  settings,
  whatsappNumber,
}: {
  locale: L
  projects: ProjectCard[]
  testimonials: TestimonialData[]
  settings: SiteSettingsData
  whatsappNumber: string
}) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const tp = await getTranslations({ locale, namespace: 'projects' })
  // Real, published projects only: our own products, or client projects with recorded consent.
  const projects = (allProjects as (ProjectCard & ProjectCardData & { consentGiven?: boolean | null })[]).filter(isShowableProject)
  if (projects.length || testimonials.length) {
    return (
      <Section tone="alt" aria-labelledby="projects-title">
        <div id="projects-title">
          <SectionHeading title={t('projects.title')} lead={projects.length ? tp('homeLead') : t('projects.lead')} />
        </div>
        {projects.length ? (
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <ProjectTile locale={locale} project={p} placement="home_projects" />
              </li>
            ))}
          </ul>
        ) : null}
        {testimonials.length ? (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {testimonials.map((q) => (
              <li key={q.id}>
                <figure className="h-full rounded-card border border-sand-300 bg-white p-6">
                  <blockquote className="text-lg" dir="auto">
                    {q.quote}
                  </blockquote>
                  <figcaption className="mt-4 text-sm text-ink-600">
                    <span className="font-semibold text-ink-950">{q.person}</span>
                    {q.role ? `${locale === 'ar' ? '، ' : ', '}${q.role}` : ''}
                    {q.company ? ` · ${q.company}` : ''}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
    )
  }

  const { foundingPriceActive, foundingPrice, foundingSlots } = settings
  if (!foundingPriceActive || !foundingPrice || !foundingSlots) return null
  return (
    <Section tone="alt" aria-labelledby="founding-title">
      <Card className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2 id="founding-title" className="text-display-3 font-bold">
            {t('projects.foundingTitle')}
          </h2>
          <p className="mt-3 text-lg text-ink-600">{t('projects.foundingBody', { price: formatPrice(foundingPrice, locale), slots: foundingSlots })}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
          {whatsappNumber ? (
            <WhatsAppButton number={whatsappNumber} message={t('projects.foundingCta')} refCode="FOUNDING" placement="home_founding" label={t('projects.foundingCta')} />
          ) : null}
          <TrackedAnchor
            href={localePath(locale, '/scorecard')}
            event="cta_click"
            params={{ cta_id: 'scorecard', location: 'home_founding' }}
            className={buttonVariants({ variant: whatsappNumber ? 'secondary' : 'primary' })}
          >
            {t('projects.foundingScorecard')}
            <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </TrackedAnchor>
        </div>
      </Card>
    </Section>
  )
}

/* 13. FAQ */
export async function Faq({ locale, faqs, title }: { locale: L; faqs: FaqItemData[]; title?: string }) {
  if (!faqs.length) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <Section aria-labelledby="faq-title">
      <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
        <div>
          <h2 id="faq-title" className="text-display-2 font-bold">
            {title ?? t('faq.title')}
          </h2>
          <Link href="/faq" className="mt-4 inline-flex items-center gap-2 font-semibold underline-offset-4 hover:underline">
            {t('faq.all')}
            <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
        <Accordion>
          {faqs.map((f) => (
            <AccordionItem key={f.id} title={f.question} name="home-faq">
              {f.answer.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>
  )
}

/* 14. Final CTA: scorecard, booking and WhatsApp side by side. */
export async function FinalCta({ locale, whatsappNumber, title, location = 'final_cta' }: { locale: L; whatsappNumber: string; title?: string; location?: string }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  const tc = await getTranslations({ locale, namespace: 'common' })
  return (
    <Section tone="dark" aria-labelledby={`${location}-title`}>
      <h2 id={`${location}-title`} className="max-w-3xl text-display-2 font-bold">
        {title ?? t('finalCta.title')}
      </h2>
      <p className="mt-4 text-lg text-sand-300">{t('finalCta.lead')}</p>
      <div className={cn('mt-10 grid gap-4', whatsappNumber ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
        <div className="flex flex-col gap-3 rounded-card border border-ignition-500 bg-ink-800/60 p-6">
          <h3 className="font-display text-xl font-semibold">{t('finalCta.scorecardTitle')}</h3>
          <p className="text-sand-300">{t('finalCta.scorecardBody')}</p>
          <TrackedAnchor href={localePath(locale, '/scorecard')} event="cta_click" params={{ cta_id: 'scorecard', location }} className={cn(buttonVariants(), 'mt-auto')}>
            {tc('cta.scorecard')}
            <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </TrackedAnchor>
        </div>
        <div className="flex flex-col gap-3 rounded-card border border-ink-800 bg-ink-800/60 p-6">
          <h3 className="font-display text-xl font-semibold">{t('finalCta.bookTitle')}</h3>
          <p className="text-sand-300">{t('finalCta.bookBody')}</p>
          <TrackedAnchor href={localePath(locale, '/book')} event="cta_click" params={{ cta_id: 'book', location }} className={cn(buttonVariants({ variant: 'secondary-dark' }), 'mt-auto')}>
            {tc('cta.bookFitCall')}
          </TrackedAnchor>
        </div>
        {whatsappNumber ? (
          <div className="flex flex-col gap-3 rounded-card border border-ink-800 bg-ink-800/60 p-6">
            <h3 className="font-display text-xl font-semibold">{t('finalCta.whatsappTitle')}</h3>
            <p className="text-sand-300">{t('finalCta.whatsappBody')}</p>
            <WhatsAppButton number={whatsappNumber} message={t('finalCta.whatsappMessage')} refCode="HOME" placement={location} label={tc('cta.whatsapp')} className="mt-auto" />
          </div>
        ) : null}
      </div>
    </Section>
  )
}
