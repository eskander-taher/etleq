import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { JsonLd } from '@/components/seo/JsonLd'
import { ModelCard } from '@/components/content/ModelCard'
import { CtaPanel } from '@/components/content/CtaPanel'
import { getOffer } from '@/components/content/globals'
import { ContentSection, EmptyState, FilterLink, PageHero, Pagination } from '@/components/content/parts'
import { EmptyCtas } from '@/components/content/EmptyCtas'
import { firstParam, pageParam, scorecardFrom, withQuery, type Loc } from '@/components/content/lib'
import { MODEL_CATEGORIES, isModelCategory, listModels } from '@/lib/queries/models'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { graph } from '@/lib/schema'

export const revalidate = 3600

type Props = {
  params: Promise<{ locale: Loc }>
  searchParams: Promise<{ category?: string; page?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { locale } = await params
  const sp = await searchParams
  const t = await getTranslations({ locale, namespace: 'content' })
  const category = firstParam(sp.category)
  const cat = isModelCategory(category) ? category : undefined
  const page = pageParam(sp.page)
  return buildMetadata({
    locale,
    path: withQuery('/models', { category: cat, page }),
    title: cat ? t('models.indexTitleCategory', { category: t(`models.categories.${cat}`) }) : t('models.indexTitle'),
    description: t('models.indexLead'),
    alternates: { ar: true, en: true },
  })
}

export default async function ModelsIndex({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const category = firstParam(sp.category)
  const cat = isModelCategory(category) ? category : undefined
  const page = pageParam(sp.page)
  const [t, offer, result] = await Promise.all([
    getTranslations({ locale, namespace: 'content' }),
    getOffer(locale),
    listModels(locale, { category: cat, page }),
  ])

  const url = absoluteUrl(locale, '/models')
  const jsonLd = graph({
    '@type': 'CollectionPage',
    '@id': `${url}#webpage`,
    url,
    name: t('models.indexTitle'),
    inLanguage: locale,
    hasPart: result.docs.map((m) => ({
      '@type': 'Article' as const,
      headline: m.title ?? '',
      url: absoluteUrl(locale, `/models/${m.slug}`),
    })),
  })

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.models'), href: '/models' },
        ]}
        title={t('models.indexTitle')}
        lead={t('models.indexLead')}
      />

      <ContentSection>
        {/* One scrolling row on phones (links stay server-rendered and crawlable); wraps from sm up. */}
        <nav
          aria-label={t('models.filterLabel')}
          className="relative -mx-4 mb-8 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
        >
          <FilterLink href="/models" active={!cat} label={t('common.all')} />
          {MODEL_CATEGORIES.map((c) => (
            <FilterLink
              key={c}
              href={withQuery('/models', { category: c })}
              active={cat === c}
              label={t(`models.categories.${c}`)}
            />
          ))}
        </nav>

        {result.docs.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((m) => (
              <ModelCard key={m.id} model={m} offer={offer} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState title={t('models.empty')} body={t('models.emptyBody')}>
            <EmptyCtas locale={locale} path="/models" placement="models_index" refCode="MODELS" />
          </EmptyState>
        )}

        <Pagination
          locale={locale}
          basePath="/models"
          page={page}
          totalPages={result.totalPages}
          query={{ category: cat }}
        />
      </ContentSection>

      <CtaPanel
        locale={locale}
        title={t('models.indexCtaTitle')}
        body={t('models.indexCtaBody')}
        href={scorecardFrom('/models')}
        ctaId="models_index_scorecard"
        placement="models_index"
        refCode="MODELS"
      />
    </>
  )
}
