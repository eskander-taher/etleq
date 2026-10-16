import type { Access, FieldAccess, PayloadRequest, Where } from 'payload'

/**
 * Role-based access helpers.
 *
 * Roles (stored on the user and saved to the JWT):
 * - admin: everything
 * - editor: public content, media, consent files
 * - recruiter: jobs, applications and CV files only
 * - sales: leads and subscribers only
 *
 * Anonymous visitors only ever read published public content. Personal data
 * (leads, applications, subscribers, private files) is never readable without
 * the right role. Public forms write through server actions that use the
 * Local API with `overrideAccess`, so `create` stays closed here as well.
 */

export type Role = 'admin' | 'editor' | 'recruiter' | 'sales'

type MaybeUser = { role?: string | null } | null | undefined

export const roleOf = (user: MaybeUser): Role | null => {
  const role = user?.role
  return role === 'admin' || role === 'editor' || role === 'recruiter' || role === 'sales' ? role : null
}

export const hasRole = (user: MaybeUser, ...roles: Role[]): boolean => {
  const role = roleOf(user)
  return role !== null && roles.includes(role)
}

const userOf = (args: { req: PayloadRequest }) => args.req.user as MaybeUser

export const anyone: Access = () => true
export const nobody: Access = () => false

export const isLoggedIn: Access = (args) => Boolean(args.req.user)
export const isAdmin: Access = (args) => hasRole(userOf(args), 'admin')
export const isAdminOrEditor: Access = (args) => hasRole(userOf(args), 'admin', 'editor')
export const isAdminOrRecruiter: Access = (args) => hasRole(userOf(args), 'admin', 'recruiter')
export const isAdminOrSales: Access = (args) => hasRole(userOf(args), 'admin', 'sales')

export const isAdminFieldLevel: FieldAccess = ({ req }) => hasRole(req.user as MaybeUser, 'admin')

/** A user may read/update their own record; admins may read/update everyone. */
export const isAdminOrSelf: Access = ({ req }) => {
  const user = req.user as (MaybeUser & { id?: string | number }) | null
  if (!user) return false
  if (hasRole(user, 'admin')) return true
  return { id: { equals: user.id } }
}

const PUBLIC_LOCALES = ['ar', 'en'] as const

/**
 * Query constraint applied to anonymous (and non-content-role) reads of public
 * content: only published documents, and when the request names a single
 * public locale, only documents whose translation for that locale is ticked.
 */
export const publishedTranslatedWhere = (locale?: string | null): Where => {
  const and: Where[] = [{ _status: { equals: 'published' } }]
  if (locale && (PUBLIC_LOCALES as readonly string[]).includes(locale)) {
    and.push({ [`translated.${locale}`]: { equals: true } })
  }
  return { and }
}

/**
 * Read access for public content collections. Staff who edit the collection
 * see everything (drafts included); everyone else only sees published,
 * translated documents.
 */
export const publishedAndTranslated =
  (...editorRoles: Role[]): Access =>
  ({ req }) => {
    const roles: Role[] = editorRoles.length ? editorRoles : ['admin', 'editor']
    if (hasRole(req.user as MaybeUser, ...roles)) return true
    return publishedTranslatedWhere(req.locale)
  }

/**
 * Private files hold both CVs (recruiter) and consent records (editor).
 * Each role only sees its own purpose; sales and anonymous see nothing.
 */
export const privateFilesAccess: Access = ({ req }) => {
  const user = req.user as MaybeUser
  if (hasRole(user, 'admin')) return true
  if (hasRole(user, 'recruiter')) return { purpose: { equals: 'cv' } }
  if (hasRole(user, 'editor')) return { purpose: { equals: 'consent' } }
  return false
}

/** Hide an admin collection from roles that cannot use it. */
export const hiddenUnless =
  (...roles: Role[]) =>
  ({ user }: { user: unknown }) =>
    !hasRole(user as MaybeUser, ...roles)
