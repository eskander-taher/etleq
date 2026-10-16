import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, CreditCard, Languages, Receipt, ServerCog, ShieldCheck, Smartphone } from 'lucide-react'
import type { Locale } from '@/i18n/routing'
import { env } from '@/lib/env'
import { buildMetadata } from '@/lib/seo'
import { formatNumber, formatSAR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { getShellData } from '@/components/layout/shell-data'
import { Logo, LogoMark } from '@/components/layout/Logo'
import { Accordion, AccordionItem } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { BentoGrid, BentoItem } from '@/components/ui/bento'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardText, CardTitle } from '@/components/ui/card'
import { Container } from '@/components/ui/container'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form'
import { Price } from '@/components/ui/price'
import { SectionHeading } from '@/components/ui/section'
import { SourceCite } from '@/components/ui/source-cite'
import { Stat } from '@/components/ui/stat'
import { Stepper } from '@/components/ui/stepper'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Trajectory } from '@/components/ui/trajectory'
import { VideoFacade } from '@/components/ui/video-facade'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'

/* Internal design reference (brief section 6): noindex, and 404 on the production site. */

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props) {
  const { locale } = await params
  return buildMetadata({ locale: locale as Locale, path: '/design', title: 'Design system', noindex: true })
}

/* ---------- WCAG contrast, computed (not hard-coded) ---------- */

const TOKENS = {
  'ink-950': '#0B0F14',
  'ink-800': '#1C2430',
  'ink-600': '#3A4553',
  'stone-500': '#6B6459',
  'sand-50': '#FAF7F2',
  'sand-100': '#F3EEE6',
  'sand-300': '#E3D9CA',
  'ignition-500': '#FF5A1F',
  'ignition-700': '#C2410C',
  'verified-600': '#15803D',
  white: '#FFFFFF',
} as const
type Token = keyof typeof TOKENS

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

/** Text/background pairs the components actually use. `large` = only used for ≥24px or bold ≥18.66px text. */
const PAIRS: { fg: Token; bg: Token; use: string; large?: boolean }[] = [
  { fg: 'ink-950', bg: 'sand-50', use: 'Body text' },
  { fg: 'ink-950', bg: 'sand-100', use: 'Body text on alternate sections' },
  { fg: 'ink-600', bg: 'sand-50', use: 'Secondary text' },
  { fg: 'ink-600', bg: 'sand-100', use: 'Secondary text on alternate sections' },
  { fg: 'stone-500', bg: 'sand-50', use: 'Captions, citations' },
  { fg: 'stone-500', bg: 'sand-100', use: 'Captions on alternate sections' },
  { fg: 'stone-500', bg: 'white', use: 'Input placeholder' },
  { fg: 'ink-950', bg: 'ignition-500', use: 'Primary button' },
  { fg: 'white', bg: 'ignition-500', use: 'Never: white on ignition' },
  { fg: 'ignition-700', bg: 'sand-50', use: 'Accent text / links on light' },
  { fg: 'ignition-700', bg: 'sand-100', use: 'Avoid: accent text on sand-100' },
  { fg: 'white', bg: 'verified-600', use: 'Verified badge' },
  { fg: 'verified-600', bg: 'sand-50', use: 'Verified text on light' },
  { fg: 'verified-600', bg: 'sand-100', use: 'Avoid: verified text on sand-100' },
  { fg: 'sand-50', bg: 'ink-950', use: 'Text on dark sections' },
  { fg: 'sand-300', bg: 'ink-950', use: 'Muted text on dark' },
  { fg: 'sand-300', bg: 'ink-800', use: 'Muted text on dark cards' },
  { fg: 'ignition-500', bg: 'ink-950', use: 'Accent on dark' },
  { fg: 'ignition-700', bg: 'sand-50', use: 'Focus ring vs page (non-text, 3:1)', large: true },
]

/* ---------- Bilingual specimen copy (approved drafts from the brief) ---------- */

const COPY = {
  ar: {
    dir: 'rtl' as const,
    heading: 'العربية، من اليمين إلى اليسار',
    h1: 'فكرة مجرّبة، ومنصّتك جاهزة تستقبل المدفوعات خلال 30 يومًا',
    h2: 'Etleq Core: معظم منصّتك جاهز قبل اليوم الأول',
    h3: 'نبني لك شيئًا جديدًا، لا قالبًا مكرّرًا',
    body: 'نبني لك منصّة SaaS متكاملة بالعربية: دفع عبر مدى وApple Pay، فوترة متوافقة مع ZATCA، استضافة وصيانة، بسعر ثابت يبدأ من 22,125 ر.س.',
    mixed: 'رقم واتساب للتجربة',
    small: 'نص صغير للتعليقات والمصادر.',
    buttons: { primary: 'ابدأ التقييم', secondary: 'شاهد كيف نعمل', ghost: 'اقرأ المزيد', wa: 'تحدّث معنا على واتساب' },
    badges: { neutral: 'حجوزات', accent: 'جديد', verified: 'موثّق', source: 'المصدر', sample: 'عيّنة' },
    card: { title: 'الوكالات', text: 'من 35,000 إلى 65,000 ر.س، ومدة من 4 إلى 8 أسابيع.' },
    stat: 'متوسط معدّل التحويل لصفحات الهبوط (2024)',
    faq: [
      { q: 'هل أملك الكود؟', a: 'مكان الإجابة من مجموعة الأسئلة الشائعة في لوحة التحكّم.' },
      { q: 'هل يمكن الدفع على دفعات؟', a: 'مكان الإجابة من مجموعة الأسئلة الشائعة في لوحة التحكّم.' },
    ],
    table: { label: 'جدول مقارنة', cols: ['', 'إطلاق', 'وكالة', 'مستقل'], rows: [['السعر', 'سعر ثابت', '35,000–65,000 ر.س', 'متغيّر'], ['المدة', '30 يومًا', '4–8 أسابيع', 'غير محددة'], ['دعم بعد الإطلاق', 'نعم', 'حسب العقد', 'نادرًا']] },
    steps: [
      { title: 'التقييم', description: '12 سؤالًا في دقيقتين.' },
      { title: 'مكالمة التعارف', description: '15 دقيقة لنتأكد من الملاءمة.' },
      { title: 'البناء خلال 30 يومًا', description: 'عرض تجريبي في اليوم العاشر.', meta: 'اليوم 10' },
      { title: 'الإطلاق', description: 'منصّتك تستقبل أول المدفوعات.' },
    ],
    bento: ['واجهة عربية RTL', 'دفع مدى وApple Pay', 'فوترة ZATCA', 'دخول برمز OTP', 'استضافة ونسخ احتياطي', 'لوحة تحكّم'],
    form: { name: 'الاسم', email: 'البريد الإلكتروني', phone: 'رقم واتساب', country: 'الدولة', msg: 'رسالتك', hint: 'نستخدمه لإرسال نتيجتك فقط.', error: 'أدخل بريدًا إلكترونيًا صحيحًا.', optional: '(اختياري)', consent: 'أوافق على سياسة الخصوصية', countries: ['السعودية', 'الإمارات', 'عُمان'] },
    crumbs: [{ label: 'النماذج', href: '/models' }, { label: 'تطبيق حجز الحلاقين', href: '/models/barber-booking-app' }],
    video: 'شاهد كيف نعمل في 60 ثانية',
  },
  en: {
    dir: 'ltr' as const,
    heading: 'English, left to right',
    h1: 'A proven idea, live and taking payments in 30 days.',
    h2: 'Etleq Core: most of your product exists before day one',
    h3: 'Built by two senior engineers, not salespeople',
    body: 'We build your complete software product, Arabic-first, with mada and Apple Pay, ZATCA-ready invoicing, hosting and maintenance, at a fixed price from $5,900.',
    mixed: 'Test WhatsApp number',
    small: 'Small text for captions and sources.',
    buttons: { primary: 'Take the scorecard', secondary: 'See how it works', ghost: 'Read more', wa: 'Chat with us on WhatsApp' },
    badges: { neutral: 'Booking', accent: 'New', verified: 'Verified', source: 'Source', sample: 'Sample' },
    card: { title: 'Agencies', text: 'SAR 35,000 to 65,000, and 4 to 8 weeks.' },
    stat: 'Median landing-page conversion rate (2024)',
    faq: [
      { q: 'Do I own the code?', a: 'Answer slot, filled from the FAQs collection in the admin panel.' },
      { q: 'Can I pay in instalments?', a: 'Answer slot, filled from the FAQs collection in the admin panel.' },
    ],
    table: { label: 'Comparison table', cols: ['', 'Etleq', 'Agency', 'Freelancer'], rows: [['Price', 'Fixed price', 'SAR 35,000–65,000', 'Varies'], ['Time', '30 days', '4–8 weeks', 'Unclear'], ['Support after launch', 'Yes', 'Per contract', 'Rarely']] },
    steps: [
      { title: 'Scorecard', description: '12 questions in two minutes.' },
      { title: 'Fit call', description: '15 minutes to check the fit.' },
      { title: '30-day build', description: 'Demo on day 10.', meta: 'Day 10' },
      { title: 'Launch', description: 'Your product takes its first payments.' },
    ],
    bento: ['Arabic RTL interface', 'mada and Apple Pay', 'ZATCA invoicing', 'OTP login', 'Hosting and backups', 'Admin panel'],
    form: { name: 'Name', email: 'Email', phone: 'WhatsApp number', country: 'Country', msg: 'Your message', hint: 'We only use it to send your result.', error: 'Enter a valid email address.', optional: '(optional)', consent: 'I agree to the privacy policy', countries: ['Saudi Arabia', 'UAE', 'Oman'] },
    crumbs: [{ label: 'Models', href: '/models' }, { label: 'Barber booking app', href: '/models/barber-booking-app' }],
    video: 'See how it works in 60 seconds',
  },
}

const BENTO_ICONS = [Languages, CreditCard, Receipt, Smartphone, ServerCog, ShieldCheck]

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-sand-300 py-8">
      <h3 className="mb-5 font-mono text-xs font-medium text-stone-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

async function Specimen({ locale, whatsappNumber }: { locale: Locale; whatsappNumber?: string | null }) {
  const c = COPY[locale]
  return (
    <div dir={c.dir} lang={locale} className={cn('min-w-0', locale === 'ar' ? 'text-[1.0625rem] leading-[1.75]' : 'text-base leading-[1.6]')}>
      <h2 className="font-display text-2xl font-bold">{c.heading}</h2>

      <Block title="Logo">
        <div className="flex flex-wrap items-end gap-8">
          <Logo variant="ar" />
          <Logo variant="en" />
          <Logo variant="stacked" />
          <span className="flex items-end gap-3">
            <LogoMark className="size-4" accent />
            <LogoMark className="size-8" accent />
            <span className="inline-flex size-12 items-center justify-center rounded-button bg-ink-950 text-ignition-500">
              <LogoMark className="size-8" />
            </span>
          </span>
        </div>
      </Block>

      <Block title="Type scale (diacritics test: مجرّبة · جديدًا)">
        <div className="space-y-4">
          <p className="font-display text-display-1 leading-[1.5] font-bold">{c.h1}</p>
          <p className="font-display text-display-2 leading-[1.5] font-bold">{c.h2}</p>
          <p className="font-display text-display-3 leading-[1.5] font-semibold">{c.h3}</p>
          <p className="font-display text-xl font-semibold">مجرّبة · جديدًا · Launch 30</p>
          <p className="max-w-prose">{c.body}</p>
          <p>
            {c.mixed}: <bdi dir="ltr" className="num">+966 5X XXX XXXX</bdi> · <bdi className="num">{formatSAR(22125, locale)}</bdi> ·{' '}
            <bdi dir="ltr">hello@etleq.com</bdi>
          </p>
          <p className="text-sm text-stone-500">{c.small}</p>
          <p className="num text-lg">0123456789 · {formatNumber(22125, locale)} · $5,900</p>
        </div>
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>
            {c.buttons.primary}
            <ArrowRight className="size-5 rtl:rotate-180" aria-hidden="true" />
          </Button>
          <Button variant="secondary">{c.buttons.secondary}</Button>
          <Button variant="ghost">{c.buttons.ghost}</Button>
          <Button size="sm">{c.buttons.primary}</Button>
          <Button disabled>{c.buttons.primary}</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 rounded-card bg-ink-950 p-4" data-tone="dark">
          <Button>{c.buttons.primary}</Button>
          <Button variant="secondary-dark">{c.buttons.secondary}</Button>
        </div>
        <div className="mt-4">
          {whatsappNumber ? (
            <WhatsAppButton number={whatsappNumber} message="design" placement="design" label={c.buttons.wa} />
          ) : (
            <p className="text-sm text-stone-500">WhatsApp button hidden: no number in SiteSettings or WHATSAPP_NUMBER.</p>
          )}
        </div>
      </Block>

      <Block title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>{c.badges.neutral}</Badge>
          <Badge variant="accent">{c.badges.accent}</Badge>
          <Badge variant="dark">Pro</Badge>
          <Badge variant="outline">Core</Badge>
          <Badge variant="verified">{c.badges.verified}</Badge>
          <Badge variant="source">{c.badges.source}</Badge>
          <Badge variant="sample">{c.badges.sample}</Badge>
        </div>
      </Block>

      <Block title="Breadcrumbs">
        <Breadcrumbs items={c.crumbs} locale={locale} jsonLd={false} />
      </Block>

      <Block title="Cards, stat, price, citation">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>{c.card.title}</CardTitle>
            <CardText>{c.card.text}</CardText>
            <p className="mt-3">
              <SourceCite label="Sendan" url="https://www.sendantech.com/en-SA/mobile-app-development-cost-saudi-arabia" locale={locale} />
            </p>
          </Card>
          <Card tone="alt">
            <Price usd={5900} locale={locale} from showUsdOnArabic />
          </Card>
          <Card>
            <Stat
              value="6.6%"
              label={c.stat}
              locale={locale}
              size="md"
              source={{ label: 'Unbounce', url: 'https://unbounce.com/landing-page-benchmarks/' }}
            />
          </Card>
          <Card tone="dark" data-tone="dark">
            <CardTitle>{c.card.title}</CardTitle>
            <CardText>{c.card.text}</CardText>
          </Card>
        </div>
      </Block>

      <Block title="Bento grid">
        <BentoGrid>
          {c.bento.map((title, i) => {
            const Icon = BENTO_ICONS[i]
            return (
              <BentoItem
                key={title}
                title={title}
                span={i === 0 ? 'wide' : i === 1 ? 'third' : 'third'}
                tone={i === 0 ? 'dark' : i === 3 ? 'alt' : 'light'}
                icon={<Icon className="size-5" />}
              />
            )
          })}
        </BentoGrid>
      </Block>

      <Block title="Stepper">
        <Stepper steps={c.steps} locale={locale} />
      </Block>

      <Block title="Accordion (native details)">
        <Accordion>
          {c.faq.map((f, i) => (
            <AccordionItem key={f.q} title={f.q} open={i === 0}>
              <p>{f.a}</p>
            </AccordionItem>
          ))}
        </Accordion>
      </Block>

      <Block title="Table (sticky first column on mobile)">
        <Table label={c.table.label}>
          <THead>
            <TR>
              {c.table.cols.map((col, i) => (
                <TH key={i} scope="col" sticky={i === 0} highlight={i === 1}>
                  {col}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {c.table.rows.map((row) => (
              <TR key={row[0]}>
                {row.map((cell, i) =>
                  i === 0 ? (
                    <TH key={i} scope="row" sticky>
                      {cell}
                    </TH>
                  ) : (
                    <TD key={i} highlight={i === 1}>
                      {cell}
                    </TD>
                  ),
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      </Block>

      <Block title="Form primitives">
        <div className="grid max-w-lg gap-5">
          <Field label={c.form.name} required>
            <Input name="name" autoComplete="name" />
          </Field>
          <Field label={c.form.email} hint={c.form.hint} error={c.form.error} required>
            <Input type="email" name="email" autoComplete="email" defaultValue="name@" />
          </Field>
          <Field label={c.form.phone} optionalLabel={c.form.optional}>
            <Input type="tel" name="phone" inputMode="tel" autoComplete="tel" placeholder="+966 5X XXX XXXX" />
          </Field>
          <Field label={c.form.country}>
            <Select name="country" defaultValue="">
              <option value="" disabled>
                —
              </option>
              {c.form.countries.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
          <Field label={c.form.msg} optionalLabel={c.form.optional}>
            <Textarea name="message" />
          </Field>
          <Checkbox name="consent" label={c.form.consent} />
        </div>
      </Block>

      <Block title="Video facade, trajectory">
        <div className="grid gap-4 sm:grid-cols-2">
          <VideoFacade url="https://www.instagram.com/" platform="instagram" title={c.video} locale={locale} aspect="video" />
          <div className="rounded-card bg-ink-950 p-6">
            <Trajectory tone="dark" />
          </div>
        </div>
      </Block>
    </div>
  )
}

export default async function DesignPage({ params }: Props) {
  if (env.isProd) notFound()
  const { locale: raw } = await params
  const locale = raw as Locale
  setRequestLocale(locale)
  const [, data] = await Promise.all([getTranslations({ locale, namespace: 'common' }), getShellData(locale)])

  const colors = Object.entries(TOKENS).filter(([k]) => k !== 'white') as [Token, string][]

  return (
    <div lang="en" dir="ltr" className="bg-sand-50">
      <Container className="py-12">
        <SectionHeading eyebrow="Internal · noindex" title="Etleq design system" lead="Every token and component, rendered right-to-left (Arabic) and left-to-right (English). Contrast ratios are computed with the WCAG 2.x formula." as="h1" />
        <p className="mt-4 max-w-3xl text-sm text-stone-500">
          Note: Tailwind&apos;s <code>rtl:</code> variant matches any element inside <code>[dir=rtl]</code>, so on the Arabic URL the English column shows mirrored arrows. Logical spacing is correct in both. Check LTR icons on <code>/en/design</code>.
        </p>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">Colour tokens</h2>
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {colors.map(([name, hex]) => {
              const onInk = contrast(hex, TOKENS['ink-950'])
              const onSand = contrast(hex, TOKENS['sand-50'])
              return (
                <li key={name} className="overflow-hidden rounded-card border border-sand-300">
                  <div className="h-20" style={{ background: hex }} />
                  <div className="p-3 text-sm">
                    <p className="font-semibold">{name}</p>
                    <p className="num text-stone-500">{hex}</p>
                    <p className="num mt-1 text-xs text-ink-600">
                      vs ink-950 {onInk.toFixed(2)} · vs sand-50 {onSand.toFixed(2)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          <h3 className="mt-10 font-display text-xl font-bold">Text pairs in use</h3>
          <Table label="Contrast pairs" className="mt-4 min-w-[36rem]">
            <THead>
              <TR>
                <TH scope="col" sticky>
                  Sample
                </TH>
                <TH scope="col">Pair</TH>
                <TH scope="col">Use</TH>
                <TH scope="col">Ratio</TH>
                <TH scope="col">AA</TH>
              </TR>
            </THead>
            <TBody>
              {PAIRS.map((p) => {
                const r = contrast(TOKENS[p.fg], TOKENS[p.bg])
                const pass = r >= (p.large ? 3 : 4.5)
                return (
                  <TR key={`${p.fg}-${p.bg}-${p.use}`}>
                    <TD sticky>
                      <span className="inline-flex rounded-button px-3 py-1 font-semibold" style={{ color: TOKENS[p.fg], background: TOKENS[p.bg] }}>
                        Aa إطلاق
                      </span>
                    </TD>
                    <TD className="num text-xs">
                      {p.fg} / {p.bg}
                    </TD>
                    <TD>{p.use}</TD>
                    <TD className="num">{r.toFixed(2)}:1</TD>
                    <TD>{pass ? <Badge variant="verified">Pass</Badge> : <Badge variant="sample">Fail</Badge>}</TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        </section>

        <section className="mt-12">
          <h2 className="font-display text-2xl font-bold">Radius, spacing, motion</h2>
          <div className="mt-6 flex flex-wrap items-end gap-6 text-sm">
            <div className="flex size-24 items-end rounded-card border border-sand-300 bg-sand-100 p-2">card 20px</div>
            <div className="flex h-12 items-center rounded-button bg-ink-950 px-4 text-sand-50">button 12px</div>
            <div className="text-ink-600">Section padding: 64px mobile / 112px desktop · max width 1200px · transitions 150–300ms ease-out</div>
          </div>
        </section>
      </Container>

      <Container className="pb-20">
        <div className="grid gap-12 xl:grid-cols-2">
          <div className="rounded-card border border-sand-300 p-4 sm:p-6">
            <Specimen locale="ar" whatsappNumber={data.settings.whatsappNumber} />
          </div>
          <div className="rounded-card border border-sand-300 p-4 sm:p-6">
            <Specimen locale="en" whatsappNumber={data.settings.whatsappNumber} />
          </div>
        </div>
      </Container>
    </div>
  )
}
