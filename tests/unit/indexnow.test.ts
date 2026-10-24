import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildIndexNowPayload, indexNowKey, INDEXNOW_KEY_PATH, pingIndexNow, runAfterResponse } from '@/lib/indexnow'
import { GET as keyFile } from '@/app/indexnow-key.txt/route'

const WWW = 'https://www.etleq.com'
const KEY = 'a1b2c3d4e5f60718293a4b5c6d7e8f90'

describe('IndexNow', () => {
  const env = { ...process.env }
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = WWW
    process.env.INDEXNOW_KEY = KEY
    process.env.SITE_ENV = 'production'
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    process.env = { ...env }
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reads and validates INDEXNOW_KEY from env', () => {
    expect(indexNowKey()).toBe(KEY)
    process.env.INDEXNOW_KEY = `  ${KEY}\n`
    expect(indexNowKey()).toBe(KEY)
    process.env.INDEXNOW_KEY = 'short'
    expect(indexNowKey()).toBeNull()
    process.env.INDEXNOW_KEY = 'has spaces in it!'
    expect(indexNowKey()).toBeNull()
    delete process.env.INDEXNOW_KEY
    expect(indexNowKey()).toBeNull()
  })

  it('serves the key file, 404 without a key', async () => {
    const res = keyFile()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/plain')
    expect(await res.text()).toBe(KEY)
    delete process.env.INDEXNOW_KEY
    expect(keyFile().status).toBe(404)
  })

  it('payload: canonical host, keyLocation on that host, deduped and same-host URLs only', () => {
    const p = buildIndexNowPayload([`${WWW}/a`, `${WWW}/a`, 'https://etleq.com/b', 'nope', `${WWW}/en/c`], KEY)
    expect(p).toEqual({
      host: 'www.etleq.com',
      key: KEY,
      keyLocation: `${WWW}${INDEXNOW_KEY_PATH}`,
      urlList: [`${WWW}/a`, `${WWW}/en/c`],
    })
    expect(buildIndexNowPayload(['https://other.com/x'], KEY)).toBeNull()
  })

  it('pings api.indexnow.org in production', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    await pingIndexNow([`${WWW}/models/x`, `${WWW}/en/models/x`])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.indexnow.org/indexnow')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toMatchObject({
      host: 'www.etleq.com',
      key: KEY,
      keyLocation: `${WWW}/indexnow-key.txt`,
      urlList: [`${WWW}/models/x`, `${WWW}/en/models/x`],
    })
  })

  it('is a logged dry run outside production or without a valid key', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    process.env.SITE_ENV = 'staging'
    await pingIndexNow([`${WWW}/a`])
    process.env.SITE_ENV = 'production'
    process.env.INDEXNOW_KEY = 'bad'
    await pingIndexNow([`${WWW}/a`])
    expect(fetchMock).not.toHaveBeenCalled()
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('dry run (SITE_ENV=staging)'), `${WWW}/a`)
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('invalid INDEXNOW_KEY'), `${WWW}/a`)
  })

  it('never throws when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
    await expect(pingIndexNow([`${WWW}/a`])).resolves.toBeUndefined()
  })

  it('runAfterResponse runs the task directly outside a request', async () => {
    const task = vi.fn().mockResolvedValue(undefined)
    await runAfterResponse(task)
    expect(task).toHaveBeenCalledTimes(1)
  })
})
