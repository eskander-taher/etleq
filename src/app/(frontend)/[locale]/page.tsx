import { getTranslations, setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { buildMetadata, DEFAULT_ONE_LINER } from '@/lib/seo'
import { faqPageNode, graph, organizationNode, websiteNode } from '@/lib/schema'
import { absoluteUrl } from '@/lib/seo'
import { JsonLd } from '@/components/seo/JsonLd'
import { Hero } from '@/components/sections/home/Hero'
import { Comparison, Faq, FinalCta, Founders, HowItWorks, Mechanism, ModelsTeaser, Problem, ProjectsProof, ProofStrip } from '@/components/sections/home/sections'
import { GuaranteeSection, OfferSection } from '@/components/sections/offer/OfferSection'
import { resolveOffer } from '@/components/sections/offer/resolve-offer'
import {
  getAuthors,
  getFaqs,
  getModels,
  getOffer,
  getProjects,
  getSeoDefaults,
  getSiteSettings,
  getTestimonials,
  whatsappNumberFor,
} from '@/components/sections/offer/data'

export const revalidate = 3600

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  const [t, seo] = await Promise.all([getTranslations({ locale, namespace: 'home' }), getSeoDefaults(locale)])
  return buildMetadata({
    locale,
    path: '/',
    title: t('meta.title'),
    absoluteTitle: true,
    description: seo.defaultDescription || DEFAULT_ONE_LINER[locale],
    alternates: { ar: true, en: true },
  })
}

// Section order follows brief section 7 (2–14); the shell renders 0, 1, 15 and the sticky bar.
export default async function HomePage({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)

  const [settings, offerData, models, authors, projects, testimonials, faqs, seo] = await Promise.all([
    getSiteSettings(locale),
    getOffer(locale),
    getModels(locale, 6),
    getAuthors(locale),
    getProjects(locale),
    getTestimonials(locale),
    getFaqs(locale, 10),
    getSeoDefaults(locale),
  ])
  const offer = await resolveOffer(locale, offerData)
  const whatsapp = whatsappNumberFor(settings)

  const jsonLd = graph(
    organizationNode({
      full: true,
      locale,
      settings: { contactEmail: settings.contactEmail, whatsappNumber: settings.whatsappNumber, legalEntities: settings.legalEntities },
      seo: { sameAs: seo.sameAs, oneLiner: seo.oneLiner },
      founders: authors.slice(0, 2).map((a) => ({ name: a.name, jobTitle: a.role, slug: a.slug, sameAs: (a.sameAs ?? []).map((s) => s.url).filter((u): u is string => Boolean(u)) })),
    }),
    websiteNode(locale, { description: seo.oneLiner || DEFAULT_ONE_LINER[locale] }),
    faqs.length ? faqPageNode(faqs.map((f) => ({ question: f.question, answer: f.answer })), { url: absoluteUrl(locale, '/'), locale }) : null,
  )

  return (
    <>
      <JsonLd data={jsonLd} />
      <Hero locale={locale} priceFrom={offer.priceFrom} settings={settings} />
      <ProofStrip locale={locale} projects={projects} />
      <Problem locale={locale} />
      <Mechanism locale={locale} />
      <ModelsTeaser locale={locale} models={models} fallbackPrice={offer.priceFrom} />
      <OfferSection locale={locale} offer={offer} />
      <HowItWorks locale={locale} />
      <GuaranteeSection locale={locale} offer={offer} />
      <Comparison locale={locale} offer={offer} />
      <Founders locale={locale} authors={authors} />
      <ProjectsProof locale={locale} projects={projects} testimonials={testimonials} settings={settings} whatsappNumber={whatsapp} />
      <Faq locale={locale} faqs={faqs} />
      <FinalCta locale={locale} whatsappNumber={whatsapp} />
    </>
  )
}
