import { buildLlmsTxt } from '@/components/seo/llms'
import { findPublished, getSeoDefaults } from '@/components/seo/server-data'

// Optional /llms.txt (brief §12). Content lives in src/components/seo/llms.ts.
export const revalidate = 3600

export async function GET() {
  const [seoEn, seoAr, models, solutions, guides] = await Promise.all([
    getSeoDefaults('en'),
    getSeoDefaults('ar'),
    findPublished('models', { locale: 'en', limit: 50 }),
    findPublished('solutions', { locale: 'en', limit: 20 }),
    findPublished('guides', { locale: 'en', limit: 30 }),
  ])
  const body = buildLlmsTxt({
    oneLiner: { en: seoEn?.oneLiner, ar: seoAr?.oneLiner },
    models,
    solutions,
    guides,
    includeSamples: process.env.SITE_ENV !== 'production',
  })
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
