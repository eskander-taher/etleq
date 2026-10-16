'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { trackEvent } from '@/lib/analytics'
import { instagramEmbed, youtubeId } from './lib'

/**
 * Lightweight facade: a poster and a play button until clicked, then the real player (brief section 14).
 * Vertical reels use a 9:16 frame, other videos 16:9.
 */
export function VideoFacade({
  url,
  title,
  poster,
  playLabel,
  vertical = false,
  trackParams,
}: {
  url: string
  title: string
  poster?: string | null
  playLabel: string
  vertical?: boolean
  trackParams?: Record<string, string | number | undefined>
}) {
  const [active, setActive] = useState(false)
  const yt = youtubeId(url)
  const ig = yt ? null : instagramEmbed(url)
  const src = yt ? `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0` : ig ? `${ig}` : null
  const thumb = poster || (yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null)
  const frame = vertical ? 'aspect-[9/16] max-w-sm' : 'aspect-video'

  if (!src) {
    return (
      <a href={url} rel="noopener" target="_blank" className="font-semibold text-ignition-700 underline">
        {title}
      </a>
    )
  }

  return (
    <div className={`relative mx-auto w-full overflow-hidden rounded-[var(--radius-card)] bg-ink-950 ${frame}`}>
      {active ? (
        <iframe
          src={src}
          title={title}
          className="absolute inset-0 size-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setActive(true)
            trackEvent('video_play', { ...trackParams, video_url: url })
          }}
          className="group absolute inset-0 flex size-full items-center justify-center"
          aria-label={`${playLabel}: ${title}`}
        >
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover opacity-80" />
          )}
          <span className="relative flex size-16 items-center justify-center rounded-full bg-ignition-500 text-ink-950 shadow-lg transition-transform group-hover:scale-105">
            <Play aria-hidden className="size-7" />
          </span>
        </button>
      )}
    </div>
  )
}
