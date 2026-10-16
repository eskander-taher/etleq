'use client'

import { useEffect } from 'react'
import { fireOnce, type PendingEvent } from './pending-event'

/** Fires the queued conversion event(s) once per session for `onceKey`. Renders nothing. */
export function FireOnce({ onceKey, fallback }: { onceKey: string; fallback?: PendingEvent[] }) {
  useEffect(() => {
    fireOnce(onceKey, fallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onceKey])
  return null
}
