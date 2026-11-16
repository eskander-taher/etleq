'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { pick } from './content'
import { AuditIntake } from './AuditIntake'
import { trackEvent } from '@/lib/analytics'
import { closeAuditDialog } from './dialog'
import { useHydrated } from './useHydrated'

/** Native dialog provides Escape, focus trapping and focus restoration; the link works without JS. */
export function HomeActions({ locale, turnstileSiteKey }: { locale: 'ar' | 'en'; turnstileSiteKey: string | null }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const heading = useId()
  const [initialized, setInitialized] = useState(false)
  const hydrated = useHydrated()
  const ready = hydrated && typeof HTMLDialogElement !== 'undefined' && 'showModal' in HTMLDialogElement.prototype
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  return (
    <>
      <div className="eng-actions">
        {ready ? (
          <button
            type="button"
            className="eng-button eng-primary-action"
            aria-haspopup="dialog"
            onClick={() => {
              setInitialized(true)
              dialog.current?.showModal()
              trackEvent('cta_click', { location: 'home', destination: 'audit_dialog' })
            }}
          >
            {t('Get the audit — SAR 750', 'اطلب الفحص — 750 ريال')}
            <ArrowUpRight size={19} className="eng-arrow" />
          </button>
        ) : (
          <Link href="/audit#start" className="eng-button eng-primary-action">
            {t('Get the audit — SAR 750', 'اطلب الفحص — 750 ريال')}
            <ArrowUpRight size={19} className="eng-arrow" />
          </Link>
        )}
        <Link
          href="/contact"
          className="eng-button eng-secondary"
          onClick={() => trackEvent('cta_click', { location: 'home', destination: 'contact' })}
        >
          {t('Book a free call', 'احجز مكالمة مجانية')}
        </Link>
      </div>
      <dialog
        ref={dialog}
        {...{ closedby: 'any' }}
        onCancel={(event) => {
          event.preventDefault()
          void closeAuditDialog(event.currentTarget)
        }}
        className="audit-dialog"
        aria-labelledby={heading}
        onClick={(event) => {
          if (!('closedBy' in HTMLDialogElement.prototype) && event.target === event.currentTarget) {
            const r = event.currentTarget.getBoundingClientRect()
            if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom)
              void closeAuditDialog(event.currentTarget)
          }
        }}
      >
        <div className="audit-dialog-top">
          <span className="audit-overline">{t('YOUR NEXT STEP', 'خطوتك التالية')}</span>
          <button
            type="button"
            className="audit-dialog-close"
            onClick={() => void closeAuditDialog(dialog.current)}
            aria-label={t('Close audit request', 'إغلاق طلب الفحص')}
          >
            <X size={22} />
          </button>
        </div>
        <h2 id={heading}>{t('Let’s make your app launch-ready.', 'لنجهز تطبيقك للإطلاق.')}</h2>
        <p className="audit-dialog-price">
          {t('SAR 750 + VAT · SAR 862.50 including 15% VAT', '750 ريال + الضريبة · 862.50 ريال شامل ضريبة 15%')}
        </p>
        <p className="eng-note">
          {t(
            'Send your request. We will confirm scope, secure access and payment. No payment is taken here; the 48-hour review starts after payment and complete access.',
            'أرسل طلبك لنؤكد النطاق والوصول الآمن والدفع. لا يخصم مبلغ هنا؛ تبدأ مهلة الـ48 ساعة بعد الدفع واكتمال الوصول.',
          )}
        </p>
        {initialized && <AuditIntake locale={locale} turnstileSiteKey={turnstileSiteKey} />}
      </dialog>
    </>
  )
}

export function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector('.eng-home')
    if (!root || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return
    const elements = root.querySelectorAll('.eng-section, .eng-final')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('eng-revealed')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.08 },
    )
    elements.forEach((el) => {
      el.classList.add('eng-reveal')
      observer.observe(el)
    })
    return () => {
      observer.disconnect()
      elements.forEach((el) => el.classList.remove('eng-reveal', 'eng-revealed'))
    }
  }, [])
  return null
}
