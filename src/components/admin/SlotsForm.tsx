'use client'

import { useActionState } from 'react'

import { updateSlots } from '@/app/admin/actions'

const input =
  'w-20 rounded-lg border border-sand-300 bg-white px-3 py-2 text-center text-base font-semibold focus:border-ink-600 focus:outline-none'

/** Dashboard shortcut for the "slots left this month" counter. */
export function SlotsForm({ left, total }: { left: number; total: number }) {
  const [state, action, pending] = useActionState(updateSlots, null)
  return (
    <form action={action} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <input name="slotsLeft" type="number" min={0} inputMode="numeric" defaultValue={left} aria-label="Slots left" className={input} />
        <span>left of</span>
        <input name="slotsTotal" type="number" min={0} inputMode="numeric" defaultValue={total} aria-label="Slots this month" className={input} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-ink-950 px-3 py-2 text-sm font-semibold text-sand-50 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Update'}
        </button>
      </div>
      {state?.ok && <p className="text-xs font-medium text-verified-600">Updated. The site shows the new numbers.</p>}
      {state && !state.ok && <p className="text-xs text-[#B42318]">{state.errors[0]?.message}</p>}
    </form>
  )
}
