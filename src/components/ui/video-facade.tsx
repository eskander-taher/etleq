'use client'

import { useState } from 'react'
import { ExternalLink, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trackEvent } from '@/lib/analytics'

const L = {
  ar: { play: 'شغّل الفيديو', insta: 'شاهد على إنستغرام', newTab: '(يفتح في نافذة جديدة)' },
  en: { play: 'Play video', insta: 'Watch on Instagram', newTab: '(opens in a new tab)' },
} as const

/** Extract a YouTube video id from watch, youtu.be, shorts and embed URLs. */
export function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0] || null
    if (u.searchParams.get('v')) return u.searchParams.get('v')
    const m = u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]{6,})/)
    return m ? m[1] : null
  } catch {
    return null
  }
}

/**
 * Click-to-load video. Nothing from YouTube loads until the visitor presses play (performance
 * and privacy); then a youtube-nocookie iframe replaces the poster. Instagram reels can't be
 * embedded without their script, so they open on Instagram.
 */
export function VideoFacade({
  url,
  platform,
  title,
  locale,
  poster,
  aspect = 'video',
  trackParams,
  className,
}: {
  url: string
  platform: 'youtube' | 'instagram'
  title: string
  locale: 'ar' | 'en'
  /** Poster image; YouTube falls back to its own thumbnail (loaded as a plain image). */
  poster?: { src: string; alt?: string } | null
  /** `reel` = 9:16 (Instagram/Shorts), `video` = 16:9. */
  aspect?: 'video' | 'reel'
  /** Extra analytics params, e.g. { model_slug }. */
  trackParams?: Record<string, unknown>
  className?: string
}) {
  const [playing, setPlaying] = useState(false)
  const t = L[locale]
  const id = platform === 'youtube' ? youtubeId(url) : null
  const posterSrc = poster?.src || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null)
  const frame = cn(
    'relative overflow-hidden rounded-card bg-ink-950',
    aspect === 'reel' ? 'aspect-[9/16] max-w-sm' : 'aspect-video',
    className,
  )
  const report = () => {
    try {
      trackEvent('video_play', { platform, video_url: url, ...trackParams })
    } catch {
      /* ignore */
    }
  }

  const Poster = (
    <>
      {posterSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote poster without image optimisation config
        <img src={posterSrc} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-90" />
      ) : null}
      <span className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-ink-950/10 to-transparent" aria-hidden="true" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-ignition-500 text-ink-950 shadow-lg transition-transform duration-200 ease-out group-hover:scale-105">
          {/* Media controls are not mirrored in RTL */}
          <Play className="size-7 translate-x-0.5 fill-current" aria-hidden="true" />
        </span>
      </span>
      <span className="absolute inset-x-0 bottom-0 p-4 text-start text-sm font-semibold text-sand-50">{title}</span>
    </>
  )

  if (platform === 'instagram' || !id) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" onClick={report} className={cn(frame, 'group block')}>
        {Poster}
        <span className="sr-only">
          {platform === 'instagram' ? t.insta : t.play}: {title} {t.newTab}
        </span>
        {platform === 'instagram' ? (
          <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-ink-950/80 px-3 py-1 text-xs font-semibold text-sand-50" aria-hidden="true">
            {t.insta}
            <ExternalLink className="size-3" />
          </span>
        ) : null}
      </a>
    )
  }

  if (playing) {
    return (
      <div className={frame}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&hl=${locale}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        report()
        setPlaying(true)
      }}
      className={cn(frame, 'group block w-full cursor-pointer')}
    >
      {Poster}
      <span className="sr-only">
        {t.play}: {title}
      </span>
    </button>
  )
}
