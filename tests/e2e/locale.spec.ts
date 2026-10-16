import { expect, test } from '@playwright/test'
import { setConsent } from './helpers'

test.beforeEach(async ({ page, baseURL }) => setConsent(page, baseURL))

test('Arabic home at / is lang=ar dir=rtl', async ({ page }) => {
  const res = await page.goto('/')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
})

test('English home at /en is lang=en dir=ltr', async ({ page }) => {
  const res = await page.goto('/en')
  expect(res?.status()).toBe(200)
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
})

test.describe('no language redirects', () => {
  test.use({ extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } })

  test('Accept-Language: en on / still serves Arabic without a redirect', async ({ page, request }) => {
    const raw = await request.get('/', { maxRedirects: 0 })
    expect(raw.status()).toBe(200)
    await page.goto('/')
    expect(new URL(page.url()).pathname).toBe('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  })
})

test('self canonical and hreflang on home', async ({ page, baseURL }) => {
  await page.goto('/en')
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
  expect(canonical?.endsWith('/en')).toBe(true)
  const xDefault = page.locator('link[rel="alternate"][hreflang="x-default"]')
  if (await xDefault.count()) {
    const href = await xDefault.getAttribute('href')
    expect(new URL(href!).pathname).toBe('/')
  }
  expect(baseURL).toBeTruthy()
})

test('machine files respond', async ({ request }) => {
  for (const [path, type] of [
    ['/robots.txt', 'text/plain'],
    ['/sitemap.xml', 'xml'],
    ['/sitemaps/sitemap/static.xml', 'xml'],
    ['/rss.xml', 'xml'],
    ['/en/rss.xml', 'xml'],
    ['/llms.txt', 'text/plain'],
  ] as const) {
    const res = await request.get(path)
    expect(res.status(), path).toBe(200)
    expect(res.headers()['content-type'], path).toContain(type)
  }
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Disallow: /admin')
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/)
})
