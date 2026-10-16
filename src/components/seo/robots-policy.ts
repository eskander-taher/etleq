import type { MetadataRoute } from 'next'

export interface AiCrawlerToggles {
  allowTraining?: boolean | null
  allowSearch?: boolean | null
  allowUser?: boolean | null
}

/** Paths never crawled, in both locales. */
export const DISALLOW = [
  '/admin',
  '/api',
  '/hooks',
  '/scorecard/result',
  '/en/scorecard/result',
  '/thank-you',
  '/en/thank-you',
  '/design',
  '/en/design',
]

/** Classic search engines: always allowed (blocking them would deindex the site). */
export const SEARCH_ENGINES = ['Googlebot', 'Bingbot']
/** AI search / answer engines (brief §12). Follow `allowSearch`. */
export const AI_SEARCH_BOTS = ['OAI-SearchBot', 'OAI-AdsBot', 'PerplexityBot', 'Claude-SearchBot']
/** User-initiated fetchers. Follow `allowUser`. */
export const AI_USER_BOTS = ['ChatGPT-User', 'Perplexity-User', 'Claude-User']
/** Model-training crawlers. Follow `allowTraining`. */
export const AI_TRAINING_BOTS = ['GPTBot', 'ClaudeBot', 'Google-Extended']

/** Missing toggles default to allow (brief §12 recommendation). */
const on = (v: boolean | null | undefined) => v !== false

export interface RobotsPolicyInput {
  siteUrl: string
  aiCrawlers?: AiCrawlerToggles | null
  staging?: boolean
  sitemaps?: string[]
}

/** Pure robots.txt builder. Specific UA groups repeat the disallow list because a matching group replaces `*`. */
export function buildRobotsPolicy({
  siteUrl,
  aiCrawlers,
  staging,
  sitemaps = [],
}: RobotsPolicyInput): MetadataRoute.Robots {
  if (staging) {
    return { rules: [{ userAgent: '*', disallow: '/' }] }
  }
  const allowed = { allow: '/', disallow: DISALLOW }
  const blocked = { disallow: '/' }
  const t = aiCrawlers || {}
  const rules: NonNullable<Extract<MetadataRoute.Robots['rules'], unknown[]>> = [
    { userAgent: '*', ...allowed },
    { userAgent: SEARCH_ENGINES, ...allowed },
    { userAgent: AI_SEARCH_BOTS, ...(on(t.allowSearch) ? allowed : blocked) },
    { userAgent: AI_USER_BOTS, ...(on(t.allowUser) ? allowed : blocked) },
    { userAgent: AI_TRAINING_BOTS, ...(on(t.allowTraining) ? allowed : blocked) },
  ]
  return {
    rules,
    sitemap: sitemaps.length ? sitemaps : [`${siteUrl}/sitemap.xml`],
    host: siteUrl,
  }
}
