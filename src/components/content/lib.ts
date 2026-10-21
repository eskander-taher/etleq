// Shared helpers for the content templates (workstream D). Pure functions only, so they are unit-testable.

export type Loc = 'ar' | 'en'

type WithId = { id: string | number }

/** Narrow a CMS relationship value (id or populated doc) to the populated doc. */
export function populated<T extends WithId>(value: string | number | T | null | undefined): T | null {
  return value && typeof value === 'object' ? value : null
}

type PublicLike = WithId & {
  translated?: { ar?: boolean | null; en?: boolean | null } | null
  _status?: 'draft' | 'published' | null
}

/** True when a populated doc may be shown on a public page in `locale` (translated and, if versioned, published). */
export function isPublicIn<T extends PublicLike>(doc: T | null | undefined, locale: Loc): doc is T {
  if (!doc) return false
  if (doc.translated?.[locale] !== true) return false
  if (doc._status && doc._status !== 'published') return false
  return true
}

/** Populated relationships filtered to those public in `locale`. Never shows the other language's text. */
export function publicRelations<T extends PublicLike>(
  values: (string | number | T)[] | string | number | T | null | undefined,
  locale: Loc,
): T[] {
  const list = Array.isArray(values) ? values : values == null ? [] : [values]
  return list.map((v) => populated<T>(v)).filter((d): d is T => isPublicIn(d, locale))
}

/** Page number from a search param; anything invalid becomes 1. */
export function pageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  const n = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n > 0 && n < 10_000 ? n : 1
}

export function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() || undefined
}

/** Builds `path?key=value&…` skipping empty values, used for crawlable filter and pagination links. */
export function withQuery(path: string, query: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '' || (k === 'page' && Number(v) === 1)) continue
    q.set(k, String(v))
  }
  const s = q.toString()
  return s ? `${path}?${s}` : path
}

// ---------- Lexical helpers (headings → ids for the table of contents) ----------

type LexNode = { type?: string; tag?: string; text?: string; children?: LexNode[] }
type LexData = { root?: LexNode } | null | undefined

export function nodeText(node: LexNode | undefined): string {
  if (!node) return ''
  if (typeof node.text === 'string') return node.text
  return (node.children ?? []).map(nodeText).join('')
}

/** Slug usable as an HTML id. Keeps Arabic and Latin letters and digits. */
export function slugifyHeading(text: string): string {
  const s = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '') // Arabic diacritics and tatweel
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'section'
}

export type TocItem = { id: string; text: string; level: 2 | 3 }

/**
 * Walks the Lexical tree once and assigns a unique id to every h2/h3 heading node.
 * Returns the ids keyed by node object (used by the RichText converter) and the TOC list.
 */
export function collectHeadings(data: LexData): { ids: WeakMap<object, string>; toc: TocItem[] } {
  const ids = new WeakMap<object, string>()
  const toc: TocItem[] = []
  const seen = new Map<string, number>()
  const walk = (node: LexNode | undefined) => {
    if (!node) return
    if (node.type === 'heading' && (node.tag === 'h2' || node.tag === 'h3')) {
      const text = nodeText(node).trim()
      const base = slugifyHeading(text)
      const count = seen.get(base) ?? 0
      seen.set(base, count + 1)
      const id = count ? `${base}-${count + 1}` : base
      ids.set(node, id)
      toc.push({ id, text, level: node.tag === 'h2' ? 2 : 3 })
    }
    node.children?.forEach(walk)
  }
  walk(data?.root)
  return { ids, toc }
}

// ---------- Jobs ----------

/** A job is closed when its status says so or its validThrough date has passed. */
export function isJobClosed(job: { status?: string | null; validThrough?: string | null }, now = new Date()): boolean {
  if (job.status === 'closed') return true
  if (job.validThrough && new Date(job.validThrough).getTime() < now.getTime()) return true
  return false
}

// ---------- Media ----------

type MediaLike = { url?: string | null; alt?: string | null; width?: number | null; height?: number | null }

export function mediaOf(value: unknown): (MediaLike & { url: string }) | null {
  if (!value || typeof value !== 'object') return null
  const m = value as MediaLike
  return m.url ? (m as MediaLike & { url: string }) : null
}

/** Arabic text runs need Latin brand names wrapped in <bdi>; this tells whether a string has Latin letters. */
export const hasLatin = (s: string) => /[A-Za-z]/.test(s)

// ---------- Video ----------

/** YouTube id from watch, shorts, embed, live and youtu.be URLs. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

/** Instagram reel/post embed URL. */
export function instagramEmbed(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:reel|reels|p|tv)\/([\w-]+)/)
  return m ? `https://www.instagram.com/reel/${m[1]}/embed/` : null
}

/** Player URL for structured data and a fallback thumbnail. */
export function videoMeta(url: string): { embedUrl: string | null; thumbnail: string | null; vertical: boolean } {
  const yt = youtubeId(url)
  if (yt)
    return {
      embedUrl: `https://www.youtube.com/embed/${yt}`,
      thumbnail: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      vertical: /\/shorts\//.test(url),
    }
  const ig = instagramEmbed(url)
  return { embedUrl: ig, thumbnail: null, vertical: !!ig }
}

/** Hostname for a source label ("example.com"); returns the input when it is not a valid URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

// ---------- MRR rule ----------

export type MrrData = {
  amount?: number | null
  currency?: string | null
  sourceName?: string | null
  sourceUrl?: string | null
  reportedAt?: string | null
}

/** True when an MRR figure can be shown under the MRR rule (amount, source link and date all present). */
export type ShowableMrr = MrrData & { amount: number; sourceUrl: string; reportedAt: string }

export const mrrShowable = (mrr: MrrData | null | undefined): mrr is ShowableMrr =>
  !!(mrr && typeof mrr.amount === 'number' && mrr.sourceUrl && mrr.reportedAt)

/** Scorecard link that tells the scorecard (and the lead record) which page the visitor came from. */
export const scorecardFrom = (path: string) => `/scorecard?from=${encodeURIComponent(path)}`

/** Scorecard link with the model question answered in advance. */
export const scorecardForModel = (slug: string) => `/scorecard?model=${encodeURIComponent(slug)}`
