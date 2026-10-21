'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { canDelete, canWrite, getAdminUser, login, logout, privateFileVisible } from '@/cms/auth'
import { type Doc } from '@/cms/fields'
import { publishProblems, validateFields } from '@/cms/hooks'
import { cms } from '@/cms/local'
import { getCollectionConfig, getGlobalConfig } from '@/cms/schema'
import { type CollectionSlug, type GlobalSlug, ValidationError } from '@/cms/types'

export type SaveResult = { ok: true; id: string } | { ok: false; errors: { path: string; message: string }[] }

const errorResult = (error: unknown): SaveResult => {
  if (error instanceof ValidationError) return { ok: false, errors: error.problems }
  console.error('[admin] save failed:', error)
  return { ok: false, errors: [{ path: '', message: (error as Error).message || 'Could not save.' }] }
}

export async function loginAction(_prev: { message: string } | null, formData: FormData) {
  const result = await login(String(formData.get('email') || ''), String(formData.get('password') || ''))
  if (!result.ok) return { message: result.message }
  redirect('/admin')
}

export async function logoutAction() {
  await logout()
  redirect('/admin/login')
}

/** Create or update a document from the admin form (the full stored shape, both locales). */
export async function saveDocument(collection: string, id: string | null, json: string): Promise<SaveResult> {
  const user = await getAdminUser()
  const config = getCollectionConfig(collection)
  if (!user || !config || !canWrite(user, config)) return { ok: false, errors: [{ path: '', message: 'Not allowed.' }] }

  let data: Doc
  try {
    data = JSON.parse(json) as Doc
  } catch {
    return { ok: false, errors: [{ path: '', message: 'Invalid form data.' }] }
  }
  delete data.id
  delete data.createdAt
  delete data.updatedAt

  if (config.slug === 'private-files' && !privateFileVisible(user, data.purpose)) {
    return { ok: false, errors: [{ path: 'purpose', message: 'You cannot manage files with this purpose.' }] }
  }
  // Only admins manage users and roles.
  if (config.auth && !id && !data.password)
    return { ok: false, errors: [{ path: 'password', message: 'Set a password for the new user.' }] }

  const problems = validateFields(config.fields, data)
  if (config.auth && typeof data.email === 'string') {
    const clash = await cms.find({
      collection: 'users',
      where: { email: { equals: data.email.trim().toLowerCase() } },
      limit: 1,
      locale: 'all',
    })
    if (clash.docs[0] && String(clash.docs[0].id) !== id)
      problems.push({ path: 'email', message: 'Another user has this email.' })
  }
  if (config.slug === 'short-links' && typeof data.code === 'string') {
    const clash = await cms.find({
      collection: 'short-links',
      where: { code: { equals: data.code } },
      limit: 1,
      locale: 'all',
    })
    if (clash.docs[0] && String(clash.docs[0].id) !== id)
      problems.push({ path: 'code', message: 'This code is already used.' })
  }
  if (config.drafts && data._status === 'published') problems.push(...publishProblems(config, data))
  if (problems.length) return { ok: false, errors: problems }

  try {
    const slug = config.slug as CollectionSlug
    const doc = id ? await cms.update({ collection: slug, id, data }) : await cms.create({ collection: slug, data })
    revalidatePath(`/admin/collections/${config.slug}`)
    return { ok: true, id: String(doc.id) }
  } catch (error) {
    return errorResult(error)
  }
}

export async function deleteDocument(collection: string, id: string) {
  const user = await getAdminUser()
  const config = getCollectionConfig(collection)
  if (!user || !config || !canDelete(user, config)) throw new Error('Not allowed.')
  if (config.auth && id === user.id) throw new Error('You cannot delete your own account.')
  await cms.delete({ collection: config.slug, id })
  revalidatePath(`/admin/collections/${config.slug}`)
  redirect(`/admin/collections/${config.slug}`)
}

export async function saveGlobal(slug: string, json: string): Promise<SaveResult> {
  const user = await getAdminUser()
  const config = getGlobalConfig(slug)
  if (!user || !config || !config.access.write.includes(user.role))
    return { ok: false, errors: [{ path: '', message: 'Not allowed.' }] }
  let data: Doc
  try {
    data = JSON.parse(json) as Doc
  } catch {
    return { ok: false, errors: [{ path: '', message: 'Invalid form data.' }] }
  }
  delete data.globalType
  delete data.updatedAt
  const problems = validateFields(config.fields, data)
  if (problems.length) return { ok: false, errors: problems }
  try {
    await cms.updateGlobal({ slug: config.slug as GlobalSlug, data })
    return { ok: true, id: config.slug }
  } catch (error) {
    return errorResult(error)
  }
}

/** Gallery widget: save an image's description (alt text) without leaving the form. */
export async function saveMediaAlt(id: string, alt: { ar?: string; en?: string }): Promise<SaveResult> {
  const user = await getAdminUser()
  const config = getCollectionConfig('media')
  if (!user || !config || !canWrite(user, config)) return { ok: false, errors: [{ path: '', message: 'Not allowed.' }] }
  try {
    const current = (await cms.findByID({ collection: 'media', id, locale: 'all', depth: 0 })) as Doc
    const clean = (v: unknown) => (typeof v === 'string' ? v.trim().slice(0, 300) : '')
    await cms.update({
      collection: 'media',
      id,
      data: { alt: { ...(current.alt || {}), ar: clean(alt.ar), en: clean(alt.en) } },
    })
    return { ok: true, id }
  } catch (error) {
    return errorResult(error)
  }
}

/** Dashboard shortcut: update the launch-slot counter in one step. */
export async function updateSlots(_prev: SaveResult | null, formData: FormData): Promise<SaveResult> {
  const user = await getAdminUser()
  const config = getGlobalConfig('site-settings')
  if (!user || !config || !config.access.write.includes(user.role))
    return { ok: false, errors: [{ path: '', message: 'Not allowed.' }] }
  const num = (key: string) => {
    const raw = String(formData.get(key) ?? '').trim()
    const n = Number(raw)
    return raw === '' || !Number.isInteger(n) || n < 0 ? null : n
  }
  const slotsLeft = num('slotsLeft')
  const slotsTotal = num('slotsTotal')
  if (slotsLeft === null || slotsTotal === null)
    return { ok: false, errors: [{ path: 'slotsLeft', message: 'Use whole numbers, 0 or more.' }] }
  if (slotsLeft > slotsTotal)
    return { ok: false, errors: [{ path: 'slotsLeft', message: 'Slots left cannot be more than the total.' }] }
  try {
    await cms.updateGlobal({ slug: 'site-settings', data: { slotsLeft, slotsTotal } })
    revalidatePath('/admin')
    return { ok: true, id: 'site-settings' }
  } catch (error) {
    return errorResult(error)
  }
}
