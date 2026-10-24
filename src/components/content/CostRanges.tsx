import { getTranslations } from 'next-intl/server'
import { ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/format'
import { AutoBdi } from './Bdi'
import { formatRange, hostOf, sourcedRanges, type CostRange, type Loc } from './lib'

/**
 * Market price ranges as a plain HTML table (assistants lift figures from tables).
 * Every row shows its source link and checked date; unsourced rows are never rendered.
 */
export async function CostRangesTable({ rows, locale }: { rows: CostRange[] | null | undefined; locale: Loc }) {
  const list = sourcedRanges(rows)
  if (!list.length) return null
  const t = await getTranslations({ locale, namespace: 'content' })
  return (
    <div className="relative overflow-x-auto rounded-[var(--radius-card)] border border-sand-300">
      <table className="w-full min-w-[560px] border-collapse text-start text-sm">
        <caption className="p-4 text-start text-ink-600">{t('cost.rangesCaption')}</caption>
        <thead className="bg-sand-100">
          <tr>
            <th scope="col" className="p-3 text-start font-semibold">
              {t('cost.rangesOption')}
            </th>
            <th scope="col" className="p-3 text-start font-semibold">
              {t('cost.rangesRange')}
            </th>
            <th scope="col" className="p-3 text-start font-semibold">
              {t('common.source')}
            </th>
            <th scope="col" className="p-3 text-start font-semibold">
              {t('cost.rangesChecked')}
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, i) => (
            <tr key={i} className="border-t border-sand-300 align-top">
              <th scope="row" className="p-3 text-start font-semibold">
                <AutoBdi text={r.option} locale={locale} />
                {r.note && <span className="block font-normal text-ink-600">{r.note}</span>}
              </th>
              <td className="p-3 font-semibold">
                <bdi className="num">{formatRange(r, locale)}</bdi>
              </td>
              <td className="p-3">
                <a
                  href={r.sourceUrl}
                  rel="noopener nofollow"
                  target="_blank"
                  className="inline-flex items-center gap-1 text-ignition-700 underline"
                >
                  <AutoBdi text={r.sourceName || hostOf(r.sourceUrl)} locale={locale} />
                  <ExternalLink aria-hidden className="size-3" />
                </a>
              </td>
              <td className="p-3">
                <time dateTime={r.checkedAt}>{formatDate(r.checkedAt, locale)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** "What changes the cost": a plain definition list. */
export function CostFactors({
  items,
  locale,
}: {
  items: { factor?: string | null; effect?: string | null }[] | null | undefined
  locale: Loc
}) {
  const list = (items ?? []).filter((f) => f?.factor?.trim())
  if (!list.length) return null
  return (
    <dl className="grid max-w-3xl gap-4">
      {list.map((f, i) => (
        <div key={i} className="rounded-[var(--radius-card)] border border-sand-300 bg-white p-5">
          <dt className="font-semibold">
            <AutoBdi text={f.factor!} locale={locale} />
          </dt>
          {f.effect && <dd className="mt-1 text-ink-600">{f.effect}</dd>}
        </div>
      ))}
    </dl>
  )
}
