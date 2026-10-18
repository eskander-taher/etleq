/**
 * Development seed: `pnpm seed`
 *
 * Wipes the public content collections and recreates sample content in Arabic
 * and English. Every document is flagged `isSample: true`, and invented facts
 * are marked [SAMPLE] / [عينة] with example.com sources. The production build
 * refuses to run while published samples exist (scripts/check-samples.ts).
 *
 * Leads, applications and subscribers are personal data and are never touched.
 */
import 'dotenv/config'

import { closeDb, getDb } from '../src/cms/db'
import { ensureIndexes } from '../src/cms/indexes'
import { cms } from '../src/cms/local'
import { toMarkdown } from '../src/cms/richtext'
import type { CollectionSlug, GlobalSlug } from '../src/cms/types'

type Data = Record<string, unknown>
type Loc = { ar: Data; en: Data }

const context = { seed: true, disableRevalidate: true, skipSlugRedirects: true }
const ADMIN_EMAIL = 'admin@etleq.local'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'etleq-dev-123'

const WIPE: CollectionSlug[] = [
  'pages',
  'models',
  'solutions',
  'projects',
  'posts',
  'news',
  'guides',
  'jobs',
  'faqs',
  'authors',
  'categories',
  'tags',
  'testimonials',
  'short-links',
]

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Copy array-row ids from the Arabic document into the English data so that
 * localized fields inside arrays land on the same rows instead of new ones.
 */
function withIds(data: unknown, stored: unknown): unknown {
  if (Array.isArray(data)) {
    const rows = Array.isArray(stored) ? stored : []
    return data.map((row, i) => {
      const storedRow = rows[i] as Data | undefined
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        const merged = withIds(row, storedRow) as Data
        return storedRow?.id ? { ...merged, id: storedRow.id } : merged
      }
      return row
    })
  }
  if (data && typeof data === 'object' && !('root' in (data as Data))) {
    const out: Data = {}
    for (const [k, v] of Object.entries(data as Data)) out[k] = withIds(v, (stored as Data | undefined)?.[k])
    return out
  }
  return data
}

function makeSeeder() {
  /** Create a published document in Arabic, then add the English locale. */
  async function create(collection: CollectionSlug, common: Data, loc: Loc): Promise<{ id: string }> {
    const base = { isSample: true, ...common, translated: { ar: true, en: true }, _status: 'published' }
    const created = (await cms.create({
      collection,
      locale: 'ar',
      data: { ...base, ...loc.ar } as never,
      overrideAccess: true,
      context,
    })) as unknown as Data & { id: string }
    const en = withIds({ ...base, ...loc.en }, created) as Data
    await cms.update({ collection, id: created.id, locale: 'en', data: en as never, overrideAccess: true, context })
    return { id: created.id }
  }

  async function global(slug: GlobalSlug, common: Data, loc: Loc) {
    const ar = (await cms.updateGlobal({
      slug,
      locale: 'ar',
      data: { ...common, ...loc.ar } as never,
      overrideAccess: true,
      context,
    })) as unknown as Data
    await cms.updateGlobal({
      slug,
      locale: 'en',
      data: withIds({ ...common, ...loc.en }, ar) as never,
      overrideAccess: true,
      context,
    })
  }

  return { create, global }
}

/** Build a localized pair of arrays from [ar, en] tuples. */
const pairs = <T extends string>(key: T, rows: [string, string][]) => ({
  ar: rows.map(([a]) => ({ [key]: a })),
  en: rows.map(([, e]) => ({ [key]: e })),
})

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

async function seed() {
  const { create, global } = makeSeeder()

  console.log('Seeding sample content…')

  // Wipe public content (not leads/applications/subscribers/users).
  const db = await getDb()
  for (const slug of WIPE) await db.collection(slug).deleteMany({})
  await ensureIndexes()

  /* Admin user ------------------------------------------------------ */
  const existing = await cms.find({
    collection: 'users',
    where: { email: { equals: ADMIN_EMAIL } },
    limit: 1,
    overrideAccess: true,
  })
  let adminId: string
  if (existing.docs[0]) {
    adminId = String(existing.docs[0].id)
    await cms.update({
      collection: 'users',
      id: adminId,
      data: {
        password: ADMIN_PASSWORD,
        role: 'admin',
        name: 'Etleq Admin',
        loginAttempts: 0,
        lockUntil: null,
      } as never,
      overrideAccess: true,
      context,
    })
  } else {
    const user = await cms.create({
      collection: 'users',
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, name: 'Etleq Admin', role: 'admin' },
      overrideAccess: true,
      context,
    })
    adminId = String(user.id)
  }

  /* Taxonomies ------------------------------------------------------ */
  const cat = {
    models: await create(
      'categories',
      { slug: 'saas-models' },
      {
        ar: { name: 'نماذج SaaS', description: 'قصص نجاح لمنصّات برمجية يمكن بناء نسخة خليجية منها.' },
        en: { name: 'SaaS models', description: 'Software success stories with a Gulf version worth building.' },
      },
    ),
    costs: await create(
      'categories',
      { slug: 'costs' },
      {
        ar: { name: 'التكاليف', description: 'كم يكلّف بناء منصّة وتشغيلها.' },
        en: { name: 'Costs', description: 'What it costs to build and run a product.' },
      },
    ),
    launch: await create(
      'categories',
      { slug: 'launching' },
      {
        ar: { name: 'الإطلاق', description: 'خطوات عملية من الفكرة إلى أول عميل.' },
        en: { name: 'Launching', description: 'Practical steps from idea to first customer.' },
      },
    ),
  }
  const tag = {
    mada: await create('tags', { slug: 'mada' }, { ar: { name: 'مدى' }, en: { name: 'mada' } }),
    zatca: await create('tags', { slug: 'zatca' }, { ar: { name: 'زاتكا' }, en: { name: 'ZATCA' } }),
    clinics: await create('tags', { slug: 'clinics' }, { ar: { name: 'العيادات' }, en: { name: 'Clinics' } }),
  }

  /* Authors --------------------------------------------------------- */
  // Real co-founders (owner-supplied facts, 2026-10-16). Not samples: they stay in production.
  // Photos, LinkedIn links and longer bios still to come from the founders.
  const founder1 = await create(
    'authors',
    { slug: 'eskander-taher', isSample: false, isFounder: true, order: 1, user: adminId },
    {
      ar: {
        name: 'اسكندر طاهر',
        role: 'شريك مؤسس',
        bio: 'مهندس برمجيات وشريك مؤسس في اطلق. يحمل بكالوريوس في هندسة البرمجيات، وماجستير في الإدارة المبنية على البيانات من جامعة رودن، وماجستير في علوم البيانات من جامعة ميسيس.',
        credentials: [
          { text: 'بكالوريوس في هندسة البرمجيات' },
          { text: 'ماجستير في الإدارة المبنية على البيانات، جامعة رودن (RUDN)' },
          { text: 'ماجستير في علوم البيانات، جامعة ميسيس (MISIS)' },
        ],
      },
      en: {
        name: 'Eskander Taher',
        role: 'Co-founder',
        bio: "Software engineer and co-founder of Etleq. He holds a bachelor's degree in software engineering, a master's in data-driven management from RUDN University and a master's in data science from MISIS University.",
        credentials: [
          { text: "Bachelor's degree in software engineering" },
          { text: "Master's in data-driven management, RUDN University" },
          { text: "Master's in data science, MISIS University" },
        ],
      },
    },
  )
  const founder2 = await create(
    'authors',
    { slug: 'hazim-al-haidari', isSample: false, isFounder: true, order: 2 },
    {
      ar: {
        name: 'حازم الحيدري',
        role: 'شريك مؤسس',
        bio: 'شريك مؤسس في اطلق. يحمل ماجستير في علوم البيانات من جامعة ميسيس، وباحث دكتوراه في جامعة باومان التقنية.',
        credentials: [
          { text: 'ماجستير في علوم البيانات، جامعة ميسيس (MISIS)' },
          { text: 'باحث دكتوراه، جامعة باومان التقنية (Bauman)' },
        ],
      },
      en: {
        name: 'Hazim Al-Haidari',
        role: 'Co-founder',
        bio: "Co-founder of Etleq. He holds a master's in data science from MISIS University and is a PhD researcher at Bauman Moscow State Technical University.",
        credentials: [
          { text: "Master's in data science, MISIS University" },
          { text: 'PhD researcher, Bauman Moscow State Technical University' },
        ],
      },
    },
  )

  /* FAQs ------------------------------------------------------------ */
  const faqRows: [string, [string, string], [string, string]][] = [
    [
      'price',
      [
        'كم يكلّف بناء منصّتي؟',
        'تبدأ باقة Core من 5,900 دولار (22,125 ر.س) دون ضريبة القيمة المضافة. نحدّد السعر النهائي الثابت في جلسة المخطّط خلال 48 ساعة.',
      ],
      [
        'How much does my product cost?',
        'Launch 30 Core starts at $5,900 excluding VAT. You get a fixed final quote within 48 hours of the Blueprint session.',
      ],
    ],
    [
      'ownership',
      [
        'من يملك الكود والبيانات؟',
        'أنت تملك بيانات منصّتك وعلامتك التجارية. تفاصيل ترخيص Etleq Core مكتوبة في العقد بوضوح.',
      ],
      [
        'Who owns the code and the data?',
        'You own your product’s data and brand. The licence terms for Etleq Core are written plainly in the contract.',
      ],
    ],
    [
      'timeline',
      [
        'ماذا لو تأخّرتم عن 30 يومًا؟',
        'نردّ 10% من قيمة البناء عن كل أسبوع تأخير ونواصل العمل مجانًا. تتوقّف المدّة إذا تأخّرت مدخلاتك.',
      ],
      [
        'What if you miss the 30 days?',
        'We refund 10% of the build fee for each late week and keep building for free. The clock pauses while your inputs are overdue.',
      ],
    ],
    [
      'payments',
      [
        'هل تدعم المنصّة مدى وApple Pay؟',
        'نعم. الدفع عبر مدى وApple Pay والبطاقات جاهز في Etleq Core منذ اليوم الأول.',
      ],
      [
        'Does it support mada and Apple Pay?',
        'Yes. mada, Apple Pay and card payments are built into Etleq Core from day one.',
      ],
    ],
    [
      'hosting',
      [
        'أين تُستضاف منصّتي؟',
        'نختار موقع الاستضافة معك بحسب متطلبات حماية البيانات في بلدك. الاستضافة والنسخ الاحتياطي ضمن خطط الرعاية.',
      ],
      [
        'Where is my product hosted?',
        'We choose the hosting region with you based on your country’s data-protection rules. Hosting and backups are part of the Care plans.',
      ],
    ],
    [
      'languages',
      [
        'هل المنصّة بالعربية والإنجليزية؟',
        'نعم. العربية أولًا مع واجهة من اليمين إلى اليسار، والإنجليزية متاحة أيضًا.',
      ],
      [
        'Is it in Arabic and English?',
        'Yes. Arabic first with a proper right-to-left interface, with English available too.',
      ],
    ],
    [
      'equity',
      ['هل تأخذون حصّة من شركتي؟', 'لا. نعمل بسعر ثابت ولا نطلب حصّة في شركتك.'],
      ['Do you take equity?', 'No. We work for a fixed price and never ask for equity.'],
    ],
    [
      'refunds',
      [
        'هل يمكن استرداد رسوم المخطّط؟',
        'تُخصم رسوم المخطّط (390 دولارًا) من قيمة البناء إذا تابعنا معًا. شروط الاسترداد مكتوبة في صفحة العرض.',
      ],
      [
        'Can I get the Blueprint fee back?',
        'The $390 Blueprint fee is credited to your build if we go ahead. Refund terms are on the offer page.',
      ],
    ],
    [
      'process',
      [
        'كيف تسير العملية؟',
        'التقييم، ثم مكالمة توافق قصيرة، ثم المخطّط المدفوع، ثم بناء 30 يومًا مع عرض في اليوم العاشر، ثم الإطلاق والرعاية.',
      ],
      [
        'How does the process work?',
        'Scorecard, a short fit call, the paid Blueprint, a 30-day build with a demo on day 10, then launch and Care.',
      ],
    ],
    [
      'general',
      ['هل أحتاج خبرة تقنية؟', 'لا. أنت تدير مشروعك وعملاءك، ونحن نتولّى التقنية بالكامل.'],
      ['Do I need technical skills?', 'No. You run the business and the customers; we run the technology.'],
    ],
  ]
  const faqIds: string[] = []
  for (const [i, [category, [qa, aa], [qe, ae]]] of faqRows.entries()) {
    const f = await create(
      'faqs',
      { category, order: i + 1 },
      { ar: { question: qa, answer: aa }, en: { question: qe, answer: ae } },
    )
    faqIds.push(f.id)
  }

  /* Solutions ------------------------------------------------------- */
  const solutionDefs: { slug: string; vertical: string; ar: [string, string]; en: [string, string]; price: number }[] =
    [
      {
        slug: 'clinics',
        vertical: 'clinics',
        price: 12000,
        ar: [
          'نظام حجوزات وإدارة للعيادات',
          'حجز المواعيد، تذكير المرضى عبر واتساب، الدفع المسبق بمدى، وفواتير متوافقة مع ZATCA.',
        ],
        en: [
          'Clinic booking and operations system',
          'Appointment booking, WhatsApp reminders, mada prepayment and ZATCA-ready invoices.',
        ],
      },
      {
        slug: 'gyms',
        vertical: 'gyms',
        price: 8900,
        ar: ['منصّة اشتراكات للأندية الرياضية', 'اشتراكات شهرية تتجدّد تلقائيًا، حجز الحصص، وتطبيق للأعضاء بالعربية.'],
        en: ['Membership platform for gyms', 'Auto-renewing memberships, class booking and an Arabic member app.'],
      },
      {
        slug: 'salons',
        vertical: 'salons',
        price: 5900,
        ar: ['نظام حجز للصالونات', 'حجز أونلاين على مدار الساعة، إدارة الموظفين، وتقليل المواعيد الضائعة.'],
        en: ['Booking system for salons', 'Online booking around the clock, staff schedules and fewer no-shows.'],
      },
      {
        slug: 'restaurants',
        vertical: 'restaurants',
        price: 12000,
        ar: ['نظام طلبات وولاء للمطاعم', 'طلبات مباشرة دون عمولات التطبيقات، برنامج ولاء، وفواتير ZATCA.'],
        en: [
          'Ordering and loyalty system for restaurants',
          'Direct orders without app commissions, a loyalty programme and ZATCA invoices.',
        ],
      },
      {
        slug: 'training-centres',
        vertical: 'training-centres',
        price: 8900,
        ar: ['منصّة تسجيل لمراكز التدريب', 'تسجيل الدورات والدفع، الشهادات، وإدارة المدرّبين في مكان واحد.'],
        en: [
          'Enrolment platform for training centres',
          'Course enrolment and payment, certificates and trainer management in one place.',
        ],
      },
    ]
  const solutionIds: Record<string, string> = {}
  for (const s of solutionDefs) {
    const problems = pairs('problem', [
      ['[عينة] الحجوزات تضيع بين الهاتف وواتساب', '[SAMPLE] Bookings get lost between phone calls and WhatsApp'],
      ['[عينة] لا توجد فوترة إلكترونية متوافقة', '[SAMPLE] No compliant e-invoicing'],
    ])
    const doc = await create(
      'solutions',
      {
        slug: s.slug,
        vertical: s.vertical,
        priceFrom: s.price,
        faqs: faqIds.slice(0, 4),
        integrations: [{ name: 'mada' }, { name: 'Apple Pay' }, { name: 'WhatsApp' }],
      },
      {
        ar: {
          title: s.ar[0],
          summary: s.ar[1],
          buyerProblems: problems.ar,
          features: [
            { title: 'دفع عبر مدى وApple Pay', description: 'يدفع عملاؤك مباشرة من المنصّة.', icon: 'credit-card' },
            { title: 'فوترة ZATCA', description: 'فواتير إلكترونية جاهزة للمرحلة الثانية.', icon: 'receipt' },
          ],
          steps: [
            { title: 'المخطّط', description: 'جلسة 90 دقيقة نحدّد فيها النطاق والسعر.' },
            { title: 'البناء', description: '30 يومًا مع عرض تجريبي في اليوم العاشر.' },
            { title: 'الإطلاق', description: 'منصّتك تعمل وتستقبل المدفوعات.' },
          ],
        },
        en: {
          title: s.en[0],
          summary: s.en[1],
          buyerProblems: problems.en,
          features: [
            { title: 'mada and Apple Pay', description: 'Your customers pay inside the product.', icon: 'credit-card' },
            { title: 'ZATCA invoicing', description: 'E-invoices ready for phase two.', icon: 'receipt' },
          ],
          steps: [
            { title: 'Blueprint', description: 'A 90-minute session to fix scope and price.' },
            { title: 'Build', description: '30 days with a demo on day 10.' },
            { title: 'Launch', description: 'Your product is live and taking payments.' },
          ],
        },
      },
    )
    solutionIds[s.slug] = doc.id
  }

  /* Models ---------------------------------------------------------- */
  const modelDefs = [
    {
      slug: 'barber-booking-app',
      category: 'booking',
      tier: 'core',
      priceFrom: 5900,
      solution: 'salons',
      mrr: 25000,
      ar: {
        title: 'تطبيق حجز للحلّاقين',
        what: 'تطبيق يحجز فيه العملاء موعد الحلاقة ويدفعون مسبقًا، ويدير منه الصالون جدول الحلّاقين.',
        pays: 'صاحب الصالون يدفع اشتراكًا شهريًا لكل فرع.',
      },
      en: {
        title: 'Barber booking app',
        what: 'An app where customers book a haircut and prepay, and the shop manages its barbers’ schedules.',
        pays: 'The shop owner pays a monthly subscription per branch.',
      },
    },
    {
      slug: 'gym-membership-platform',
      category: 'membership',
      tier: 'pro',
      priceFrom: 8900,
      solution: 'gyms',
      mrr: 60000,
      ar: {
        title: 'منصّة اشتراكات للأندية الرياضية',
        what: 'منصّة تدير الاشتراكات المتجدّدة وحجز الحصص ودخول الأعضاء.',
        pays: 'النادي يدفع اشتراكًا شهريًا حسب عدد الأعضاء.',
      },
      en: {
        title: 'Gym membership platform',
        what: 'A platform that runs recurring memberships, class booking and member check-in.',
        pays: 'The gym pays a monthly fee based on member count.',
      },
    },
    {
      slug: 'clinic-booking-system',
      category: 'vertical',
      tier: 'vertical',
      priceFrom: 12000,
      solution: 'clinics',
      mrr: 120000,
      ar: {
        title: 'نظام حجوزات للعيادات',
        what: 'نظام يحجز فيه المرضى مواعيدهم، وتصلهم تذكيرات، وتصدر العيادة فواتير إلكترونية.',
        pays: 'العيادة تدفع اشتراكًا شهريًا لكل طبيب.',
      },
      en: {
        title: 'Clinic booking system',
        what: 'A system where patients book appointments, get reminders and the clinic issues e-invoices.',
        pays: 'The clinic pays a monthly fee per doctor.',
      },
    },
  ]
  const modelIds: string[] = []
  for (const m of modelDefs) {
    const facts = [1, 2, 3].map((n) => ({
      url: `https://example.com/sample-source-${m.slug}-${n}`,
      checkedAt: daysAgo(10 * n),
    }))
    const doc = await create(
      'models',
      {
        slug: m.slug,
        category: m.category,
        tier: m.tier,
        priceFrom: m.priceFrom,
        buildDays: 30,
        teamSize: 3,
        yearFounded: 2019,
        mrr: {
          amount: m.mrr,
          currency: 'USD',
          sourceName: '[SAMPLE] Example Source',
          sourceUrl: `https://example.com/sample-mrr-${m.slug}`,
          reportedAt: daysAgo(60),
        },
        factSources: facts,
        runningCosts: [
          {
            monthlyCost: 40,
            currency: 'USD',
            sourceUrl: 'https://example.com/sample-hosting-price',
            checkedAt: daysAgo(5),
          },
          {
            monthlyCost: 15,
            currency: 'USD',
            sourceUrl: 'https://example.com/sample-sms-price',
            checkedAt: daysAgo(5),
          },
        ],
        reel: { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', platform: 'youtube' },
        faqs: faqIds.slice(0, 5),
        relatedSolution: solutionIds[m.solution],
        reviewer: founder1.id,
        authors: [founder1.id],
        lastReviewedAt: daysAgo(3),
      },
      {
        ar: {
          title: m.ar.title,
          answerBox: `[عينة] ${m.ar.what} يمكن إطلاق نسخة خليجية منه خلال 30 يومًا بسعر يبدأ من ${Math.round(m.priceFrom * 3.75).toLocaleString('en-US')} ر.س، مع الدفع عبر مدى وفواتير ZATCA.`,
          whatItDoes: m.ar.what,
          whoPays: m.ar.pays,
          pricingModel: '[عينة] اشتراك شهري مع خصم للدفع السنوي.',
          factSources: facts.map((f, i) => ({
            ...f,
            label: `[عينة] حقيقة ${i + 1}`,
            value: `[عينة] قيمة توضيحية ${i + 1}`,
          })),
          whyItWorks: toMarkdown(
            '[عينة] مشكلة يومية متكرّرة، وعميل يدفع شهريًا، وتكلفة تشغيل منخفضة.',
            'كل رقم هنا توضيحي ويُستبدل بمصدر حقيقي قبل النشر.',
          ),
          gulfVersion: toMarkdown(
            '## النسخة الخليجية',
            '[عينة] واجهة عربية، دفع عبر مدى وApple Pay، تذكيرات واتساب، وفواتير متوافقة مع ZATCA.',
          ),
          runningCosts: [{ item: 'الاستضافة' }, { item: 'رسائل التذكير' }],
          mvpFeatures: [
            { feature: 'الحجز والدفع المسبق' },
            { feature: 'لوحة تحكم للمالك' },
            { feature: 'تذكيرات واتساب' },
          ],
          fitCriteria: [{ criterion: 'لديك عملاء حاليون في هذا القطاع' }, { criterion: 'ميزانية من 5,000 دولار' }],
          transcript: '[عينة] نص الفيديو القصير عن قصة النجاح.',
        },
        en: {
          title: m.en.title,
          answerBox: `[SAMPLE] ${m.en.what} A Gulf version can go live in 30 days from $${m.priceFrom.toLocaleString('en-US')}, with mada payments and ZATCA invoicing.`,
          whatItDoes: m.en.what,
          whoPays: m.en.pays,
          pricingModel: '[SAMPLE] Monthly subscription with an annual discount.',
          factSources: facts.map((f, i) => ({
            ...f,
            label: `[SAMPLE] Fact ${i + 1}`,
            value: `[SAMPLE] Illustrative value ${i + 1}`,
          })),
          whyItWorks: toMarkdown(
            '[SAMPLE] A daily, repeated problem, a customer who pays monthly, and low running costs.',
            'Every figure here is illustrative and is replaced by a real source before publishing.',
          ),
          gulfVersion: toMarkdown(
            '## The Gulf version',
            '[SAMPLE] Arabic interface, mada and Apple Pay, WhatsApp reminders and ZATCA-ready invoices.',
          ),
          runningCosts: [{ item: 'Hosting' }, { item: 'Reminder messages' }],
          mvpFeatures: [
            { feature: 'Booking and prepayment' },
            { feature: 'Owner dashboard' },
            { feature: 'WhatsApp reminders' },
          ],
          fitCriteria: [
            { criterion: 'You already have customers in this sector' },
            { criterion: 'A budget from $5,000' },
          ],
          transcript: '[SAMPLE] Transcript of the short video about the success story.',
        },
      },
    )
    modelIds.push(doc.id)
  }
  // Related models (each links the other two).
  for (const [i, id] of modelIds.entries()) {
    await cms.update({
      collection: 'models',
      id,
      locale: 'ar',
      data: { relatedModels: modelIds.filter((_, j) => j !== i).slice(0, 2), _status: 'published' } as never,
      overrideAccess: true,
      context,
    })
  }

  /* Posts ----------------------------------------------------------- */
  const postDefs = [
    {
      slug: 'how-to-choose-a-saas-model',
      ar: ['كيف تختار نموذج SaaS مناسبًا لسوق الخليج', 'خمسة أسئلة تساعدك على اختيار فكرة لها عملاء يدفعون.'],
      en: [
        'How to choose a SaaS model for the Gulf market',
        'Five questions that help you pick an idea with paying customers.',
      ],
    },
    {
      slug: 'zatca-e-invoicing-explained',
      ar: ['الفوترة الإلكترونية من ZATCA بلغة بسيطة', 'ما الذي تحتاجه منصّتك لتصدر فواتير متوافقة.'],
      en: ['ZATCA e-invoicing in plain words', 'What your product needs to issue compliant invoices.'],
    },
    {
      slug: 'first-10-customers',
      ar: ['أول 10 عملاء بعد الإطلاق', 'خطة عملية للأسابيع الأربعة الأولى بعد إطلاق منصّتك.'],
      en: ['Your first 10 customers after launch', 'A practical plan for the first four weeks after launch.'],
    },
  ]
  const postIds: string[] = []
  for (const [i, p] of postDefs.entries()) {
    const doc = await create(
      'posts',
      {
        slug: p.slug,
        authors: [i % 2 ? founder2.id : founder1.id],
        categories: [i === 1 ? cat.costs.id : cat.launch.id],
        tags: [tag.mada.id, tag.zatca.id],
        publishedAt: daysAgo(20 - i * 5),
        lastReviewedAt: daysAgo(2),
        sources: [
          { label: '[SAMPLE] Example source', url: 'https://example.com/sample-post-source', accessedAt: daysAgo(4) },
        ],
        faqs: faqIds.slice(5, 8),
        relatedPosts: postIds.slice(0, 1),
      },
      {
        ar: {
          title: p.ar[0],
          excerpt: p.ar[1],
          keyTakeaways: [
            { text: '[عينة] ابدأ بمشكلة يدفع الناس لحلّها اليوم.' },
            { text: '[عينة] اختبر الطلب قبل البناء.' },
          ],
          content: toMarkdown(
            '## الخلاصة',
            `[عينة] ${p.ar[1]} هذا نص توضيحي لمقال تجريبي.`,
            { blockType: 'callout', tone: 'tip', title: 'نصيحة', body: '[عينة] اكتب الأرقام مع مصادرها دائمًا.' },
            {
              blockType: 'statWithSource',
              value: '6.6%',
              label: 'متوسط معدل التحويل لصفحات الهبوط (2024)',
              sourceName: 'Unbounce',
              sourceUrl: 'https://unbounce.com/landing-page-benchmarks/',
              checkedAt: daysAgo(30),
            },
            { blockType: 'cta', heading: 'هل فكرتك جاهزة للإطلاق؟', body: 'اعرف خلال دقيقتين.', action: 'scorecard' },
          ),
        },
        en: {
          title: p.en[0],
          excerpt: p.en[1],
          keyTakeaways: [
            { text: '[SAMPLE] Start with a problem people pay to solve today.' },
            { text: '[SAMPLE] Test demand before you build.' },
          ],
          content: toMarkdown(
            '## The short answer',
            `[SAMPLE] ${p.en[1]} This is placeholder text for a sample article.`,
            {
              blockType: 'callout',
              tone: 'tip',
              title: 'Tip',
              body: '[SAMPLE] Always show numbers with their sources.',
            },
            {
              blockType: 'statWithSource',
              value: '6.6%',
              label: 'Median landing-page conversion rate (2024)',
              sourceName: 'Unbounce',
              sourceUrl: 'https://unbounce.com/landing-page-benchmarks/',
              checkedAt: daysAgo(30),
            },
            {
              blockType: 'cta',
              heading: 'Is your idea ready to launch?',
              body: 'Find out in two minutes.',
              action: 'scorecard',
            },
          ),
        },
      },
    )
    postIds.push(doc.id)
  }
  // Link models to posts now that posts exist.
  for (const id of modelIds) {
    await cms.update({
      collection: 'models',
      id,
      locale: 'ar',
      data: { relatedPosts: postIds.slice(0, 2), _status: 'published' } as never,
      overrideAccess: true,
      context,
    })
  }

  /* News ------------------------------------------------------------ */
  const newsDefs = [
    {
      slug: 'etleq-core-update',
      ar: ['[عينة] تحديث جديد في Etleq Core', 'أضفنا دعم الاشتراكات السنوية.'],
      en: ['[SAMPLE] A new Etleq Core update', 'We added support for annual subscriptions.'],
    },
    {
      slug: 'zatca-phase-two-reminder',
      ar: ['[عينة] تذكير بموعد مرحلة الربط من ZATCA', 'ما الذي يعنيه ذلك لأصحاب المنصّات.'],
      en: ['[SAMPLE] Reminder about the ZATCA integration phase', 'What it means for product owners.'],
    },
  ]
  for (const [i, n] of newsDefs.entries()) {
    await create(
      'news',
      {
        slug: n.slug,
        publishedAt: daysAgo(7 - i * 3),
        sourceLinks: [{ label: '[SAMPLE] Example source', url: 'https://example.com/sample-news-source' }],
      },
      {
        ar: {
          title: n.ar[0],
          excerpt: n.ar[1],
          content: toMarkdown(`[عينة] ${n.ar[1]}`, 'هذا خبر تجريبي لأغراض التطوير فقط.'),
        },
        en: {
          title: n.en[0],
          excerpt: n.en[1],
          content: toMarkdown(`[SAMPLE] ${n.en[1]}`, 'This is a sample news item for development only.'),
        },
      },
    )
  }

  /* Guides ---------------------------------------------------------- */
  const guideSources = [1, 2, 3].map((n) => ({
    label: `[SAMPLE] Source ${n}`,
    url: `https://example.com/sample-guide-source-${n}`,
    accessedAt: daysAgo(n * 3),
  }))
  await create(
    'guides',
    {
      slug: 'clinic-booking-app-cost-saudi-arabia',
      type: 'cost',
      authors: [founder1.id],
      reviewer: founder2.id,
      categories: [cat.costs.id],
      tags: [tag.clinics.id],
      publishedAt: daysAgo(12),
      lastReviewedAt: daysAgo(2),
      sources: guideSources,
      faqs: faqIds.slice(0, 3),
    },
    {
      ar: {
        title: 'كم تكلفة تطبيق حجز للعيادات في السعودية؟',
        excerpt: 'مقارنة تكاليف البناء والتشغيل بين الوكالة والمستقل وEtleq.',
        answerBox:
          '[عينة] تتراوح تكلفة بناء نظام حجز للعيادات في السعودية بين 35 و65 ألف ريال لدى الوكالات. باقة Etleq Vertical تبدأ من 45,000 ر.س بسعر ثابت وتنطلق خلال 30 يومًا.',
        keyTakeaways: [{ text: '[عينة] السعر الثابت يحميك من تجاوز الميزانية.' }],
        content: toMarkdown('## التكلفة باختصار', '[عينة] نص توضيحي لدليل التكلفة.'),
        comparisonTable: {
          columns: [{ label: 'الخيار' }, { label: 'السعر' }, { label: 'المدة' }],
          rows: [
            { label: 'وكالة', cells: [{ value: 'وكالة' }, { value: '35–65 ألف ر.س' }, { value: '4–8 أسابيع' }] },
            { label: 'Etleq', cells: [{ value: 'Etleq Vertical' }, { value: 'من 45,000 ر.س' }, { value: '30 يومًا' }] },
          ],
        },
      },
      en: {
        title: 'How much does a clinic booking app cost in Saudi Arabia?',
        excerpt: 'Build and running costs compared: agency, freelancer and Etleq.',
        answerBox:
          '[SAMPLE] Agencies in Saudi Arabia quote SAR 35k–65k for a clinic booking system. Etleq Vertical starts at $12,000 at a fixed price and goes live in 30 days.',
        keyTakeaways: [{ text: '[SAMPLE] A fixed price protects you from budget overruns.' }],
        content: toMarkdown('## The cost in short', '[SAMPLE] Placeholder text for the cost guide.'),
        comparisonTable: {
          columns: [{ label: 'Option' }, { label: 'Price' }, { label: 'Time' }],
          rows: [
            {
              label: 'Agency',
              cells: [
                {
                  value: 'Agency',
                  sourceUrl: 'https://www.sendantech.com/en-SA/mobile-app-development-cost-saudi-arabia',
                },
                { value: 'SAR 35k–65k' },
                { value: '4–8 weeks' },
              ],
            },
            { label: 'Etleq', cells: [{ value: 'Etleq Vertical' }, { value: 'from $12,000' }, { value: '30 days' }] },
          ],
        },
      },
    },
  )
  await create(
    'guides',
    {
      slug: 'etleq-vs-ai-app-builders',
      type: 'comparison',
      authors: [founder2.id],
      reviewer: founder1.id,
      categories: [cat.launch.id],
      publishedAt: daysAgo(9),
      lastReviewedAt: daysAgo(2),
      sources: guideSources,
    },
    {
      ar: {
        title: 'Etleq أم أدوات بناء التطبيقات بالذكاء الاصطناعي؟',
        excerpt: 'متى تكفيك أداة بالذكاء الاصطناعي، ومتى تحتاج منصّة تستقبل المدفوعات.',
        answerBox:
          '[عينة] أدوات الذكاء الاصطناعي تبدأ من 25 دولارًا شهريًا وتناسب النماذج الأولية، لكنها تتعثّر عند الدفع بمدى والفوترة والاستضافة. Etleq يسلّمك منصّة تعمل وتستقبل المدفوعات خلال 30 يومًا.',
        content: toMarkdown('## المقارنة باختصار', '[عينة] نص توضيحي لصفحة المقارنة.'),
        comparisonTable: {
          columns: [{ label: 'المعيار' }, { label: 'أداة ذكاء اصطناعي' }, { label: 'Etleq' }],
          rows: [
            {
              label: 'الدفع عبر مدى',
              cells: [{ value: 'الدفع عبر مدى' }, { value: 'غير مدعوم غالبًا' }, { value: 'مدمج' }],
            },
          ],
        },
      },
      en: {
        title: 'Etleq vs AI app builders',
        excerpt: 'When an AI builder is enough, and when you need a product that takes payments.',
        answerBox:
          '[SAMPLE] AI app builders start from $25 a month and suit prototypes, but they stall at mada payments, invoicing and hosting. Etleq delivers a live product that takes payments in 30 days.',
        content: toMarkdown('## The comparison in short', '[SAMPLE] Placeholder text for the comparison page.'),
        comparisonTable: {
          columns: [{ label: 'Criterion' }, { label: 'AI builder' }, { label: 'Etleq' }],
          rows: [
            {
              label: 'mada payments',
              cells: [
                { value: 'mada payments' },
                { value: 'Usually not supported', sourceUrl: 'https://eesel.ai/blog/lovable-pricing' },
                { value: 'Built in' },
              ],
            },
          ],
        },
      },
    },
  )

  /* Jobs ------------------------------------------------------------ */
  const jobDefs = [
    {
      slug: 'senior-full-stack-engineer',
      team: 'engineering',
      workplace: 'remote',
      employmentType: 'FULL_TIME',
      city: '',
      country: 'SA',
      applicantLocationRequirements: [{ country: 'SA' }, { country: 'AE' }, { country: 'EG' }, { country: 'JO' }],
      salary: { min: 15000, max: 22000, currency: 'SAR', unit: 'MONTH', show: true },
      ar: [
        '[عينة] مهندس Full-stack أول (عن بُعد)',
        'تبني منصّات SaaS للعملاء على Etleq Core باستخدام Next.js وMongoDB.',
      ],
      en: [
        '[SAMPLE] Senior full-stack engineer (remote)',
        'Build client SaaS products on Etleq Core with Next.js and MongoDB.',
      ],
    },
    {
      slug: 'growth-marketer-riyadh',
      team: 'growth',
      workplace: 'hybrid',
      employmentType: 'FULL_TIME',
      city: 'Riyadh',
      country: 'SA',
      applicantLocationRequirements: [],
      salary: { min: 10000, max: 14000, currency: 'SAR', unit: 'MONTH', show: false },
      ar: ['[عينة] مسوّق نموّ (الرياض)', 'تدير محتوى المقاطع القصيرة وقمع التقييم والحجز.'],
      en: ['[SAMPLE] Growth marketer (Riyadh)', 'Run short-video content and the scorecard-to-booking funnel.'],
    },
  ]
  for (const j of jobDefs) {
    await create(
      'jobs',
      {
        slug: j.slug,
        team: j.team,
        workplace: j.workplace,
        employmentType: j.employmentType,
        city: j.city,
        country: j.country,
        applicantLocationRequirements: j.applicantLocationRequirements,
        salary: j.salary,
        datePosted: daysAgo(5),
        validThrough: new Date(Date.now() + 60 * 86400000).toISOString(),
        status: 'open',
      },
      {
        ar: {
          title: j.ar[0],
          description: toMarkdown(j.ar[1], 'هذه وظيفة تجريبية لأغراض التطوير فقط.'),
          responsibilities: [{ item: 'العمل مباشرة مع المؤسسين والعملاء' }, { item: 'تسليم العمل في مواعيد ثابتة' }],
          requirements: [{ item: 'خبرة 4 سنوات أو أكثر' }, { item: 'كتابة عربية وإنجليزية واضحة' }],
          roleQuestions: [{ question: 'حدّثنا عن مشروع أطلقته وما تعلّمته منه.' }],
        },
        en: {
          title: j.en[0],
          description: toMarkdown(j.en[1], 'This is a sample job for development only.'),
          responsibilities: [{ item: 'Work directly with the founders and clients' }, { item: 'Ship on fixed dates' }],
          requirements: [{ item: '4+ years of experience' }, { item: 'Clear written Arabic and English' }],
          roleQuestions: [{ question: 'Tell us about something you launched and what you learned.' }],
        },
      },
    )
  }

  /* Home page ------------------------------------------------------- */
  await create(
    'pages',
    { slug: 'home' },
    {
      ar: {
        title: 'الرئيسية',
        layout: [
          {
            blockType: 'hero',
            heading: 'فكرة مجرّبة، ومنصّتك جاهزة تستقبل المدفوعات خلال 30 يومًا',
            subheading:
              'نبني لك منصّة SaaS متكاملة بالعربية: دفع عبر مدى وApple Pay، فوترة متوافقة مع ZATCA، استضافة وصيانة، بسعر ثابت يبدأ من 22,125 ر.س. أنت تركّز على عملائك، ونحن نتولّى التقنية.',
            primaryLabel: 'ابدأ التقييم (دقيقتان)',
            secondaryLabel: 'شاهد كيف نعمل في 60 ثانية',
            microcopy: '12 سؤالًا، نتيجة فورية، دون أي التزام.',
            trustItems: [{ text: 'مدى' }, { text: 'Apple Pay' }, { text: 'البطاقات' }],
          },
          {
            blockType: 'mechanism',
            heading: 'Etleq Core: معظم منصّتك جاهز قبل اليوم الأول',
            items: [
              { title: 'واجهة عربية من اليمين إلى اليسار' },
              { title: 'دفع عبر مدى وApple Pay' },
              { title: 'فوترة ZATCA' },
              { title: 'لوحة تحكم' },
              { title: 'تسجيل دخول برمز OTP' },
              { title: 'استضافة ونسخ احتياطي' },
            ],
          },
          { blockType: 'modelsTeaser', heading: 'نماذج مجرّبة يمكنك إطلاق نسختها الخليجية', models: modelIds },
          { blockType: 'offerStack', heading: 'ماذا تحصل عليه' },
          { blockType: 'guarantee', heading: 'إذا تأخّرنا، ندفع نحن' },
          {
            blockType: 'founders',
            heading: 'يقودها مهندسون ويبنيها فريق هندسي، لا مندوبو مبيعات',
            authors: [founder1.id, founder2.id],
          },
          { blockType: 'faqList', heading: 'أسئلة شائعة', faqs: faqIds },
          { blockType: 'finalCta', heading: 'اعرف خلال دقيقتين إن كانت فكرتك مناسبة للإطلاق' },
        ],
      },
      en: {
        title: 'Home',
        layout: [
          {
            blockType: 'hero',
            heading: 'A proven idea, live and taking payments in 30 days.',
            subheading:
              'We build your complete software product, Arabic-first, with mada and Apple Pay, ZATCA-ready invoicing, hosting and maintenance, at a fixed price from $5,900. You run the business. We run the tech.',
            primaryLabel: 'Take the 2-minute scorecard',
            secondaryLabel: 'See how it works in 60 seconds',
            microcopy: '12 questions. Instant result. No commitment.',
            trustItems: [{ text: 'mada' }, { text: 'Apple Pay' }, { text: 'Cards' }],
          },
          {
            blockType: 'mechanism',
            heading: 'Etleq Core: most of your product exists before day one',
            items: [
              { title: 'Arabic RTL interface' },
              { title: 'mada and Apple Pay billing' },
              { title: 'ZATCA invoicing' },
              { title: 'Admin panel' },
              { title: 'OTP login' },
              { title: 'Hosting and backups' },
            ],
          },
          { blockType: 'modelsTeaser', heading: 'Proven models with a Gulf version', models: modelIds },
          { blockType: 'offerStack', heading: 'What you get' },
          { blockType: 'guarantee', heading: 'If we’re late, we pay' },
          {
            blockType: 'founders',
            heading: 'Led by engineers, built by an engineering team, not salespeople',
            authors: [founder1.id, founder2.id],
          },
          { blockType: 'faqList', heading: 'Common questions', faqs: faqIds },
          { blockType: 'finalCta', heading: 'Find out in two minutes whether your idea is ready to launch' },
        ],
      },
    },
  )

  /* Short link ------------------------------------------------------ */
  await cms.create({
    collection: 'short-links',
    data: {
      code: 'r1',
      target: '/models/barber-booking-app',
      utm: { source: 'instagram', medium: 'reel', campaign: 'barber-booking-app', content: 'r1' },
      isSample: true,
    },
    overrideAccess: true,
    context,
  })

  /* Globals --------------------------------------------------------- */
  await seedGlobals(global)

  console.log('Seed complete.')
  console.log('\n  Admin login: %s / %s\n  (set SEED_ADMIN_PASSWORD to change it)\n', ADMIN_EMAIL, ADMIN_PASSWORD)
}

async function seedGlobals(global: (slug: GlobalSlug, common: Data, loc: Loc) => Promise<void>) {
  const nav: [string, string, string][] = [
    ['اطلق 30', 'Launch 30', '/launch-30'],
    ['النماذج', 'Models', '/models'],
    ['الحلول', 'Solutions', '/solutions'],
    ['المشاريع', 'Projects', '/projects'],
    ['المدوّنة', 'Blog', '/blog'],
    ['من نحن', 'About', '/about'],
    ['الوظائف', 'Careers', '/careers'],
  ]
  await global(
    'header',
    {},
    {
      ar: { nav: nav.map(([label, , href]) => ({ label, href })), ctaLabel: 'ابدأ التقييم' },
      en: { nav: nav.map(([, label, href]) => ({ label, href })), ctaLabel: 'Take the scorecard' },
    },
  )

  const footerCols = (l: 0 | 1) => [
    {
      title: ['الشركة', 'Company'][l],
      links: [
        { label: ['من نحن', 'About'][l], href: '/about' },
        { label: ['الوظائف', 'Careers'][l], href: '/careers' },
        { label: ['تواصل معنا', 'Contact'][l], href: '/contact' },
      ],
    },
    {
      title: ['المحتوى', 'Resources'][l],
      links: [
        { label: ['النماذج', 'Models'][l], href: '/models' },
        { label: ['المدوّنة', 'Blog'][l], href: '/blog' },
        { label: ['الأسئلة الشائعة', 'FAQ'][l], href: '/faq' },
      ],
    },
  ]
  const legal = (l: 0 | 1) => [
    { label: ['سياسة الخصوصية', 'Privacy'][l], href: '/privacy' },
    { label: ['الشروط', 'Terms'][l], href: '/terms' },
    { label: ['ملفات تعريف الارتباط', 'Cookies'][l], href: '/cookies' },
  ]
  await global(
    'footer',
    {
      social: [
        { platform: 'instagram', url: 'https://www.instagram.com/example-etleq' },
        { platform: 'tiktok', url: 'https://www.tiktok.com/@example-etleq' },
        { platform: 'youtube', url: 'https://www.youtube.com/@example-etleq' },
        { platform: 'linkedin', url: 'https://www.linkedin.com/company/example-etleq' },
      ],
    },
    { ar: { columns: footerCols(0), legalLinks: legal(0) }, en: { columns: footerCols(1), legalLinks: legal(1) } },
  )

  await global(
    'site-settings',
    {
      slotsTotal: 4,
      slotsLeft: 3,
      foundingPriceActive: true,
      foundingPrice: 4500,
      foundingSlots: 3,
      whatsappNumber: '966500000000',
      bookingUrls: {
        ar: process.env.CAL_BOOKING_URL || 'https://cal.com/example-etleq/fit-call-ar',
        en: process.env.CAL_BOOKING_URL || 'https://cal.com/example-etleq/fit-call-en',
      },
      contactEmail: 'hello@etleq.com',
      legalEntities: [
        { country: 'SA', crNumber: '[CR number]', vatNumber: '[VAT number]' },
        { country: 'AE', crNumber: '[Licence number]', vatNumber: '[TRN]' },
        { country: 'OM', crNumber: '[CR number]', vatNumber: '[VAT number]' },
      ],
      retention: { leadsMonths: 24, applicationsMonths: 12 },
      policyVersion: '2026-10-draft',
    },
    {
      ar: {
        responseTimePromise: '[عينة] نردّ خلال ساعتي عمل',
        legalEntities: [
          { legalName: '[اسم الكيان القانوني — السعودية]', address: '[العنوان — الرياض]' },
          { legalName: '[اسم الكيان القانوني — الإمارات]', address: '[العنوان — دبي]' },
          { legalName: '[اسم الكيان القانوني — عُمان]', address: '[العنوان — مسقط]' },
        ],
      },
      en: {
        responseTimePromise: '[SAMPLE] We reply within two working hours',
        legalEntities: [
          { legalName: '[Legal entity name — KSA]', address: '[Address — Riyadh]' },
          { legalName: '[Legal entity name — UAE]', address: '[Address — Dubai]' },
          { legalName: '[Legal entity name — Oman]', address: '[Address — Muscat]' },
        ],
      },
    },
  )

  const tierFeatures = {
    core: [
      ['دور مستخدم واحد', 'Single user role'],
      ['حجز أو اشتراكات أو دليل', 'Booking, memberships or directory'],
      ['دفع مدى وApple Pay', 'mada and Apple Pay'],
    ],
    pro: [
      ['أدوار متعددة', 'Multiple roles'],
      ['سوق إلكتروني أو بوابة أعمال', 'Marketplace or B2B portal'],
      ['تقارير متقدمة', 'Advanced reports'],
    ],
    vertical: [
      ['نظام تشغيل كامل للقطاع', 'Full operations system for the sector'],
      ['فوترة ZATCA', 'ZATCA invoicing'],
      ['تكاملات القطاع', 'Sector integrations'],
    ],
  } as const
  const tiers: { key: keyof typeof tierFeatures; price: number; ar: [string, string]; en: [string, string] }[] = [
    {
      key: 'core',
      price: 5900,
      ar: ['اطلق 30 — Core', 'منصّة SaaS بدور مستخدم واحد على Etleq Core.'],
      en: ['Launch 30 — Core', 'Single-role SaaS on Etleq Core.'],
    },
    {
      key: 'pro',
      price: 8900,
      ar: ['اطلق 30 — Pro', 'منصّة متعددة الأدوار أو سوق إلكتروني أو بوابة أعمال.'],
      en: ['Launch 30 — Pro', 'Multi-role product, marketplace or B2B portal.'],
    },
    {
      key: 'vertical',
      price: 12000,
      ar: ['اطلق 30 — Vertical', 'أنظمة تشغيل للعيادات والمطاعم والأندية مع فوترة ZATCA.'],
      en: ['Launch 30 — Vertical', 'Clinic, restaurant and gym operations systems with ZATCA invoicing.'],
    },
  ]
  const care: { price: number; ar: string; en: string; f: [string, string][] }[] = [
    {
      price: 290,
      ar: 'رعاية أساسية',
      en: 'Care Basic',
      f: [
        ['استضافة ونسخ احتياطي', 'Hosting and backups'],
        ['تحديثات أمنية', 'Security updates'],
      ],
    },
    {
      price: 590,
      ar: 'رعاية نموّ',
      en: 'Care Growth',
      f: [
        ['كل ما في الأساسية', 'Everything in Basic'],
        ['ساعات تعديل شهرية', 'Monthly change hours'],
      ],
    },
    {
      price: 1200,
      ar: 'رعاية متقدّمة',
      en: 'Care Pro',
      f: [
        ['كل ما في النموّ', 'Everything in Growth'],
        ['أولوية في الدعم', 'Priority support'],
      ],
    },
  ]
  const bonuses: { value: number; ar: [string, string]; en: [string, string] }[] = [
    {
      value: 1500,
      ar: ['[عينة] خطة أول 10 عملاء', 'جلسات لإطلاق أول حملة مبيعات.'],
      en: ['[SAMPLE] First 10 customers sprint', 'Sessions to run your first sales push.'],
    },
    {
      value: 800,
      ar: ['[عينة] صفحة هبوط جاهزة', 'صفحة بيع لمنصّتك بالعربية والإنجليزية.'],
      en: ['[SAMPLE] Ready landing page', 'A sales page for your product in Arabic and English.'],
    },
  ]
  await global(
    'offer',
    { confirmed: false, blueprint: { price: 390 } },
    {
      ar: {
        blueprint: {
          price: 390,
          name: 'مخطّط SaaS',
          description:
            'جلسة تحديد نطاق مدفوعة مدتها 90 دقيقة، وعرض سعر ثابت خلال 48 ساعة. تُخصم الرسوم من قيمة البناء.',
        },
        tiers: tiers.map((t) => ({
          key: t.key,
          priceFrom: t.price,
          name: t.ar[0],
          description: t.ar[1],
          features: tierFeatures[t.key].map(([a]) => ({ text: a })),
        })),
        bonuses: bonuses.map((b) => ({ statedValue: b.value, name: b.ar[0], description: b.ar[1] })),
        carePlans: care.map((c) => ({ monthlyPrice: c.price, name: c.ar, features: c.f.map(([a]) => ({ text: a })) })),
        guarantee:
          'إذا تأخّرنا، ندفع نحن: نردّ 10% من قيمة البناء عن كل أسبوع تأخير ونواصل العمل مجانًا. تتوقّف المدّة إذا تأخّرت مدخلاتك.',
        guaranteeHonestLine: 'لا نَعِدك بأرباح. نَعِدك بمنصّة تعمل، وتاريخ إطلاق، ودعم بعد الإطلاق.',
        paymentTerms: '[عينة] 50% عند توقيع العقد، و50% عند الإطلاق. الأسعار لا تشمل ضريبة القيمة المضافة.',
        notIncluded: [{ text: 'التسويق وإدارة الإعلانات' }, { text: 'رسوم بوابات الدفع' }],
      },
      en: {
        blueprint: {
          price: 390,
          name: 'SaaS Blueprint',
          description:
            'A paid 90-minute scoping session and a fixed quote within 48 hours. The fee is credited to your build.',
        },
        tiers: tiers.map((t) => ({
          key: t.key,
          priceFrom: t.price,
          name: t.en[0],
          description: t.en[1],
          features: tierFeatures[t.key].map(([, e]) => ({ text: e })),
        })),
        bonuses: bonuses.map((b) => ({ statedValue: b.value, name: b.en[0], description: b.en[1] })),
        carePlans: care.map((c) => ({
          monthlyPrice: c.price,
          name: c.en,
          features: c.f.map(([, e]) => ({ text: e })),
        })),
        guarantee:
          'If we’re late, we pay: 10% of the build fee back for every late week, and we keep building for free. The clock pauses while your inputs are overdue.',
        guaranteeHonestLine:
          'We don’t promise you profit. We promise a working product, a launch date and support after launch.',
        paymentTerms: '[SAMPLE] 50% on signing and 50% at launch. Prices exclude VAT.',
        notIncluded: [{ text: 'Marketing and ad management' }, { text: 'Payment gateway fees' }],
      },
    },
  )

  // Scorecard: exact points from brief section 9.
  type Q = {
    key: string
    type: 'single' | 'text' | 'model'
    ar: string
    en: string
    options: [string, number, string, string][]
  }
  const questions: Q[] = [
    {
      key: 'business',
      type: 'single',
      ar: 'هل تدير مشروعًا تجاريًا اليوم؟',
      en: 'Do you run a business today?',
      options: [
        ['none', 0, 'لا', 'No'],
        ['lt1m', 10, 'نعم، إيراداته أقل من مليون ريال', 'Yes, under SAR 1M revenue'],
        ['1to5m', 15, 'نعم، من 1 إلى 5 ملايين ريال', 'Yes, SAR 1–5M'],
        ['gt5m', 20, 'نعم، أكثر من 5 ملايين ريال', 'Yes, over SAR 5M'],
      ],
    },
    {
      key: 'budget',
      type: 'single',
      ar: 'ما الميزانية المتاحة خلال الـ60 يومًا القادمة؟',
      en: 'What budget is available in the next 60 days?',
      options: [
        ['lt2k', 0, 'أقل من 2,000 دولار', 'Under $2k'],
        ['2to5k', 5, 'من 2,000 إلى 5,000 دولار', '$2k–5k'],
        ['5to10k', 15, 'من 5,000 إلى 10,000 دولار', '$5k–10k'],
        ['gt10k', 20, 'أكثر من 10,000 دولار', '$10k+'],
      ],
    },
    {
      key: 'marketer',
      type: 'single',
      ar: 'من سيسوّق المنصّة؟',
      en: 'Who will market the product?',
      options: [
        ['me', 10, 'أنا أو فريقي', 'Me or my team'],
        ['etleq', 0, 'أتمنّى أن تتولّى Etleq ذلك', 'I hope Etleq will'],
      ],
    },
    {
      key: 'audience',
      type: 'single',
      ar: 'هل لديك عملاء أو جمهور حالي؟',
      en: 'Do you have existing customers or an audience?',
      options: [
        ['none', 0, 'لا يوجد', 'None'],
        ['lt500', 4, 'أقل من 500', 'Under 500'],
        ['500to5k', 7, 'من 500 إلى 5,000', '500–5,000'],
        ['gt5k', 10, 'أكثر من 5,000', '5,000+'],
      ],
    },
    {
      key: 'model',
      type: 'model',
      ar: 'أيّ نموذج أو فكرة تهمّك؟',
      en: 'Which model or idea interests you?',
      options: [],
    },
    {
      key: 'country',
      type: 'single',
      ar: 'في أيّ بلد تعمل؟',
      en: 'Which country are you in?',
      options: [
        ['ksa_uae', 5, 'السعودية أو الإمارات', 'Saudi Arabia or UAE'],
        ['gcc', 3, 'دولة خليجية أخرى', 'Another GCC country'],
        ['other', 1, 'بلد آخر', 'Elsewhere'],
      ],
    },
    {
      key: 'timeline',
      type: 'single',
      ar: 'متى تريد الإطلاق؟',
      en: 'When do you want to launch?',
      options: [
        ['month', 10, 'خلال شهر', 'Within a month'],
        ['1to3', 7, 'خلال 1–3 أشهر', 'In 1–3 months'],
        ['3to6', 3, 'خلال 3–6 أشهر', 'In 3–6 months'],
        ['later', 0, 'لاحقًا', 'Later'],
      ],
    },
    {
      key: 'decisionMaker',
      type: 'single',
      ar: 'هل أنت صاحب القرار النهائي؟',
      en: 'Are you the final decision-maker?',
      options: [
        ['yes', 10, 'نعم', 'Yes'],
        ['no', 0, 'لا', 'No'],
      ],
    },
    {
      key: 'soldOnline',
      type: 'single',
      ar: 'هل بعت شيئًا عبر الإنترنت من قبل؟',
      en: 'Have you sold anything online before?',
      options: [
        ['yes', 5, 'نعم', 'Yes'],
        ['no', 0, 'لا', 'No'],
      ],
    },
    {
      key: 'hours',
      type: 'single',
      ar: 'كم ساعة أسبوعيًا يمكنك تخصيصها للإطلاق؟',
      en: 'How many hours a week can you give the launch?',
      options: [
        ['lt3', 0, 'أقل من 3 ساعات', 'Under 3'],
        ['3to8', 3, 'من 3 إلى 8 ساعات', '3–8'],
        ['gt8', 5, 'أكثر من 8 ساعات', '8+'],
      ],
    },
    {
      key: 'commercialReg',
      type: 'single',
      ar: 'هل لديك سجل تجاري؟',
      en: 'Do you have a commercial registration?',
      options: [
        ['yes', 5, 'نعم', 'Yes'],
        ['no', 0, 'لا', 'No'],
      ],
    },
    {
      key: 'success',
      type: 'text',
      ar: 'كيف يبدو النجاح بعد 6 أشهر؟',
      en: 'What would success in 6 months look like?',
      options: [],
    },
  ]
  const disq: [string, string, string, string][] = [
    ['budget', 'lt2k', 'الميزانية أقل من 5,000 دولار', 'Budget under $5k'],
    ['budget', '2to5k', 'الميزانية أقل من 5,000 دولار', 'Budget under $5k'],
    ['decisionMaker', 'no', 'لست صاحب القرار النهائي', 'Not the final decision-maker'],
    ['timeline', 'later', 'الإطلاق بعد أكثر من 6 أشهر', 'Launch later than 6 months'],
    ['marketer', 'etleq', 'التسويق يحتاج إلى أن يتولّاه صاحب المشروع', 'The owner needs to market the product'],
  ]
  await global(
    'scorecard-settings',
    { thresholds: { ready: 60, almost: 40 } },
    {
      ar: {
        questions: questions.map((q) => ({
          key: q.key,
          type: q.type,
          prompt: q.ar,
          options: q.options.map(([value, points, label]) => ({ value, points, label })),
        })),
        disqualifiers: disq.map(([questionKey, optionValue, reason]) => ({ questionKey, optionValue, reason })),
      },
      en: {
        questions: questions.map((q) => ({
          key: q.key,
          type: q.type,
          prompt: q.en,
          options: q.options.map(([value, points, , label]) => ({ value, points, label })),
        })),
        disqualifiers: disq.map(([questionKey, optionValue, , reason]) => ({ questionKey, optionValue, reason })),
      },
    },
  )

  await global(
    'seo-defaults',
    {
      sameAs: [
        { url: 'https://www.instagram.com/example-etleq' },
        { url: 'https://www.linkedin.com/company/example-etleq' },
      ],
      aiCrawlers: { allowTraining: true, allowSearch: true, allowUser: true },
    },
    {
      ar: {
        titleTemplate: '%s — اطلق',
        defaultDescription:
          'اطلق استوديو يبني منصّتك البرمجية بالعربية ويطلقها خلال 30 يومًا بسعر ثابت، مع الدفع عبر مدى وفواتير ZATCA والاستضافة.',
        oneLiner: 'نطلق منصّتك البرمجية خلال 30 يومًا بسعر ثابت.',
      },
      en: {
        titleTemplate: '%s — Etleq',
        defaultDescription:
          'Etleq is a SaaS launch studio that takes a proven software model live in 30 days at a fixed price, with mada payments, ZATCA invoicing and hosting.',
        oneLiner: 'We take your software product live in 30 days at a fixed price.',
      },
    },
  )

  await global(
    'announcement-bar',
    { enabled: true, link: '/launch-30' },
    {
      ar: { text: 'متبقٍّ {n} من {total} مقاعد إطلاق هذا الشهر' },
      en: { text: '{n} of {total} launch slots left this month' },
    },
  )
}

seed()
  .then(async () => {
    await closeDb()
    process.exit(0)
  })
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exit(1)
  })
