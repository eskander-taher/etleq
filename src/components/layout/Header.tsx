import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Container } from '@/components/ui/container'
import { Logo } from './Logo'
import { NavLink } from './NavLink'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileMenu } from './MobileMenu'
import { FocusSwitch } from './FocusSwitch'
import { PageScorecardLink, PageWhatsAppLink } from './page-cta'
import { FALLBACK_NAV } from './nav-config'
import type { ShellData } from './shell-data'

export async function Header({ locale, data }: { locale: Locale; data: ShellData }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  const items = data.header.nav.length
    ? data.header.nav
    : FALLBACK_NAV.map((n) => ({ label: t(`nav.${n.key}`), href: n.href }))
  // One primary CTA label site-wide (brief section 9); the CMS may override the wording.
  const ctaLabel = data.header.ctaLabel || t('cta.scorecard')
  const waNumber = data.settings.whatsappNumber
  const waMessage = t('whatsapp.defaultMessage')

  const logo = (
    <Link href="/" aria-label={t('brand.home')} className="inline-flex min-h-12 items-center rounded-button">
      <Logo variant={locale} />
    </Link>
  )
  // Arabic glyphs read small at text-sm; the short Arabic label still fits a 360px header at text-base.
  const ctaText = locale === 'ar' ? 'text-base' : 'text-sm'
  const whatsappIcon = (className?: string) => (
    <PageWhatsAppLink
      appearance="icon"
      number={waNumber}
      defaultMessage={waMessage}
      placement="header"
      label={t('a11y.whatsappIcon')}
      className={className}
    />
  )

  return (
    <header className="sticky top-0 z-40 border-b border-sand-300/80 bg-sand-50/90 backdrop-blur-md supports-[backdrop-filter]:bg-sand-50/80">
      <Container className="flex h-16 items-center gap-2 lg:h-[72px] lg:gap-6">
        {logo}

        <FocusSwitch
          focused={
            // Scorecard flow: no nav and no competing CTA; language and WhatsApp stay reachable.
            <div className="ms-auto flex items-center gap-1">
              <LanguageSwitcher />
              {whatsappIcon()}
            </div>
          }
        >
          <nav aria-label={t('a11y.mainNav')} className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    className="relative inline-flex min-h-12 items-center rounded-button px-3 text-[0.95rem] font-medium text-ink-600 transition-colors duration-200 hover:text-ink-950"
                    activeClassName="text-ink-950 after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:rounded-full after:bg-ignition-500"
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitcher className="hidden md:inline-flex" />
            {whatsappIcon('hidden sm:inline-flex')}
            <PageScorecardLink
              label={ctaLabel}
              location="header"
              className={cn(
                buttonVariants({ variant: 'primary', size: 'sm' }),
                'ms-1 min-h-11 whitespace-nowrap px-3 sm:px-4',
                ctaText,
              )}
            />
            <div className="lg:hidden">
              <MobileMenu
                items={items}
                labels={{ open: t('a11y.openMenu'), close: t('a11y.closeMenu'), nav: t('a11y.mobileNav') }}
                logo={<Logo variant={locale} />}
                cta={
                  <PageScorecardLink
                    label={ctaLabel}
                    location="mobile_menu"
                    className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'min-h-12 w-full text-base')}
                  />
                }
                whatsapp={
                  <PageWhatsAppLink
                    number={waNumber}
                    defaultMessage={waMessage}
                    placement="mobile_menu"
                    label={t('cta.whatsapp')}
                  />
                }
              />
            </div>
          </div>
        </FocusSwitch>
      </Container>
    </header>
  )
}
