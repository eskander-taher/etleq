'use client'
import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { pick, services } from './content'

export function Actions({ locale, compact = false }: { locale: string; compact?: boolean }) {
  return (
    <div className="eng-actions">
      <Link
        className="eng-button"
        href="/audit#start"
        onClick={() => trackEvent('cta_click', { destination: 'audit', location: 'engineering' })}
      >
        {pick(
          locale,
          compact
            ? ['Audit · SAR 750', 'الفحص · 750 ريال']
            : ['Get the audit — SAR 750', 'اطلب الفحص التقني — 750 ريال'],
        )}
        <span aria-hidden="true" className="eng-arrow">
          ↗
        </span>
      </Link>
      <Link
        className="eng-button eng-secondary"
        href="/contact"
        onClick={() => trackEvent('cta_click', { destination: 'contact', location: 'engineering' })}
      >
        {pick(locale, ['Book a free call', 'احجز مكالمة مجانية'])}
      </Link>
    </div>
  )
}
export function PageEvent({ name }: { name: 'audit_page_view' | 'pricing_viewed' }) {
  useEffect(() => {
    trackEvent(name, {})
  }, [name])
  return null
}
export function PricingTable({ locale }: { locale: string }) {
  const [currency, setCurrency] = useState('SAR')
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  const factor = currency === 'USD' ? 1 / 3.75 : currency === 'AED' ? 3.6725 / 3.75 : 1
  const price = (amount: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 0 }).format(amount * factor)
  return (
    <>
      <PageEvent name="pricing_viewed" />
      <div className="eng-currency" role="group" aria-label={t('Display currency', 'عملة العرض')}>
        {['SAR', 'AED', 'USD'].map((c) => (
          <button type="button" key={c} aria-pressed={currency === c} onClick={() => setCurrency(c)}>
            {c}
          </button>
        ))}
      </div>
      <p className="eng-muted">
        {t(
          'Prices exclude VAT. AED / USD are indicative display conversions; quotes and billing are in SAR.',
          'الأسعار دون الضريبة. عرض الدرهم والدولار تقديري؛ عروض الأسعار والفواتير بالريال السعودي.',
        )}
      </p>
      <div className="eng-table-wrap">
        <table className="eng-table">
          <caption className="sr-only">
            {t('Services, prices and delivery timelines', 'الخدمات والأسعار ومدد التسليم')}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t('Service', 'الخدمة')}</th>
              <th scope="col">{t('Price', 'السعر')}</th>
              <th scope="col">{t('Timeline', 'المدة')}</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.slug}>
                <th scope="row">
                  <Link href={`/${s.slug}`}>{pick(locale, s.name)}</Link>
                </th>
                <td>
                  {s.price ? (
                    <>
                      <bdi>
                        {currency} {price(s.slug === 'app-finisher' ? 18000 : s.price)}
                      </bdi>
                      <small>
                        {s.slug === 'app-finisher'
                          ? t('per module · usually 2–4', 'للوحدة · غالبًا 2–4')
                          : pick(locale, s.priceNote)}
                      </small>
                    </>
                  ) : (
                    pick(locale, s.priceNote)
                  )}
                </td>
                <td>{pick(locale, s.timeline)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row">{t('Enterprise & government', 'الشركات والجهات الحكومية')}</th>
              <td>
                <bdi>
                  {currency} {price(28000)}
                </bdi>
                <small>{t('per module', 'للوحدة')}</small>
              </td>
              <td>{t('Per scope', 'حسب النطاق')}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="eng-note">
        {t(
          'Enterprise modules include bilingual documentation, on-site demos, in-country hosting requirements and security paperwork. Hosting provider charges are scoped separately.',
          'تشمل وحدات الجهات الكبيرة التوثيق باللغتين والعروض الحضورية ومتطلبات الاستضافة المحلية ومستندات الأمان. تحدد رسوم مزود الاستضافة بشكل مستقل.',
        )}
      </p>
    </>
  )
}
