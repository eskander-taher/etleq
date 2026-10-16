import { expect, test, type Page } from '@playwright/test'
import arMsgs from '../../src/messages/ar/scorecard.json' with { type: 'json' }
import enMsgs from '../../src/messages/en/scorecard.json' with { type: 'json' }
import { setConsent } from './helpers'

/** Highest-scoring answer per question (src/lib/scoring.ts defaults). */
const BEST: Record<string, string> = {
  business: 'gt5m',
  budget: 'gt10k',
  marketer: 'me',
  audience: 'gt5k',
  country: 'ksa_uae',
  timeline: 'month',
  decisionMaker: 'yes',
  soldOnline: 'yes',
  hours: 'gt8',
  commercialReg: 'yes',
}

async function answerAll(page: Page, next: string, submit: string) {
  for (let step = 0; step < 20; step++) {
    const nameField = page.locator('input[name="name"]')
    if (await nameField.isVisible().catch(() => false)) break

    const radios = page.locator('fieldset input[type="radio"]')
    const textarea = page.locator('textarea')
    await expect(radios.first().or(textarea.first()).or(nameField)).toBeAttached()

    if (await radios.count()) {
      const key = (await radios.first().getAttribute('name')) || ''
      const best = BEST[key]
      const target = best ? page.locator(`input[type="radio"][value="${best}"]`) : page.locator('input[type="radio"]').first()
      const heading = await page.locator('main h2').first().textContent()
      // Click the label (mouse selection auto-advances).
      await (best ? page.locator('label', { has: target }) : page.locator('fieldset label').first()).click()
      await expect(page.locator('main h2').first())
        .not.toHaveText(heading || '', { timeout: 5000 })
        .catch(async () => {
          await page.getByRole('button', { name: next }).click()
        })
    } else if (await textarea.count()) {
      await textarea.first().fill('Bookings for 40 clinics in Riyadh within three months.')
      await page.getByRole('button', { name: next }).click()
    }
  }

  await page.locator('input[name="name"]').fill('Playwright Test')
  await page.locator('input[name="phone"]').fill('501234567')
  await page.locator('input[name="email"]').fill('e2e@example.com')
  await page.locator('input[name="consent"]').check({ force: true })
  await page.getByRole('button', { name: submit }).click()
}

for (const [locale, prefix, t] of [
  ['ar', '', arMsgs],
  ['en', '/en', enMsgs],
] as const) {
  test(`scorecard completes in ${locale} and reaches tier ready`, async ({ page, baseURL }) => {
    test.slow()
    await setConsent(page, baseURL)
    await page.goto(`${prefix}/scorecard`)
    await expect(page.locator('html')).toHaveAttribute('lang', locale)
    await answerAll(page, t.next, t.contact.submit)

    await page.waitForURL(new RegExp(`${prefix}/scorecard/result`), { timeout: 20_000 })
    await expect(page.getByText(t.result.ready.badge).first()).toBeVisible()
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })
}
