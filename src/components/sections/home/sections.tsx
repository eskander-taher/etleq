import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { ArrowRight, Building2, Check, CreditCard, DatabaseBackup, Globe2, KeyRound, LayoutDashboard, Receipt, Server, UserRound, Users, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { formatMoney, formatPrice } from '@/lib/format'
import { cn, localePath } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { BentoGrid, BentoItem } from '@/components/ui/bento'
import { Card } from '@/components/ui/card'
import { Section, SectionHeading } from '@/components/ui/section'
import { SourceCite } from '@/components/ui/source-cite'
import { Stepper } from '@/components/ui/stepper'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { TrackedAnchor } from '@/components/ui/tracked-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { mediaUrl, type AuthorCard, type FaqItemData, type ModelCard, type ProjectCard, type SiteSettingsData, type TestimonialData } from '@/components/sections/offer/data'
import type { ResolvedOffer } from '@/components/sections/offer/resolve-offer'
import { SOURCES } from './sources'

type L = 'ar' | 'en'

/* 3. Proof strip: true facts only. With no live launches yet it renders nothing. */
export async function ProofStrip({ locale, projects }: { locale: L; projects: ProjectCard[] }) {
  if (!projects.length) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  const onTime = projects.filter((p) => p.plannedDays && p.actualDays && p.actualDays <= p.plannedDays).length
  const facts = [{ n: projects.length, label: t('proof.launches') }, ...(onTime ? [{ n: onTime, label: t('proof.onTime') }] : [])]
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
            <p className="num text-2xl font-medium" dir="auto">
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
          const mrr = m.mrr?.amount && m.mrr.sourceUrl ? m.mrr : null
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
                      <SourceCite label={mrr.sourceName || new URL(mrr.sourceUrl!).hostname} url={mrr.sourceUrl} date={mrr.reportedAt} locale={locale} className="relative z-10" />
                    </div>
                  ) : null}
                  <p className="font-semibold text-ink-950">
                    {t('models.gulf', { price: formatPrice(m.priceFrom || fallbackPrice, locale), days: m.buildDays || 30 })}
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
  const tc = await getTranslations({ locale, namespace: 'common' })
  const steps = t.raw('how.steps') as { title: string; body: string }[]
  return (
    <Section aria-labelledby="how-title">
      <div id="how-title">
        <SectionHeading title={t('how.title')} lead={t('how.lead')} />
      </div>
      <Stepper className="mt-10" locale={locale} layout="grid" steps={steps.map((s) => ({ title: s.title, description: s.body }))} />
      <Link href="/how-it-works" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-10')}>
        {tc('cta.readMore')}
        <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
      </Link>
    </Section>
  )
}

/* 10. Comparison table: sourced figures cite their source; other cells are qualitative. */
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
    {
      key: 'time',
      etleq: c('etleqTime'),
      agency: (
        <>
          {c('agencyTime')}
          {cite(SOURCES.sendan)}
        </>
      ),
      freelancer: c('freelancerTime'),
      ai: c('aiTime'),
    },
    { key: 'mada', etleq: yes(c('included')), agency: c('extraCost'), freelancer: c('depends'), ai: no(c('notBuiltIn')) },
    { key: 'zatca', etleq: yes(c('included')), agency: c('extraCost'), freelancer: c('depends'), ai: no(c('notBuiltIn')) },
    { key: 'ownership', etleq: c('etleqOwnership'), agency: c('depends'), freelancer: c('depends'), ai: c('depends') },
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
      <div className="mt-10">
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
                <TH scope="row" sticky className="font-medium">
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
            return (
              <li key={a.id}>
                <Card className="flex h-full gap-5">
                  {photo ? (
                    <Image src={photo} alt={a.name} width={96} height={96} className="size-24 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="inline-flex size-24 shrink-0 items-center justify-center rounded-full bg-sand-100" aria-hidden="true">
                      <Users className="size-8 text-stone-500" />
                    </span>
                  )}
                  <div>
                    <h3 className="font-display text-xl font-semibold">
                      <Link href={`/authors/${a.slug}`} className="hover:underline">
                        {a.name}
                      </Link>
                    </h3>
                    {a.role ? <p className="text-sm font-semibold text-ignition-700">{a.role}</p> : null}
                    {a.bio ? <p className="mt-2 line-clamp-2 text-ink-600">{a.bio}</p> : null}
                    {a.sameAs?.length ? (
                      <ul className="mt-3 flex flex-wrap gap-3 text-sm">
                        {a.sameAs
                          .filter((s) => s.url)
                          .map((s) => (
                            <li key={s.url!}>
                              <a href={s.url!} target="_blank" rel="noopener noreferrer me" className="underline underline-offset-2" dir="ltr">
                                {new URL(s.url!).hostname.replace(/^www\./, '')}
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
    </Section>
  )
}

/* 12. Projects and testimonials, or the founding-client offer until they exist. */
export async function ProjectsProof({
  locale,
  projects,
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
  if (projects.length || testimonials.length) {
    return (
      <Section tone="alt" aria-labelledby="projects-title">
        <div id="projects-title">
          <SectionHeading title={t('projects.title')} lead={t('projects.lead')} />
        </div>
        {projects.length ? (
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <Card interactive className="relative flex h-full flex-col gap-2">
                  <Badge variant="verified" className="self-start">
                    {t('projects.verified')}
                  </Badge>
                  <h3 className="font-display text-xl font-semibold">
                    <Link href={`/projects/${p.slug}`} className="after:absolute after:inset-0 after:content-['']">
                      {p.title}
                    </Link>
                  </h3>
                  {p.clientName ? <p className="text-sm font-semibold">{p.clientName}</p> : null}
                  {p.context ? <p className="line-clamp-3 text-ink-600">{p.context}</p> : null}
                  {p.plannedDays && p.actualDays ? (
                    <p className="mt-auto text-sm text-ink-600">
                      {t('projects.planned', { days: p.plannedDays })} · {t('projects.actual', { days: p.actualDays })}
                    </p>
                  ) : null}
                </Card>
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
        <WhatsAppButton number={whatsappNumber} message={t('projects.foundingCta')} refCode="FOUNDING" placement="home_founding" label={t('projects.foundingCta')} className="shrink-0" />
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
      <div className="mt-10 grid gap-4 md:grid-cols-3">
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
        <div className="flex flex-col gap-3 rounded-card border border-ink-800 bg-ink-800/60 p-6">
          <h3 className="font-display text-xl font-semibold">{t('finalCta.whatsappTitle')}</h3>
          <p className="text-sand-300">{t('finalCta.whatsappBody')}</p>
          <WhatsAppButton number={whatsappNumber} message={t('finalCta.whatsappMessage')} refCode="HOME" placement={location} label={tc('cta.whatsapp')} className="mt-auto" />
        </div>
      </div>
    </Section>
  )
}
