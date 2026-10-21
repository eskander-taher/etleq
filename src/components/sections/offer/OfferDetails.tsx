import { getTranslations } from 'next-intl/server'
import { ShieldCheck, X } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { slotsAreCurrent, type SiteSettingsData } from './data'
import type { ResolvedOffer } from './resolve-offer'

/**
 * Launch-date guarantee with the honest line (CMS text first, approved brief copy as fallback), then the
 * Blueprint money-back guarantee (owner decision 2026-10-22; messages until the offer global has a field for it).
 */
export async function Guarantee({ locale, offer, detailed = false }: { locale: 'ar' | 'en'; offer: ResolvedOffer; detailed?: boolean }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
      <ShieldCheck className="size-14 text-ignition-500" aria-hidden="true" />
      <div>
        <p className="font-display text-display-3 font-bold whitespace-pre-line">{offer.guarantee || t('guarantee.body')}</p>
        {detailed || !offer.guarantee ? <p className="mt-4 text-sand-300">{t('guarantee.terms')}</p> : null}
        <div className="mt-8 rounded-card border border-ink-800 bg-ink-800/60 p-5">
          <h3 className="font-display text-lg font-semibold">{t('guarantee.blueprintTitle')}</h3>
          <p className="mt-2 text-sand-300">{t('guarantee.blueprint', { price: formatPrice(offer.blueprint.price, locale) })}</p>
        </div>
        <p className="mt-6 border-s-2 border-ignition-500 ps-4 text-lg">{offer.guaranteeHonestLine || t('guarantee.honest')}</p>
      </div>
    </div>
  )
}

export async function CarePlansTable({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  if (!offer.carePlans.length) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  return (
    <Table label={t('launch30.careTable.caption')} caption={t('launch30.careTable.caption')}>
      <THead>
        <TR>
          <TH scope="col" sticky>
            {t('launch30.careTable.plan')}
          </TH>
          <TH scope="col">{t('launch30.careTable.price')}</TH>
          <TH scope="col">{t('launch30.careTable.includes')}</TH>
        </TR>
      </THead>
      <TBody>
        {offer.carePlans.map((c) => (
          <TR key={c.name}>
            <TH scope="row" sticky className="font-medium">
              {c.name}
            </TH>
            <TD>
              <bdi className="num">{formatPrice(c.monthlyPrice, locale)}</bdi> <span className="text-sm">{t('offer.perMonth')}</span>
            </TD>
            <TD>{c.features.length ? c.features.join(locale === 'ar' ? '، ' : ', ') : '—'}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

export async function PaymentTerms({ locale, offer }: { locale: 'ar' | 'en'; offer: ResolvedOffer }) {
  const t = await getTranslations({ locale, namespace: 'home' })
  if (offer.paymentTerms) return <p className="text-lg whitespace-pre-line text-ink-600">{offer.paymentTerms}</p>
  const steps = t.raw('launch30.paymentSteps') as { share: string; when: string }[]
  return (
    <ol className="grid gap-4 sm:grid-cols-3">
      {steps.map((s) => (
        <li key={s.when}>
          <Card className="h-full">
            <bdi className="num text-4xl">{s.share}</bdi>
            <p className="mt-2 text-ink-600">{s.when}</p>
          </Card>
        </li>
      ))}
    </ol>
  )
}

export function NotIncluded({ offer }: { offer: ResolvedOffer }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {offer.notIncluded.map((x) => (
        <li key={x} className="flex items-start gap-3 rounded-button border border-sand-300 bg-white p-4">
          <X className="mt-0.5 size-5 shrink-0 text-stone-500" aria-hidden="true" />
          {x}
        </li>
      ))}
    </ul>
  )
}

/** Real scarcity only: reads site-settings; renders nothing when the founders haven't set it or the month has passed. */
export async function SlotCounter({ locale, settings }: { locale: 'ar' | 'en'; settings: SiteSettingsData }) {
  const { slotsLeft, slotsTotal, slotsMonth } = settings
  if (typeof slotsLeft !== 'number' || typeof slotsTotal !== 'number' || slotsTotal <= 0) return null
  if (!slotsAreCurrent(slotsMonth)) return null
  const t = await getTranslations({ locale, namespace: 'home' })
  const left = Math.max(0, Math.min(slotsLeft, slotsTotal))
  const taken = slotsTotal - left
  return (
    <div className="rounded-card border border-sand-300 bg-white p-5">
      <p className="font-semibold">{t('launch30.slots', { n: left, total: slotsTotal })}</p>
      {/* Open slots first in reading order, then taken ones; the legend names both. */}
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: slotsTotal }, (_, i) => (
          <span key={i} className={i < left ? 'h-2.5 flex-1 rounded-full bg-ignition-500' : 'h-2.5 flex-1 rounded-full bg-sand-300'} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-600" aria-hidden="true">
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-ignition-500" />
          {t('launch30.slotsOpen', { n: left })}
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-sand-300" />
          {t('launch30.slotsTaken', { n: taken })}
        </li>
      </ul>
      <p className="mt-3 text-sm text-ink-600">{t('launch30.slotsNote')}</p>
    </div>
  )
}
