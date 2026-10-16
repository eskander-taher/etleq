import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import { FileWarning } from 'lucide-react'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Container } from '@/components/ui/container'
import { PageHeader } from '@/components/ui/page-header'

export type LegalKind = 'privacy' | 'terms' | 'disclaimer' | 'cookies' | 'accessibility'

export async function legalMetadata(locale: Locale, kind: LegalKind): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'common' })
  return buildMetadata({
    locale,
    path: `/${kind}`,
    title: t(`legal.${kind}.title`),
    description: t(`legal.${kind}.description`),
    alternates: { ar: true, en: true },
  })
}

/** Clearly marked slot for text the founders' lawyer will write (guardrail 14). */
export async function LawyerPlaceholder({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  return (
    <p className="rounded-button border border-dashed border-stone-500 bg-sand-100 px-4 py-3 font-medium text-ink-600">
      {t('placeholder.lawyer')}
    </p>
  )
}

/**
 * Structure for the legal pages: H1, draft notice, a table of contents and one H2 per section
 * with a lawyer placeholder. `before` renders page-specific drafted content above the sections.
 */
export async function LegalPage({ locale, kind, before, after }: { locale: Locale; kind: LegalKind; before?: ReactNode; after?: ReactNode }) {
  const t = await getTranslations({ locale, namespace: 'common' })
  const sections = t.raw(`legal.${kind}.sections`) as string[]
  const title = t(`legal.${kind}.title`)

  return (
    <>
      <PageHeader
        title={title}
        lead={t(`legal.${kind}.description`)}
        breadcrumbs={<Breadcrumbs items={[{ label: title, href: `/${kind}` }]} />}
        motif={false}
      />
      <Container className="py-12 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <p className="flex items-start gap-2 rounded-card border border-sand-300 bg-sand-100 p-4 text-sm text-ink-600">
                <FileWarning className="mt-0.5 size-5 shrink-0 text-ink-950" aria-hidden="true" />
                {t('legal.draftNotice')}
              </p>
              <nav aria-labelledby="legal-toc" className="mt-6 hidden lg:block">
                <h2 id="legal-toc" className="text-sm font-semibold text-ink-950">
                  {title}
                </h2>
                <ol className="mt-2 space-y-1 text-sm text-ink-600">
                  {sections.map((s, i) => (
                    <li key={s}>
                      <a href={`#section-${i + 1}`} className="inline-flex min-h-8 items-center hover:text-ink-950 hover:underline">
                        {s}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </aside>
          <div className="max-w-3xl space-y-12 lg:col-span-8">
            {before}
            {sections.map((s, i) => (
              <section key={s} id={`section-${i + 1}`} aria-labelledby={`section-${i + 1}-h`} className="scroll-mt-28">
                <h2 id={`section-${i + 1}-h`} className="text-display-3 font-bold">
                  {s}
                </h2>
                <div className="mt-4">
                  <LawyerPlaceholder locale={locale} />
                </div>
              </section>
            ))}
            {after}
          </div>
        </div>
      </Container>
    </>
  )
}
