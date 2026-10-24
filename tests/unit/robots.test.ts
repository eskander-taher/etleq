import { describe, expect, it } from 'vitest'
import { AI_TRAINING_BOTS, DISALLOW, buildRobotsPolicy } from '@/components/seo/robots-policy'

const SITE = 'https://www.etleq.com'
type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] }

const ruleFor = (rules: Rule[], ua: string) =>
  rules.find((r) => (Array.isArray(r.userAgent) ? r.userAgent.includes(ua) : r.userAgent === ua))

describe('buildRobotsPolicy', () => {
  it('defaults to allow everything except private paths', () => {
    const r = buildRobotsPolicy({ siteUrl: SITE })
    const rules = r.rules as Rule[]
    for (const ua of [
      '*',
      'Googlebot',
      'Bingbot',
      'OAI-SearchBot',
      'ChatGPT-User',
      'OAI-AdsBot',
      'PerplexityBot',
      'Perplexity-User',
      'Claude-SearchBot',
      'Claude-User',
      'GPTBot',
      'ClaudeBot',
      'Google-Extended',
    ]) {
      const rule = ruleFor(rules, ua)
      expect(rule, ua).toBeDefined()
      expect(rule!.allow).toBe('/')
      expect(rule!.disallow).toEqual(DISALLOW)
    }
    expect(DISALLOW).toEqual(
      expect.arrayContaining([
        '/admin',
        '/api',
        '/scorecard/result',
        '/en/scorecard/result',
        '/thank-you',
        '/en/thank-you',
        '/design',
        '/en/design',
        '/hooks',
      ]),
    )
    expect(r.sitemap).toEqual([`${SITE}/sitemap.xml`])
  })

  it('training toggle blocks only training bots', () => {
    const rules = buildRobotsPolicy({ siteUrl: SITE, aiCrawlers: { allowTraining: false } }).rules as Rule[]
    for (const ua of AI_TRAINING_BOTS) expect(ruleFor(rules, ua)!.disallow).toBe('/')
    expect(ruleFor(rules, 'OAI-SearchBot')!.allow).toBe('/')
    expect(ruleFor(rules, 'Googlebot')!.allow).toBe('/')
  })

  it('search and user toggles never block Googlebot or Bingbot', () => {
    const rules = buildRobotsPolicy({ siteUrl: SITE, aiCrawlers: { allowSearch: false, allowUser: false } })
      .rules as Rule[]
    expect(ruleFor(rules, 'PerplexityBot')!.disallow).toBe('/')
    expect(ruleFor(rules, 'Claude-User')!.disallow).toBe('/')
    expect(ruleFor(rules, 'Googlebot')!.allow).toBe('/')
    expect(ruleFor(rules, 'Bingbot')!.allow).toBe('/')
  })

  it('staging disallows everything', () => {
    const r = buildRobotsPolicy({ siteUrl: SITE, staging: true })
    expect(r.rules).toEqual([{ userAgent: '*', disallow: '/' }])
    expect(r.sitemap).toBeUndefined()
  })

  it('null toggles count as allowed', () => {
    const rules = buildRobotsPolicy({ siteUrl: SITE, aiCrawlers: { allowTraining: null } }).rules as Rule[]
    expect(ruleFor(rules, 'GPTBot')!.allow).toBe('/')
  })
})
