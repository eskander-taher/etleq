/**
 * Search engine pings after publish/unpublish.
 * - IndexNow (Bing, Yandex, Seznam, Naver…) for every public URL.
 * - Google Indexing API for job postings only (the only content type Google allows).
 * Outside production both are dry runs that only log.
 */

const isProduction = () => process.env.SITE_ENV === 'production'

export async function pingIndexNow(urls: string[]): Promise<void> {
  const list = Array.from(new Set(urls.filter(Boolean)))
  if (!list.length) return
  const key = process.env.INDEXNOW_KEY
  if (!isProduction() || !key) {
    console.log(`[indexnow] dry run (${!key ? 'no INDEXNOW_KEY' : `SITE_ENV=${process.env.SITE_ENV || 'development'}`}):`, list.join(', '))
    return
  }
  try {
    const host = new URL(list[0]).host
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: list }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok && res.status !== 202) console.warn(`[indexnow] HTTP ${res.status} for ${list.length} URL(s)`)
  } catch (error) {
    console.warn('[indexnow] ping failed:', (error as Error).message)
  }
}

export type GoogleIndexingType = 'URL_UPDATED' | 'URL_DELETED'

/**
 * Notify the Google Indexing API about a job URL. Requires a service account
 * JSON in GOOGLE_INDEXING_SA_JSON; without it (or outside production) it logs a dry run.
 */
export async function notifyGoogleIndexing(url: string, type: GoogleIndexingType): Promise<void> {
  const raw = process.env.GOOGLE_INDEXING_SA_JSON
  if (!raw || !isProduction()) {
    console.log(`[google-indexing] dry run (${!raw ? 'no GOOGLE_INDEXING_SA_JSON' : 'not production'}): ${type} ${url}`)
    return
  }
  try {
    const sa = JSON.parse(raw) as { client_email: string; private_key: string }
    const token = await googleAccessToken(sa)
    const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, type }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.warn(`[google-indexing] HTTP ${res.status} for ${url}`)
  } catch (error) {
    console.warn('[google-indexing] failed:', (error as Error).message)
  }
}

/** Service-account JWT bearer flow using Node's crypto (no extra dependency). */
async function googleAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const { createSign } = await import('node:crypto')
  const now = Math.floor(Date.now() / 1000)
  const b64 = (obj: object) => Buffer.from(JSON.stringify(obj)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url')
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(5000),
  })
  const json = (await res.json()) as { access_token?: string; error?: string }
  if (!json.access_token) throw new Error(json.error || 'no access token')
  return json.access_token
}
