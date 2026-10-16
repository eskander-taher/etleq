'use client'

import { useTranslations } from 'next-intl'
import type { FieldErrors, UseFormRegister, FieldValues, Path } from 'react-hook-form'
import { AlertCircle } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { Checkbox, Field, Input, Select, useField } from '@/components/ui/form'
import { DIAL_CODES } from '@/lib/validation/phone'
import type { ActionError } from '@/actions/leads'

const errorOf = (errors: FieldErrors, name: string) => {
  const e = errors[name]
  return typeof e?.message === 'string' ? e.message : undefined
}

/** Country code picker (default +966) + national number. Validated to E.164 by the shared schema. */
export function PhoneField<T extends FieldValues>({ register, errors, label }: { register: UseFormRegister<T>; errors: FieldErrors<T>; label?: string }) {
  const t = useTranslations('forms')
  const error = errorOf(errors, 'phone')
  return (
    <Field label={label ?? t('fields.phone')} hint={t('fields.phoneHint')} error={error} required>
      <PhoneInputs register={register} countryLabel={t('fields.phoneCountry')} />
    </Field>
  )
}

function PhoneInputs<T extends FieldValues>({ register, countryLabel }: { register: UseFormRegister<T>; countryLabel: string }) {
  const t = useTranslations('forms')
  const field = useField()
  return (
    // Phone numbers read left to right in both languages: country code first.
    <div dir="ltr" className="flex gap-2">
      <div className="w-32 shrink-0">
        <Select aria-label={countryLabel} id={field ? `${field.id}-cc` : undefined} autoComplete="tel-country-code" {...register('phoneCountry' as Path<T>)}>
          {DIAL_CODES.map((d) => (
            <option key={d.iso} value={d.code}>
              {`+${d.code} ${t(`countries.${d.iso}`)}`}
            </option>
          ))}
        </Select>
      </div>
      <Input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="5X XXX XXXX" className="flex-1" {...register('phone' as Path<T>)} />
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

/** Form-level error, announced politely. */
export function FormAlert({ error }: { error: ActionError | null }) {
  const t = useTranslations('forms')
  return (
    <div role="alert" aria-live="assertive" className="empty:hidden">
      {error ? (
        <p className="flex items-start gap-2 rounded-button border border-[#B42318] bg-white p-3 text-sm font-medium text-[#B42318]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t(`errors.${error}`)}
        </p>
      ) : null}
    </div>
  )
}

/** Maps server field errors (already localized) into react-hook-form. */
export function applyServerErrors(fieldErrors: Record<string, string> | undefined, setError: (name: never, e: { type: string; message: string }) => void) {
  for (const [name, message] of Object.entries(fieldErrors ?? {})) {
    setError(name as never, { type: 'server', message })
  }
}
