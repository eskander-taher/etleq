/**
 * Fallback navigation used until the `header` / `footer` globals are filled in the CMS.
 * Labels are message keys in `common.nav` / `common.legalLinks`.
 * Header order follows brief section 7, row 1.
 */
export const FALLBACK_NAV = [
  { key: 'launch30', href: '/launch-30' },
  { key: 'models', href: '/models' },
  { key: 'solutions', href: '/solutions' },
  { key: 'projects', href: '/projects' },
  { key: 'blog', href: '/blog' },
  { key: 'about', href: '/about' },
] as const

export const FALLBACK_FOOTER_COLUMNS = [
  {
    key: 'explore',
    links: [
      { key: 'launch30', href: '/launch-30' },
      { key: 'howItWorks', href: '/how-it-works' },
      { key: 'models', href: '/models' },
      { key: 'solutions', href: '/solutions' },
      { key: 'projects', href: '/projects' },
      { key: 'blog', href: '/blog' },
      { key: 'news', href: '/news' },
    ],
  },
  {
    key: 'company',
    links: [
      { key: 'about', href: '/about' },
      { key: 'faq', href: '/faq' },
      { key: 'careers', href: '/careers' },
      { key: 'contact', href: '/contact' },
    ],
  },
] as const

export const LEGAL_LINKS = [
  { key: 'privacy', href: '/privacy' },
  { key: 'terms', href: '/terms' },
  { key: 'disclaimer', href: '/disclaimer' },
  { key: 'cookies', href: '/cookies' },
  { key: 'accessibility', href: '/accessibility' },
] as const

/** Pages where the sticky mobile CTA bar would compete with the page's own action. */
export const NO_STICKY_BAR = ['/scorecard', '/book']
