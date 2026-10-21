import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { BadgeCheck, Check, Clock, Layers, ShieldCheck } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { buttonVariants } from '@/components/ui/button'
import { TrackedLink } from '@/components/ui/tracked-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { SourceCite } from '@/components/ui/source-cite'
import { JsonLd } from '@/components/seo/JsonLd'
import { RichText } from '@/components/RichText'
import { AutoBdi } from '@/components/content/Bdi'
import { FaqList } from '@/components/content/FaqList'
import { TrackView } from '@/components/content/TrackView'
import { VideoFacade } from '@/components/content/VideoFacade'
import { CtaPanel } from '@/components/content/CtaPanel'
import { SetPageCta } from '@/components/layout/page-cta'
import { getOffer, getSiteSettings } from '@/components/content/globals'
import {
  Alternates,
  AnswerBox,
  ContentCard,
  ContentSection,
  DateLine,
  MrrFigure,
  PageHero,
  PriceFrom,
  authorList,
  mrrShowable,
} from '@/components/content/parts'
import { hostOf, mediaOf, publicRelations, scorecardForModel, videoMeta, type Loc } from '@/components/content/lib'
import { getModel, modelSlugs } from '@/lib/queries/models'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { articleNode, faqPageNode, graph, personNode, videoNode } from '@/lib/schema'
import { formatMoney, formatNumber, formatPrice } from '@/lib/format'
import type { Faq, Model, Post, Solution } from '@/cms/content-types'

export const revalidate = 3600
export const dynamicParams = true

type Props = { params: Promise<{ locale: Loc; slug: string }> }

export async function generateStaticParams({ params }: { params: { locale: string } }) {
  const slugs = await modelSlugs(params.locale as Loc)
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const model = await getModel(slug, locale).catch(() => null)
  if (!model) return {}
  const t = await getTranslations({ locale, namespace: 'content' })
  const h1 = t('models.h1', { model: model.title ?? '' })
  return buildMetadata({
    locale,
    path: `/models/${slug}`,
    title: model.meta?.title || h1,
    description: model.meta?.description || model.answerBox,
    image: mediaOf(model.meta?.image)?.url ?? mediaOf(model.heroImage)?.url,
    alternates: { ar: !!model.translated?.ar, en: !!model.translated?.en },
    type: 'article',
    publishedTime: model.createdAt,
    modifiedTime: model.lastReviewedAt ?? model.updatedAt,
  })
}

export default async function ModelPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const model = await getModel(slug, locale)
  if (!model) notFound()

  const [t, offer, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    getOffer(locale),
    getSiteSettings(locale),
  ])

  const title = model.title ?? ''
  const h1 = t('models.h1', { model: title })
  const path = `/models/${slug}`
  const pageUrl = absoluteUrl(locale, path)

  const tier = offer?.tiers?.find((x) => x.key === model.tier)
  const priceFrom = model.priceFrom ?? tier?.priceFrom ?? null
  const buildDays = model.buildDays ?? 30
  const carePlans = (offer?.carePlans ?? []).filter((c) => typeof c.monthlyPrice === 'number')
  const careFrom = carePlans.length ? Math.min(...carePlans.map((c) => c.monthlyPrice as number)) : null

  const faqs = publicRelations<Faq>(model.faqs as (string | Faq)[], locale).filter((f) => f.question && f.answer)
  const relatedModels = publicRelations<Model>(model.relatedModels as (string | Model)[], locale).slice(0, 2)
  const relatedSolution = publicRelations<Solution>(model.relatedSolution as string | Solution, locale)[0]
  const relatedPost = publicRelations<Post>(model.relatedPosts as (string | Post)[], locale)[0]
  const authors = authorList(model.authors, locale)
  const reviewer = authorList(model.reviewer ? [model.reviewer] : [], locale)[0]

  const reelUrl = model.reel?.url
  const reel = reelUrl ? videoMeta(reelUrl) : null
  const poster = mediaOf(model.reel?.posterImage)?.url ?? reel?.thumbnail ?? null
  const whatsappMessage = t('models.whatsappMessage', { model: title })
  const refCode = `M-${slug}`
  const scorecardHref = scorecardForModel(slug)
  // Inline CTA blocks in the analysis keep the model context too.
  const richCtx = {
    scorecardHref,
    from: path,
    whatsappNumber: settings?.whatsappNumber,
    refCode,
    waMessage: whatsappMessage,
  }

  const video =
    reelUrl && reel?.embedUrl && poster
      ? videoNode({
          name: h1,
          description: model.answerBox || h1,
          thumbnailUrl: poster,
          uploadDate: model.createdAt,
          embedUrl: reel.embedUrl,
          transcript: model.transcript,
          pageUrl,
          locale,
        })
      : null

  const jsonLd = graph(
    articleNode({
      locale,
      path,
      headline: h1,
      description: model.answerBox,
      images: [mediaOf(model.heroImage)?.url],
      datePublished: model.createdAt,
      dateModified: model.lastReviewedAt ?? model.updatedAt,
      authors: authors.map((a) => a.slug).filter((s): s is string => !!s),
      reviewer: reviewer?.slug,
      video: video ? { '@id': `${pageUrl}#video` } : undefined,
    }),
    video,
    ...authors
      .filter((a) => a.slug && a.name)
      .map((a) => personNode({ ...a, slug: a.slug!, name: a.name!, photoUrl: mediaOf(a.photo)?.url }, locale)),
    faqs.length
      ? faqPageNode(
          faqs.map((f) => ({ question: f.question!, answer: f.answer! })),
          { url: pageUrl, locale },
        )
      : null,
  )

  const factRows: { label: string; value: ReactNode; source: ReactNode }[] = []
  const analysis = <span className="text-xs text-stone-500">{t('models.facts.ourAnalysis')}</span>
  if (model.whatItDoes)
    factRows.push({ label: t('models.facts.whatItDoes'), value: model.whatItDoes, source: analysis })
  if (model.whoPays) factRows.push({ label: t('models.facts.whoPays'), value: model.whoPays, source: analysis })
  if (model.pricingModel)
    factRows.push({ label: t('models.facts.pricingModel'), value: model.pricingModel, source: analysis })
  if (mrrShowable(model.mrr)) {
    factRows.push({
      label: t('models.facts.mrr'),
      value: (
        <>
          <bdi className="num font-semibold">{formatMoney(model.mrr.amount, model.mrr.currency || 'USD', locale)}</bdi>{' '}
          {t('mrr.perMonth')} — <AutoBdi text={title} locale={locale} />
          <span className="mt-1 block text-xs text-stone-500">{t('mrr.disclaimerShort', { company: title })}</span>
        </>
      ),
      source: (
        <SourceCite
          label={model.mrr.sourceName || t('common.source')}
          url={model.mrr.sourceUrl}
          date={model.mrr.reportedAt}
          locale={locale}
        />
      ),
    })
  }
  for (const f of model.factSources ?? []) {
    if (!f.label || !f.value || !f.url) continue
    factRows.push({
      label: f.label,
      value: <AutoBdi text={f.value} locale={locale} />,
      source: <SourceCite label={hostOf(f.url)} url={f.url} date={f.checkedAt} locale={locale} />,
    })
  }

  const marketChanges = ['arabic', 'mada', 'zatca', 'whatsapp'] as const

  return (
    <>
      <Alternates path={path} indexPath="/models" available={model.translated} />
      <SetPageCta scorecardHref={scorecardHref} waMessage={whatsappMessage} refCode={refCode} />
      <JsonLd data={jsonLd} />
      <TrackView event="model_view" params={{ model_slug: slug, category: model.category ?? undefined }} />

      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.models'), href: '/models' },
          { label: title, href: path },
        ]}
        title={<AutoBdi text={h1} locale={locale} />}
        /* Smaller H1 on phones keeps the price and CTAs near the first screen. */
        titleClassName="text-display-2 lg:text-display-1"
      >
        {model.answerBox && <AnswerBox label={t('common.shortAnswer')}>{model.answerBox}</AnswerBox>}
        {/* Price and the next step come before the MRR box so they sit near the first screen on phones. */}
        <div className="mt-6 max-w-3xl">
          <p className="text-base font-semibold sm:text-lg">
            {priceFrom ? (
              <>
                {t('models.heroStrip', { price: formatPrice(priceFrom, locale) })}{' '}
                <span className="text-sm font-normal text-ink-600">({t('common.exVat')})</span>
              </>
            ) : (
              t('models.heroStripNoPrice')
            )}
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <TrackedLink
              href={scorecardHref}
              event="cta_click"
              params={{ cta_id: 'model_scorecard', location: 'model_hero', model_slug: slug, ref_code: refCode }}
              className={buttonVariants({ size: 'lg' })}
            >
              {t('cta.scorecard')}
            </TrackedLink>
            <WhatsAppButton
              message={whatsappMessage}
              refCode={refCode}
              placement="model_hero"
              number={settings?.whatsappNumber}
              label={t('cta.whatsapp')}
              variant="secondary"
              size="lg"
            />
          </div>
        </div>
        <div className="mt-6 max-w-3xl">
          <MrrFigure mrr={model.mrr} company={title} locale={locale} compact />
        </div>
        <DateLine
          locale={locale}
          published={model.createdAt}
          reviewed={model.lastReviewedAt}
          reviewer={reviewer ? { name: reviewer.name, slug: reviewer.slug } : null}
        />
      </PageHero>

      {factRows.length > 0 && (
        <ContentSection id="facts" title={t('models.facts.title')}>
          <div className="relative overflow-x-auto rounded-[var(--radius-card)] border border-sand-300">
            <table className="w-full min-w-[560px] border-collapse text-start text-sm">
              <thead className="bg-sand-100">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    {t('models.facts.fact')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('models.facts.value')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('common.source')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {factRows.map((r, i) => (
                  <tr key={i} className="border-t border-sand-300 align-top">
                    <th scope="row" className="p-3 text-start font-semibold">
                      {r.label}
                    </th>
                    <td className="p-3">{r.value}</td>
                    <td className="p-3">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ContentSection>
      )}

      {model.whyItWorks && (
        <ContentSection id="why-it-works" title={t('models.whyItWorks')} tone="alt">
          <RichText data={model.whyItWorks} locale={locale} className="max-w-3xl" ctx={richCtx} />
        </ContentSection>
      )}

      {!!model.runningCosts?.length && (
        <ContentSection id="running-costs" title={t('models.runningCosts.title')}>
          <div className="relative overflow-x-auto rounded-[var(--radius-card)] border border-sand-300">
            <table className="w-full min-w-[560px] border-collapse text-start text-sm">
              <thead className="bg-sand-100">
                <tr>
                  <th scope="col" className="p-3 text-start">
                    {t('models.runningCosts.item')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('models.runningCosts.monthly')}
                  </th>
                  <th scope="col" className="p-3 text-start">
                    {t('common.source')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {model.runningCosts.map((c, i) => (
                  <tr key={i} className="border-t border-sand-300 align-top">
                    <th scope="row" className="p-3 text-start font-semibold">
                      {c.item}
                    </th>
                    <td className="p-3">
                      {typeof c.monthlyCost === 'number' ? (
                        <bdi className="num">{formatMoney(c.monthlyCost, c.currency || 'USD', locale)}</bdi>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      {c.sourceUrl ? (
                        <SourceCite label={hostOf(c.sourceUrl)} url={c.sourceUrl} date={c.checkedAt} locale={locale} />
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-ink-600">{t('models.runningCosts.note')}</p>
        </ContentSection>
      )}

      <ContentSection id="gulf-version" title={t('models.gulf.title')} tone="alt">
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            {model.gulfVersion && <RichText data={model.gulfVersion} locale={locale} ctx={richCtx} />}
            {!!model.mvpFeatures?.length && (
              <>
                <h3 className="mt-8 text-xl font-semibold">{t('models.gulf.mvp')}</h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {model.mvpFeatures.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <Check aria-hidden className="mt-1 size-4 shrink-0 text-verified-600" />
                      <AutoBdi text={f.feature} locale={locale} />
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h3 className="mt-8 text-xl font-semibold">{t('models.gulf.changes')}</h3>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {marketChanges.map((k) => (
                <li key={k} className="flex gap-2">
                  <Check aria-hidden className="mt-1 size-4 shrink-0 text-verified-600" />
                  <span>{t(`models.gulf.change.${k}`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <aside className="h-fit rounded-[var(--radius-card)] border border-sand-300 bg-white p-6">
            <dl className="space-y-4">
              {(tier?.name || model.tier) && (
                <div className="flex gap-3">
                  <Layers aria-hidden className="mt-1 size-5 shrink-0" />
                  <div>
                    <dt className="text-sm text-ink-600">{t('models.gulf.tier')}</dt>
                    <dd className="font-semibold">
                      <AutoBdi text={tier?.name || t(`tiers.${model.tier}`)} locale={locale} />
                    </dd>
                  </div>
                </div>
              )}
              {priceFrom ? (
                <div>
                  <dt className="text-sm text-ink-600">{t('models.gulf.price')}</dt>
                  <dd>
                    <PriceFrom usd={priceFrom} locale={locale} />
                  </dd>
                  <dd className="mt-2 flex gap-2 text-sm text-ink-600">
                    <BadgeCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-verified-600" />
                    <span>{t('models.gulf.guarantee')}</span>
                  </dd>
                </div>
              ) : null}
              <div className="flex gap-3">
                <Clock aria-hidden className="mt-1 size-5 shrink-0" />
                <div>
                  <dt className="text-sm text-ink-600">{t('models.gulf.timeline')}</dt>
                  <dd className="font-semibold">{t('models.gulf.days', { days: formatNumber(buildDays, locale) })}</dd>
                </div>
              </div>
              {careFrom !== null && (
                <div className="flex gap-3">
                  <ShieldCheck aria-hidden className="mt-1 size-5 shrink-0" />
                  <div>
                    <dt className="text-sm text-ink-600">{t('models.gulf.care')}</dt>
                    <dd>
                      <PriceFrom usd={careFrom} locale={locale} /> {t('common.perMonth')}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
            <Link href="/launch-30" className="mt-5 inline-block text-sm font-semibold text-ignition-700 underline">
              {t('models.gulf.offerLink')}
            </Link>
          </aside>
        </div>
      </ContentSection>

      {!!model.fitCriteria?.length && (
        <ContentSection id="who-should-build" title={t('models.fit.title')}>
          <ul className="grid max-w-3xl gap-3">
            {model.fitCriteria.map((c, i) => (
              <li key={i} className="flex gap-3 rounded-[12px] bg-sand-100 p-4">
                <Check aria-hidden className="mt-1 size-4 shrink-0 text-verified-600" />
                <AutoBdi text={c.criterion} locale={locale} />
              </li>
            ))}
          </ul>
        </ContentSection>
      )}

      {reelUrl && (
        <ContentSection id="reel" title={t('models.reel.title', { model: title })} tone="alt">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr]">
            <VideoFacade
              url={reelUrl}
              title={h1}
              poster={poster}
              vertical={reel?.vertical ?? true}
              playLabel={t('common.playVideo')}
              trackParams={{ model_slug: slug }}
            />
            {model.transcript && (
              <div>
                <h3 className="text-xl font-semibold">{t('common.transcript')}</h3>
                <div className="mt-3 max-h-[32rem] overflow-y-auto whitespace-pre-line rounded-[12px] bg-white p-5 text-ink-600">
                  {model.transcript}
                </div>
              </div>
            )}
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
        title={t('models.cta.title', { model: title })}
        body={t('models.cta.body')}
        href={scorecardHref}
        ctaId="model_scorecard"
        whatsappMessage={whatsappMessage}
        refCode={refCode}
        placement="model_footer"
        trackParams={{ model_slug: slug }}
      />

      {(relatedModels.length > 0 || relatedSolution || relatedPost) && (
        <ContentSection id="related" title={t('common.related')}>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {relatedModels.map((m) => (
              <ContentCard
                key={m.id}
                locale={locale}
                href={`/models/${m.slug}`}
                title={m.title ?? ''}
                excerpt={m.whatItDoes}
                meta={t('models.relatedModel')}
              />
            ))}
            {relatedSolution && (
              <ContentCard
                locale={locale}
                href={`/solutions/${relatedSolution.slug}`}
                title={relatedSolution.title ?? ''}
                excerpt={relatedSolution.summary}
                meta={t('models.relatedSolution')}
              />
            )}
            {relatedPost && (
              <ContentCard
                locale={locale}
                href={`/blog/${relatedPost.slug}`}
                title={relatedPost.title ?? ''}
                excerpt={relatedPost.excerpt}
                meta={t('models.relatedPost')}
              />
            )}
          </div>
        </ContentSection>
      )}
    </>
  )
}
