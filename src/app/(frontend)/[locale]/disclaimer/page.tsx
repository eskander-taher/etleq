import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { LegalPage, legalMetadata } from '@/components/layout/LegalPage'
import { Badge } from '@/components/ui/badge'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  return legalMetadata(locale as Locale, 'disclaimer')
}

export default async function Page({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'common' })
  const paragraphs = t.raw('legal.disclaimer.earningsDraft') as string[]

  return (
    <LegalPage
      locale={locale}
      kind="disclaimer"
      before={
        <section id="earnings" aria-labelledby="earnings-h" className="scroll-mt-28 rounded-card border border-sand-300 bg-sand-100 p-6 sm:p-8">
          <Badge variant="outline">{t('placeholder.lawyer')}</Badge>
          <h2 id="earnings-h" className="mt-4 text-display-3 font-bold">
            {t('legal.disclaimer.earningsTitle')}
          </h2>
          <div className="mt-4 space-y-3 text-ink-600">
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </section>
      }
    />
  )
}
