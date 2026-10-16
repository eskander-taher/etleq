import type { InputHTMLAttributes, Ref } from 'react'
import { HONEYPOT_FIELD } from '@/lib/validation/schemas'

/** Off-screen field that people never see; bots that fill it are rejected server-side. */
export function Honeypot({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <div aria-hidden="true" className="absolute -start-[10000px] top-auto size-px overflow-hidden">
      <label>
        {label}
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" {...props} />
      </label>
    </div>
  )
}
