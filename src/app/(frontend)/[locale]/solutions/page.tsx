import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { CtaPanel } from '@/components/content/CtaPanel'
import { ContentCard, ContentSection, EmptyState, PageHero } from '@/components/content/parts'
import type { Loc } from '@/components/content/lib'
import { listSolutions } from '@/lib/queries/solutions'
import { buildMetadata } from '@/lib/seo'
import { formatPrice } from '@/lib/format'

export const revalidate = 3600

type Props = { params: Promise<{ locale: Loc }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'content' })
  return buildMetadata({
    locale,
    path: '/solutions',
    title: t('solutions.indexTitle'),
    description: t('solutions.indexLead'),
    alternates: { ar: true, en: true },
  })
}

export default async function SolutionsIndex({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'content' })
  const result = await listSolutions(locale).catch(() => ({ docs: [] as Awaited<ReturnType<typeof listSolutions>>['docs'] }))

  return (
    <>
      <PageHero
        crumbs={[
          { label: t('nav.home'), href: '/' },
          { label: t('nav.solutions'), href: '/solutions' },
        ]}
        title={t('solutions.indexTitle')}
        lead={t('solutions.indexLead')}
      />
      <ContentSection>
        {result.docs.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {result.docs.map((s) => (
              <ContentCard
                key={s.id}
                locale={locale}
                href={`/solutions/${s.slug}`}
                title={s.title ?? ''}
                excerpt={s.summary}
                meta={s.vertical ? t(`solutions.verticals.${s.vertical}`) : undefined}
                footer={
                  typeof s.priceFrom === 'number' ? (
                    <span className="text-sm font-semibold">
                      {t('common.from')} <bdi className="num">{formatPrice(s.priceFrom, locale)}</bdi>
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState title={t('solutions.empty')} />
        )}
      </ContentSection>
      <CtaPanel locale={locale} title={t('solutions.indexCtaTitle')} label={t('solutions.cta')} ctaId="solutions_index" placement="solutions_index" refCode="SOLUTIONS" />
    </>
  )
}
