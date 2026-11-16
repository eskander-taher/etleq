import { absoluteUrl, DEFAULT_ONE_LINER } from '@/lib/seo'

// Optional /llms.txt (brief §12): site summary + hubs + top pages, generated from the CMS.

const HUBS: Array<{ path: string; en: string; ar: string }> = [
  { path: '/audit', en: 'Production Audit — SAR 750', ar: 'الفحص التقني — 750 ريال' },
  { path: '/method', en: 'Our method', ar: 'منهجيتنا' },
  { path: '/services', en: 'Services', ar: 'الخدمات' },
  { path: '/pricing', en: 'Pricing', ar: 'الأسعار' },
  { path: '/work', en: 'Proof and sample audit', ar: 'النتائج ونموذج الفحص' },
  { path: '/blog', en: 'Blog', ar: 'المدونة' },
  { path: '/news', en: 'News', ar: 'الأخبار' },
  { path: '/faq', en: 'FAQ', ar: 'الأسئلة الشائعة' },
  { path: '/about', en: 'About Etleq', ar: 'من نحن' },
  { path: '/contact', en: 'Book a free call', ar: 'احجز مكالمة مجانية' },
  { path: '/careers', en: 'Careers', ar: 'الوظائف' },
]

type Doc = Record<string, unknown>

export interface LlmsInput {
  oneLiner?: { ar?: string | null; en?: string | null }
  models?: Doc[]
  solutions?: Doc[]
  guides?: Doc[]
  includeSamples?: boolean
}

/** Pure llms.txt builder. Every URL comes from `absoluteUrl` (NEXT_PUBLIC_SITE_URL). */
export function buildLlmsTxt({
  oneLiner,
  models = [],
  solutions = [],
  guides = [],
  includeSamples,
}: LlmsInput): string {
  const ok = (d: Doc) => typeof d.slug === 'string' && (includeSamples || !d.isSample)
  const list = (docs: Doc[], base: (d: Doc) => string) =>
    docs
      .filter(ok)
      .map((d) => `- [${String(d.title || d.slug)}](${absoluteUrl('en', `${base(d)}/${d.slug as string}`)})`)
      .join('\n')

  const lines: string[] = [
    '# Etleq (اطلق)',
    '',
    `> ${oneLiner?.en || DEFAULT_ONE_LINER.en}`,
    `> ${oneLiner?.ar || DEFAULT_ONE_LINER.ar}`,
    '',
    `Arabic pages live at ${absoluteUrl('ar', '/')} and English pages under ${absoluteUrl('en', '/')}. Prices are shown in SAR and USD.`,
    '',
    '## Main pages',
    ...HUBS.map((h) => `- [${h.en}](${absoluteUrl('en', h.path)}) · [${h.ar}](${absoluteUrl('ar', h.path)})`),
  ]
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
  return lines.join('\n')
}
