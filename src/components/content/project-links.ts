/** Public links of a project: the button text comes from the URL unless the editor typed one. */

export type ProjectLinkKind = 'appStore' | 'googlePlay' | 'website'
export type ProjectLink = { url: string; kind: ProjectLinkKind; label: string | null }

export function linkKind(url: string): ProjectLinkKind {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'website'
  }
  if (host === 'apps.apple.com' || host === 'itunes.apple.com' || host === 'testflight.apple.com') return 'appStore'
  if (host === 'play.google.com') return 'googlePlay'
  return 'website'
}

/** Only absolute http(s) URLs survive (bad CMS text must not break a page). App stores first. */
export function projectLinks(links: { url?: string | null; label?: string | null }[] | null | undefined): ProjectLink[] {
  const order: Record<ProjectLinkKind, number> = { appStore: 0, googlePlay: 1, website: 2 }
  const out: ProjectLink[] = []
  for (const l of links ?? []) {
    const url = l?.url?.trim()
    if (!url) continue
    try {
      const u = new URL(url)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') continue
    } catch {
      continue
    }
    out.push({ url, kind: linkKind(url), label: l.label?.trim() || null })
  }
  return out.sort((a, b) => order[a.kind] - order[b.kind])
}

/** Projects saved before `kind` existed count as client projects. */
export const isOwnProject = (p: { kind?: string | null } | null | undefined) => p?.kind === 'own'

/** A project may be shown publicly: our own product, or a client project with recorded consent. */
export const isShowableProject = (p: { kind?: string | null; consentGiven?: boolean | null } | null | undefined) =>
  isOwnProject(p) || p?.consentGiven === true
