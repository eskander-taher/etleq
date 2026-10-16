const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/**
 * Verifies a Cloudflare Turnstile token. When TURNSTILE_SECRET_KEY is unset (local dev),
 * it passes outside production and fails closed in production.
 */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    if (process.env.SITE_ENV === 'production') {
      console.error('[turnstile] TURNSTILE_SECRET_KEY is not set in production; rejecting submission')
      return false
    }
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not set; skipping verification (dev)')
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
