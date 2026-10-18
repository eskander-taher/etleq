import { redirect } from 'next/navigation'

import { getAdminUser } from '@/cms/auth'
import { LoginForm } from '@/components/admin/LoginForm'

export const metadata = { title: 'Log in' }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (await getAdminUser()) redirect('/admin')
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-sand-300 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-ignition-700">Etleq</p>
        <h1 className="mt-1 text-2xl font-bold">Admin login</h1>
        <LoginForm />
      </div>
    </main>
  )
}
