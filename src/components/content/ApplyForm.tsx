'use client'

import { useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { AlertCircle, FileText, Send } from 'lucide-react'
import { Link, useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/form'
import { EmailField, NameField, PhoneField } from '@/components/forms/fields'
import { Honeypot } from '@/components/forms/Honeypot'
import { useTurnstile } from '@/components/forms/Turnstile'
import { createEventId, queueEvents } from '@/components/forms/pending-event'
import { DEFAULT_DIAL_CODE } from '@/lib/validation/phone'
import {
  CV_MIME,
  applicationSchema,
  checkCvFile,
  type ApplicationData,
  type ApplicationInput,
} from '@/lib/validation/application'
import { submitApplication, type ApplyError } from '@/actions/apply'

/**
 * Apply form on the job page (brief section 8): name, email, phone (+966 default, E.164), CV (PDF, max 4 MB),
 * LinkedIn, portfolio/GitHub, role questions, PDPL consent, honeypot and Turnstile.
 */
export function ApplyForm({
  locale,
  jobSlug,
  questions,
  turnstileSiteKey,
}: {
  locale: 'ar' | 'en'
  jobSlug: string
  questions: string[]
  turnstileSiteKey: string | null
}) {
  const t = useTranslations('careers')
  const router = useRouter()
  const { ref: turnstileRef, token: turnstileToken, reset: resetTurnstile } = useTurnstile(turnstileSiteKey, locale)
  const [cv, setCv] = useState<File | null>(null)
  const [cvError, setCvError] = useState<string | null>(null)
  const [formError, setFormError] = useState<ApplyError | null>(null)
  const [honeypot, setHoneypot] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationInput, unknown, ApplicationData>({
    resolver: zodResolver(applicationSchema(locale, questions.length)),
    defaultValues: {
      name: '',
      email: '',
      phoneCountry: DEFAULT_DIAL_CODE,
      phone: '',
      linkedin: '',
      portfolio: '',
      answers: questions.map(() => ''),
      consent: false as unknown as true,
    },
    mode: 'onTouched',
  })

  const onCvChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    const problem = checkCvFile(file, locale)
    setCvError(problem)
    setCv(problem ? null : file)
    if (problem) e.target.value = ''
  }

  const onSubmit = handleSubmit(
    async (data) => {
      setFormError(null)
      const problem = checkCvFile(cv, locale)
      if (problem || !cv) {
        setCvError(problem)
        return
      }
      const fd = new FormData()
      fd.set('locale', locale)
      fd.set('jobSlug', jobSlug)
      fd.set('name', data.name)
      fd.set('email', data.email)
      fd.set('phoneCountry', data.phoneCountry)
      fd.set('phone', data.phone)
      fd.set('linkedin', data.linkedin)
      fd.set('portfolio', data.portfolio)
      fd.set('answers', JSON.stringify(data.answers))
      fd.set('consent', 'true')
      fd.set('website', honeypot)
      if (turnstileToken) fd.set('turnstileToken', turnstileToken)
      fd.set('cv', cv)

      const res = await submitApplication(fd).catch(() => ({ ok: false as const, error: 'server' as const }))
      if (!res.ok) {
        const fieldErrors = 'fieldErrors' in res ? res.fieldErrors : undefined
        for (const [name, message] of Object.entries(fieldErrors ?? {})) {
          if (name === 'cv') setCvError(message)
          else setError(name as never, { type: 'server', message })
        }
        setFormError(res.error)
        resetTurnstile()
        return
      }
      // Fired once on the confirmation page (same pattern as the lead forms).
      queueEvents([{ name: 'job_apply_submit', params: { job_slug: jobSlug, event_id: createEventId() } }])
      router.push('/thank-you/application')
    },
    () => {
      if (!cv) setCvError(checkCvFile(cv, locale))
    },
  )

  const answerError = (i: number) => {
    const e = (errors.answers as unknown as Record<number, { message?: string }> | undefined)?.[i]
    return e?.message
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-5" aria-busy={isSubmitting}>
      <NameField register={register} errors={errors} />
      <EmailField register={register} errors={errors} />
      <PhoneField register={register} errors={errors} label={t('form.phone')} />

      <Field label={t('form.cv')} hint={t('form.cvHint')} error={cvError ?? undefined} required>
        <div className="flex flex-col gap-2">
          <Input type="file" accept={`${CV_MIME},.pdf`} onChange={onCvChange} className="py-2.5 file:me-3 file:rounded-[8px] file:border-0 file:bg-sand-100 file:px-3 file:py-1.5 file:font-semibold" />
          {cv && (
            <p className="flex items-center gap-2 text-sm text-ink-600">
              <FileText aria-hidden className="size-4" />
              <bdi>{cv.name}</bdi>
            </p>
          )}
        </div>
      </Field>

      <Field label={t('form.linkedin')} error={errors.linkedin?.message} optionalLabel={t('form.optional')}>
        <Input type="url" inputMode="url" autoComplete="url" placeholder="https://www.linkedin.com/in/…" {...register('linkedin')} />
      </Field>
      <Field label={t('form.portfolio')} error={errors.portfolio?.message} optionalLabel={t('form.optional')}>
        <Input type="url" inputMode="url" placeholder="https://github.com/…" {...register('portfolio')} />
      </Field>

      {questions.map((q, i) => (
        <Field key={i} label={q} error={answerError(i)} required>
          <Textarea rows={4} {...register(`answers.${i}` as const)} />
        </Field>
      ))}

      <div>
        <Checkbox
          {...register('consent')}
          aria-required
          aria-invalid={errors.consent ? true : undefined}
          aria-describedby={errors.consent ? 'apply-consent-error' : undefined}
          label={t.rich('form.consent', {
            privacy: (chunks) => (
              <Link href="/privacy" className="font-semibold underline underline-offset-2" target="_blank">
                {chunks}
              </Link>
            ),
          })}
        />
        <p id="apply-consent-error" aria-live="polite" className="mt-1 text-sm font-medium text-[#B42318] empty:hidden">
          {errors.consent?.message}
        </p>
      </div>

      <Honeypot label={t('form.honeypot')} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      <div ref={turnstileRef} />

      <div role="alert" aria-live="assertive" className="empty:hidden">
        {formError ? (
          <p className="flex items-start gap-2 rounded-[12px] border border-[#B42318] bg-white p-3 text-sm font-medium text-[#B42318]">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t(`errors.${formError}`)}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting} className="sm:self-start">
          <Send className="size-5 rtl:rotate-180" aria-hidden="true" />
          {isSubmitting ? t('form.submitting') : t('form.submit')}
        </Button>
        <p className="text-sm text-stone-500">{t('form.note')}</p>
      </div>
    </form>
  )
}
