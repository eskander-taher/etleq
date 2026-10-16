// In-memory sliding-window rate limiter (per process). Nginx `limit_req` is the first line; this is the app check.

type Bucket = number[]
const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

export function rateLimit(key: string, { limit = 5, windowMs = 10 * 60_000 }: { limit?: number; windowMs?: number } = {}): RateLimitResult {
  const now = Date.now()
  sweep(now, windowMs)
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return { ok: false, remaining: 0, retryAfterMs: windowMs - (now - hits[0]) }
  }
  hits.push(now)
  buckets.set(key, hits)
  return { ok: true, remaining: limit - hits.length, retryAfterMs: 0 }
}

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, hits] of buckets) if (!hits.some((t) => now - t < windowMs)) buckets.delete(k)
}

/** Test helper. */
export function resetRateLimits() {
  buckets.clear()
}

/** True when the hidden honeypot field was filled (a bot). */
export function isHoneypotTripped(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0
}

/** Best-effort client IP from proxy headers (Cloudflare first). */
export function clientIp(h: Headers) {
  return h.get('cf-connecting-ip') || h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}
