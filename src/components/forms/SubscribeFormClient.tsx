'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/form'
import { cn } from '@/lib/utils'
import { getAttribution } from '@/lib/attribution'
import { HONEYPOT_FIELD, subscribeSchema, type SubscribeData, type SubscribeInput } from '@/lib/validation'
import { submitSubscribe, type ActionError } from '@/actions/leads'
import { ConsentFields, FormAlert, applyServerErrors, trackFormErrors } from './fields'
import { Honeypot } from './Honeypot'
import { useTurnstile } from './Turnstile'
import { createEventId, queueEvents } from './pending-event'

export function SubscribeFormClient({
  locale,
  source,
  compact,
  tone,
  turnstileSiteKey,
}: {
  locale: 'ar' | 'en'
  source: 'newsletter' | 'playbook'
  compact: boolean
  tone: 'light' | 'dark'
  turnstileSiteKey: string | null
}) {
  const t = useTranslations('forms')
  const router = useRouter()
  const [formError, setFormError] = useState<ActionError | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const [verifying, setVerifying] = useState(false)
  const { ref: turnstileRef, reset: resetTurnstile, waitForToken, enabled: turnstileOn } = useTurnstile(turnstileSiteKey, locale)
  const ns = source === 'playbook' ? 'playbook' : 'newsletter'

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SubscribeInput, unknown, SubscribeData>({
    resolver: zodResolver(subscribeSchema(locale)),
    defaultValues: { email: '', consent: false as unknown as true, source },
    mode: 'onTouched',
  })

  const onSubmit = handleSubmit(
    async (data) => {
      setFormError(null)
      setVerifying(true)
      const turnstileToken = await waitForToken()
      setVerifying(false)
      if (turnstileOn && !turnstileToken) {
        trackFormErrors(source, { _form: 'turnstile_timeout' })
        setFormError('spam')
        resetTurnstile()
        return
      }
      const eventId = createEventId()
      const res = await submitSubscribe({ locale, data: { ...data, source }, turnstileToken, [HONEYPOT_FIELD]: honeypot, attribution: getAttribution(), eventId })
      if (!res.ok) {
        trackFormErrors(source, res.fieldErrors ? Object.fromEntries(Object.keys(res.fieldErrors).map((k) => [k, `server_${res.error}`])) : { _form: res.error })
        applyServerErrors(res.fieldErrors, setError as never)
        setFormError(res.error)
        resetTurnstile()
        return
      }
      const page = typeof window !== 'undefined' ? window.location.pathname : ''
      queueEvents([{ name: source === 'playbook' ? 'playbook_download' : 'newsletter_signup', params: { source_page: page, event_id: eventId } }])
      router.push(`/thank-you/${source}`)
    },
    (invalid) => trackFormErrors(source, invalid),
  )

  return (
    <form onSubmit={onSubmit} noValidate className={cn('relative flex flex-col gap-4', tone === 'dark' && '[&_label]:text-sand-50')} aria-busy={isSubmitting}>
      <div className={cn('flex flex-col gap-3', compact && 'sm:flex-row sm:items-start')}>
        <Field label={t('fields.email')} error={errors.email?.message} required className="flex-1">
          <Input type="email" inputMode="email" autoComplete="email" spellCheck={false} {...register('email')} />
        </Field>
        <Button type="submit" disabled={isSubmitting} className={cn(compact && 'sm:mt-[1.85rem]')}>
          {verifying ? t('verifying') : isSubmitting ? t(`${ns}.submitting`) : t(`${ns}.submit`)}
        </Button>
      </div>
      <ConsentFields register={register} errors={errors} consentKey={`${ns}.consent`} marketing={false} />
      <Honeypot label={t('fields.honeypot')} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      <div ref={turnstileRef} />
      <FormAlert error={formError} />
    </form>
  )
}
