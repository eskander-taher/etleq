const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies a Cloudflare Turnstile token. When TURNSTILE_SECRET_KEY is unset, verification is skipped
 * (the honeypot and per-IP rate limit still apply): rejecting every lead is worse than some spam.
 * Once the key is set, a missing or invalid token fails.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    const level = process.env.SITE_ENV === 'production' ? 'error' : 'warn'
    console[level]('[turnstile] TURNSTILE_SECRET_KEY not set; skipping verification (honeypot and rate limit only)')
    return true
  }
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    if (ip) body.set('remoteip', ip)
    const res = await fetch(VERIFY_URL, { method: 'POST', body, signal: AbortSignal.timeout(5000) })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (!data.success) console.warn('[turnstile] verification failed', data['error-codes'] ?? [])
    return !!data.success
  } catch (err) {
    console.error('[turnstile] verification request failed', (err as Error).message)
    return false
  }
}
