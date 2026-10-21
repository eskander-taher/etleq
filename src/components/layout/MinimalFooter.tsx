import { getTranslations } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { Container } from '@/components/ui/container'
import { SmartLink } from '@/components/ui/smart-link'
import { CookieSettingsButton } from './CookieSettingsButton'
import { LEGAL_LINKS } from './nav-config'
import type { ShellData } from './shell-data'

const linkClass =
  'inline-flex min-h-11 items-center text-sand-300 transition-colors duration-200 hover:text-sand-50 hover:underline hover:underline-offset-4'

/** Footer for focused flows (scorecard): only the legal line, so nothing pulls the visitor away. */
export async function MinimalFooter({ locale, data }: { locale: Locale; data: ShellData }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  const legal = data.footer.legalLinks.length
    ? data.footer.legalLinks
    : LEGAL_LINKS.map((l) => ({ label: t(`legalLinks.${l.key}`), href: l.href }))
  return (
    <footer className="bg-ink-950 text-sand-50" data-tone="dark">
      <Container className="flex flex-col gap-3 py-6 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={t('a11y.legalNav')}>
          <ul className="flex flex-wrap gap-x-5 text-sm">
            {legal.map((l) => (
              <li key={l.href}>
                <SmartLink href={l.href} className={linkClass}>
                  {l.label}
                </SmartLink>
              </li>
            ))}
            <li>
              <CookieSettingsButton className={`${linkClass} cursor-pointer`}>
                {t('footer.cookieSettings')}
              </CookieSettingsButton>
            </li>
          </ul>
        </nav>
        <p className="text-sm text-sand-300">{t('footer.rights', { year: String(new Date().getFullYear()) })}</p>
      </Container>
    </footer>
  )
}
