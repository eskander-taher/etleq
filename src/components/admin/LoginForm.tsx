'use client'

import { useActionState } from 'react'

import { loginAction } from '@/app/admin/actions'

const input = 'mt-1 w-full rounded-lg border border-sand-300 px-3 py-2 focus:border-ink-600 focus:outline-none'

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null)
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block text-sm font-semibold">
        Email
        <input name="email" type="email" autoComplete="username" required dir="ltr" className={input} />
      </label>
      <label className="block text-sm font-semibold">
        Password
        <input name="password" type="password" autoComplete="current-password" required dir="ltr" className={input} />
      </label>
      {state?.message && (
        <p role="alert" className="text-sm text-[#B42318]">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-ink-950 px-4 py-2.5 font-semibold text-sand-50 disabled:opacity-60"
      >
        {pending ? 'Logging in…' : 'Log in'}
      </button>
    </form>
  )
}
