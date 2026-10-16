import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.PORT || 3000)
const baseURL = process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || `http://localhost:${PORT}`
const isCI = Boolean(process.env.CI)

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000, toHaveScreenshot: { maxDiffPixelRatio: 0.02 } },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /(locale|consent|scorecard)\.spec\.ts/ },
  ],
  // In CI the app is built first, then served with `pnpm start`. Locally, run the app yourself
  // (or set PLAYWRIGHT_BASE_URL to a deployed staging URL).
  webServer:
    isCI && !process.env.PLAYWRIGHT_BASE_URL
      ? {
          command: 'pnpm start',
          port: PORT,
          reuseExistingServer: false,
          timeout: 120_000,
          env: { PORT: String(PORT) },
        }
      : undefined,
})
