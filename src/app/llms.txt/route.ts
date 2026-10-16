import { absoluteUrl } from '@/lib/seo'
import { findPublished, getSeoDefaults } from '@/components/seo/server-data'

// Optional /llms.txt (brief §12): site summary + hubs + top pages, generated from the CMS.
export const revalidate = 3600

const HUBS: Array<{ path: string; en: string; ar: string }> = [
  { path: '/launch-30', en: 'Launch 30: the offer', ar: 'إطلاق 30: العرض' },
  { path: '/how-it-works', en: 'How it works', ar: 'كيف نعمل' },
  { path: '/models', en: 'SaaS models library', ar: 'مكتبة نماذج SaaS' },
  { path: '/projects', en: 'Projects and case studies', ar: 'المشاريع' },
  { path: '/blog', en: 'Blog', ar: 'المدونة' },
  { path: '/news', en: 'News', ar: 'الأخبار' },
  { path: '/faq', en: 'FAQ', ar: 'الأسئلة الشائعة' },
  { path: '/about', en: 'About Etleq', ar: 'من نحن' },
  { path: '/scorecard', en: 'Readiness scorecard', ar: 'تقييم الجاهزية' },
  { path: '/careers', en: 'Careers', ar: 'الوظائف' },
]

const FALLBACK_ONE_LINER =
  'Etleq is a SaaS launch studio for Saudi Arabia and the Gulf: we build and launch your SaaS in 30 days at a fixed price, and you own the code.'

export async function GET() {
  const includeSamples = process.env.SITE_ENV !== 'production'
  const [seoEn, seoAr, models, solutions, guides] = await Promise.all([
    getSeoDefaults('en'),
    getSeoDefaults('ar'),
    findPublished('models', { locale: 'en', limit: 50 }),
    findPublished('solutions', { locale: 'en', limit: 20 }),
    findPublished('guides', { locale: 'en', limit: 30 }),
  ])
  const ok = (d: Record<string, unknown>) => typeof d.slug === 'string' && (includeSamples || !d.isSample)
  const list = (docs: Record<string, unknown>[], base: (d: Record<string, unknown>) => string) =>
    docs
      .filter(ok)
      .map((d) => `- [${String(d.title || d.slug)}](${absoluteUrl('en', `${base(d)}/${d.slug as string}`)})`)
      .join('\n')

  const lines: string[] = ['# Etleq (إطلاق)', '', `> ${seoEn?.oneLiner || FALLBACK_ONE_LINER}`]
  if (seoAr?.oneLiner) lines.push(`> ${seoAr.oneLiner}`)
  lines.push(
    '',
    `Arabic pages live at ${absoluteUrl('ar', '/')} and English pages under ${absoluteUrl('en', '/')}. Prices are shown in SAR and USD.`,
    '',
    '## Main pages',
    ...HUBS.map((h) => `- [${h.en}](${absoluteUrl('en', h.path)}) · [${h.ar}](${absoluteUrl('ar', h.path)})`),
  )
  const m = list(models, () => '/models')
  if (m) lines.push('', '## SaaS models', m)
  const s = list(solutions, () => '/solutions')
  if (s) lines.push('', '## Solutions', s)
  const g = list(guides, (d) => (d.type === 'comparison' ? '/compare' : '/cost'))
  if (g) lines.push('', '## Cost guides and comparisons', g)
  lines.push(
    '',
    '## Feeds and sitemaps',
    `- ${absoluteUrl('ar', '/rss.xml')}`,
    `- ${absoluteUrl('en', '/rss.xml')}`,
    `- ${absoluteUrl('ar', '/sitemap.xml')}`,
    '',
  )

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
