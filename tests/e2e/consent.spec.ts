import { expect, test } from '@playwright/test'
import ar from '../../src/messages/ar/consent.json' with { type: 'json' }
import en from '../../src/messages/en/consent.json' with { type: 'json' }
import { CONSENT_COOKIE } from '../../src/lib/consent'
import { isTracker } from './helpers'

for (const [locale, path, t] of [
  ['ar', '/', ar],
  ['en', '/en', en],
] as const) {
  test(`no tracker requests before consent (${locale})`, async ({ page }) => {
    const hits: string[] = []
    page.on('request', (r) => {
      if (isTracker(r.url())) hits.push(r.url())
    })
    await page.goto(path)
    await expect(page.getByTestId('consent-banner')).toBeVisible()
    // Browse a bit without choosing.
    await page.mouse.wheel(0, 2000)
    await page.waitForTimeout(1500)
    expect(hits).toEqual([])
  })

  test(`banner offers equal choices in page language and reject keeps trackers off (${locale})`, async ({
    page,
    context,
  }) => {
    const hits: string[] = []
    page.on('request', (r) => {
      if (isTracker(r.url())) hits.push(r.url())
    })
    await page.goto(path)
    const banner = page.getByTestId('consent-banner')
    const accept = banner.getByRole('button', { name: t.acceptAll })
    const reject = banner.getByRole('button', { name: t.rejectAll })
    const settings = banner.getByRole('button', { name: t.settings })
    await expect(accept).toBeVisible()
    await expect(reject).toBeVisible()
    await expect(settings).toBeVisible()
    // Equally prominent: same class list.
    expect(await accept.getAttribute('class')).toBe(await reject.getAttribute('class'))
    expect(await accept.getAttribute('class')).toBe(await settings.getAttribute('class'))

    await reject.click()
    await expect(banner).toBeHidden()
    const cookie = (await context.cookies()).find((c) => c.name === CONSENT_COOKIE)
    expect(cookie).toBeDefined()
    const stored = JSON.parse(decodeURIComponent(cookie!.value))
    expect(stored.categories).toEqual({ necessary: true, analytics: false, marketing: false })

    await page.reload()
    await expect(page.getByTestId('consent-banner')).toBeHidden()
    await page.waitForTimeout(1000)
    expect(hits).toEqual([])
  })

  test(`banner can be reopened from the footer event (${locale})`, async ({ page }) => {
    await page.goto(path)
    await page.getByTestId('consent-banner').getByRole('button', { name: t.rejectAll }).click()
    await page.evaluate(() => window.dispatchEvent(new Event('etleq:open-consent')))
    const banner = page.getByTestId('consent-banner')
    await expect(banner).toBeVisible()
    await expect(banner.getByRole('checkbox', { name: new RegExp(t.categories.analytics.name) })).not.toBeChecked()
  })
}

test('banner does not block the page on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  const banner = page.getByTestId('consent-banner')
  await expect(banner).toBeVisible()
  expect(await banner.getAttribute('aria-modal')).toBe('false')
  const box = await banner.boundingBox()
  expect(box!.height).toBeLessThan(740 * 0.8 + 1)
  // Content above the sheet stays clickable.
  const firstLink = page.locator('main a, header a').first()
  await expect(firstLink).toBeVisible()
})
