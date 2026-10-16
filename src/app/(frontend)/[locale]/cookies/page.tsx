import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { cn } from '@/lib/utils'
import { LegalPage, legalMetadata } from '@/components/layout/LegalPage'
import { CookieSettingsButton } from '@/components/layout/CookieSettingsButton'
import { buttonVariants } from '@/components/ui/button'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  return legalMetadata(locale as Locale, 'cookies')
}

export default async function Page({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'common' })
  const categories = t.raw('legal.cookies.categories') as { name: string; text: string }[]

  return (
    <LegalPage
      locale={locale}
      kind="cookies"
      before={
        <section aria-labelledby="cookie-cats" className="space-y-6">
          <p className="text-lg text-ink-950">{t('legal.cookies.intro')}</p>
          <h2 id="cookie-cats" className="text-display-3 font-bold">
            {t('legal.cookies.categoriesTitle')}
          </h2>
          <dl className="grid gap-4 sm:grid-cols-3">
            {categories.map((c) => (
              <div key={c.name} className="rounded-card border border-sand-300 bg-sand-50 p-5">
                <dt className="font-display font-semibold">{c.name}</dt>
                <dd className="mt-2 text-sm text-ink-600">{c.text}</dd>
              </div>
            ))}
          </dl>
          <CookieSettingsButton className={cn(buttonVariants({ variant: 'secondary' }), 'cursor-pointer')}>
            {t('legal.cookies.manage')}
          </CookieSettingsButton>
        </section>
      }
    />
  )
}
