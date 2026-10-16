import type { Access, CollectionConfig, PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { publishedTranslatedWhere } from '@/access'
import { Applications } from '@/collections/Applications'
import { Jobs } from '@/collections/Jobs'
import { Leads } from '@/collections/Leads'
import { Models } from '@/collections/Models'
import { PrivateFiles } from '@/collections/PrivateFiles'
import { Subscribers } from '@/collections/Subscribers'
import { Users } from '@/collections/Users'

type Who = 'anonymous' | 'editor' | 'recruiter' | 'sales' | 'admin'
const WHO: Who[] = ['anonymous', 'editor', 'recruiter', 'sales', 'admin']
type Op = 'read' | 'create' | 'update' | 'delete'

const reqFor = (who: Who, locale = 'ar') =>
  ({ user: who === 'anonymous' ? null : { id: `u-${who}`, role: who, collection: 'users' }, locale }) as unknown as PayloadRequest

const run = (collection: CollectionConfig, op: Op, who: Who, locale?: string) => {
  const fn = collection.access?.[op] as Access | undefined
  if (!fn) throw new Error(`${collection.slug} has no ${op} access function`)
  return fn({ req: reqFor(who, locale) } as never)
}

/** Allowed = true, or a query constraint (a Where object). Denied = false. */
const allowed = (result: unknown) => result !== false && result !== undefined && result !== null

describe('personal data collections', () => {
  const matrix: [CollectionConfig, Who[]][] = [
    [Leads, ['sales', 'admin']],
    [Subscribers, ['sales', 'admin']],
    [Applications, ['recruiter', 'admin']],
  ]

  for (const [collection, allowedRoles] of matrix) {
    for (const who of WHO) {
      it(`${collection.slug}: ${who} ${allowedRoles.includes(who) ? 'can' : 'cannot'} read`, async () => {
        const result = await run(collection, 'read', who)
        expect(result).toBe(allowedRoles.includes(who))
      })
    }

    it(`${collection.slug}: anonymous can never create, update or delete through the API`, async () => {
      for (const op of ['create', 'update', 'delete'] as const) {
        expect(await run(collection, op, 'anonymous')).toBe(false)
      }
    })

    it(`${collection.slug}: only admins delete`, async () => {
      for (const who of WHO) expect(await run(collection, 'delete', who)).toBe(who === 'admin')
    })
  }
})

describe('private files (CVs and consent records)', () => {
  it('anonymous and sales cannot read any private file', async () => {
    expect(await run(PrivateFiles, 'read', 'anonymous')).toBe(false)
    expect(await run(PrivateFiles, 'read', 'sales')).toBe(false)
  })

  it('recruiters only see CVs, editors only see consent records, admins see all', async () => {
    expect(await run(PrivateFiles, 'read', 'recruiter')).toEqual({ purpose: { equals: 'cv' } })
    expect(await run(PrivateFiles, 'read', 'editor')).toEqual({ purpose: { equals: 'consent' } })
    expect(await run(PrivateFiles, 'read', 'admin')).toBe(true)
  })

  it('anonymous and sales cannot upload, and only admins delete', async () => {
    expect(allowed(await run(PrivateFiles, 'create', 'anonymous'))).toBe(false)
    expect(allowed(await run(PrivateFiles, 'create', 'sales'))).toBe(false)
    for (const who of WHO) expect(await run(PrivateFiles, 'delete', who)).toBe(who === 'admin')
  })

  it('accepts PDFs only', () => {
    expect(PrivateFiles.upload && typeof PrivateFiles.upload === 'object' && PrivateFiles.upload.mimeTypes).toEqual(['application/pdf'])
  })
})

describe('role scoping', () => {
  it('recruiters edit jobs; editors and sales do not', async () => {
    expect(await run(Jobs, 'update', 'recruiter')).toBe(true)
    expect(await run(Jobs, 'update', 'admin')).toBe(true)
    expect(await run(Jobs, 'update', 'editor')).toBe(false)
    expect(await run(Jobs, 'update', 'sales')).toBe(false)
  })

  it('recruiters and sales cannot edit models', async () => {
    expect(await run(Models, 'update', 'recruiter')).toBe(false)
    expect(await run(Models, 'update', 'sales')).toBe(false)
    expect(await run(Models, 'update', 'editor')).toBe(true)
  })

  it('users: only admins create or delete users; others only see themselves', async () => {
    for (const who of WHO) {
      expect(await run(Users, 'create', who)).toBe(who === 'admin')
      expect(await run(Users, 'delete', who)).toBe(who === 'admin')
    }
    expect(await run(Users, 'read', 'anonymous')).toBe(false)
    expect(await run(Users, 'read', 'editor')).toEqual({ id: { equals: 'u-editor' } })
  })

  it('the role field can only be changed by admins and is saved to the JWT', () => {
    const role = Users.fields.find((f) => 'name' in f && f.name === 'role') as { saveToJWT?: boolean; access?: { update?: (args: { req: PayloadRequest }) => boolean } }
    expect(role.saveToJWT).toBe(true)
    expect(role.access?.update?.({ req: reqFor('editor') })).toBe(false)
    expect(role.access?.update?.({ req: reqFor('admin') })).toBe(true)
  })

  it('users lock after 5 failed logins for 10 minutes', () => {
    expect(Users.auth).toMatchObject({ maxLoginAttempts: 5, lockTime: 600000 })
  })
})

describe('public content read access', () => {
  it('anonymous visitors only read published documents translated into the request locale', async () => {
    expect(await run(Models, 'read', 'anonymous', 'en')).toEqual({
      and: [{ _status: { equals: 'published' } }, { 'translated.en': { equals: true } }],
    })
    expect(await run(Models, 'read', 'anonymous', 'ar')).toEqual(publishedTranslatedWhere('ar'))
  })

  it('sales and recruiters get the same public view of models as anonymous visitors', async () => {
    expect(await run(Models, 'read', 'sales', 'ar')).toEqual(publishedTranslatedWhere('ar'))
    expect(await run(Models, 'read', 'recruiter', 'ar')).toEqual(publishedTranslatedWhere('ar'))
  })

  it('editors and admins see drafts', async () => {
    expect(await run(Models, 'read', 'editor')).toBe(true)
    expect(await run(Models, 'read', 'admin')).toBe(true)
  })
})
