'use client'

import { useTranslations } from 'next-intl'
import { useWatch, type Control, type FieldErrors, type UseFormRegister, type FieldValues, type Path } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Checkbox, Field, Input, Select, useField } from '@/components/ui/form'
import { DEFAULT_DIAL_CODE, DIAL_CODES, flagEmoji, mobileExample } from '@/lib/validation/phone'
import { trackEvent } from '@/lib/analytics'
import type { ActionError } from '@/actions/leads'

const errorOf = (errors: FieldErrors, name: string) => {
  const e = errors[name]
  return typeof e?.message === 'string' ? e.message : undefined
}

/**
 * Country code picker (default +966) + national number. Validated to E.164 by the shared schema.
 * Pass `control` so the placeholder and hint follow the chosen dial code.
 */
export function PhoneField<T extends FieldValues>({
  register,
  errors,
  label,
  control,
}: {
  register: UseFormRegister<T>
  errors: FieldErrors<T>
  label?: string
  control?: Control<T>
}) {
  return control ? <WatchedPhoneField register={register} errors={errors} label={label} control={control} /> : <PhoneFieldView register={register} errors={errors} label={label} dialCode={DEFAULT_DIAL_CODE} />
}

function WatchedPhoneField<T extends FieldValues>({ control, ...props }: { register: UseFormRegister<T>; errors: FieldErrors<T>; label?: string; control: Control<T> }) {
  const dialCode = useWatch({ control, name: 'phoneCountry' as Path<T> }) as string | undefined
  return <PhoneFieldView {...props} dialCode={dialCode || DEFAULT_DIAL_CODE} />
}

function PhoneFieldView<T extends FieldValues>({ register, errors, label, dialCode }: { register: UseFormRegister<T>; errors: FieldErrors<T>; label?: string; dialCode: string }) {
  const t = useTranslations('forms')
  const error = errorOf(errors, 'phone')
  const example = mobileExample(dialCode)
  return (
    <Field label={label ?? t('fields.phone')} hint={t('fields.phoneHint', { example })} error={error} required>
      <PhoneInputs register={register} countryLabel={t('fields.phoneCountry')} dialCode={dialCode} example={example} />
    </Field>
  )
}

function PhoneInputs<T extends FieldValues>({ register, countryLabel, dialCode, example }: { register: UseFormRegister<T>; countryLabel: string; dialCode: string; example: string }) {
  const t = useTranslations('forms')
  const field = useField()
  const selected = DIAL_CODES.find((d) => d.code === dialCode) ?? DIAL_CODES[0]
  return (
    // Phone numbers read left to right in both languages: country code first.
    <div dir="ltr" className="flex gap-2">
      {/* The closed select shows a compact flag + code; the open list keeps full country names. */}
      <div className="relative w-28 shrink-0">
        <Select
          aria-label={countryLabel}
          id={field ? `${field.id}-cc` : undefined}
          autoComplete="tel-country-code"
          className="text-transparent [&>option]:text-ink-950"
          {...register('phoneCountry' as Path<T>)}
        >
          {DIAL_CODES.map((d) => (
            <option key={d.iso} value={d.code}>
              {`${t(`countries.${d.iso}`)} (+${d.code})`}
            </option>
          ))}
        </Select>
        <span aria-hidden="true" className="num pointer-events-none absolute inset-y-0 start-4 flex items-center gap-1.5 text-ink-950">
          <span>{flagEmoji(selected.iso)}</span>
          <span>+{selected.code}</span>
        </span>
      </div>
      <Input type="tel" inputMode="tel" autoComplete="tel-national" placeholder={example} className="flex-1" {...register('phone' as Path<T>)} />
    </div>
  )
}

export function NameField<T extends FieldValues>({ register, errors }: { register: UseFormRegister<T>; errors: FieldErrors<T> }) {
  const t = useTranslations('forms')
  return (
    <Field label={t('fields.name')} error={errorOf(errors, 'name')} required>
      <Input autoComplete="name" dir="auto" {...register('name' as Path<T>)} />
    </Field>
  )
}

export function EmailField<T extends FieldValues>({ register, errors, optional }: { register: UseFormRegister<T>; errors: FieldErrors<T>; optional?: boolean }) {
  const t = useTranslations('forms')
  return (
    <Field label={optional ? t('fields.emailOptional') : t('fields.email')} error={errorOf(errors, 'email')} required={!optional}>
      <Input type="email" inputMode="email" autoComplete="email" spellCheck={false} {...register('email' as Path<T>)} />
    </Field>
  )
}

/** Required privacy consent + the separate, unticked marketing opt-in. */
export function ConsentFields<T extends FieldValues>({
  register,
  errors,
  consentKey = 'fields.consent',
  marketing = true,
}: {
  register: UseFormRegister<T>
  errors: FieldErrors<T>
  consentKey?: 'fields.consent' | 'newsletter.consent' | 'playbook.consent'
  marketing?: boolean
}) {
  const t = useTranslations('forms')
  const error = errorOf(errors, 'consent')
  const errorId = `consent-error-${consentKey.replace('.', '-')}`
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Checkbox
          {...register('consent' as Path<T>)}
          aria-required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          label={t.rich(consentKey, {
            privacy: (chunks) => (
              <Link href="/privacy" className="font-semibold underline underline-offset-2" target="_blank">
                {chunks}
              </Link>
            ),
          })}
        />
        <p id={errorId} aria-live="polite" className="mt-1 text-sm font-medium text-[#B42318] empty:hidden">
          {error}
        </p>
      </div>
      {marketing ? <Checkbox {...register('marketing' as Path<T>)} label={t('fields.marketing')} /> : null}
    </div>
  )
}

/** Form-level error, announced politely. A spam (verification) error offers WhatsApp instead when `whatsapp` is given. */
export function FormAlert({
  error,
  whatsapp,
}: {
  error: ActionError | null
  /** `errorKey` picks the spam wording that matches the link (answers vs. a message). */
  whatsapp?: { href: string; label: string; refCode?: string; errorKey?: 'spam' | 'spamContact' } | null
}) {
  const t = useTranslations('forms')
  const key = error === 'spam' ? (whatsapp ? (whatsapp.errorKey ?? 'spam') : 'spamRetry') : error
  return (
    <div role="alert" aria-live="assertive" className="empty:hidden">
      {error ? (
        <div className="flex items-start gap-2 rounded-button border border-[#B42318] bg-white p-3 text-sm font-medium text-[#B42318]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            {t(`errors.${key}`)}
            {error === 'spam' && whatsapp ? (
              <>
                {' '}
                <a
                  href={whatsapp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent('whatsapp_click', { location: 'form_error', ref_code: whatsapp.refCode })}
                  className="font-semibold text-ink-950 underline underline-offset-2"
                >
                  {whatsapp.label}
                </a>
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </div>
  )
}

/** form_error for each invalid field (field names and error types only, never values). */
export function trackFormErrors(form: string, errors: Record<string, { type?: unknown } | string | undefined>) {
  for (const [field, e] of Object.entries(errors).slice(0, 6)) {
    trackEvent('form_error', { form, field, error: typeof e === 'string' ? e : String(e?.type ?? 'invalid') })
  }
}

/** Maps server field errors (already localized) into react-hook-form. */
export function applyServerErrors(fieldErrors: Record<string, string> | undefined, setError: (name: never, e: { type: string; message: string }) => void) {
  for (const [name, message] of Object.entries(fieldErrors ?? {})) {
    setError(name as never, { type: 'server', message })
  }
}
