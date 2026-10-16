'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { PendingEvent } from '@/components/forms/pending-event'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/form'
import { trackEvent } from '@/lib/analytics'
import { getAttribution } from '@/lib/attribution'
import { cn } from '@/lib/utils'
import { DEFAULT_DIAL_CODE, HONEYPOT_FIELD, leadContactSchema, type LeadContact, type LeadContactInput } from '@/lib/validation'
import { submitScorecard, type ActionError } from '@/actions/leads'
import { ConsentFields, EmailField, FormAlert, NameField, PhoneField, applyServerErrors } from '@/components/forms/fields'
import { Honeypot } from '@/components/forms/Honeypot'
import { useTurnstile } from '@/components/forms/Turnstile'
import { createEventId, queueEvents } from '@/components/forms/pending-event'
import type { ResolvedQuestion } from './resolve'

const STORAGE_KEY = 'etleq_scorecard'

export function Scorecard({
  locale,
  questions,
  modelPrefill,
  turnstileSiteKey,
  sourcePage,
}: {
  locale: 'ar' | 'en'
  questions: ResolvedQuestion[]
  /** Model slug from ?model=…; the model question is stored but not shown. */
  modelPrefill?: string | null
  turnstileSiteKey: string | null
  sourcePage?: string | null
}) {
  const t = useTranslations('scorecard')
  const router = useRouter()

  const visible = useMemo(() => questions.filter((q) => !(q.type === 'model' && modelPrefill)), [questions, modelPrefill])
  const totalSteps = visible.length + 1 // + contact step
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const prefill: Record<string, string> = {}
    const modelQ = questions.find((q) => q.type === 'model')
    if (modelQ && modelPrefill) prefill[modelQ.key] = modelPrefill
    return prefill
  })
  const started = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)

  // Restore an unfinished scorecard in this tab (same model only).
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as { answers: Record<string, string>; step: number; model?: string | null } | null
      if (saved && (saved.model ?? null) === (modelPrefill ?? null)) {
        // Restoring from browser storage has to happen after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAnswers((a) => ({ ...saved.answers, ...a }))
        setStep(Math.min(saved.step, visible.length))
        started.current = Object.keys(saved.answers).length > (modelPrefill ? 1 : 0)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step, model: modelPrefill ?? null }))
    } catch {
      /* ignore */
    }
  }, [answers, step, modelPrefill])

  // Move focus to the new question so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  const current = visible[step]
  const isContact = step >= visible.length
  const progress = Math.round((step / totalSteps) * 100)

  function answer(key: string, value: string) {
    if (!started.current) {
      started.current = true
      trackEvent('scorecard_start', { source_page: sourcePage || undefined, model_slug: modelPrefill || answers.model || undefined })
    }
    setAnswers((a) => ({ ...a, [key]: value }))
  }

  function next() {
    if (!current) return
    trackEvent('scorecard_step', { step: step + 1, question_id: current.key })
    setStep((s) => Math.min(s + 1, visible.length))
  }

  const back = () => setStep((s) => Math.max(0, s - 1))
  const canContinue = current ? current.type === 'text' || Boolean(answers[current.key]) : false

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-sm font-medium text-ink-600">
          <span aria-live="polite">{isContact ? t('progressContact') : t('progress', { n: step + 1, total: visible.length })}</span>
          <span className="num" dir="ltr">
            {progress}%
          </span>
        </div>
        {/* Fills from the start edge, so it follows the reading direction. */}
        <div role="progressbar" aria-label={t('progressLabel')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="relative h-2 overflow-hidden rounded-full bg-sand-300">
          <div className="absolute inset-y-0 start-0 rounded-full bg-ignition-500 transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!isContact && current ? (
        <QuestionStep
          key={current.key}
          question={current}
          value={answers[current.key] ?? ''}
          headingRef={headingRef}
          onAnswer={(v) => answer(current.key, v)}
          onAdvance={next}
          optionalLabel={t('optional')}
        />
      ) : (
        <ContactStep
          locale={locale}
          headingRef={headingRef}
          answers={answers}
          turnstileSiteKey={turnstileSiteKey}
          onDone={(token) => {
            try {
              sessionStorage.removeItem(STORAGE_KEY)
            } catch {
              /* ignore */
            }
            router.push({ pathname: '/scorecard/result', query: { t: token } })
          }}
        />
      )}

      <div className="mt-8 flex items-center justify-between gap-4">
        {step > 0 ? (
          <Button type="button" variant="ghost" onClick={back}>
            <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden="true" />
            {t('back')}
          </Button>
        ) : (
          <span />
        )}
        {!isContact && current ? (
          <Button type="button" onClick={next} disabled={!canContinue}>
            {current.type === 'text' && !answers[current.key] ? t('skip') : t('next')}
            <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function QuestionStep({
  question,
  value,
  headingRef,
  onAnswer,
  onAdvance,
  optionalLabel,
}: {
  question: ResolvedQuestion
  value: string
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onAnswer: (v: string) => void
  onAdvance: () => void
  optionalLabel: string
}) {
  const id = `q-${question.key}`

  if (question.type === 'text') {
    return (
      <div>
        <h2 ref={headingRef} tabIndex={-1} id={`${id}-label`} className="text-display-3 font-bold outline-none">
          <label htmlFor={id}>{question.prompt}</label> <span className="text-base font-normal text-stone-500">({optionalLabel})</span>
        </h2>
        {question.hint ? (
          <p id={`${id}-hint`} className="mt-2 text-ink-600">
            {question.hint}
          </p>
        ) : null}
        <Textarea
          id={id}
          className="mt-6"
          rows={4}
          maxLength={1000}
          placeholder={question.placeholder}
          aria-describedby={question.hint ? `${id}-hint` : undefined}
          value={value}
          onChange={(e) => onAnswer(e.target.value)}
        />
      </div>
    )
  }

  return (
    <fieldset aria-labelledby={`${id}-label`}>
      <h2 ref={headingRef} tabIndex={-1} id={`${id}-label`} className="text-display-3 font-bold outline-none">
        {question.prompt}
      </h2>
      <div className="mt-6 grid gap-3">
        {question.options.map((o) => {
          const checked = value === o.value
          return (
            <label
              key={o.value}
              className={cn(
                'flex min-h-14 cursor-pointer items-center gap-3 rounded-button border bg-white px-4 py-3 text-start transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ignition-700',
                checked ? 'border-ink-950 bg-sand-100 font-semibold' : 'border-sand-300 hover:border-ink-600',
              )}
            >
              <input
                type="radio"
                name={question.key}
                value={o.value}
                checked={checked}
                onChange={() => onAnswer(o.value)}
                // Mouse/touch selection moves on; keyboard arrows only change the selection.
                onClick={(e) => {
                  if (e.detail > 0) window.setTimeout(onAdvance, 180)
                }}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-full border', checked ? 'border-ink-950 bg-ink-950 text-sand-50' : 'border-sand-300')}
              >
                {checked ? <Check className="size-4" /> : null}
              </span>
              <span dir="auto">{o.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function ContactStep({
  locale,
  headingRef,
  answers,
  turnstileSiteKey,
  onDone,
}: {
  locale: 'ar' | 'en'
  headingRef: React.RefObject<HTMLHeadingElement | null>
  answers: Record<string, string>
  turnstileSiteKey: string | null
  onDone: (token: string) => void
}) {
  const t = useTranslations('scorecard')
  const tf = useTranslations('forms')
  const [formError, setFormError] = useState<ActionError | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const { ref: turnstileRef, token: turnstileToken, reset: resetTurnstile } = useTurnstile(turnstileSiteKey, locale)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LeadContactInput, unknown, LeadContact>({
    resolver: zodResolver(leadContactSchema(locale)),
    defaultValues: { name: '', phoneCountry: DEFAULT_DIAL_CODE, phone: '', email: '', consent: false as unknown as true, marketing: false },
    mode: 'onTouched',
  })

  const onSubmit = handleSubmit(async (contact) => {
    setFormError(null)
    const eventId = createEventId()
    const res = await submitScorecard({
      locale,
      answers,
      contact,
      turnstileToken,
      [HONEYPOT_FIELD]: honeypot,
      attribution: getAttribution(),
      eventId,
    })
    if (!res.ok) {
      applyServerErrors(res.fieldErrors, setError as never)
      setFormError(res.error)
      resetTurnstile()
      return
    }
    const modelSlug = answers.model && answers.model !== 'other' ? answers.model : undefined
    const events: PendingEvent[] = [
      { name: 'scorecard_complete', params: { score: res.score, tier: res.tier } },
      { name: 'generate_lead', params: { source: 'scorecard', tier: res.tier, score: res.score, event_id: eventId } },
    ]
    if (res.tier === 'ready') events.push({ name: 'qualify_lead', params: { score: res.score, model_slug: modelSlug } })
    queueEvents(events)
    onDone(res.token)
  })

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-5" aria-busy={isSubmitting}>
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-display-3 font-bold outline-none">
          {t('contact.title')}
        </h2>
        <p className="mt-2 text-ink-600">{t('contact.reason')}</p>
      </div>
      <NameField register={register} errors={errors} />
      <PhoneField register={register} errors={errors} />
      <EmailField register={register} errors={errors} />
      <ConsentFields register={register} errors={errors} />
      <Honeypot label={tf('fields.honeypot')} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      <div ref={turnstileRef} />
      <FormAlert error={formError} />
      <Button type="submit" size="lg" disabled={isSubmitting} block>
        {isSubmitting ? t('contact.submitting') : t('contact.submit')}
      </Button>
    </form>
  )
}
