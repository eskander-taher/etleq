import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { KEY_ROUTES, localized, setConsent } from './helpers'

for (const locale of ['ar', 'en'] as const) {
  for (const route of KEY_ROUTES) {
    const path = localized(locale, route)
    test(`axe: no serious/critical violations on ${path}`, async ({ page, baseURL }) => {
      await setConsent(page, baseURL)
      const res = await page.goto(path)
      expect(res?.status()).toBeLessThan(400)
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze()
      const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      expect(bad.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([])
    })
  }

  test(`axe: consent banner is accessible (${locale})`, async ({ page }) => {
    await page.goto(localized(locale, '/'))
    const banner = page.getByTestId('consent-banner')
    await expect(banner).toBeVisible()
    const results = await new AxeBuilder({ page }).include('[data-testid="consent-banner"]').analyze()
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
    expect(bad.map((v) => v.id)).toEqual([])
  })
}
