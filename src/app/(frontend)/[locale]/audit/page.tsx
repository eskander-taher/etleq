import { setRequestLocale } from 'next-intl/server'
import type { Locale } from '@/i18n/routing'
import { buildMetadata } from '@/lib/seo'
import { ServicePage } from '@/components/engineering/Pages'
import { pick, services } from '@/components/engineering/content'
export const revalidate = 3600
type Props = { params: Promise<{ locale: string }> }
export async function generateMetadata({ params }: Props) {
  const { locale: raw } = await params
  const locale = raw as Locale
  return buildMetadata({
    locale,
    path: '/audit',
    title: pick(locale, services.find((s) => s.slug === 'audit')!.title),
    description: pick(locale, [
      'Audited AI engineering. SAR 750 production audit, delivered in 48 hours. Fixed 40-hour modules. Your code, fully yours.',
      'هندسة ذكاء اصطناعي بفحص واضح. الفحص التقني 750 ريال خلال 48 ساعة. وحدات ثابتة من 40 ساعة. الكود ملكك بالكامل.',
    ]),
    alternates: { ar: true, en: true },
  })
}
export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ServicePage locale={locale as Locale} slug="audit" />
}
