import { expect, test } from '@playwright/test'
import { localized, setConsent } from './helpers'

const WIDTHS = [360, 768, 1280]
const ROUTES = ['/', '/launch-30', '/scorecard', '/models', '/faq']

test.describe('RTL/LTR screenshots', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one engine is enough for visual baselines')
  // Baselines are recorded on Windows (the founders' machines); font rendering differs on Linux CI runners.
  test.skip(process.platform !== 'win32', 'visual baselines exist for win32 only; refresh with --update-snapshots')

  for (const locale of ['ar', 'en'] as const) {
    for (const route of ROUTES) {
      for (const width of WIDTHS) {
        const path = localized(locale, route)
        test(`${locale} ${path} @${width}`, async ({ page, baseURL }) => {
          await setConsent(page, baseURL)
          await page.setViewportSize({ width, height: 900 })
          await page.goto(path)
          await page.evaluate(() => document.fonts.ready)
          // No horizontal overflow is the most common RTL bug.
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          )
          expect(overflow, 'horizontal overflow').toBeLessThanOrEqual(1)
          await expect(page).toHaveScreenshot(
            `${locale}${route === '/' ? '-home' : route.replace(/\//g, '-')}-${width}.png`,
            {
              fullPage: true,
              animations: 'disabled',
              mask: [page.locator('[data-dynamic]'), page.locator('video'), page.locator('iframe')],
            },
          )
        })
      }
    }
  }
})
