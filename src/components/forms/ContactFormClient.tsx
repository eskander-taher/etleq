'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Send } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input, Textarea } from '@/components/ui/form'
import { getAttribution } from '@/lib/attribution'
import { contactSchema, DEFAULT_DIAL_CODE, HONEYPOT_FIELD, type ContactData, type ContactInput } from '@/lib/validation'
import { submitContact, type ActionError } from '@/actions/leads'
import { ConsentFields, EmailField, FormAlert, NameField, PhoneField, applyServerErrors } from './fields'
import { Honeypot } from './Honeypot'
import { useTurnstile } from './Turnstile'
import { createEventId, queueEvents } from './pending-event'

export function ContactFormClient({ locale, turnstileSiteKey }: { locale: 'ar' | 'en'; turnstileSiteKey: string | null }) {
  const t = useTranslations('forms')
  const router = useRouter()
  const [formError, setFormError] = useState<ActionError | null>(null)
  const [honeypot, setHoneypot] = useState('')
  const { ref: turnstileRef, token: turnstileToken, reset: resetTurnstile } = useTurnstile(turnstileSiteKey, locale)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput, unknown, ContactData>({
    resolver: zodResolver(contactSchema(locale)),
    defaultValues: { name: '', phoneCountry: DEFAULT_DIAL_CODE, phone: '', email: '', company: '', message: '', consent: false as unknown as true, marketing: false },
    mode: 'onTouched',
  })

  const onSubmit = handleSubmit(async (data) => {
    setFormError(null)
    const eventId = createEventId()
    const res = await submitContact({ locale, data, turnstileToken, [HONEYPOT_FIELD]: honeypot, attribution: getAttribution(), eventId })
    if (!res.ok) {
      applyServerErrors(res.fieldErrors, setError as never)
      setFormError(res.error === 'invalid' && res.fieldErrors ? 'invalid' : res.error)
      resetTurnstile()
      return
    }
    queueEvents([{ name: 'generate_lead', params: { source: 'contact', event_id: eventId } }])
    router.push('/thank-you/contact')
  })

  return (
    <form onSubmit={onSubmit} noValidate className="relative flex flex-col gap-5" aria-busy={isSubmitting}>
      <NameField register={register} errors={errors} />
      <PhoneField register={register} errors={errors} />
      <EmailField register={register} errors={errors} optional />
      <Field label={t('fields.company')} error={errors.company?.message}>
        <Input autoComplete="organization" dir="auto" {...register('company')} />
      </Field>
      <Field label={t('fields.message')} error={errors.message?.message} required>
        <Textarea rows={5} placeholder={t('fields.messagePlaceholder')} {...register('message')} />
      </Field>
      <ConsentFields register={register} errors={errors} />
      <Honeypot label={t('fields.honeypot')} value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      <div ref={turnstileRef} />
      <FormAlert error={formError} />
      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" disabled={isSubmitting} className="sm:self-start">
          <Send className="size-5 rtl:rotate-180" aria-hidden="true" />
          {isSubmitting ? t('contact.submitting') : t('contact.submit')}
        </Button>
        <p className="text-sm text-stone-500">{t('contact.note')}</p>
      </div>
    </form>
  )
}
