'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/analytics'

/** Fires one analytics event when the page mounts (e.g. model_view, job_view). Renders nothing. */
export function TrackView({ event, params }: { event: string; params: Record<string, string | number | undefined> }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackEvent(event, params)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}
