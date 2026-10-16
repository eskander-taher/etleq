import { cache } from 'react'
import type { Locale } from '@/i18n/routing'
import { getGlobal } from '@/lib/queries/common'
import { env } from '@/lib/env'

/*
 * Loose shapes of the CMS globals the shell reads (docs/schema-contract.md). Kept local and
 * all-optional on purpose: the shell must render when the CMS is empty, unreachable or mid-migration.
 */
export type NavLink = { label: string; href: string }
export type ShellHeader = { nav: NavLink[]; ctaLabel?: string }
export type ShellFooter = {
  columns: { title: string; links: NavLink[] }[]
  social: { platform: string; url: string }[]
  legalLinks: NavLink[]
}
export type LegalEntity = {
  legalName?: string | null
  country?: string | null
  crNumber?: string | null
  vatNumber?: string | null
  address?: string | null
}
export type ShellSettings = {
  slotsTotal?: number | null
  slotsLeft?: number | null
  whatsappNumber?: string | null
  responseTimePromise?: string | null
  contactEmail?: string | null
  legalEntities: LegalEntity[]
}
export type ShellAnnouncement = { enabled: boolean; text?: string | null; link?: string | null }

type AnyRecord = Record<string, unknown>
const asArray = <T = AnyRecord>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

const links = (v: unknown): NavLink[] =>
  asArray(v)
    .map((l) => ({ label: str(l.label) ?? '', href: str(l.href) ?? '' }))
    .filter((l) => l.label && l.href)

async function safeGlobal(slug: string, locale: Locale): Promise<AnyRecord | null> {
  try {
    // getGlobal is typed by workstream A; the shell only needs a plain record.
    const doc = (await (getGlobal as (s: string, l: Locale) => Promise<unknown>)(slug, locale)) as AnyRecord | null
    return doc && typeof doc === 'object' ? doc : null
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.warn(`[shell] global "${slug}" unavailable:`, (err as Error)?.message)
    return null
  }
}

export const getShellData = cache(async (locale: Locale) => {
  const [header, footer, settings, announcement] = await Promise.all([
    safeGlobal('header', locale),
    safeGlobal('footer', locale),
    safeGlobal('site-settings', locale),
    safeGlobal('announcement-bar', locale),
  ])

  const shellHeader: ShellHeader = { nav: links(header?.nav), ctaLabel: str(header?.ctaLabel) }

  const shellFooter: ShellFooter = {
    columns: asArray(footer?.columns)
      .map((c) => ({ title: str(c.title) ?? '', links: links(c.links) }))
      .filter((c) => c.title && c.links.length),
    social: asArray(footer?.social)
      .map((s) => ({ platform: str(s.platform) ?? '', url: str(s.url) ?? '' }))
      .filter((s) => s.platform && /^https?:\/\//.test(s.url)),
    legalLinks: links(footer?.legalLinks),
  }

  const shellSettings: ShellSettings = {
    slotsTotal: num(settings?.slotsTotal),
    slotsLeft: num(settings?.slotsLeft),
    whatsappNumber: str(settings?.whatsappNumber)?.replace(/[^\d]/g, '') || env.whatsappNumber.replace(/[^\d]/g, '') || null,
    responseTimePromise: str(settings?.responseTimePromise) ?? null,
    contactEmail: str(settings?.contactEmail) ?? null,
    legalEntities: asArray<LegalEntity>(settings?.legalEntities).filter((e) => str(e?.legalName)),
  }

  const shellAnnouncement: ShellAnnouncement = {
    enabled: Boolean(announcement?.enabled),
    text: str(announcement?.text) ?? null,
    link: str(announcement?.link) ?? null,
  }

  return { header: shellHeader, footer: shellFooter, settings: shellSettings, announcement: shellAnnouncement }
})

export type ShellData = Awaited<ReturnType<typeof getShellData>>
