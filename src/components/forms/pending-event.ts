'use client'

import { newEventId, trackEvent } from '@/lib/analytics'

// A conversion event is queued at submit time (its event_id goes to the server action for
// deduplication) and fired exactly once on the page that confirms it (result or thank-you).

const KEY = 'etleq_pending_events'
const FIRED = 'etleq_fired_events'

export interface PendingEvent {
  name: string
  params: Record<string, unknown>
}

export function queueEvents(events: PendingEvent[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(events))
  } catch {
    /* storage unavailable: the confirmation page falls back to its own default event */
  }
}

/** Creates an event id to share between the browser event and the server event. */
export const createEventId = () => newEventId()

/**
 * Fires the queued events (consumed, so a reload never repeats them). With nothing queued, fires
 * `fallback` at most once per `onceKey` per session. Returns true when anything was fired.
 */
export function fireOnce(onceKey: string, fallback: PendingEvent[] = []) {
  let queued: PendingEvent[] | null = null
  try {
    const raw = sessionStorage.getItem(KEY)
    if (raw) {
      sessionStorage.removeItem(KEY)
      queued = JSON.parse(raw) as PendingEvent[]
    }
  } catch {
    queued = null
  }

  let fired: string[] = []
  try {
    fired = JSON.parse(sessionStorage.getItem(FIRED) || '[]')
  } catch {
    fired = []
  }
  if (!queued && fired.includes(onceKey)) return false

  const events = queued ?? fallback
  for (const e of events) trackEvent(e.name, e.params)
  try {
    sessionStorage.setItem(FIRED, JSON.stringify([...fired.filter((k) => k !== onceKey), onceKey].slice(-50)))
  } catch {
    /* ignore */
  }
  return events.length > 0
}
