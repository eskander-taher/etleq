'use client'

import {
  createContext,
  useContext,
  useId,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type Ref,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/*
 * Form primitives (workstream C builds the forms with react-hook-form). <Field> owns the ids and
 * wires label, hint and error to the control through context: `aria-describedby`,
 * `aria-invalid` and `aria-required` are set automatically on Input/Textarea/Select/Checkbox.
 * React 19: `ref` is a regular prop, so `{...register('name')}` works directly.
 */

type FieldCtx = { id: string; hintId?: string; errorId?: string; invalid: boolean; required?: boolean }
const FieldContext = createContext<FieldCtx | null>(null)

export function useField() {
  return useContext(FieldContext)
}

function describedBy(ctx: FieldCtx | null, own?: string) {
  const ids = [own, ctx?.hintId, ctx?.invalid ? ctx?.errorId : undefined].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

export function Field({
  label,
  hint,
  error,
  required,
  optionalLabel,
  id: idProp,
  className,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  /** Error message (already localized). Rendered and announced when present. */
  error?: ReactNode
  required?: boolean
  /** e.g. «(اختياري)» / "(optional)" shown after non-required labels. */
  optionalLabel?: string
  id?: string
  className?: string
  children: ReactNode
}) {
  const auto = useId()
  const id = idProp || `f${auto.replace(/:/g, '')}`
  const ctx: FieldCtx = {
    id,
    hintId: hint ? `${id}-hint` : undefined,
    errorId: `${id}-error`,
    invalid: Boolean(error),
    required,
  }
  return (
    <FieldContext.Provider value={ctx}>
      <div className={cn('flex flex-col gap-1.5', className)}>
        <Label htmlFor={id}>
          {label}
          {!required && optionalLabel ? <span className="ms-1 font-normal text-stone-500">{optionalLabel}</span> : null}
        </Label>
        {hint ? (
          <p id={ctx.hintId} className="text-sm text-stone-500">
            {hint}
          </p>
        ) : null}
        {children}
        <FieldError id={ctx.errorId}>{error}</FieldError>
      </div>
    </FieldContext.Provider>
  )
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('text-[0.95rem] font-semibold text-ink-950', className)} {...props} />
}

/** Error text; the live region stays mounted so new messages are announced. */
export function FieldError({ id, children, className }: { id?: string; children?: ReactNode; className?: string }) {
  return (
    <p id={id} aria-live="polite" className={cn('text-sm font-medium text-[#B42318] empty:hidden', className)}>
      {children}
    </p>
  )
}

const control =
  'w-full min-h-12 rounded-button border border-sand-300 bg-white px-4 text-base text-ink-950 placeholder:text-stone-500 transition-colors duration-150 hover:border-ink-600 focus:border-ink-950 focus-visible:outline-3 focus-visible:outline-offset-1 aria-[invalid=true]:border-[#B42318] disabled:cursor-not-allowed disabled:bg-sand-100 disabled:text-stone-500'

const LTR_TYPES = new Set(['email', 'tel', 'url', 'number', 'password'])

export function Input({ className, id, type = 'text', dir, ...props }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  const ctx = useField()
  return (
    <input
      {...props}
      id={id ?? ctx?.id}
      type={type}
      // Emails, phones and URLs keep LTR order inside Arabic forms; free text follows its content.
      dir={dir ?? (LTR_TYPES.has(type) ? 'ltr' : 'auto')}
      aria-describedby={describedBy(ctx, props['aria-describedby'])}
      aria-invalid={ctx?.invalid || props['aria-invalid'] || undefined}
      aria-required={ctx?.required || props['aria-required'] || undefined}
      className={cn(control, LTR_TYPES.has(type) && 'rtl:text-end', className)}
    />
  )
}

export function Textarea({ className, id, dir, rows = 4, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const ctx = useField()
  return (
    <textarea
      {...props}
      id={id ?? ctx?.id}
      dir={dir ?? 'auto'}
      rows={rows}
      aria-describedby={describedBy(ctx, props['aria-describedby'])}
      aria-invalid={ctx?.invalid || props['aria-invalid'] || undefined}
      aria-required={ctx?.required || props['aria-required'] || undefined}
      className={cn(control, 'py-3 leading-relaxed', className)}
    />
  )
}

export function Select({ className, id, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  const ctx = useField()
  return (
    <div className="relative">
      <select
        {...props}
        id={id ?? ctx?.id}
        aria-describedby={describedBy(ctx, props['aria-describedby'])}
        aria-invalid={ctx?.invalid || props['aria-invalid'] || undefined}
        aria-required={ctx?.required || props['aria-required'] || undefined}
        className={cn(control, 'cursor-pointer appearance-none pe-11', className)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-4 top-1/2 size-5 -translate-y-1/2 text-stone-500" aria-hidden="true" />
    </div>
  )
}

/** Checkbox with its label to the start side; use inside or outside <Field>. */
export function Checkbox({
  className,
  id,
  label,
  description,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode; description?: ReactNode; ref?: Ref<HTMLInputElement> }) {
  const ctx = useField()
  const auto = useId()
  const cid = id ?? ctx?.id ?? `c${auto.replace(/:/g, '')}`
  const descId = description ? `${cid}-desc` : undefined
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        {...props}
        id={cid}
        type="checkbox"
        aria-describedby={describedBy(ctx, [descId, props['aria-describedby']].filter(Boolean).join(' ') || undefined)}
        aria-invalid={ctx?.invalid || props['aria-invalid'] || undefined}
        className="mt-1 size-5 shrink-0 cursor-pointer rounded border-sand-300 accent-ink-950"
      />
      <div>
        <label htmlFor={cid} className="cursor-pointer text-[0.95rem] text-ink-950">
          {label}
        </label>
        {description ? (
          <p id={descId} className="text-sm text-stone-500">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}
