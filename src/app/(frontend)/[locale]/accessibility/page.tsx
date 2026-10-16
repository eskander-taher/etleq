import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Mail } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { LegalPage, legalMetadata } from '@/components/layout/LegalPage'
import { getShellData } from '@/components/layout/shell-data'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  return legalMetadata(locale as Locale, 'accessibility')
}

export default async function Page({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: 'common' }), getShellData(locale)])
  const email = data.settings.contactEmail

  return (
    <LegalPage
      locale={locale}
      kind="accessibility"
      before={<p className="text-lg text-ink-950">{t('legal.accessibility.commitment')}</p>}
      after={
        <section aria-labelledby="a11y-feedback" className="rounded-card border border-sand-300 bg-sand-100 p-6 sm:p-8">
          <h2 id="a11y-feedback" className="text-display-3 font-bold">
            {t('legal.accessibility.feedbackTitle')}
          </h2>
          <p className="mt-3 text-ink-600">{t('legal.accessibility.feedbackText')}</p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            {email ? (
              <a href={`mailto:${email}`} className="inline-flex min-h-12 items-center gap-2 font-semibold underline underline-offset-4">
                <Mail className="size-5" aria-hidden="true" />
                <bdi dir="ltr">{email}</bdi>
              </a>
            ) : null}
            <WhatsAppButton
              number={data.settings.whatsappNumber}
              message={t('whatsapp.contactMessage')}
              refCode="A11Y"
              placement="accessibility_feedback"
              label={t('cta.whatsapp')}
              variant="secondary"
            />
          </div>
        </section>
      }
    />
  )
}
