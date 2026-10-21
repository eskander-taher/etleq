import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Check } from 'lucide-react'
import { JsonLd } from '@/components/seo/JsonLd'
import { RichText } from '@/components/RichText'
import { getGuide, listGuides, type GuideType } from '@/lib/queries/guides'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { articleNode, faqPageNode, graph, personNode } from '@/lib/schema'
import type { Faq, Post } from '@/cms/content-types'
import { AutoBdi } from './Bdi'
import { ComparisonTable } from './ComparisonTable'
import { CtaPanel } from './CtaPanel'
import { EmptyCtas } from './EmptyCtas'
import { InlineCta } from './InlineCta'
import { getOffer, getSiteSettings } from './globals'
import { SetPageCta } from '@/components/layout/page-cta'
import { FaqList } from './FaqList'
import { Toc } from './Toc'
import {
  Alternates,
  AnswerBox,
  AuthorBox,
  ContentCard,
  ContentSection,
  DateLine,
  EmptyState,
  PageHero,
  PriceFrom,
  SourcesList,
  authorList,
} from './parts'
import { collectHeadings, mediaOf, publicRelations, scorecardFrom, type Loc } from './lib'

const BASE: Record<GuideType, '/cost' | '/compare'> = { cost: '/cost', comparison: '/compare' }

export async function guideMetadata(type: GuideType, locale: Loc, slug: string): Promise<Metadata> {
  const g = await getGuide(slug, type, locale).catch(() => null)
  if (!g) return {}
  return buildMetadata({
    locale,
    path: `${BASE[type]}/${slug}`,
    title: g.meta?.title || g.title || '',
    description: g.meta?.description || g.answerBox || g.excerpt,
    image: mediaOf(g.meta?.image)?.url ?? mediaOf(g.heroImage)?.url,
    alternates: { ar: !!g.translated?.ar, en: !!g.translated?.en },
    type: 'article',
    publishedTime: g.publishedAt,
    modifiedTime: g.lastReviewedAt ?? g.updatedAt,
  })
}

/** Cost guide or comparison page (brief section 8). */
export async function GuideView({ type, locale, slug }: { type: GuideType; locale: Loc; slug: string }) {
  setRequestLocale(locale)
  const g = await getGuide(slug, type, locale)
  if (!g) notFound()
  const [t, offer, settings] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    getOffer(locale),
    getSiteSettings(locale),
  ])
  const ns = type === 'cost' ? 'cost' : 'compare'
  const base = BASE[type]
  const path = `${base}/${slug}`
  const scorecardHref = scorecardFrom(path)
  const refCode = `${type === 'cost' ? 'C' : 'V'}-${slug}`
  const title = g.title ?? ''
  const waMessage = t(`${ns}.whatsappMessage`, { title })
  // Etleq's own "from" price: the core tier in the offer global (never hard-coded).
  const etleqFrom = offer?.tiers?.find((x) => x.key === 'core')?.priceFrom ?? null
  const ctaCommon = { href: scorecardHref, ctaId: `${type}_guide_scorecard`, whatsappMessage: waMessage, refCode }
  const pageUrl = absoluteUrl(locale, path)
  const authors = authorList(g.authors, locale)
  const reviewer = authorList(g.reviewer ? [g.reviewer] : [], locale)[0]
  const faqs = publicRelations<Faq>(g.faqs as (string | Faq)[], locale).filter((f) => f.question && f.answer)
  const related = publicRelations<Post>(g.relatedPosts as (string | Post)[], locale).slice(0, 3)
  const { toc } = collectHeadings(g.content as never)

  const jsonLd = graph(
    articleNode({
      locale,
      path,
      headline: title,
      description: g.answerBox || g.excerpt,
      images: [mediaOf(g.heroImage)?.url],
      datePublished: g.publishedAt ?? g.createdAt,
      dateModified: g.lastReviewedAt ?? g.updatedAt,
      authors: authors.map((a) => a.slug).filter((s): s is string => !!s),
      reviewer: reviewer?.slug,
    }),
    ...[...authors, ...(reviewer ? [reviewer] : [])]
      .filter((a, i, all) => a.slug && a.name && all.findIndex((b) => b.slug === a.slug) === i)
      .map((a) => personNode({ ...a, slug: a.slug!, name: a.name!, photoUrl: mediaOf(a.photo)?.url }, locale)),
    faqs.length
      ? faqPageNode(
          faqs.map((f) => ({ question: f.question!, answer: f.answer! })),
          { url: pageUrl, locale },
        )
      : null,
  )

  return (
    <>
      <Alternates path={path} indexPath={base} available={g.translated} />
      <SetPageCta scorecardHref={scorecardHref} waMessage={waMessage} refCode={refCode} />
      <JsonLd data={jsonLd} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t(`nav.${ns}`), href: base },
          { label: title, href: path },
        ]}
        title={<AutoBdi text={title} locale={locale} />}
      >
        {g.answerBox && <AnswerBox label={t('common.shortAnswer')}>{g.answerBox}</AnswerBox>}
        <InlineCta
          locale={locale}
          {...ctaCommon}
          label={t(`${ns}.ctaLabel`)}
          placement={`${type}_guide_hero`}
          className="mt-4"
          offerLink
          body={
            typeof etleqFrom === 'number' && etleqFrom > 0 ? (
              <p className="text-ink-950">
                <span className="font-semibold">{t('common.etleqPrice')}:</span>{' '}
                <PriceFrom usd={etleqFrom} locale={locale} />
              </p>
            ) : undefined
          }
        />
        <DateLine
          locale={locale}
          published={g.publishedAt}
          reviewed={g.lastReviewedAt}
          reviewer={reviewer ? { name: reviewer.name, slug: reviewer.slug } : null}
        />
      </PageHero>

      {!!g.keyTakeaways?.length && (
        <ContentSection>
          <KeyTakeaways
            title={t('common.keyTakeaways')}
            items={g.keyTakeaways.map((k) => k.text ?? '')}
            locale={locale}
          />
        </ContentSection>
      )}

      {!!g.comparisonTable?.rows?.length && (
        <ContentSection id="comparison" title={t(`${ns}.tableTitle`)}>
          <ComparisonTable data={g.comparisonTable} sourceLabel={t('common.source')} />
          <InlineCta
            locale={locale}
            {...ctaCommon}
            title={t(`${ns}.tableCtaTitle`)}
            body={t(`${ns}.ctaBody`)}
            label={t(`${ns}.ctaLabel`)}
            placement={`${type}_guide_table`}
            className="mt-8"
            offerLink
          />
        </ContentSection>
      )}

      {g.content && (
        <ContentSection>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_260px]">
            <RichText
              data={g.content}
              locale={locale}
              className="max-w-3xl"
              ctx={{ scorecardHref, from: path, whatsappNumber: settings?.whatsappNumber, refCode, waMessage }}
            />
            <Toc items={toc} title={t('common.toc')} />
          </div>
        </ContentSection>
      )}

      {faqs.length > 0 && (
        <ContentSection id="faq" title={t('common.faq')} tone="alt">
          <div className="max-w-3xl">
            <FaqList items={faqs.map((f) => ({ question: f.question!, answer: f.answer! }))} />
          </div>
        </ContentSection>
      )}

      <SourcesList sources={g.sources} locale={locale} />
      <AuthorBox authors={authors} locale={locale} />

      <CtaPanel
        locale={locale}
        title={t(`${ns}.ctaTitle`)}
        body={t(`${ns}.ctaBody`)}
        label={t(`${ns}.ctaLabel`)}
        href={scorecardHref}
        ctaId={`${type}_guide_scorecard`}
        whatsappMessage={waMessage}
        refCode={refCode}
        placement={`${type}_guide_footer`}
      />

      {related.length > 0 && (
        <ContentSection title={t('common.related')}>
          <div className="grid gap-5 md:grid-cols-3">
            {related.map((p) => (
              <ContentCard
                key={p.id}
                locale={locale}
                href={`/blog/${p.slug}`}
                title={p.title ?? ''}
                excerpt={p.excerpt}
              />
            ))}
          </div>
        </ContentSection>
      )}
    </>
  )
}

export async function guideIndexMetadata(type: GuideType, locale: Loc): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'content' })
  const ns = type === 'cost' ? 'cost' : 'compare'
  return buildMetadata({
    locale,
    path: BASE[type],
    title: t(`${ns}.indexTitle`),
    description: t(`${ns}.indexLead`),
    alternates: { ar: true, en: true },
  })
}

/** Hub page listing every guide of one type (hubs link to all their children). */
export async function GuideIndex({ type, locale }: { type: GuideType; locale: Loc }) {
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'content' })
  const ns = type === 'cost' ? 'cost' : 'compare'
  const base = BASE[type]
  const res = await listGuides(locale, type).catch(() => null)
  const docs = res?.docs ?? []
  return (
    <>
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t(`nav.${ns}`), href: base },
        ]}
        title={t(`${ns}.indexTitle`)}
        lead={t(`${ns}.indexLead`)}
      />
      <ContentSection>
        {docs.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {docs.map((g) => (
              <ContentCard
                key={g.id}
                locale={locale}
                href={`${base}/${g.slug}`}
                title={g.title ?? ''}
                excerpt={g.answerBox || g.excerpt}
              />
            ))}
          </div>
        ) : (
          <EmptyState title={t(`${ns}.empty`)}>
            <EmptyCtas
              locale={locale}
              path={base}
              placement={`${type}_index`}
              refCode={type === 'cost' ? 'COST' : 'COMPARE'}
            />
          </EmptyState>
        )}
      </ContentSection>
      <CtaPanel
        locale={locale}
        title={t(`${ns}.ctaTitle`)}
        label={t(`${ns}.ctaLabel`)}
        href={scorecardFrom(base)}
        ctaId={`${type}_index_scorecard`}
        placement={`${type}_index`}
        refCode={type === 'cost' ? 'COST' : 'COMPARE'}
      />
    </>
  )
}

export function KeyTakeaways({ title, items, locale }: { title: string; items: string[]; locale: Loc }) {
  const list = items.filter(Boolean)
  if (!list.length) return null
  return (
    <aside
      className="max-w-3xl rounded-[var(--radius-card)] border border-sand-300 bg-white p-6"
      aria-labelledby="key-takeaways"
    >
      <h2 id="key-takeaways" className="text-xl font-bold">
        {title}
      </h2>
      <ul className="mt-4 space-y-2">
        {list.map((text, i) => (
          <li key={i} className="flex gap-2">
            <Check aria-hidden className="mt-1 size-4 shrink-0 text-verified-600" />
            <AutoBdi text={text} locale={locale} />
          </li>
        ))}
      </ul>
    </aside>
  )
}
