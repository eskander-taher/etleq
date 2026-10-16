import { getTranslations } from 'next-intl/server'
import { ArrowRight, Mail } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Container } from '@/components/ui/container'
import { SmartLink } from '@/components/ui/smart-link'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { Logo } from './Logo'
import { LanguageSwitcher } from './LanguageSwitcher'
import { CookieSettingsButton } from './CookieSettingsButton'
import { FALLBACK_FOOTER_COLUMNS, LEGAL_LINKS } from './nav-config'
import type { LegalEntity, ShellData } from './shell-data'

export function countryName(code: string | null | undefined, locale: Locale) {
  if (!code) return ''
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

const linkClass =
  'inline-flex min-h-10 items-center text-sand-300 transition-colors duration-200 hover:text-sand-50 hover:underline hover:underline-offset-4'

/** One entity: only the fields present in SiteSettings are shown (missing facts are omitted). */
export async function EntityDetails({ entity, locale, tone = 'dark' }: { entity: LegalEntity; locale: Locale; tone?: 'dark' | 'light' }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  const muted = tone === 'dark' ? 'text-sand-300' : 'text-ink-600'
  return (
    <div className="text-sm">
      <p className="font-semibold">{entity.legalName}</p>
      {entity.country ? <p className={muted}>{countryName(entity.country, locale)}</p> : null}
      {entity.crNumber ? (
        <p className={muted}>
          {t('footer.crNumber')}: <bdi className="num">{entity.crNumber}</bdi>
        </p>
      ) : null}
      {entity.vatNumber ? (
        <p className={muted}>
          {t('footer.vatNumber')}: <bdi className="num">{entity.vatNumber}</bdi>
        </p>
      ) : null}
      {entity.address ? <address className={`not-italic ${muted}`}>{entity.address}</address> : null}
    </div>
  )
}

export async function Footer({ locale, data }: { locale: Locale; data: ShellData }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  const { footer, settings } = data

  const columns = footer.columns.length
    ? footer.columns
    : FALLBACK_FOOTER_COLUMNS.map((c) => ({
        title: t(`footer.${c.key}`),
        links: c.links.map((l) => ({ label: t(`nav.${l.key}`), href: l.href })),
      }))
  const legal = footer.legalLinks.length
    ? footer.legalLinks
    : LEGAL_LINKS.map((l) => ({ label: t(`legalLinks.${l.key}`), href: l.href }))
  const year = new Date().getFullYear()

  return (
    <footer className="bg-ink-950 text-sand-50" data-tone="dark">
      <Container className="py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand + playbook (newsletter slot: workstream C owns the form; link for now) */}
          <div className="lg:col-span-4">
            <Link href="/" aria-label={t('brand.home')} className="inline-flex min-h-12 items-center rounded-button">
              <Logo variant={locale} />
            </Link>
            <p className="mt-4 max-w-sm text-sand-300">{t('footer.about')}</p>
            <div className="mt-8 rounded-card border border-ink-800 bg-ink-800/40 p-5">
              <p className="font-display font-semibold">{t('footer.newsletterTitle')}</p>
              <p className="mt-1 text-sm text-sand-300">{t('footer.newsletterText')}</p>
              <Link
                href="/playbook"
                className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold text-ignition-500 hover:underline hover:underline-offset-4"
              >
                {t('footer.newsletterCta')}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <nav aria-label={t('a11y.footerNav')} className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="font-display text-sm font-semibold text-sand-50">{col.title}</h2>
                <ul className="mt-3">
                  {col.links.map((l) => (
                    <li key={`${l.href}-${l.label}`}>
                      <SmartLink href={l.href} className={linkClass} newTabLabel={t('a11y.opensNewTab')}>
                        {l.label}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Help sits in the same place on every page (WCAG 3.2.6) */}
            <div className="col-span-2 sm:col-span-1">
              <h2 className="font-display text-sm font-semibold text-sand-50">{t('footer.contact')}</h2>
              <ul className="mt-3">
                <li>
                  <WhatsAppButton
                    appearance="link"
                    number={settings.whatsappNumber}
                    message={t('whatsapp.defaultMessage')}
                    placement="footer"
                    label={t('cta.whatsappShort')}
                    className="min-h-10 font-normal text-sand-300 hover:text-sand-50"
                  />
                </li>
                {settings.contactEmail ? (
                  <li>
                    <a href={`mailto:${settings.contactEmail}`} className={`${linkClass} gap-2`}>
                      <Mail className="size-5" aria-hidden="true" />
                      <bdi dir="ltr">{settings.contactEmail}</bdi>
                    </a>
                  </li>
                ) : null}
                <li>
                  <Link href="/contact" className={linkClass}>
                    {t('nav.contact')}
                  </Link>
                </li>
              </ul>
              {footer.social.length ? (
                <>
                  <h2 className="mt-6 font-display text-sm font-semibold text-sand-50">{t('footer.follow')}</h2>
                  <ul className="mt-3 flex flex-wrap gap-x-4">
                    {footer.social.map((s) => (
                      <li key={s.url}>
                        <a href={s.url} target="_blank" rel="noopener noreferrer me" className={linkClass}>
                          <bdi>{s.platform}</bdi>
                          <span className="sr-only"> {t('a11y.opensNewTab')}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </nav>
        </div>

        {settings.legalEntities.length ? (
          <section aria-labelledby="footer-entities" className="mt-14 border-t border-ink-800 pt-8">
            <h2 id="footer-entities" className="font-display text-sm font-semibold">
              {t('footer.entities')}
            </h2>
            <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {settings.legalEntities.map((e, i) => (
                <EntityDetails key={`${e.legalName}-${i}`} entity={e} locale={locale} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-14 flex flex-col gap-6 border-t border-ink-800 pt-8 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label={t('a11y.legalNav')}>
            <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {legal.map((l) => (
                <li key={l.href}>
                  <SmartLink href={l.href} className={linkClass}>
                    {l.label}
                  </SmartLink>
                </li>
              ))}
              <li>
                <CookieSettingsButton className={`${linkClass} cursor-pointer`}>{t('footer.cookieSettings')}</CookieSettingsButton>
              </li>
            </ul>
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            <LanguageSwitcher tone="dark" className="-mx-3" />
            <p className="text-sm text-sand-300">{t('footer.rights', { year: String(year) })}</p>
          </div>
        </div>
      </Container>
    </footer>
  )
}
