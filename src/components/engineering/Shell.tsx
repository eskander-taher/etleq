import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import type { Locale } from '@/i18n/routing'
import { Logo } from '@/components/layout/Logo'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { AlternatePathProvider } from '@/components/layout/alternate'
import { ConsentManager } from '@/components/analytics/ConsentManager'
import { CookieSettingsButton } from '@/components/layout/CookieSettingsButton'
import { EntityDetails, isReal } from '@/components/layout/Footer'
import { getShellData } from '@/components/layout/shell-data'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import { pick, services } from './content'
import { Actions } from './interactive'

const platformNames: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  linkedin: 'LinkedIn',
  x: 'X',
  twitter: 'X',
  facebook: 'Facebook',
  snapchat: 'Snapchat',
  github: 'GitHub',
}

export async function EngineeringShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = (en: string, ar: string) => pick(locale, [en, ar])
  const { settings, footer } = await getShellData(locale)
  return (
    <AlternatePathProvider>
      <div className="engineering-site">
        <a className="eng-skip" href="#main">
          {t('Skip to content', 'انتقل إلى المحتوى')}
        </a>
        <header className="eng-header">
          <div className="eng-wrap eng-header-inner">
            <Link href="/" aria-label={t('Etleq home', 'اطلق الرئيسية')}>
              <Logo variant={locale} />
            </Link>
            <nav className="eng-nav" aria-label={t('Main navigation', 'القائمة الرئيسية')}>
              <Link href="/services">{t('Services', 'الخدمات')}</Link>
              <Link href="/method">{t('Method', 'المنهجية')}</Link>
              <Link href="/pricing">{t('Pricing', 'الأسعار')}</Link>
            </nav>
            <div className="eng-header-actions">
              <LanguageSwitcher tone="dark" />
              <Link className="eng-button eng-header-cta" href="/audit#start">
                {t('Get the audit · SAR 750', 'اطلب الفحص · 750 ريال')}
              </Link>
            </div>
            <details className="eng-menu">
              <summary aria-label={t('Menu', 'القائمة')}>☰</summary>
              <nav>
                <Link href="/services">{t('Services', 'الخدمات')}</Link>
                <Link href="/method">{t('Method', 'المنهجية')}</Link>
                <Link href="/pricing">{t('Pricing', 'الأسعار')}</Link>
                <Link href="/work">{t('Proof', 'النتائج')}</Link>
                <Link href="/about">{t('About', 'عن اطلق')}</Link>
                <Link href="/contact">{t('Book a free call', 'احجز مكالمة مجانية')}</Link>
              </nav>
            </details>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="eng-footer">
          <div className="eng-wrap">
            <div className="eng-footer-top">
              <div>
                <Link href="/">
                  <Logo variant={locale} />
                </Link>
                <p>
                  {t('Audited software. Fixed modules. Fully yours.', 'برمجيات مفحوصة. وحدات بسعر ثابت. ملكك بالكامل.')}
                </p>
                {settings.contactEmail && (
                  <a href={`mailto:${settings.contactEmail}`}>
                    <bdi>{settings.contactEmail}</bdi>
                  </a>
                )}
                {settings.whatsappNumber && (
                  <WhatsAppButton
                    number={settings.whatsappNumber}
                    message={t('I would like to discuss a production audit.', 'أود الاستفسار عن الفحص التقني.')}
                    placement="engineering_footer"
                    appearance="link"
                    label={t('WhatsApp', 'واتساب')}
                  />
                )}
              </div>
              <nav aria-label={t('Services', 'الخدمات')}>
                <div className="eng-footer-heading">{t('Services', 'الخدمات')}</div>
                {services.map((s) => (
                  <Link key={s.slug} href={`/${s.slug}`}>
                    {pick(locale, s.name)}
                  </Link>
                ))}
              </nav>
              <nav aria-label={t('Company', 'الشركة')}>
                <div className="eng-footer-heading">{t('Company', 'الشركة')}</div>
                {[
                  ['method', 'Method', 'المنهجية'],
                  ['pricing', 'Pricing', 'الأسعار'],
                  ['work', 'Proof', 'النتائج'],
                  ['about', 'About', 'عن اطلق'],
                  ['contact', 'Contact', 'تواصل معنا'],
                  ['faq', 'FAQ', 'الأسئلة الشائعة'],
                  ['learn', 'Learn', 'المعرفة'],
                ].map(([url, en, ar]) => (
                  <Link key={url} href={`/${url}`}>
                    {t(en, ar)}
                  </Link>
                ))}
                {footer.social.map((s) => (
                  <a key={s.url} href={s.url} rel="noopener noreferrer" target="_blank">
                    {platformNames[s.platform.toLowerCase()] ?? s.platform}
                  </a>
                ))}
              </nav>
            </div>
            {settings.legalEntities
              .filter((e) => isReal(e.legalName))
              .map((e, i) => (
                <EntityDetails key={i} entity={e} locale={locale} />
              ))}
            <div className="eng-footer-bottom">
              <span>
                © {new Date().getFullYear()} {t('Etleq', 'اطلق')}
              </span>
              <nav>
                {[
                  ['privacy', 'Privacy', 'الخصوصية'],
                  ['terms', 'Terms', 'الشروط'],
                  ['audit-terms', 'Audit terms', 'شروط الفحص'],
                  ['refund-policy', 'Refunds', 'الاسترداد'],
                  ['cookies', 'Cookies', 'ملفات الارتباط'],
                ].map(([url, en, ar]) => (
                  <Link key={url} href={`/${url}`}>
                    {t(en, ar)}
                  </Link>
                ))}
                <CookieSettingsButton>{t('Cookie settings', 'إعدادات الخصوصية')}</CookieSettingsButton>
              </nav>
            </div>
          </div>
        </footer>
        <div className="eng-mobile-actions">
          <Actions locale={locale} compact />
        </div>
      </div>
      <ConsentManager />
    </AlternatePathProvider>
  )
}
