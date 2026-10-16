import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Check } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { PageHeader } from '@/components/ui/page-header'
import { NewsletterForm } from '@/components/forms/NewsletterForm'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'forms' })
  return buildMetadata({ locale, path: '/playbook', title: t('playbook.meta.title'), description: t('playbook.meta.description'), alternates: { ar: true, en: true } })
}

export default async function PlaybookPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'forms' })

  return (
    <>
      <PageHeader
        eyebrow={t('playbook.eyebrow')}
        title={t('playbook.h1')}
        lead={t('playbook.lead')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('playbook.meta.title'), href: '/playbook' }]} />}
      />
      <Container className="py-12 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <ul className="flex flex-col gap-4">
            {(t.raw('playbook.points') as string[]).map((p) => (
              <li key={p} className="flex items-start gap-3 text-lg">
                <Check className="mt-1 size-5 shrink-0 text-verified-600" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <Card tone="alt">
            <NewsletterForm locale={locale} source="playbook" />
          </Card>
        </div>
      </Container>
    </>
  )
}
