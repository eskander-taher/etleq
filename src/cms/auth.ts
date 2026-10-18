import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { signToken, verifyPassword, verifyToken } from './auth-crypto'
import { getDb, idCandidates } from './db'
import { type CollectionConfig, type Role, ROLES } from './schema'

/**
 * Admin sessions: a signed, httpOnly cookie scoped to /admin holding the user
 * id and expiry. The user is re-read on every request, so deleting a user or
 * changing their role takes effect immediately.
 */

export const SESSION_COOKIE = 'etleq_admin'
const SESSION_HOURS = 8
const MAX_ATTEMPTS = 5
const LOCK_MS = 10 * 60 * 1000

export type AdminUser = { id: string; email: string; name: string; role: Role }

type Session = { uid: string; exp: number }

export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const session = verifyToken<Session>(token, 'admin-session')
  if (!session || session.exp < Date.now()) return null
  try {
    const db = await getDb()
    const user = await db.collection('users').findOne({ _id: { $in: idCandidates(session.uid) } } as never)
    if (!user || !ROLES.includes(user.role)) return null
    return {
      id: String(session.uid),
      email: String(user.email),
      name: String(user.name || user.email),
      role: user.role as Role,
    }
  } catch {
    return null
  }
})

/** The signed-in user, or a redirect to the login page. */
export async function requireAdminUser(): Promise<AdminUser> {
  const user = await getAdminUser()
  if (!user) redirect('/admin/login')
  return user
}

export const canRead = (user: AdminUser, config: CollectionConfig) => config.access.read.includes(user.role)
export const canWrite = (user: AdminUser, config: CollectionConfig) => config.access.write.includes(user.role)
export const canDelete = (user: AdminUser, config: CollectionConfig) => config.access.delete.includes(user.role)

/** Private files: recruiters only see CVs, editors only consent records. */
export function privateFileVisible(user: AdminUser, purpose: unknown): boolean {
  if (user.role === 'admin') return true
  if (user.role === 'recruiter') return purpose === 'cv'
  if (user.role === 'editor') return purpose === 'consent'
  return false
}

export type LoginResult = { ok: true } | { ok: false; message: string }

export async function login(emailInput: string, password: string): Promise<LoginResult> {
  const email = emailInput.trim().toLowerCase()
  const fail: LoginResult = { ok: false, message: 'Wrong email or password.' }
  if (!email || !password) return fail
  const db = await getDb()
  const users = db.collection('users')
  const user = await users.findOne({ email })
  if (!user) return fail
  const lockUntil = user.lockUntil ? new Date(user.lockUntil).getTime() : 0
  if (lockUntil > Date.now()) return { ok: false, message: 'Too many attempts. Try again in a few minutes.' }

  if (!(await verifyPassword(password, user.salt, user.hash))) {
    const attempts = (Number(user.loginAttempts) || 0) + 1
    await users.updateOne(
      { _id: user._id },
      {
        $set:
          attempts >= MAX_ATTEMPTS
            ? { loginAttempts: 0, lockUntil: new Date(Date.now() + LOCK_MS).toISOString() }
            : { loginAttempts: attempts },
      },
    )
    return fail
  }

  await users.updateOne({ _id: user._id }, { $set: { loginAttempts: 0, lockUntil: null } })
  const exp = Date.now() + SESSION_HOURS * 3600 * 1000
  ;(await cookies()).set(SESSION_COOKIE, signToken({ uid: String(user._id), exp } satisfies Session, 'admin-session'), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/admin',
    expires: new Date(exp),
  })
  return { ok: true }
}

export async function logout() {
  ;(await cookies()).delete({ name: SESSION_COOKIE, path: '/admin' })
}
