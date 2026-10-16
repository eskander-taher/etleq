import type { Page } from '@playwright/test'
import { CONSENT_COOKIE, POLICY_VERSION } from '../../src/lib/consent'

/** Pre-set a consent choice so the banner does not cover the page. */
export async function setConsent(
  page: Page,
  baseURL: string | undefined,
  choice: { analytics: boolean; marketing: boolean } = { analytics: false, marketing: false },
) {
  const url = new URL(baseURL || 'http://localhost:3000')
  await page.context().addCookies([
    {
      name: CONSENT_COOKIE,
      value: encodeURIComponent(
        JSON.stringify({
          categories: { necessary: true, ...choice },
          at: new Date().toISOString(),
          policyVersion: POLICY_VERSION,
        }),
      ),
      domain: url.hostname,
      path: '/',
    },
  ])
}

/** Third-party hosts that must never be contacted before consent. */
export const TRACKER_HOSTS = [
  'google-analytics.com',
  'googletagmanager.com',
  'analytics.google.com',
  'connect.facebook.net',
  'facebook.com/tr',
  'sc-static.net',
  'tr.snapchat.com',
  'analytics.tiktok.com',
  'clarity.ms',
]

export const isTracker = (url: string) => TRACKER_HOSTS.some((h) => url.includes(h))

/** Key public routes (locale-less). */
export const KEY_ROUTES = [
  '/',
  '/launch-30',
  '/how-it-works',
  '/scorecard',
  '/models',
  '/blog',
  '/faq',
  '/contact',
  '/about',
  '/careers',
]

export const localized = (locale: 'ar' | 'en', path: string) =>
  locale === 'ar' ? path : path === '/' ? '/en' : `/en${path}`
