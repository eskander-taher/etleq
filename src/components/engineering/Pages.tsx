import type { CSSProperties } from 'react'
import type { Locale } from '@/i18n/routing'
import { Link } from '@/i18n/navigation'
import { ContactForm } from '@/components/forms/ContactForm'
import { BookingPanel } from '@/components/scorecard/BookingPanel'
import { getSiteSettings } from '@/components/sections/offer/data'
import { getShellData } from '@/components/layout/shell-data'
import { EntityDetails, isReal } from '@/components/layout/Footer'
import { findPublic } from '@/lib/queries/common'
import { JsonLd } from '@/components/seo/JsonLd'
import { absoluteUrl } from '@/lib/seo'
import { env } from '@/lib/env'
import { pick, services, layers, rules, faqs, type Copy } from './content'
import { Actions, PricingTable, PageEvent } from './interactive'
import { AuditIntake } from './AuditIntake'
import { HomeActions } from './Experience'
import { ScanStory } from './ScanStory'
import { HeroStack } from './HeroStack'

const text = (locale: string) => (en: string, ar: string) => pick(locale, [en, ar])
export function List({ locale, items }: { locale: string; items: Copy[] }) {
  return (
    <ul className="eng-list">
      {items.map((v, i) => (
        <li key={i}>{pick(locale, v)}</li>
      ))}
    </ul>
  )
}
export function Scorecard({ locale, full = false }: { locale: string; full?: boolean }) {
  const t = text(locale)
  return (
    <div className="eng-score">
      <div className="eng-score-title">
        <span>{t('EXAMPLE REPORT', 'نموذج تقرير')}</span>
        <span>{t('Illustrative, not client results', 'توضيحي، ليس نتائج عميل')}</span>
      </div>
      {(full ? layers : layers.slice(0, 5)).map((l, i) => (
        <div className="eng-score-row" key={i}>
          <span className="eng-score-num">{String(i + 1).padStart(2, '0')}</span>
          <span>{pick(locale, l).split(' · ')[0]}</span>
          <span className={`eng-grade ${i === 3 ? 'critical' : i === 2 ? 'warn' : ''}`}>
            {i === 3 ? t('Critical', 'حرج') : i === 2 ? t('Warning', 'تحذير') : t('Pass', 'ناجح')}
          </span>
        </div>
      ))}
    </div>
  )
}
export function Final({ locale }: { locale: string }) {
  return (
    <section className="eng-final">
      <h2>{pick(locale, ['Your next step is small. Start with clarity.', 'خطوتك التالية بسيطة. ابدأ بالوضوح.'])}</h2>
      <Actions locale={locale} />
    </section>
  )
}
export function Home({ locale }: { locale: Locale }) {
  const t = text(locale)
  return (
    <div className="eng-wrap eng-home">
      <section className="eng-launch">
        <svg className="launch-arc" viewBox="0 0 400 520" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
          <defs>
            <linearGradient id="launch-trail" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#ff5a1f" stopOpacity="0.15" />
              <stop offset="1" stopColor="#ff5a1f" />
            </linearGradient>
          </defs>
          <path className="launch-path" pathLength={1} d="M48 496C190 490 300 410 336 34" />
          <circle className="launch-pad" cx="48" cy="496" r="10" />
          <circle className="launch-tip" cx="336" cy="34" r="7" />
        </svg>
        <div className="launch-copy">
          <h1>
            {t('Built with AI.', 'بنيته بالذكاء الاصطناعي.')}
            <em>{t('Ready for real users?', 'هل هو جاهز لعملائك؟')}</em>
          </h1>
          <p className="eng-lead">
            {t(
              'We check your app across 15 engineering layers and hand you a clear plan to launch.',
              'نفحص تطبيقك عبر 15 طبقة هندسية ونسلمك خطة واضحة للإطلاق.',
            )}
          </p>
          <HomeActions locale={locale} turnstileSiteKey={env.turnstileSiteKey || null} />
          <ul className="launch-facts">
            <li>
              <b className="num">48h</b>
              <span>{t('to your report', 'حتى تستلم التقرير')}</span>
            </li>
            <li>
              <b className="num">15</b>
              <span>{t('layers checked', 'طبقة نفحصها')}</span>
            </li>
            <li>
              <b className="num">750</b>
              <span>{t('SAR, one time', 'ريال، مرة واحدة')}</span>
            </li>
          </ul>
        </div>
        <HeroStack locale={locale} />
        <a className="launch-cue" href="#scan">
          {t('See what we check', 'شاهد ماذا نفحص')}
          <span aria-hidden="true" />
        </a>
      </section>
      <ScanStory locale={locale} />
      <section className="eng-section eng-module">
        <div>
          <div className="eng-kicker">{t('Need us to fix it?', 'تحتاج من يصلحه؟')}</div>
          <h2>{t('One module. One fixed price.', 'وحدة واحدة. سعر ثابت.')}</h2>
          <p>
            {t(
              'Senior engineers direct AI, show working software about every 10 hours, and hand over the code. Approve the next module or stop with what you own.',
              'يوجه مهندسون ذوو خبرة الذكاء الاصطناعي، ويعرضون العمل كل 10 ساعات تقريبًا، ويسلمونك الكود. وافق على الوحدة التالية أو توقف واحتفظ بما تملك.',
            )}
          </p>
          <Link className="eng-text-link" href="/services">
            {t('See all services', 'استكشف الخدمات')}
          </Link>
        </div>
        <div className="eng-quote">
          <div className="eng-quote-price">
            <bdi>{t('SAR 18,000', '18,000 ر.س')}</bdi>
          </div>
          <div className="eng-quote-note">{t('per module, before VAT', 'لكل وحدة، قبل الضريبة')}</div>
          <div
            className="eng-timeline"
            role="img"
            aria-label={t(
              '40 hours, with a working demo about every 10 hours',
              '40 ساعة، مع عرض للعمل كل 10 ساعات تقريبًا',
            )}
          >
            {[10, 20, 30, 40].map((h, i) => (
              <span key={h} style={{ '--i': i } as CSSProperties}>
                <small>
                  <bdi className="num">{h}h</bdi> {h === 40 ? t('handover', 'التسليم') : t('demo', 'عرض')}
                </small>
              </span>
            ))}
          </div>
          <dl>
            <div>
              <dt>{t('Engineering time', 'وقت التنفيذ')}</dt>
              <dd>{t('40 hours', '40 ساعة')}</dd>
            </div>
            <div>
              <dt>{t('Working demo', 'عرض للعمل')}</dt>
              <dd>{t('About every 10 hours', 'كل 10 ساعات تقريبًا')}</dd>
            </div>
            <div>
              <dt>{t('Code ownership', 'ملكية الكود')}</dt>
              <dd>{t('Yours', 'لك')}</dd>
            </div>
          </dl>
        </div>
      </section>
      <section className="eng-section eng-faq-layout">
        <h2>{t('A few things you might be wondering.', 'أسئلة قبل أن تبدأ.')}</h2>
        <div>
          {[faqs[2], faqs[3], faqs[7]].map((f, i) => (
            <details className="eng-faq" key={i}>
              <summary>{pick(locale, f.q)}</summary>
              <p>{pick(locale, f.a)}</p>
            </details>
          ))}
        </div>
      </section>
      <Final locale={locale} />
    </div>
  )
}

export async function ServicePage({ locale, slug }: { locale: Locale; slug: string }) {
  const s = services.find((s) => s.slug === slug)!
  const t = text(locale)
  return (
    <div className="eng-wrap">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: pick(locale, s.name),
          description: pick(locale, s.description),
          url: absoluteUrl(locale, `/${slug}`),
          provider: { '@type': 'Organization', name: 'Etleq' },
          ...(s.price ? { offers: { '@type': 'Offer', price: s.price, priceCurrency: 'SAR' } } : {}),
        }}
      />
      {slug === 'audit' && <PageEvent name="audit_page_view" />}
      <header className="eng-page-head">
        <div className="eng-kicker">{pick(locale, s.name)}</div>
        <h1>{pick(locale, s.title)}</h1>
        <p className="eng-lead">{pick(locale, s.description)}</p>
        <div className="eng-price-line">
          {s.price && <bdi>SAR {s.price.toLocaleString('en')} · </bdi>}
          {pick(locale, s.priceNote)}
        </div>
        <Actions locale={locale} />
      </header>
      <section className="eng-section eng-detail-grid">
        <div>
          <h2>{t('Who it is for', 'لمن هذه الخدمة؟')}</h2>
          <p>{pick(locale, s.audience)}</p>
          <h3>{t('What you receive', 'ماذا تستلم؟')}</h3>
          <List locale={locale} items={s.deliverables} />
        </div>
        <div>
          <h2>{t('How it runs', 'كيف نعمل؟')}</h2>
          <List locale={locale} items={s.steps} />
          <p>
            {t('Timeline', 'المدة')}: {pick(locale, s.timeline)}
          </p>
          <p className="eng-note">
            {t(
              'Prices exclude VAT. Scope and acceptance criteria are agreed before work starts.',
              'الأسعار دون الضريبة. نتفق على النطاق ومعايير القبول قبل العمل.',
            )}
          </p>
        </div>
      </section>
      {slug === 'audit' && (
        <>
          <section className="eng-section">
            <h2>{t('15 layers. Nothing hidden.', '15 طبقة. الصورة كاملة.')}</h2>
            <p>
              {t(
                'Pass: ready. Warning: improvement needed. Critical: resolve before launch.',
                'ناجح: جاهز. تحذير: يحتاج تحسينًا. حرج: يعالج قبل الإطلاق.',
              )}
            </p>
            <LayerGrid locale={locale} />
          </section>
          <section className="eng-section eng-detail-grid">
            <div>
              <div className="eng-kicker">{t('Start here', 'ابدأ هنا')}</div>
              <h2>{t('Request your production audit.', 'اطلب الفحص التقني.')}</h2>
              <p>
                {t(
                  'SAR 750 + SAR 112.50 VAT = SAR 862.50 for Saudi buyers. Submit your details and we will confirm scope, secure access and payment arrangements.',
                  '750 ريال + 112.50 ريال ضريبة = 862.50 ريال للمشترين في السعودية. أرسل بياناتك لنؤكد النطاق والوصول الآمن وترتيبات الدفع.',
                )}
              </p>
              <p>
                {t(
                  'Online checkout is not available yet. This request does not charge you or start a scan. The 48-hour delivery window starts after payment and complete access are confirmed.',
                  'الدفع الإلكتروني غير متاح حاليًا. لا يخصم هذا الطلب أي مبلغ ولا يبدأ الفحص. تبدأ مهلة 48 ساعة بعد تأكيد الدفع واكتمال الوصول.',
                )}
              </p>
              <h3>{t('Your code, under your control.', 'الكود تحت سيطرتك.')}</h3>
              <List
                locale={locale}
                items={[
                  [
                    'Read-only access arranged before sharing; revoke it at any time.',
                    'وصول للقراءة فقط يرتب قبل المشاركة، ويمكنك إلغاؤه.',
                  ],
                  [
                    'NDA available before access. Do not submit source code, passwords or keys in this form.',
                    'اتفاقية سرية قبل الوصول. لا ترسل الكود أو كلمات المرور أو المفاتيح في هذا النموذج.',
                  ],
                  [
                    'Hosting region, deletion schedule and permitted AI tools are confirmed in writing before the scan.',
                    'تؤكد منطقة الاستضافة وموعد حذف الكود وأدوات الذكاء الاصطناعي المسموحة كتابيًا قبل الفحص.',
                  ],
                ]}
              />
            </div>
            <AuditIntake locale={locale} turnstileSiteKey={env.turnstileSiteKey || null} />
          </section>
        </>
      )}
      <section className="eng-section">
        <h2>{t('Questions before you start', 'أسئلة قبل البدء')}</h2>
        {[faqs[1], faqs[5], faqs[7]].map((f, i) => (
          <details key={i} className="eng-faq">
            <summary>{pick(locale, f.q)}</summary>
            <p>{pick(locale, f.a)}</p>
          </details>
        ))}
      </section>
      <Final locale={locale} />
    </div>
  )
}
export function LayerGrid({ locale }: { locale: string }) {
  return (
    <div className="eng-layers">
      {layers.map((l, i) => (
        <div key={i}>
          <b>{String(i + 1).padStart(2, '0')}</b>
          {pick(locale, l)}
        </div>
      ))}
    </div>
  )
}

export async function SupportingPage({ locale, slug }: { locale: Locale; slug: string }) {
  const t = text(locale)
  const title = pageTitle(slug, locale)
  return (
    <div className="eng-wrap">
      <header className="eng-page-head">
        <h1>{title}</h1>
      </header>
      {slug === 'services' && (
        <section className="eng-section eng-grid">
          {services.map((s) => (
            <Link className="eng-card" href={`/${s.slug}`} key={s.slug}>
              <span className="eng-card-num">{pick(locale, s.timeline)}</span>
              <h2 style={{ fontSize: 24, marginBottom: 8 }}>{pick(locale, s.name)}</h2>
              <p>{pick(locale, s.description)}</p>
              <span className="eng-text-link">
                {s.price ? `SAR ${s.price.toLocaleString('en')} · ` : ''}
                {pick(locale, s.priceNote)}
              </span>
            </Link>
          ))}
        </section>
      )}
      {slug === 'method' && (
        <>
          <section className="eng-section">
            <h2>{t('Audit in. Build in modules. Audit out.', 'فحص في البداية، بناء على مراحل، فحص في النهاية')}</h2>
            <ol className="eng-process">
              {[
                ['Your code', 'الكود'],
                ['Entry audit', 'الفحص الأولي'],
                ['Modules', 'الوحدات'],
                ['Staging sign-off', 'قبول بيئة الاختبار'],
                ['Exit audit', 'الفحص النهائي'],
                ['Live', 'الإطلاق'],
              ].map((v, i) => (
                <li key={i}>{pick(locale, v as Copy)}</li>
              ))}
            </ol>
            <p>
              {t(
                'A failed layer returns to remediation and review. No release with unresolved critical findings.',
                'تعود الطبقة غير المقبولة للإصلاح والمراجعة. لا إطلاق مع ملاحظات حرجة غير معالجة.',
              )}
            </p>
            <LayerGrid locale={locale} />
          </section>
          <section className="eng-section">
            <h2>{t('The module rules', 'قواعد الوحدات')}</h2>
            <List locale={locale} items={rules} />
            <p>
              {t(
                'Foundations included in builds: login and roles, encryption, notification integrations, admin, logs, AI integration and Arabic/English switching. External provider usage is quoted separately.',
                'أساسيات مشمولة في البناء: الدخول والأدوار والتشفير وربط التنبيهات والإدارة والسجلات وربط الذكاء الاصطناعي والتبديل بين اللغتين. تكلفة استخدام المزودين الخارجيين تحدد منفصلة.',
              )}
            </p>
          </section>
        </>
      )}
      {slug === 'pricing' && (
        <section className="eng-section">
          <PricingTable locale={locale} />
          <h2>{t('Pay for the next module. Keep the work.', 'ادفع للوحدة التالية. واحتفظ بالعمل.')}</h2>
          <p>
            {t(
              'No forced retainers. No idle hours. Your audit fee is credited when you start within 30 days. Sovereign AI management is a separately agreed recurring service.',
              'دون اشتراكات إلزامية أو ساعات انتظار. تخصم رسوم الفحص عند البدء خلال 30 يومًا. إدارة الذكاء الاصطناعي السيادي خدمة دورية باتفاق مستقل.',
            )}
          </p>
        </section>
      )}
      {slug === 'faq' && (
        <section className="eng-section">
          <JsonLd
            data={{
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map((f) => ({
                '@type': 'Question',
                name: pick(locale, f.q),
                acceptedAnswer: { '@type': 'Answer', text: pick(locale, f.a) },
              })),
            }}
          />
          {faqs.map((f, i) => (
            <details className="eng-faq" key={i}>
              <summary>{pick(locale, f.q)}</summary>
              <p>{pick(locale, f.a)}</p>
            </details>
          ))}
        </section>
      )}
      {(slug === 'work' || slug === 'audit/sample') && (
        <section className="eng-section eng-detail-grid">
          <div>
            <h2>{t('See what an audit actually tells you.', 'شاهد ما يوضحه الفحص.')}</h2>
            <p>
              {t(
                'This is an illustrative report, not a client audit or a claim of measured results. Named case studies will be published only with client permission.',
                'هذا تقرير توضيحي، وليس فحص عميل أو ادعاء بنتائج مقاسة. ننشر قصص العملاء بأسمائهم بعد موافقتهم فقط.',
              )}
            </p>
            <h3>{t('Example finding: missing ownership check', 'مثال: غياب التحقق من ملكية البيانات')}</h3>
            <p>
              {t(
                'Critical · api/orders/[id].ts:42 (fictional location). A signed-in user can read another account’s order. Add server-side ownership checks, test cross-account requests, and re-run the access review before release.',
                'حرج · api/orders/[id].ts:42 (موقع افتراضي). يمكن لمستخدم مسجل قراءة طلب لحساب آخر. أضف التحقق من الملكية على الخادم واختبر طلبات الحسابات المختلفة وأعد مراجعة الوصول قبل النشر.',
              )}
            </p>
            <p>
              {t(
                'Priority 1: authorization and sensitive data. Priority 2: storage performance and resilience. Final hours and module count follow the actual audit.',
                'الأولوية 1: الصلاحيات والبيانات الحساسة. الأولوية 2: أداء التخزين والاعتمادية. تحدد الساعات والوحدات بعد الفحص الفعلي.',
              )}
            </p>
            <Link className="eng-text-link" href="/advisory">
              {t('Or start with a free leadership session', 'أو ابدأ بجلسة قيادة مجانية')}
            </Link>
          </div>
          <Scorecard locale={locale} full />
        </section>
      )}
      {slug === 'contact' && (
        <section className="eng-section eng-detail-grid">
          <div>
            <h2>{t('A free 30-minute conversation.', 'مكالمة مجانية لمدة 30 دقيقة.')}</h2>
            <p>
              {t(
                'Tell us what you want to build or fix. We will help you choose a next step, with no obligation. Available times are shown in your time zone.',
                'أخبرنا بما تريد بناءه أو إصلاحه لنساعدك على تحديد الخطوة التالية دون التزام. تظهر المواعيد المتاحة بتوقيتك المحلي.',
              )}
            </p>
            <BookingPanel locale={locale} settings={await getSiteSettings(locale)} location="engineering_contact" />
          </div>
          <div>
            <h2>{t('Prefer to write?', 'تفضل الكتابة؟')}</h2>
            <p>
              {t(
                'Include your role, budget range and preferred timeline in your message.',
                'اذكر دورك والميزانية المتوقعة والموعد المناسب في رسالتك.',
              )}
            </p>
            <div className="eng-contact-form">
              <ContactForm locale={locale} />
            </div>
          </div>
        </section>
      )}
      {slug === 'about' && <About locale={locale} />}
      {slug === 'learn' && (
        <section className="eng-section">
          <h2>{t('Start with the production-readiness checklist.', 'ابدأ بقائمة جاهزية الإنتاج.')}</h2>
          <p>
            {t(
              'Before you launch an AI-built app: test access between accounts, revoke exposed keys, restore a backup, review error logs, and test the Arabic interface on a small phone. Our method covers all 15 review layers.',
              'قبل إطلاق تطبيقك: اختبر الوصول بين الحسابات، وألغ المفاتيح المكشوفة، واسترجع نسخة احتياطية، وراجع سجلات الأخطاء، واختبر العربية على جوال صغير. تغطي منهجيتنا طبقات الفحص الـ 15.',
            )}
          </p>
          <Link className="eng-text-link" href="/method">
            {t('Read the full checklist', 'اطلع على القائمة الكاملة')}
          </Link>
          <br />
          <Link className="eng-text-link" href="/blog">
            {t('Browse the journal', 'تصفح المقالات')}
          </Link>
        </section>
      )}
      {(slug === 'audit-terms' || slug === 'refund-policy') && (
        <section className="eng-section">
          <h2>{t('Agreed before you pay', 'نتفق قبل الدفع')}</h2>
          <p>
            {slug === 'audit-terms'
              ? t(
                  'The audit scope, authorized read-only access, delivery start, hosting region, code deletion schedule, confidentiality and liability terms must be confirmed in a written agreement before payment or code access. The report covers the agreed snapshot and is not a guarantee against every future incident. You retain ownership of your code and report.',
                  'يجب تأكيد نطاق الفحص والوصول المصرح للقراءة فقط وبداية التسليم ومنطقة الاستضافة وحذف الكود والسرية وحدود المسؤولية باتفاق مكتوب قبل الدفع أو الوصول للكود. يغطي التقرير النسخة المتفق عليها ولا يضمن منع كل حادث مستقبلي. تبقى ملكية الكود والتقرير لك.',
                )
              : t(
                  'Refund eligibility, cancellation and the 48-hour delivery commitment are confirmed in your audit order before payment. No payment is collected by the request form. Contact us about an existing order; include your order reference, never card details.',
                  'تؤكد أهلية الاسترداد والإلغاء والتزام التسليم خلال 48 ساعة في طلب الفحص قبل الدفع. لا يجمع نموذج الطلب أي دفعة. تواصل معنا بخصوص الطلب القائم وأرفق مرجعه دون بيانات البطاقة.',
                )}
          </p>
          <Link className="eng-text-link" href="/contact">
            {t('Contact Etleq', 'تواصل مع اطلق')}
          </Link>
        </section>
      )}
      <Final locale={locale} />
    </div>
  )
}
async function About({ locale }: { locale: Locale }) {
  const t = text(locale)
  const [data, founders] = await Promise.all([
    getShellData(locale),
    findPublic('authors', locale, { where: { isFounder: { equals: true } }, limit: 12, depth: 1 }).catch(() => ({
      docs: [],
    })),
  ])
  return (
    <section className="eng-section">
      <h2>{t('The second version of your company starts here.', 'النسخة الثانية من شركتك تبدأ هنا')}</h2>
      <p className="eng-lead">
        {t(
          'Etleq builds software for Gulf businesses with senior engineering oversight, AI-assisted delivery and explicit acceptance gates. You should be able to see what works, know what it costs and own what you pay for.',
          'تبني اطلق برمجيات للشركات الخليجية بإشراف هندسي وبمساعدة الذكاء الاصطناعي ومعايير قبول واضحة. تعرف ما يعمل، وكم يكلف، وتملك ما تدفع مقابله.',
        )}
      </p>
      {founders.docs.map((f) => (
        <article key={f.id} className="eng-card eng-founder">
          {f.photo && typeof f.photo === 'object' && f.photo.url && (
            <img src={f.photo.url} alt={f.name || ''} width={160} height={180} />
          )}
          <div>
            <h3>{f.name}</h3>
            <p>{f.role}</p>
            <p>{f.bio}</p>
            {f.sameAs
              ?.filter((s) => s.url && /^https?:\/\//.test(s.url))
              .map((s) => (
                <a key={s.url} className="eng-text-link" href={s.url!} rel="noopener noreferrer" target="_blank">
                  {new URL(s.url!).hostname}
                </a>
              ))}
          </div>
        </article>
      ))}
      <List locale={locale} items={rules} />
      {data.settings.legalEntities
        .filter((e) => isReal(e.legalName))
        .map((e, i) => (
          <EntityDetails key={i} locale={locale} entity={e} />
        ))}
    </section>
  )
}
export function pageTitle(slug: string, locale: string) {
  const titles: Record<string, Copy> = {
    services: ['Choose your next step.', 'اختر خطوتك التالية.'],
    method: ['A standard you can inspect.', 'معيار يمكنك فحصه.'],
    pricing: ['Clear prices. No surprises.', 'أسعار واضحة. دون مفاجآت.'],
    work: ['Proof before promises.', 'الدليل قبل الوعود.'],
    'audit/sample': ['A sample production audit.', 'نموذج الفحص التقني.'],
    contact: ['Let’s make your next step clear.', 'لنحدد خطوتك التالية.'],
    about: ['Engineering you can own.', 'هندسة تملكها بالكامل.'],
    faq: ['Your questions, answered.', 'إجابات لأسئلتك.'],
    learn: ['Build with understanding.', 'ابنِ على معرفة.'],
    'audit-terms': ['Audit terms', 'شروط الفحص'],
    'refund-policy': ['Audit refunds', 'استرداد رسوم الفحص'],
  }
  return pick(locale, titles[slug] || ['Etleq', 'اطلق'])
}
