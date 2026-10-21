'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, Check, RotateCcw, ShieldCheck } from 'lucide-react'
import type { PendingEvent } from '@/components/forms/pending-event'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/form'
import { trackEvent } from '@/lib/analytics'
import { getAttribution } from '@/lib/attribution'
import { hasConsent } from '@/lib/consent'
import { cn } from '@/lib/utils'
import { whatsappLink } from '@/lib/whatsapp'
import { DEFAULT_DIAL_CODE, HONEYPOT_FIELD, dialCodeForCountryAnswer, leadContactSchema, type LeadContact, type LeadContactInput } from '@/lib/validation'
import { submitScorecard, type ActionError } from '@/actions/leads'
import { ConsentFields, EmailField, FormAlert, NameField, PhoneField, applyServerErrors, trackFormErrors } from '@/components/forms/fields'
import { Honeypot } from '@/components/forms/Honeypot'
import { useTurnstile } from '@/components/forms/Turnstile'
import { createEventId, queueEvents } from '@/components/forms/pending-event'
import type { ResolvedQuestion } from './resolve'

// Progress is kept in localStorage for a week so a visitor who leaves can pick up where they stopped.
// Only answers are stored; contact details never leave memory until they are submitted.
const STORAGE_KEY = 'etleq_scorecard'
const SAVE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const ADVANCE_DELAY_MS = 180

interface Saved {
  answers: Record<string, string>
  step: number
  model: string | null
  savedAt: number
}

function readSaved(model: string | null): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Saved | null
    if (!saved || typeof saved.savedAt !== 'number' || Date.now() - saved.savedAt > SAVE_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return (saved.model ?? null) === model && saved.answers && typeof saved.answers === 'object' ? saved : null
  } catch {
    return null
  }
}

function clearSaved() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function Scorecard({
  locale,
  questions,
  modelPrefill,
  turnstileSiteKey,
  sourcePage,
  whatsappNumber,
  intro,
  title,
}: {
  locale: 'ar' | 'en'
  questions: ResolvedQuestion[]
  /** Model slug from ?model=…; the model question is stored but not shown. */
  modelPrefill?: string | null
  turnstileSiteKey: string | null
  sourcePage?: string | null
  /** For the WhatsApp fallback when verification fails. */
  whatsappNumber?: string | null
  /** Page introduction (with the page h1), shown above the first question only. */
  intro?: ReactNode
  /** Page h1 text, kept for screen readers once the intro is hidden. */
  title?: string
}) {
  const t = useTranslations('scorecard')
  const router = useRouter()

  const visible = useMemo(() => questions.filter((q) => !(q.type === 'model' && modelPrefill)), [questions, modelPrefill])
  const totalSteps = visible.length + 1 // + contact step
  const prefill = useMemo(() => {
    const p: Record<string, string> = {}
    const modelQ = questions.find((q) => q.type === 'model')
    if (modelQ && modelPrefill) p[modelQ.key] = modelPrefill
    return p
  }, [questions, modelPrefill])

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(prefill)
  const [resumable, setResumable] = useState<Saved | null>(null)
  /** Question the server said is unanswered (after a skipped step); shows a prompt on it. */
  const [missingKey, setMissingKey] = useState<string | null>(null)
  const started = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  // The step an advance may start from. Updated synchronously so a double tap, or a tap plus the
  // Next button, can never move two questions at once.
  const stepRef = useRef(0)
  const advanceTimer = useRef<number | null>(null)
  const contactViewed = useRef(false)
  /** Contact fields survive a jump back to a question. */
  const [contactDraft, setContactDraft] = useState<Partial<LeadContactInput> | null>(null)

  function goTo(n: number) {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    advanceTimer.current = null
    stepRef.current = n
    setStep(n)
  }

  // Offer to resume an unfinished scorecard (same model only, saved within 7 days).
  useEffect(() => {
    const saved = readSaved(modelPrefill ?? null)
    const progressed = saved && (saved.step > 0 || Object.keys(saved.answers).some((k) => !(k in prefill)))
    // Reading browser storage has to happen after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (progressed) setResumable(saved)
    return () => {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (resumable) return // don't overwrite saved progress before the visitor chooses
    const progressed = step > 0 || Object.keys(answers).some((k) => !(k in prefill))
    if (!progressed) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, step, model: modelPrefill ?? null, savedAt: Date.now() } satisfies Saved))
    } catch {
      /* ignore */
    }
  }, [answers, step, modelPrefill, prefill, resumable])

  // Move focus to the new question so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    headingRef.current?.focus()
  }, [step])

  function resume() {
    if (!resumable) return
    setAnswers({ ...resumable.answers, ...prefill })
    started.current = true
    setResumable(null)
    goTo(Math.min(Math.max(0, resumable.step), visible.length))
  }

  function restart() {
    clearSaved()
    setResumable(null)
    setAnswers(prefill)
    setContactDraft(null)
    started.current = false
    goTo(0)
  }

  const current = visible[step]
  const isContact = step >= visible.length
  // Starts above zero: the first question already counts as progress.
  const progress = Math.round(((step + 1) / (totalSteps + 1)) * 100)

  function answer(key: string, value: string) {
    if (!started.current) {
      started.current = true
      trackEvent('scorecard_start', { source_page: sourcePage || undefined, model_slug: modelPrefill || answers.model || undefined })
    }
    if (key === missingKey) setMissingKey(null)
    setAnswers((a) => ({ ...a, [key]: value }))
  }

  /** Moves on from question `from`; ignored when the scorecard has already left that question. */
  function next(from: number) {
    const q = visible[from]
    if (!q || stepRef.current !== from) return
    trackEvent('scorecard_step', { step: from + 1, question_id: q.key })
    goTo(Math.min(from + 1, visible.length))
  }

  /** Tap on an option: a short pause shows the selection, then the next question. */
  function scheduleAdvance(from: number) {
    if (advanceTimer.current !== null) return
    advanceTimer.current = window.setTimeout(() => {
      advanceTimer.current = null
      next(from)
    }, ADVANCE_DELAY_MS)
  }

  const back = () => goTo(Math.max(0, stepRef.current - 1))
  const canContinue = current ? current.type === 'text' || Boolean(answers[current.key]) : false

  if (resumable) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        {title ? <h1 className="sr-only">{title}</h1> : null}
        <div className="rounded-card border border-sand-300 bg-sand-100 p-6">
          <h2 ref={headingRef} tabIndex={-1} className="text-display-3 font-bold outline-none">
            {t('resume.title')}
          </h2>
          <p className="mt-2 text-ink-600">{t('resume.body')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" size="lg" onClick={resume}>
              {t('resume.continue')}
              <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
            </Button>
            <Button type="button" size="lg" variant="ghost" onClick={restart}>
              <RotateCcw className="size-5" aria-hidden="true" />
              {t('resume.restart')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      {step === 0 && intro ? <div className="mb-10">{intro}</div> : title ? <h1 className="sr-only">{title}</h1> : null}
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
          onAdvance={() => scheduleAdvance(step)}
          optionalLabel={t('optional')}
          missingNote={missingKey === current.key ? t('missingAnswer') : null}
        />
      ) : (
        <ContactStep
          locale={locale}
          headingRef={headingRef}
          answers={answers}
          questions={visible}
          turnstileSiteKey={turnstileSiteKey}
          whatsappNumber={whatsappNumber}
          initialValues={contactDraft}
          onLeave={setContactDraft}
          onView={() => {
            if (contactViewed.current) return
            contactViewed.current = true
            trackEvent('scorecard_contact_view', { model_slug: modelPrefill || answers.model || undefined })
          }}
          onMissingAnswer={(key) => {
            const i = visible.findIndex((q) => q.key === key)
            if (i < 0) return false
            setMissingKey(key)
            goTo(i)
            return true
          }}
          onDone={(token) => {
            clearSaved()
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
          <Button type="button" onClick={() => next(step)} disabled={!canContinue}>
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
  missingNote,
}: {
  question: ResolvedQuestion
  value: string
  headingRef: React.RefObject<HTMLHeadingElement | null>
  onAnswer: (v: string) => void
  onAdvance: () => void
  optionalLabel: string
  missingNote?: string | null
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
    <fieldset aria-labelledby={`${id}-label`} aria-describedby={missingNote ? `${id}-missing` : undefined}>
      <h2 ref={headingRef} tabIndex={-1} id={`${id}-label`} className="text-display-3 font-bold outline-none">
        {question.prompt}
      </h2>
      {missingNote ? (
        <p id={`${id}-missing`} role="alert" className="mt-3 text-sm font-medium text-[#B42318]">
          {missingNote}
        </p>
      ) : null}
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
                  if (e.detail > 0) onAdvance()
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

/** Plain-text answers for the WhatsApp fallback message. */
function answersSummary(questions: ResolvedQuestion[], answers: Record<string, string>) {
  return questions
    .map((q) => {
      const v = answers[q.key]
      if (!v) return null
      const label = q.options.find((o) => o.value === v)?.label ?? v.slice(0, 200)
      return `- ${q.prompt} ${label}`
    })
    .filter(Boolean)
    .join('\n')
}

function ContactStep({
  locale,
  headingRef,
  answers,
  questions,
  turnstileSiteKey,
  whatsappNumber,
  initialValues,
  onLeave,
  onView,
  onMissingAnswer,
  onDone,
}: {
  locale: 'ar' | 'en'
  headingRef: React.RefObject<HTMLHeadingElement | null>
  answers: Record<string, string>
  questions: ResolvedQuestion[]
  turnstileSiteKey: string | null
  whatsappNumber?: string | null
  initialValues: Partial<LeadContactInput> | null
  /** Receives the typed values when the step unmounts (going back to a question). */
  onLeave: (values: Partial<LeadContactInput>) => void
  onView: () => void
  /** Returns true when it moved back to the unanswered question. */
  onMissingAnswer: (key: string) => boolean
  onDone: (token: string) => void
}) {
  const t = useTranslations('scorecard')
  const tf = useTranslations('forms')
  const [formError, setFormError] = useState<ActionError | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const [verifying, setVerifying] = useState(false)
  const { ref: turnstileRef, reset: resetTurnstile, waitForToken, enabled: turnstileOn } = useTurnstile(turnstileSiteKey, locale)

  const {
    register,
    control,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LeadContactInput, unknown, LeadContact>({
    resolver: zodResolver(leadContactSchema(locale)),
    defaultValues: {
      name: '',
      phoneCountry: dialCodeForCountryAnswer(answers.country) ?? DEFAULT_DIAL_CODE,
      phone: '',
      email: '',
      consent: false as unknown as true,
      marketing: false,
      ...initialValues,
    },
    mode: 'onTouched',
  })

  useEffect(() => {
    onView()
    // Keep what was typed if the visitor goes back to a question.
    return () => {
      onLeave(getValues())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = handleSubmit(
    async (contact) => {
      setFormError(null)
      setVerifying(true)
      const turnstileToken = await waitForToken()
      setVerifying(false)
      if (turnstileOn && !turnstileToken) {
        trackFormErrors('scorecard', { _form: 'turnstile_timeout' })
        setFormError('spam')
        resetTurnstile()
        return
      }
      // One id per conversion event, shared with its server twin so ad platforms count it once.
      const eventIds = { generate_lead: createEventId(), qualify_lead: createEventId(), disqualify_lead: createEventId() }
      const res = await submitScorecard({
        locale,
        answers,
        contact: { ...contact, adConsent: hasConsent('marketing') },
        turnstileToken,
        [HONEYPOT_FIELD]: honeypot,
        attribution: getAttribution(),
        eventIds,
      })
      if (!res.ok) {
        const fieldErrs = res.fieldErrors ?? {}
        trackFormErrors('scorecard', Object.keys(fieldErrs).length ? Object.fromEntries(Object.keys(fieldErrs).map((k) => [k, `server_${res.error}`])) : { _form: res.error })
        resetTurnstile()
        // A skipped question (e.g. after a fast double tap): go back to it rather than blame the contact fields.
        const missing = questions.find((q) => q.key in fieldErrs)
        if (missing && onMissingAnswer(missing.key)) return
        const contactErrs = Object.fromEntries(Object.entries(fieldErrs).filter(([k]) => k in getValues()))
        applyServerErrors(contactErrs, setError as never)
        setFormError(res.error)
        return
      }
      const modelSlug = answers.model && answers.model !== 'other' ? answers.model : undefined
      const events: PendingEvent[] = [
        { name: 'scorecard_complete', params: { score: res.score, tier: res.tier } },
        { name: 'generate_lead', params: { source: 'scorecard', tier: res.tier, score: res.score, event_id: eventIds.generate_lead } },
      ]
      if (res.tier === 'ready') events.push({ name: 'qualify_lead', params: { score: res.score, model_slug: modelSlug, event_id: eventIds.qualify_lead } })
      if (res.disqualifiers.length) events.push({ name: 'disqualify_lead', params: { reason: res.disqualifiers.join(','), event_id: eventIds.disqualify_lead } })
      queueEvents(events)
      onDone(res.token)
    },
    (invalid) => trackFormErrors('scorecard', invalid),
  )

  const whatsapp = whatsappNumber
    ? {
        href: whatsappLink({ number: whatsappNumber, message: `${t('contact.whatsappAnswers')}\n${answersSummary(questions, answers)}`, ref: 'SC-VERIFY' }),
        label: t('contact.whatsappFallback'),
        refCode: 'SC-VERIFY',
      }
    : null

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-5" aria-busy={isSubmitting}>
      <div>
        <h2 ref={headingRef} tabIndex={-1} className="text-display-3 font-bold outline-none">
          {t('contact.title')}
        </h2>
        <p className="mt-2 text-ink-600">{t('contact.reason')}</p>
      </div>
      <NameField register={register} errors={errors} />
      <PhoneField register={register} errors={errors} control={control} />
      <EmailField register={register} errors={errors} />
      <ConsentFields register={register} errors={errors} />
      <Honeypot label={tf('fields.honeypot')} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      <div ref={turnstileRef} />
      <FormAlert error={formError} whatsapp={whatsapp} />
      <div className="flex flex-col gap-3">
        <Button type="submit" size="lg" disabled={isSubmitting} block>
          {verifying ? tf('verifying') : isSubmitting ? t('contact.submitting') : t('contact.submit')}
        </Button>
        <p className="flex items-start gap-2 text-sm text-stone-500">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('contact.reassurance')}
        </p>
      </div>
    </form>
  )
}
