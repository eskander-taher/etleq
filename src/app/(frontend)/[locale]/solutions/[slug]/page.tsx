import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  AlertCircle,
  BarChart3,
  Bell,
  CalendarCheck,
  Check,
  CreditCard,
  FileText,
  Globe,
  LayoutDashboard,
  MessageCircle,
  Receipt,
  Smartphone,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { buttonVariants } from '@/components/ui/button'
import { TrackedLink } from '@/components/ui/tracked-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { SetPageCta } from '@/components/layout/page-cta'
import { getSiteSettings } from '@/components/content/globals'
import { JsonLd } from '@/components/seo/JsonLd'
import { AutoBdi } from '@/components/content/Bdi'
import { FaqList } from '@/components/content/FaqList'
import { VideoFacade } from '@/components/content/VideoFacade'
import { CtaPanel } from '@/components/content/CtaPanel'
import { Alternates, ContentCard, ContentSection, ForwardArrow, PageHero, PriceFrom } from '@/components/content/parts'
import { mediaOf, publicRelations, scorecardFrom, videoMeta, type Loc } from '@/components/content/lib'
import { getSolution, solutionSlugs } from '@/lib/queries/solutions'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { faqPageNode, graph, serviceNode } from '@/lib/schema'
import type { Faq, Project } from '@/cms/content-types'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }> }

const ICONS: Record<string, LucideIcon> = {
  calendar: CalendarCheck,
  booking: CalendarCheck,
  payments: CreditCard,
  mada: CreditCard,
  invoice: Receipt,
  zatca: Receipt,
  whatsapp: MessageCircle,
  notifications: Bell,
  reports: BarChart3,
  dashboard: LayoutDashboard,
  customers: Users,
  members: Users,
  mobile: Smartphone,
  arabic: Globe,
  documents: FileText,
}

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  return (await solutionSlugs(params.locale as Loc)).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const s = await getSolution(slug, locale).catch(() => null)
  if (!s) return {}
  return buildMetadata({
    locale,
    path: `/solutions/${slug}`,
    title: s.meta?.title || s.title || '',
    description: s.meta?.description || s.summary,
    image: mediaOf(s.meta?.image)?.url,
    alternates: { ar: !!s.translated?.ar, en: !!s.translated?.en },
  })
}

export default async function SolutionPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const s = await getSolution(slug, locale)
  if (!s) notFound()
  const [t, settings] = await Promise.all([getTranslations({ locale, namespace: 'content' }), getSiteSettings(locale)])

  const title = s.title ?? ''
  const path = `/solutions/${slug}`
  const scorecardHref = scorecardFrom(path)
  const refCode = `S-${slug}`
  const waMessage = t('solutions.whatsappMessage', { name: title })
  const vertical = s.vertical ?? undefined
  const offerLink = (
    <Link
      href="/launch-30"
      className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ignition-700 underline underline-offset-4"
    >
      {t('common.offerLink')}
      <ForwardArrow />
    </Link>
  )
  const pageUrl = absoluteUrl(locale, path)
  const faqs = publicRelations<Faq>(s.faqs as (string | Faq)[], locale).filter((f) => f.question && f.answer)
  const cases = publicRelations<Project>(s.caseStudies as (string | Project)[], locale).filter((p) => p.consentGiven)
  const videoUrl = s.video?.url
  const video = videoUrl ? videoMeta(videoUrl) : null

  const jsonLd = graph(
    typeof s.priceFrom === 'number'
      ? serviceNode({
          name: title,
          description: s.summary,
          priceFrom: s.priceFrom,
          currency: 'USD',
          url: path,
          locale,
          serviceType: t(`solutions.verticals.${s.vertical ?? 'other'}`),
        })
      : null,
    faqs.length
      ? faqPageNode(
          faqs.map((f) => ({ question: f.question!, answer: f.answer! })),
          { url: pageUrl, locale },
        )
      : null,
  )

  return (
    <>
      <Alternates path={path} indexPath="/solutions" available={s.translated} />
      <SetPageCta scorecardHref={scorecardHref} waMessage={waMessage} refCode={refCode} />
      <JsonLd data={jsonLd} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.solutions'), href: '/solutions' },
          { label: title, href: path },
        ]}
        title={<AutoBdi text={title} locale={locale} />}
        lead={s.summary}
      >
        {typeof s.priceFrom === 'number' && (
          <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1">
            <PriceFrom usd={s.priceFrom} locale={locale} />
            {offerLink}
          </p>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <TrackedLink
            href={scorecardHref}
            event="cta_click"
            params={{ cta_id: 'solution_scorecard', location: 'solution_hero', vertical, ref_code: refCode }}
            className={buttonVariants({ size: 'lg' })}
          >
            {t('cta.scorecard')}
          </TrackedLink>
          <WhatsAppButton
            message={waMessage}
            refCode={refCode}
            placement="solution_hero"
            number={settings?.whatsappNumber}
            label={t('cta.whatsapp')}
            variant="secondary"
            size="lg"
          />
        </div>
        <p className="mt-3 max-w-2xl text-sm text-ink-600">{t('solutions.ctaMicro')}</p>
      </PageHero>

      {!!s.buyerProblems?.length && (
        <ContentSection id="problems" title={t('solutions.problems')}>
          <ul className="grid gap-3 md:grid-cols-2">
            {s.buyerProblems.map((p, i) => (
              <li key={i} className="flex gap-3 rounded-[12px] bg-sand-100 p-4">
                <AlertCircle aria-hidden className="mt-1 size-5 shrink-0 text-ignition-700" />
                <AutoBdi text={p.problem} locale={locale} />
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      {!!s.features?.length && (
        <ContentSection id="features" title={t('solutions.features')} tone="alt">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {s.features.map((f, i) => {
              const Icon = ICONS[(f.icon ?? '').toLowerCase()] ?? Check
              return (
                <div key={i} className="rounded-[var(--radius-card)] border border-sand-300 bg-white p-5">
                  <Icon aria-hidden className="size-6 text-ignition-700" />
                  <h3 className="mt-3 text-lg font-semibold">
                    <AutoBdi text={f.title} locale={locale} />
                  </h3>
                  {f.description && <p className="mt-1 text-ink-600">{f.description}</p>}
                </div>
              )
            })}
          </div>
        </ContentSection>
      )}

      {videoUrl && (
        <ContentSection id="workflow" title={t('solutions.workflow')}>
          <div className="max-w-3xl">
            <VideoFacade
              url={videoUrl}
              title={title}
              poster={mediaOf(s.video?.posterImage)?.url ?? video?.thumbnail}
              vertical={video?.vertical}
              playLabel={t('common.playVideo')}
              trackParams={{ vertical: s.vertical ?? undefined }}
            />
          </div>
        </ContentSection>
      )}

      {!!s.integrations?.length && (
        <ContentSection id="integrations" title={t('solutions.integrations')} tone="alt">
          <dl className="grid gap-4 md:grid-cols-3">
            {s.integrations.map((it, i) => (
              <div key={i} className="rounded-[var(--radius-card)] bg-white p-5">
                <dt className="font-semibold">
                  <bdi>{it.name}</bdi>
                </dt>
                {it.description && <dd className="mt-1 text-ink-600">{it.description}</dd>}
              </div>
            ))}
          </dl>
        </ContentSection>
      )}

      {typeof s.priceFrom === 'number' && (
        <ContentSection id="price" title={t('solutions.price')}>
          <p className="text-xl">
            <PriceFrom usd={s.priceFrom} locale={locale} />
          </p>
          <p className="mt-2 max-w-2xl text-ink-600">{t('solutions.priceNote')}</p>
          <div className="mt-2">{offerLink}</div>
        </ContentSection>
      )}

      {!!s.steps?.length && (
        <ContentSection id="steps" title={t('solutions.steps')} tone="alt">
          <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {s.steps.map((step, i) => (
              <li key={i} className="rounded-[var(--radius-card)] bg-white p-5">
                <span className="num text-sm font-semibold text-ignition-700">
                  <bdi>{String(i + 1).padStart(2, '0')}</bdi>
                </span>
                <h3 className="mt-1 text-lg font-semibold">{step.title}</h3>
                {step.description && <p className="mt-1 text-ink-600">{step.description}</p>}
              </li>
            ))}
          </ol>
        </ContentSection>
      )}

      {cases.length > 0 && (
        <ContentSection id="case-studies" title={t('solutions.caseStudies')}>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {cases.map((p) => (
              <ContentCard
                key={p.id}
                locale={locale}
                href={`/projects/${p.slug}`}
                title={p.title ?? ''}
                excerpt={p.context}
                meta={p.clientName}
              />
            ))}
          </div>
        </ContentSection>
      )}

      {faqs.length > 0 && (
        <ContentSection id="faq" title={t('common.faq')}>
          <div className="max-w-3xl">
            <FaqList items={faqs.map((f) => ({ question: f.question!, answer: f.answer! }))} />
          </div>
        </ContentSection>
      )}

      <CtaPanel
        locale={locale}
        title={t('solutions.ctaTitle', { name: title })}
        body={t('solutions.ctaMicro')}
        href={scorecardHref}
        ctaId="solution_scorecard"
        whatsappMessage={waMessage}
        refCode={refCode}
        placement="solution_footer"
        trackParams={{ vertical }}
      />
    </>
  )
}
