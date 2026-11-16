'use client'
import { useId, useRef, useState, type FormEvent } from 'react'
import { submitContact } from '@/actions/leads'
import { useTurnstile } from '@/components/forms/Turnstile'
import { Honeypot } from '@/components/forms/Honeypot'
import { Link } from '@/i18n/navigation'
import { trackEvent } from '@/lib/analytics'
import { pick } from './content'
import { useHydrated } from './useHydrated'

export function AuditIntake({ locale, turnstileSiteKey }: { locale: 'ar' | 'en'; turnstileSiteKey: string | null }) {
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  const [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState(''),
    [honeypot, setHoneypot] = useState('')
  const started = useRef(false)
  const formRef = useRef<HTMLFormElement>(null)
  const prefix = useId()
  const ready = useHydrated()
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [announcement, setAnnouncement] = useState('')
  const field = (name: string) => ({
    id: `${prefix}-${name}`,
    'aria-invalid': Boolean(fieldErrors[name]),
    'aria-describedby': fieldErrors[name] ? `${prefix}-${name}-error` : undefined,
  })
  const feedback = (name: string) =>
    fieldErrors[name] ? (
      <span className="eng-field-error" id={`${prefix}-${name}-error`}>
        {fieldErrors[name]}
      </span>
    ) : null
  function validate(control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, announce = false) {
    const validity = control.validity
    const message = validity.valid
      ? ''
      : validity.valueMissing
        ? t('Please complete this required field.', 'يرجى إكمال هذا الحقل المطلوب.')
        : validity.typeMismatch
          ? control.type === 'email'
            ? t('Enter an email address such as name@company.com.', 'أدخل بريدًا إلكترونيًا مثل name@company.com.')
            : t('Enter a complete URL starting with https://.', 'أدخل رابطًا كاملًا يبدأ بـ https://.')
          : validity.tooShort
            ? t(
                `Enter at least ${'minLength' in control ? control.minLength : 10} characters.`,
                `أدخل ${'minLength' in control ? control.minLength : 10} أحرف على الأقل.`,
              )
            : t('Check this value and try again.', 'تحقق من هذه القيمة وحاول مجددًا.')
    setFieldErrors((previous) => ({ ...previous, [control.name]: message }))
    if (announce && message) setAnnouncement(message)
  }
  const { ref, waitForToken, reset, enabled } = useTurnstile(turnstileSiteKey, locale)
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setFieldErrors({})
    const form = new FormData(e.currentTarget)
    const value = (k: string) => String(form.get(k) || '').trim()
    try {
      const token = await waitForToken()
      if (enabled && !token) {
        setError(t('Verification expired. Please try again.', 'انتهت صلاحية التحقق. حاول مجددًا.'))
        return
      }
      const result = await submitContact({
        locale,
        turnstileToken: token,
        website: honeypot,
        data: {
          name: value('name'),
          email: value('email'),
          phoneCountry: '966',
          phone: value('phone'),
          company: value('company'),
          message: `Production Audit request | VAT: ${value('vat')} | App: ${value('url')} | Access preference: ${value('access')} | NDA: ${form.has('nda') ? 'yes' : 'no'} | ${value('description')}`,
          consent: true,
          marketing: false,
          adConsent: false,
        },
      })
      if (result.ok) {
        setSent(true)
        trackEvent('generate_lead', { source: 'production_audit_request' })
      } else {
        if (result.fieldErrors) {
          const mapped = Object.fromEntries(
            Object.entries(result.fieldErrors).map(([name, message]) => [
              name === 'message' ? 'description' : name,
              message,
            ]),
          )
          setFieldErrors(mapped)
          const first = formRef.current?.elements.namedItem(Object.keys(mapped)[0])
          if (first instanceof HTMLElement) first.focus()
        }
        setError(
          result.fieldErrors
            ? Object.values(result.fieldErrors).join(' ')
            : t(
                'We could not save your request. Please retry or book a call.',
                'تعذر حفظ طلبك. حاول مجددًا أو احجز مكالمة.',
              ),
        )
        reset()
      }
    } catch {
      setError(
        t(
          'Connection failed. Your request has not been confirmed. Please retry.',
          'تعذر الاتصال ولم يتأكد استلام طلبك. حاول مجددًا.',
        ),
      )
      reset()
    } finally {
      setBusy(false)
    }
  }
  if (sent)
    return (
      <div role="status" className="eng-card">
        <span className="eng-tag">{t('REQUEST RECEIVED', 'تم استلام الطلب')}</span>
        <h3 style={{ marginTop: 24 }}>
          {t('Thank you. We will confirm the next step.', 'شكرًا لك. سنتواصل لتأكيد الخطوة التالية.')}
        </h3>
        <p>
          {t(
            'Your request is saved. No payment has been taken and the audit has not started. We will arrange the scope, secure access and payment with you.',
            'تم حفظ طلبك. لم تدفع أي مبلغ ولم يبدأ الفحص. سنرتب معك النطاق والوصول الآمن والدفع.',
          )}
        </p>
        <Link className="eng-text-link" href="/contact">
          {t('Book a call', 'احجز مكالمة')}
        </Link>
      </div>
    )
  return (
    <form
      id="start"
      ref={formRef}
      method="post"
      className="eng-form"
      onInvalid={(event) => {
        const control = event.target
        if (
          control instanceof HTMLInputElement ||
          control instanceof HTMLTextAreaElement ||
          control instanceof HTMLSelectElement
        )
          validate(control)
      }}
      onBlur={(event) => {
        const control = event.target
        if (
          (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) &&
          (control.value || fieldErrors[control.name])
        )
          validate(control, true)
      }}
      onInput={(event) => {
        const control = event.target
        if (
          (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) &&
          fieldErrors[control.name] &&
          control.validity.valid
        ) {
          setFieldErrors((previous) => ({ ...previous, [control.name]: '' }))
          setAnnouncement('')
        }
      }}
      onSubmit={submit}
      aria-busy={busy}
      onFocus={() => {
        if (!started.current) {
          started.current = true
          trackEvent('audit_form_started', {})
        }
      }}
    >
      <p className="eng-micro">
        {t('All fields are required unless marked optional.', 'جميع الحقول مطلوبة ما لم يذكر أنها اختيارية.')}
      </p>
      <span className="sr-only" role="status">
        {announcement}
      </span>
      <noscript>
        <p>
          {t('Enable JavaScript to send this secure form, or ', 'فعّل JavaScript لإرسال النموذج الآمن، أو ')}
          <Link href="/contact">{t('contact us directly.', 'تواصل معنا مباشرة.')}</Link>
        </p>
      </noscript>
      <div className="eng-field">
        <label htmlFor={`${prefix}-name`}>
          {t('Full name', 'الاسم الكامل')}
          <input name="name" {...field('name')} required minLength={2} maxLength={80} autoComplete="name" />
        </label>
        {feedback('name')}
      </div>
      <div className="eng-field">
        <label htmlFor={`${prefix}-email`}>
          {t('Work email', 'البريد الإلكتروني للعمل')}
          <input
            name="email"
            {...field('email')}
            required
            type="email"
            maxLength={200}
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
          />
        </label>
        {feedback('email')}
      </div>
      <div className="eng-field">
        <label htmlFor={`${prefix}-phone`}>
          {t('WhatsApp number, including country code', 'رقم واتساب مع رمز الدولة')}
          <input
            name="phone"
            {...field('phone')}
            required
            type="tel"
            maxLength={32}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+966 5…"
            dir="ltr"
          />
        </label>
        {feedback('phone')}
      </div>
      <div className="eng-detail-grid">
        <div className="eng-field">
          <label htmlFor={`${prefix}-company`}>
            {t('Company (optional)', 'الشركة (اختياري)')}
            <input name="company" {...field('company')} maxLength={120} autoComplete="organization" />
          </label>
          {feedback('company')}
        </div>
        <div className="eng-field">
          <label htmlFor={`${prefix}-vat`}>
            {t('VAT number (optional)', 'الرقم الضريبي (اختياري)')}
            <input name="vat" {...field('vat')} autoCapitalize="none" spellCheck={false} maxLength={30} dir="ltr" />
          </label>
          {feedback('vat')}
        </div>
      </div>
      <div className="eng-field">
        <label htmlFor={`${prefix}-url`}>
          {t('App URL (optional for unfinished apps)', 'رابط التطبيق (اختياري لغير المكتمل)')}
          <input
            name="url"
            {...field('url')}
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={300}
            placeholder="https://"
            dir="ltr"
          />
        </label>
        {feedback('url')}
      </div>
      <div className="eng-field">
        <label htmlFor={`${prefix}-description`}>
          {t('What does it do and who uses it?', 'ماذا يفعل التطبيق ومن يستخدمه؟')}
          <textarea name="description" {...field('description')} required minLength={10} maxLength={1000} rows={4} />
        </label>
        {feedback('description')}
      </div>
      <div className="eng-field">
        <label htmlFor={`${prefix}-access`}>
          {t('Preferred secure access method', 'طريقة الوصول الآمن المفضلة')}
          <select name="access" {...field('access')}>
            <option value="read-only">
              {t('Arrange read-only repository access', 'ترتيب وصول للمستودع للقراءة فقط')}
            </option>
            <option value="secure-zip">{t('Arrange a secure ZIP transfer', 'ترتيب نقل ملف ZIP آمن')}</option>
            <option value="on-site">
              {t('Request on-site / self-hosted review', 'طلب فحص حضوري أو باستضافة داخلية')}
            </option>
          </select>
        </label>
        {feedback('access')}
      </div>
      <div className="eng-field">
        <label htmlFor={`${prefix}-nda`} className="eng-checkbox">
          <input type="checkbox" name="nda" {...field('nda')} />
          {t('Send me an NDA before I share code (optional).', 'أرسلوا اتفاقية سرية قبل مشاركة الكود (اختياري).')}
        </label>
        {feedback('nda')}
      </div>
      <div className="eng-field">
        <label htmlFor={`${prefix}-consent`} className="eng-checkbox">
          <input type="checkbox" name="consent" {...field('consent')} required />
          <span>
            {t('I agree to the', 'أوافق على')} <Link href="/audit-terms">{t('audit terms', 'شروط الفحص')}</Link>{' '}
            {t('and', 'و')} <Link href="/privacy">{t('privacy policy', 'سياسة الخصوصية')}</Link>.
          </span>
        </label>
        {feedback('consent')}
      </div>
      <Honeypot label="Website" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      <div ref={ref} />
      {error && (
        <p className="eng-alert" role="alert">
          {error}
        </p>
      )}
      <button className="eng-button" disabled={busy || !ready} type="submit">
        {busy ? t('Sending…', 'جارٍ الإرسال…') : t('Request the audit · SAR 750', 'اطلب الفحص · 750 ريال')}
      </button>
      <p className="eng-micro">
        {t(
          'No payment is taken by this form. Please do not send secrets or source code.',
          'لا يجمع النموذج أي دفعة. يرجى عدم إرسال أسرار أو كود برمجي.',
        )}
      </p>
    </form>
  )
}
