import { absoluteUrl, DEFAULT_ONE_LINER } from '@/lib/seo'

// Optional /llms.txt (brief §12): site summary + hubs + top pages, generated from the CMS.

const HUBS: Array<{ path: string; en: string; ar: string }> = [
  { path: '/launch-30', en: 'Launch 30: the offer', ar: 'اطلق 30: العرض' },
  { path: '/how-it-works', en: 'How it works', ar: 'كيف نعمل' },
  { path: '/models', en: 'SaaS models library', ar: 'مكتبة نماذج SaaS' },
  { path: '/cost', en: 'Cost guides', ar: 'أدلة التكلفة' },
  { path: '/projects', en: 'Projects and case studies', ar: 'المشاريع' },
  { path: '/blog', en: 'Blog', ar: 'المدونة' },
  { path: '/news', en: 'News', ar: 'الأخبار' },
  { path: '/faq', en: 'FAQ', ar: 'الأسئلة الشائعة' },
  { path: '/about', en: 'About Etleq', ar: 'من نحن' },
  { path: '/scorecard', en: 'Readiness scorecard', ar: 'تقييم الجاهزية' },
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
export function buildLlmsTxt({ oneLiner, models = [], solutions = [], guides = [], includeSamples }: LlmsInput): string {
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
