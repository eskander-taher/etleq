import { createHmac, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const pbkdf2Async = promisify(pbkdf2)

/** Same parameters Payload used, so existing user records keep working. */
const ITERATIONS = 25000
const KEY_LENGTH = 512

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(32).toString('hex')
  const hash = (await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, 'sha256')).toString('hex')
  return { salt, hash }
}

export async function verifyPassword(password: string, salt: unknown, hash: unknown): Promise<boolean> {
  if (typeof salt !== 'string' || typeof hash !== 'string' || !salt || !hash) return false
  const computed = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, 'sha256')
  const stored = Buffer.from(hash, 'hex')
  return stored.length === computed.length && timingSafeEqual(stored, computed)
}

/** Server secret for sessions and signed tokens. PAYLOAD_SECRET is still read so old .env files work. */
export function appSecret(): string {
  const secret = process.env.AUTH_SECRET || process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return secret
}

const b64url = (s: string) => Buffer.from(s).toString('base64url')

/** `body.signature`, HMAC-SHA256 with a purpose-specific key. */
export function signToken(data: object, purpose: string): string {
  const body = b64url(JSON.stringify(data))
  return `${body}.${createHmac('sha256', `${appSecret()}:${purpose}`).update(body).digest('base64url')}`
}

export function verifyToken<T>(token: string | undefined | null, purpose: string): T | null {
  if (!token || token.length > 2048) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = Buffer.from(createHmac('sha256', `${appSecret()}:${purpose}`).update(body).digest('base64url'))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
