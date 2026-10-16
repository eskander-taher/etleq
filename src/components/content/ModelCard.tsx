import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { formatDate, formatMoney, formatNumber, formatPrice } from '@/lib/format'
import type { Model, Offer } from '@/payload-types'
import { AutoBdi } from './Bdi'
import { ForwardArrow, mrrShowable } from './parts'
import type { Loc } from './lib'

/** Model library card: what it does, reported MRR with source/date/disclaimer, Gulf version price and timeline. */
export async function ModelCard({ model, offer, locale }: { model: Model; offer?: Offer | null; locale: Loc }) {
  const t = await getTranslations({ locale, namespace: 'content' })
  const title = model.title ?? ''
  const price = model.priceFrom ?? offer?.tiers?.find((x) => x.key === model.tier)?.priceFrom ?? null
  const days = model.buildDays ?? 30
  const mrr = model.mrr
  return (
    <article className="relative flex flex-col rounded-[var(--radius-card)] border border-sand-300 bg-white p-5 transition-shadow hover:shadow-md">
      {model.category && <p className="mb-2 text-sm text-ink-600">{t(`models.categories.${model.category}`)}</p>}
      <h3 className="text-xl font-semibold">
        <Link href={`/models/${model.slug}`} className="after:absolute after:inset-0 after:rounded-[var(--radius-card)]">
          <AutoBdi text={title} locale={locale} />
        </Link>
      </h3>
      {model.whatItDoes && <p className="mt-2 line-clamp-3 text-ink-600">{model.whatItDoes}</p>}
      {mrrShowable(mrr) && (
        <div className="mt-4 rounded-[12px] bg-sand-100 p-3 text-sm">
          <p>
            {t('mrr.label')}: <bdi className="num font-semibold">{formatMoney(mrr.amount, mrr.currency || 'USD', locale)}</bdi>{' '}
            {t('mrr.perMonth')}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            {t('mrr.source')}:{' '}
            <a href={mrr.sourceUrl} rel="noopener nofollow" target="_blank" className="relative z-10 underline">
              <AutoBdi text={mrr.sourceName || t('common.source')} locale={locale} />
            </a>
            {' · '}
            <time dateTime={mrr.reportedAt}>{formatDate(mrr.reportedAt, locale)}</time>
          </p>
          <p className="mt-1 text-xs text-stone-500">{t('mrr.disclaimerShort', { company: title })}</p>
        </div>
      )}
      <p className="mt-auto flex items-center justify-between gap-3 pt-4 text-sm font-semibold">
        <span>
          {price
            ? t('models.cardGulf', { price: formatPrice(price, locale), days: formatNumber(days, locale) })
            : t('models.cardGulfNoPrice', { days: formatNumber(days, locale) })}
        </span>
        <ForwardArrow />
      </p>
    </article>
  )
}
