import { ImageResponse } from 'next/og'
import { siteUrl } from '@/lib/site-url'

/**
 * Dynamic 1200x630 Open Graph card: /og.png?locale=ar&title=...&subtitle=...
 * The path has a dot so the next-intl proxy (matcher excludes dotted paths) leaves it alone.
 *
 * Arabic: satori joins letters with a real Arabic font but does no bidi reordering, so the
 * title is laid out word by word in a `row-reverse` wrapping flex row, and mixed tokens such
 * as "ر.س" are split into runs. See docs/decisions.md (workstream E) for the Playwright fallback.
 */
export const revalidate = 86400

const W = 1200
const H = 630
const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/
const RUNS = /([؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+|[^؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+)/g

const fontCache = new Map<string, ArrayBuffer | null>()

/** Load a Google Font as TTF, subset to the characters we draw. */
async function loadFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  const key = `${family}:${weight}:${text}`
  if (fontCache.has(key)) return fontCache.get(key) ?? null
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`
    const css = await (await fetch(cssUrl, { signal: AbortSignal.timeout(4000) })).text()
    const src = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1]
    if (!src) throw new Error('no truetype source')
    const data = await (await fetch(src, { signal: AbortSignal.timeout(4000) })).arrayBuffer()
    if (fontCache.size > 200) fontCache.clear()
    fontCache.set(key, data)
    return data
  } catch (err) {
    console.warn('[og] font load failed:', (err as Error).message)
    return null
  }
}

/** One word; Arabic tokens containing other characters (e.g. "ر.س") are split into runs. */
function Word({ word, rtl }: { word: string; rtl: boolean }) {
  const runs = word.match(RUNS) || [word]
  if (rtl && runs.length > 1 && ARABIC.test(word)) {
    return (
      <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
        {runs.map((r, i) => (
          <span key={i}>{r}</span>
        ))}
      </div>
    )
  }
  return <span>{word}</span>
}

function Line({ text, rtl, style }: { text: string; rtl: boolean; style: Record<string, string | number> }) {
  if (!rtl) return <div style={{ display: 'flex', ...style }}>{text}</div>
  const words = text.split(/\s+/).filter(Boolean)
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        flexDirection: rtl ? 'row-reverse' : 'row',
        columnGap: rtl ? 14 : 16,
        ...style,
      }}
    >
      {words.map((w, i) => (
        <Word key={i} word={w} rtl={rtl} />
      ))}
    </div>
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const locale = searchParams.get('locale') === 'en' ? 'en' : 'ar'
  const rtl = locale === 'ar'
  const title = (searchParams.get('title') || (rtl ? 'اطلق' : 'Etleq')).slice(0, 120)
  const subtitle = (searchParams.get('subtitle') || '').slice(0, 140)
  const brand = rtl ? 'اطلق' : 'Etleq'
  const tagline = rtl ? 'منصتك SaaS جاهزة خلال 30 يوم عمل' : 'Your SaaS, live in 30 working days'
  const host = new URL(siteUrl()).host

  const text = `${title}${subtitle}${brand}${tagline}${host}Etleq0123456789`
  // Arabic must use exactly ONE font: with several fonts, satori's fallback resolver crashes on
  // GSUB-shaped Arabic glyphs (they carry no unicode). So the Arabic card is set in Alexandria only.
  const [display, body] = await Promise.all([
    loadFont('Alexandria', 700, text),
    rtl ? Promise.resolve(null) : loadFont('IBM Plex Sans', 500, text),
  ])
  const fonts = [
    ...(display ? [{ name: 'Display', data: display, weight: 700 as const, style: 'normal' as const }] : []),
    ...(body ? [{ name: 'Body', data: body, weight: 500 as const, style: 'normal' as const }] : []),
  ]
  const titleSize = title.length > 70 ? 56 : title.length > 40 ? 66 : 78

  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#faf7f2',
        color: '#0b0f14',
        padding: '72px 80px',
        fontFamily: rtl ? 'Display' : 'Body',
        borderBottom: '14px solid #ff5a1f',
      }}
    >
      <div style={{ display: 'flex', flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 22, height: 22, borderRadius: 6, background: '#ff5a1f', display: 'flex' }} />
        <span style={{ fontFamily: 'Display', fontSize: 36 }}>{brand}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Line text={title} rtl={rtl} style={{ fontFamily: 'Display', fontSize: titleSize, lineHeight: 1.35 }} />
        {subtitle ? (
          <Line text={subtitle} rtl={rtl} style={{ fontSize: 32, color: '#3a4553', lineHeight: 1.5 }} />
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: rtl ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          fontSize: 26,
          color: '#3a4553',
        }}
      >
        <Line text={tagline} rtl={rtl} style={{}} />
        <span>{host}</span>
      </div>
    </div>,
    {
      width: W,
      height: H,
      fonts: fonts.length ? fonts : undefined,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400' },
    },
  )
}
