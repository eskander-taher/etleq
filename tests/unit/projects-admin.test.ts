import { describe, expect, it } from 'vitest'

import { fieldLabel, noLanguageProblem, projectPublishProblems, translationProblems } from '@/cms/gates'
import { HTTP_URL } from '@/cms/schema/collections'
import { collections, globals } from '@/cms/schema'
import { humanize, type Field } from '@/cms/schema/types'
import { toFilter } from '@/cms/where'
import { isShowableProject, linkKind, projectLinks } from '@/components/content/project-links'

const projects = collections.find((c) => c.slug === 'projects')!

describe('project publish gate', () => {
  it('lets our own products publish without client consent', () => {
    expect(projectPublishProblems({ kind: 'own' })).toEqual([])
  })

  it('keeps the consent requirement for client projects, in plain words', () => {
    const problems = projectPublishProblems({ kind: 'client' })
    expect(problems.map((p) => p.path)).toEqual(['consentGiven', 'consentFile'])
    expect(problems[0].message).toMatch(/client must agree/)
    expect(problems[0].message).toMatch(/Our own product/)
  })

  it('treats older projects without a kind as client projects', () => {
    expect(projectPublishProblems({ title: { ar: 'x' } })).toHaveLength(2)
    expect(projectPublishProblems({ consentGiven: true, consentFile: 'abc' })).toEqual([])
  })
})

describe('project schema', () => {
  const field = (name: string) => projects.fields.find((f) => f.name === name)

  it('defaults new projects to our own product', () => {
    const kind = field('kind')
    expect(kind?.type).toBe('select')
    expect(kind?.defaultValue).toBe('own')
  })

  it('shows client fields only for client projects', () => {
    for (const name of ['clientName', 'consentGiven', 'consentFile'])
      expect(field(name)?.showIf).toEqual({ field: 'kind', equals: 'client' })
  })

  it('validates link URLs as absolute http(s) addresses', () => {
    const links = field('links')
    expect(links?.type).toBe('array')
    expect(HTTP_URL('https://apps.apple.com/app/id1', {})).toBe(true)
    expect(HTTP_URL('', {})).toBe(true)
    expect(HTTP_URL('apps.apple.com/app', {})).toMatch(/https:\/\//)
    expect(HTTP_URL('javascript:alert(1)', {})).toMatch(/https:\/\//)
  })

  it('public query matches own products or consented client projects', () => {
    const filter = toFilter(
      { or: [{ kind: { equals: 'own' } }, { consentGiven: { equals: true } }] },
      projects.fields,
      'ar',
    )
    expect(filter).toEqual({ $or: [{ kind: 'own' }, { consentGiven: true }] })
  })
})

describe('admin labels', () => {
  const missingLabels = (fields: Field[], at: string): string[] =>
    fields.flatMap((f) => [
      ...(!f.hidden && !f.label && !['utm'].some((g) => at.includes(g)) ? [`${at}${f.name}`] : []),
      ...(f.type === 'group' || f.type === 'array' ? missingLabels(f.fields, `${at}${f.name}.`) : []),
    ])

  it('every visible field has a plain-English label', () => {
    for (const c of collections) expect(missingLabels(c.fields, `${c.slug}:`)).toEqual([])
    for (const g of globals) expect(missingLabels(g.fields, `${g.slug}:`)).toEqual([])
  })

  it('humanizes option values', () => {
    expect(humanize('training-centres')).toBe('Training centres')
    expect(humanize('FULL_TIME')).toBe('Full time')
  })

  it('names fields in gate messages by their label', () => {
    expect(fieldLabel(projects.fields, 'context')).toBe('One-line summary')
    expect(fieldLabel(projects.fields, 'results.0.label')).toBe('Results › 1 › What')
    const [p] = translationProblems(projects.fields, { ar: true, en: false }, { ar: {}, en: {} }, ['title'])
    expect(p.message).toBe('Fill in the Arabic “App name”, or untick Arabic under “Show on the site in”.')
    expect(noLanguageProblem({ ar: false, en: false })).toHaveLength(1)
    expect(noLanguageProblem({ ar: true })).toHaveLength(0)
  })
})

describe('project links', () => {
  it('recognises app stores', () => {
    expect(linkKind('https://apps.apple.com/sa/app/x/id123')).toBe('appStore')
    expect(linkKind('https://play.google.com/store/apps/details?id=x')).toBe('googlePlay')
    expect(linkKind('https://example.com')).toBe('website')
  })

  it('drops invalid links and puts stores first', () => {
    const links = projectLinks([
      { url: 'https://example.com' },
      { url: 'not a url' },
      { url: 'javascript:alert(1)' },
      { url: 'https://play.google.com/store/apps/details?id=x', label: '  ' },
    ])
    expect(links.map((l) => l.kind)).toEqual(['googlePlay', 'website'])
    expect(links[0].label).toBeNull()
  })

  it('shows own products and consented client projects only', () => {
    expect(isShowableProject({ kind: 'own' })).toBe(true)
    expect(isShowableProject({ kind: 'client', consentGiven: true })).toBe(true)
    expect(isShowableProject({ kind: 'client' })).toBe(false)
    expect(isShowableProject({})).toBe(false)
  })
})
