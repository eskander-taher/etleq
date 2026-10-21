import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, Clock, Mail } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { buildMetadata } from '@/lib/seo'
import { graph, organizationNode, type SchemaNode } from '@/lib/schema'
import { JsonLd } from '@/components/seo/JsonLd'
import { ContactForm } from '@/components/forms/ContactForm'
import { getShellData } from '@/components/layout/shell-data'
import { countryName, isReal } from '@/components/layout/Footer'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Card } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { WhatsAppIcon } from '@/components/ui/icons'
import { PageHeader } from '@/components/ui/page-header'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const t = await getTranslations({ locale, namespace: 'common' })
  return buildMetadata({
    locale,
    path: '/contact',
    title: t('contact.metaTitle'),
    description: t('contact.metaDescription'),
    alternates: { ar: true, en: true },
  })
}

export default async function ContactPage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [t, data] = await Promise.all([getTranslations({ locale, namespace: 'common' }), getShellData(locale)])
  const { whatsappNumber, contactEmail, responseTimePromise, legalEntities } = data.settings
  const withAddress = legalEntities.filter((e) => isReal(e.legalName) && isReal(e.address))

  const jsonLd = graph(
    organizationNode({
      full: true,
      settings: { contactEmail, whatsappNumber: whatsappNumber ?? undefined, legalEntities },
    }) as SchemaNode,
  )

  return (
    <>
      <JsonLd data={jsonLd} />
      <PageHeader
        eyebrow={t('contact.eyebrow')}
        title={t('contact.title')}
        lead={t('contact.lead')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('contact.metaTitle'), href: '/contact' }]} />}
      />

      <Container className="py-12 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-12">
          {/* WhatsApp first (brief section 8) */}
          {whatsappNumber ? (
            <Card tone="dark" data-tone="dark" className="flex flex-col gap-4 lg:col-span-7">
              <span className="inline-flex size-12 items-center justify-center rounded-button bg-[#25D366] text-ink-950" aria-hidden="true">
                <WhatsAppIcon className="size-6" />
              </span>
              <h2 className="text-display-3 font-bold">{t('contact.whatsappTitle')}</h2>
              <p className="text-sand-300">{t('contact.whatsappText')}</p>
              <p className="text-lg">
                <bdi dir="ltr" className="num">
                  +{whatsappNumber}
                </bdi>
              </p>
              <div>
                <WhatsAppButton
                  number={whatsappNumber}
                  message={t('whatsapp.contactMessage')}
                  refCode="CONTACT"
                  placement="contact_primary"
                  label={t('cta.whatsapp')}
                  size="lg"
                />
              </div>
            </Card>
          ) : null}

          <div className={whatsappNumber ? 'flex flex-col gap-6 lg:col-span-5' : 'grid gap-6 sm:grid-cols-2 lg:col-span-12'}>
            {contactEmail ? (
              <Card tone="alt">
                <Mail className="size-6" aria-hidden="true" />
                <h2 className="mt-3 font-display text-xl font-semibold">{t('contact.emailTitle')}</h2>
                <a href={`mailto:${contactEmail}`} className="mt-2 inline-flex min-h-11 items-center text-lg font-semibold underline underline-offset-4">
                  <bdi dir="ltr">{contactEmail}</bdi>
                </a>
              </Card>
            ) : null}
            {responseTimePromise ? (
              <Card tone="alt">
                <Clock className="size-6" aria-hidden="true" />
                <h2 className="mt-3 font-display text-xl font-semibold">{t('contact.responseTime')}</h2>
                <p className="mt-2 text-ink-600">{responseTimePromise}</p>
              </Card>
            ) : null}
            <Card>
              <p className="text-ink-600">{t('contact.scorecardHint')}</p>
              <Link
                href="/scorecard"
                className="mt-3 inline-flex min-h-11 items-center gap-2 font-semibold underline-offset-4 hover:underline"
              >
                {t('cta.scorecard')}
                <ArrowRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              </Link>
            </Card>
          </div>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <section aria-labelledby="contact-form-h" className="lg:col-span-7">
            <h2 id="contact-form-h" className="text-display-3 font-bold">
              {t('contact.formTitle')}
            </h2>
            <div className="mt-6">
              <ContactForm locale={locale} />
            </div>
          </section>

          {withAddress.length ? (
            <section aria-labelledby="addresses-h" className="lg:col-span-5">
              <h2 id="addresses-h" className="text-display-3 font-bold">
                {t('contact.addressesTitle')}
              </h2>
              <ul className="mt-6 space-y-6">
                {withAddress.map((e, i) => (
                  <li key={`${e.legalName}-${i}`} className="border-s-2 border-ink-950 ps-4">
                    <p className="font-semibold">{e.legalName}</p>
                    {e.country ? <p className="text-sm text-ink-600">{countryName(e.country, locale)}</p> : null}
                    <address className="mt-1 text-ink-600 not-italic">{e.address}</address>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </Container>
    </>
  )
}
