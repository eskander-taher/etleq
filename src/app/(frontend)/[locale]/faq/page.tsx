import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Faq } from '@/cms/content-types'
import type { Locale } from '@/i18n/routing'
import { absoluteUrl, buildMetadata } from '@/lib/seo'
import { faqPageNode, graph, organizationNode, type SchemaNode } from '@/lib/schema'
import { findPublic } from '@/lib/queries/common'
import { JsonLd } from '@/components/seo/JsonLd'
import { getShellData } from '@/components/layout/shell-data'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { CtaBand } from '@/components/ui/cta-band'
import { PageHeader } from '@/components/ui/page-header'
import { Container } from '@/components/ui/container'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'

export const revalidate = 3600

const CATEGORY_ORDER = ['price', 'ownership', 'timeline', 'payments', 'hosting', 'languages', 'equity', 'refunds', 'process', 'general'] as const
type Category = (typeof CATEGORY_ORDER)[number]

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'common' })
  return buildMetadata({
    locale,
    path: '/faq',
    title: t('faq.metaTitle'),
    description: t('faq.metaDescription'),
    alternates: { ar: true, en: true },
  })
}

async function getFaqs(locale: Locale): Promise<Faq[]> {
  try {
    const res = await findPublic('faqs', locale, { limit: 300, sort: 'order', depth: 0, pagination: false })
    return res.docs.filter((f) => f.question && f.answer)
  } catch {
    return []
  }
}

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

export default async function FaqPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [t, faqs, data] = await Promise.all([getTranslations({ locale, namespace: 'common' }), getFaqs(locale), getShellData(locale)])

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: faqs.filter((f) => (f.category || 'general') === cat),
  })).filter((g) => g.items.length)

  const jsonLd = faqs.length
    ? graph(
        organizationNode() as SchemaNode,
        faqPageNode(
          faqs.map((f) => ({ question: f.question as string, answer: f.answer as string })),
          { url: absoluteUrl(locale, '/faq'), locale },
        ),
      )
    : null

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow={t('faq.eyebrow')}
        title={t('faq.title')}
        lead={t('faq.lead')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('faq.metaTitle'), href: '/faq' }]} />}
      >
        <WhatsAppButton
          number={data.settings.whatsappNumber}
          message={t('whatsapp.contactMessage')}
          refCode="FAQ"
          placement="faq_header"
          label={t('cta.whatsapp')}
          variant="secondary"
        />
      </PageHeader>

      <Container className="py-12 lg:py-20">
        {groups.length ? (
          <div className="grid gap-10 lg:grid-cols-12">
            {groups.length > 1 ? (
              <nav aria-labelledby="faq-topics" className="lg:col-span-3">
                <h2 id="faq-topics" className="sr-only">
                  {t('faq.eyebrow')}
                </h2>
                <ul className="flex flex-wrap gap-2 lg:sticky lg:top-28 lg:flex-col lg:gap-1">
                  {groups.map((g) => (
                    <li key={g.cat}>
                      <a
                        href={`#faq-${g.cat}`}
                        className="inline-flex min-h-11 items-center rounded-full border border-sand-300 px-4 text-sm font-medium hover:border-ink-950 lg:rounded-button lg:border-0 lg:px-3 lg:text-base lg:text-ink-600 lg:hover:bg-sand-100 lg:hover:text-ink-950"
                      >
                        {t(`faq.categories.${g.cat as Category}`)}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
            <div className={groups.length > 1 ? 'space-y-14 lg:col-span-9' : 'space-y-14 lg:col-span-12 lg:max-w-3xl'}>
              {groups.map((g) => (
                <section key={g.cat} id={`faq-${g.cat}`} aria-labelledby={`faq-${g.cat}-h`} className="scroll-mt-28">
                  <h2 id={`faq-${g.cat}-h`} className="text-display-3 font-bold">
                    {t(`faq.categories.${g.cat as Category}`)}
                  </h2>
                  <Accordion className="mt-4">
                    {g.items.map((f) => (
                      <AccordionItem key={f.id} id={`q-${f.id}`} title={f.question}>
                        {paragraphs(f.answer as string).map((p) => (
                          <p key={p}>{p}</p>
                        ))}
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-ink-600">{t('faq.empty')}</p>
        )}
      </Container>

      <CtaBand
        locale={locale}
        title={t('faq.ctaTitle')}
        text={t('faq.ctaText')}
        placement="faq_cta"
        whatsappNumber={data.settings.whatsappNumber}
        refCode="FAQ"
      />
    </>
  )
}
