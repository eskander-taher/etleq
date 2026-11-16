export type Copy = [string, string]
export const pick = (locale: string, value: Copy) => value[locale === 'ar' ? 1 : 0]
export const layers: Copy[] = [
  ['Frontend foundations · accessibility, mobile, structure', 'أساسيات الواجهة · سهولة الاستخدام والجوال'],
  ['APIs and backend · validation and error paths', 'الواجهات البرمجية · التحقق ومعالجة الأخطاء'],
  ['Database and storage · indexes, backups, encryption', 'البيانات والتخزين · الفهارس والنسخ والتشفير'],
  ['Authentication and permissions · roles and sessions', 'الدخول والصلاحيات · الأدوار والجلسات'],
  ['Hosting and deployment · environments, SSL, DNS', 'الاستضافة والنشر · البيئات والاتصال الآمن'],
  ['Cloud and compute · capacity, cost, region', 'السحابة والموارد · السعة والتكلفة والمنطقة'],
  ['CI/CD and version control · pipelines and reviews', 'التكامل والنشر المستمر · المراجعة والإصدارات'],
  ['Security and data access · keys, injection, dependencies', 'الأمان والوصول · المفاتيح والثغرات والمكتبات'],
  ['Rate limiting · abuse and bot protection', 'تحديد الطلبات · الحماية من إساءة الاستخدام'],
  ['Caching and CDN · speed for Gulf users', 'التخزين المؤقت · سرعة الوصول في الخليج'],
  ['Scaling and load balancing · traffic spikes', 'التوسع وتوزيع الحمل · ارتفاع عدد الزيارات'],
  ['Error tracking and logs · monitoring and alerts', 'تتبع الأخطاء والسجلات · المراقبة والتنبيهات'],
  ['Availability and recovery · tested restore plans', 'التوافر والاستعادة · اختبار خطط الاسترجاع'],
  ['Arabic and localization · RTL, search, dates', 'العربية والتوطين · الاتجاه والبحث والتواريخ'],
  ['Local compliance · data residency and invoicing requirements', 'الامتثال المحلي · مكان البيانات ومتطلبات الفوترة'],
]
export const rules: Copy[] = [
  ['40 hours of senior, AI-directed engineering per module.', '40 ساعة من الهندسة بإشراف مهندسين ذوي خبرة لكل وحدة.'],
  ['A working demo about every 10 hours.', 'عرض عملي كل 10 ساعات تقريبًا.'],
  ['Fixed price and acceptance criteria agreed before work.', 'سعر ثابت ومعايير قبول متفق عليها قبل العمل.'],
  ['You approve each module before the next begins.', 'توافق على كل وحدة قبل بدء التالية.'],
  ['Stop at any gate with working, documented software.', 'توقف عند أي مرحلة واحتفظ ببرنامج يعمل مع توثيقه.'],
  ['Source code, servers and keys in your name.', 'الكود والخوادم والمفاتيح باسمك.'],
]
export const services: {
  slug: string
  name: Copy
  title: Copy
  description: Copy
  price: number | null
  priceNote: Copy
  timeline: Copy
  audience: Copy
  deliverables: Copy[]
  steps: Copy[]
}[] = [
  {
    slug: 'audit',
    name: ['Production Audit', 'الفحص التقني'],
    title: ['Know what stands between your app and real users.', 'فحص شامل لتطبيقك في 48 ساعة'],
    description: [
      'A 15-layer review. A scored report. A clear fix plan and a fixed quote in 48 hours.',
      'فحص من 15 طبقة، وتقرير بالنتائج، وخطة إصلاح وعرض سعر ثابت خلال 48 ساعة.',
    ],
    price: 750,
    priceNote: ['one time', 'مرة واحدة'],
    timeline: ['48 hours', '48 ساعة'],
    audience: [
      'AI-built apps, internal tools, MVPs approaching launch, and software you are about to acquire.',
      'للتطبيقات المبنية بالذكاء الاصطناعي والأدوات الداخلية والمنتجات قبل الإطلاق والأنظمة التي تنوي شراءها.',
    ],
    deliverables: [
      ['Findings with severity and exact file locations.', 'ملاحظات بدرجة الخطورة وموقعها في الملفات.'],
      [
        'A bilingual PDF scorecard to share with your decision-makers.',
        'تقرير PDF بالعربية والإنجليزية لمشاركته مع أصحاب القرار.',
      ],
      ['A fix plan grouped into 40-hour modules.', 'خطة إصلاح مقسمة إلى وحدات من 40 ساعة.'],
      ['A fixed quote. No obligation to hire us afterwards.', 'عرض سعر ثابت دون إلزام بالتعاقد معنا.'],
    ],
    steps: [
      ['Share your scope and arrange secure, read-only access.', 'حدد النطاق ورتب وصولًا آمنًا للقراءة فقط.'],
      ['We review the code and running application across 15 layers.', 'نفحص الكود والتطبيق عبر 15 طبقة.'],
      ['Receive the report and choose your next step.', 'استلم التقرير واختر خطوتك التالية.'],
    ],
  },
  {
    slug: 'automation-sprint',
    name: ['Automation Sprint', 'أتمتة الأعمال'],
    title: ['One working automation in five days.', 'أتمتة واحدة تعمل في 5 أيام'],
    description: [
      'Give your team back the hours spent on one repetitive task.',
      'استعد الوقت الذي يقضيه فريقك في مهمة متكررة.',
    ],
    price: 18000,
    priceNote: ['one module', 'وحدة واحدة'],
    timeline: ['5 days', '5 أيام'],
    audience: ['Teams repeating the same manual task every week.', 'للفرق التي تنفذ المهمة اليدوية نفسها كل أسبوع.'],
    deliverables: [
      [
        'A live automation: leads to CRM, document extraction, invoice workflows or daily reporting.',
        'أتمتة تعمل: العملاء إلى نظام المبيعات، أو استخراج المستندات، أو الفواتير، أو التقارير اليومية.',
      ],
      [
        'Arabic and English runbook and a 30-day fix warranty.',
        'دليل تشغيل بالعربية والإنجليزية وضمان إصلاح لمدة 30 يومًا.',
      ],
      [
        'Platform foundations included where needed: login, encrypted storage, notifications, admin and logs.',
        'الأساسيات مشمولة حسب الحاجة: الدخول والتخزين المشفر والتنبيهات والإدارة والسجلات.',
      ],
    ],
    steps: [
      ['Day 1 · scope call and acceptance criteria.', 'اليوم 1 · تحديد النطاق ومعايير القبول.'],
      ['Days 2–4 · build and test on your real data.', 'الأيام 2–4 · البناء والاختبار ببياناتك.'],
      ['Day 5 · handover, walkthrough and launch.', 'اليوم 5 · التسليم والشرح والتشغيل.'],
    ],
  },
  {
    slug: 'app-finisher',
    name: ['App Finisher', 'إكمال التطبيقات'],
    title: ['Your app is 80% done? We finish the hard 20%.', 'تطبيقك جاهز بنسبة 80%؟ نكمّل الـ 20% الصعبة'],
    description: [
      'Make your AI-built app safe, fast and ready for real users.',
      'جهز تطبيقك المبني بالذكاء الاصطناعي للاستخدام الفعلي.',
    ],
    price: 36000,
    priceNote: ['from · usually 2–4 modules', 'ابتداءً من · غالبًا 2–4 وحدات'],
    timeline: ['2–5 weeks', '2–5 أسابيع'],
    audience: [
      'Founders and teams building with Cursor, Lovable, Bolt or Replit.',
      'للمؤسسين والفرق التي تبني باستخدام أدوات الذكاء الاصطناعي.',
    ],
    deliverables: [
      ['Login, permissions, security fixes and secret handling.', 'إصلاح الدخول والصلاحيات والثغرات وحماية المفاتيح.'],
      [
        'Staging, SSL, monitoring, tests and database performance.',
        'بيئة اختبار واتصال آمن ومراقبة واختبارات وتحسين قاعدة البيانات.',
      ],
      ['Arabic, RTL, mobile and SEO polish.', 'تحسين العربية واتجاه الواجهة والجوال ومحركات البحث.'],
    ],
    steps: [
      ['Entry audit; fee credited if you start within 30 days.', 'فحص أولي؛ تخصم رسومه عند البدء خلال 30 يومًا.'],
      ['SAR 18,000 per module, demos about every 10 hours.', '18,000 ريال للوحدة مع عرض عملي كل 10 ساعات تقريبًا.'],
      ['Exit audit and launch after acceptance.', 'فحص نهائي وإطلاق بعد القبول.'],
    ],
  },
  {
    slug: 'mvp',
    name: ['MVP', 'المنتج الأولي'],
    title: ['From idea to launch in 6–10 weeks.', 'من الفكرة إلى منتج جاهز للإطلاق في 6–10 أسابيع'],
    description: [
      'A focused first product, built to test your business idea.',
      'منتج أول يركز على اختبار فكرتك التجارية.',
    ],
    price: 72000,
    priceNote: ['from · 4 modules', 'ابتداءً من · 4 وحدات'],
    timeline: ['6–10 weeks', '6–10 أسابيع'],
    audience: [
      'Founders validating an idea and teams entering a new market.',
      'للمؤسسين الذين يختبرون فكرة والفرق التي تدخل سوقًا جديدًا.',
    ],
    deliverables: [
      [
        'Arabic-first design, web or mobile app, API and database.',
        'تصميم عربي وتطبيق ويب أو جوال وواجهة برمجية وقاعدة بيانات.',
      ],
      [
        'Login, local payment integration, AI features and analytics agreed in scope.',
        'الدخول وربط المدفوعات المحلية وميزات الذكاء الاصطناعي والتحليلات ضمن النطاق.',
      ],
      ['Full source code and documented handover.', 'الكود كاملًا وتسليم موثق.'],
    ],
    steps: [
      ['Weeks 1–2 · discovery and design.', 'الأسبوعان 1–2 · الاكتشاف والتصميم.'],
      ['Weeks 3–8 · core build, features and tests.', 'الأسابيع 3–8 · البناء والميزات والاختبارات.'],
      ['Weeks 9–10 · polish and launch, where needed.', 'الأسبوعان 9–10 · التحسين والإطلاق عند الحاجة.'],
    ],
  },
  {
    slug: 'business-v2',
    name: ['Business V2', 'النسخة الثانية لشركتك'],
    title: [
      'One intelligent system. Your business keeps running.',
      'أعد بناء شركتك كنظام واحد ذكي بينما تستمر في العمل',
    ],
    description: [
      'Replace scattered spreadsheets and tools with workflows your business owns.',
      'اجمع الجداول والأدوات المتفرقة في نظام تملكه شركتك.',
    ],
    price: null,
    priceNote: ['quoted after discovery', 'عرض سعر بعد الاكتشاف'],
    timeline: ['4–8 months', '4–8 أشهر'],
    audience: [
      'Companies of 10–200 people in contracting, real estate, clinics, distribution and family businesses.',
      'للشركات من 10 إلى 200 موظف في المقاولات والعقار والعيادات والتوزيع والشركات العائلية.',
    ],
    deliverables: [
      [
        'Leads, clients, projects, contracts, invoices and reports in one system.',
        'العملاء والمشاريع والعقود والفواتير والتقارير في نظام واحد.',
      ],
      [
        'AI inside daily work, with human approval for financial and legal actions.',
        'ذكاء اصطناعي داخل العمل اليومي وموافقة بشرية للإجراءات المالية والقانونية.',
      ],
      ['Full audit logs and phased migration.', 'سجل تدقيق كامل وانتقال تدريجي.'],
    ],
    steps: [
      ['Discovery week and readiness assessment.', 'أسبوع اكتشاف وتقييم الجاهزية.'],
      ['Fixed phased plan; pay and approve per phase.', 'خطة مراحل ثابتة؛ الدفع والموافقة لكل مرحلة.'],
      [
        'Switch over when ready; stop at a gate with working software.',
        'انتقل عندما تكون جاهزًا؛ ويمكنك التوقف مع نظام يعمل.',
      ],
    ],
  },
  {
    slug: 'sovereign-ai',
    name: ['Sovereign AI', 'الذكاء الاصطناعي السيادي'],
    title: ['Arabic AI on servers inside your country.', 'ذكاء اصطناعي عربي على خوادم داخل بلدك'],
    description: [
      'Keep control of your model, your API and your documents.',
      'احتفظ بالتحكم في النموذج والواجهة البرمجية ومستنداتك.',
    ],
    price: null,
    priceNote: ['hosting at cost + management', 'تكلفة الاستضافة + الإدارة'],
    timeline: ['1–2 weeks setup', '1–2 أسبوع للإعداد'],
    audience: [
      'Organizations with strict requirements for customer, health or financial data.',
      'للجهات ذات المتطلبات الصارمة لبيانات العملاء أو البيانات الصحية والمالية.',
    ],
    deliverables: [
      [
        'An Arabic open-weight model selected for your needs and licensing requirements.',
        'نموذج عربي مفتوح الأوزان يختار حسب احتياجاتك ومتطلبات الترخيص.',
      ],
      [
        'Dedicated in-country GPU hosting, private API and document search.',
        'استضافة مخصصة داخل البلد وواجهة خاصة وبحث في المستندات.',
      ],
      [
        'Monitoring and maintenance; response commitments agreed in the service contract.',
        'مراقبة وصيانة مع اتفاق على أوقات الاستجابة في العقد.',
      ],
    ],
    steps: [
      ['Confirm residency, security and model requirements.', 'تأكيد متطلبات مكان البيانات والأمان والنموذج.'],
      ['Provision and evaluate on your own use cases.', 'الإعداد والتقييم على حالات استخدامك.'],
      ['Handover and an agreed ongoing management plan.', 'التسليم وخطة إدارة مستمرة متفق عليها.'],
    ],
  },
  {
    slug: 'advisory',
    name: ['Advisory', 'الاستشارات'],
    title: ['Start with clarity before you build.', 'ابدأ بالوضوح قبل البناء'],
    description: [
      'Decide where AI belongs in your business before investing in a build.',
      'حدد أين يفيد الذكاء الاصطناعي شركتك قبل الاستثمار في البناء.',
    ],
    price: null,
    priceNote: ['leadership session free; other work quoted', 'جلسة القيادة مجانية؛ بقية الخدمات بعرض سعر'],
    timeline: ['By scope', 'حسب النطاق'],
    audience: [
      'Owners and leadership teams deciding what to build next.',
      'لأصحاب الشركات وفرق القيادة الذين يحددون ما ينبغي بناؤه.',
    ],
    deliverables: [
      ['A free 60-minute leadership session.', 'جلسة قيادة مجانية لمدة 60 دقيقة.'],
      [
        'Arabic one-day hackathon for 8–25 staff, with prototypes and an executive readout.',
        'هاكاثون عربي ليوم واحد لـ 8–25 موظفًا مع نماذج أولية وملخص تنفيذي.',
      ],
      [
        'One-week readiness scan, 4–6 week department assessment or fractional technical leadership.',
        'فحص جاهزية لأسبوع، أو تقييم قسم لمدة 4–6 أسابيع، أو قيادة تقنية جزئية.',
      ],
    ],
    steps: [
      ['Choose a decision to resolve.', 'حدد القرار الذي تريد حسمه.'],
      ['Work with your team and real workflows.', 'نعمل مع فريقك وإجراءاتك الفعلية.'],
      ['Leave with a prioritized plan and next steps.', 'اخرج بخطة مرتبة حسب الأولوية وخطوات واضحة.'],
    ],
  },
]
export const faqs: { q: Copy; a: Copy }[] = [
  {
    q: ['Who writes the code?', 'من يكتب الكود؟'],
    a: [
      'Senior engineers direct AI tools, review the code and take responsibility for testing and delivery.',
      'يوجه مهندسون ذوو خبرة أدوات الذكاء الاصطناعي ويراجعون الكود ويتولون الاختبار والتسليم.',
    ],
  },
  {
    q: ['Why 40-hour modules? What if the scope changes?', 'لماذا وحدات من 40 ساعة؟ وماذا لو تغير النطاق؟'],
    a: [
      'Each module has agreed acceptance criteria and a fixed price. Any change is scoped and approved before additional work begins.',
      'لكل وحدة معايير قبول وسعر ثابت. يحدد أي تغيير ويوافق عليه قبل بدء العمل الإضافي.',
    ],
  },
  {
    q: ['Who owns the code and data?', 'من يملك الكود والبيانات؟'],
    a: [
      'You do. The source, servers and keys are in your name. You can stop at an agreed gate and keep the delivered work.',
      'أنت. الكود والخوادم والمفاتيح باسمك، ويمكنك التوقف عند مرحلة متفق عليها والاحتفاظ بالعمل المسلم.',
    ],
  },
  {
    q: ['Where is my data stored?', 'أين تخزن بياناتي؟'],
    a: [
      'Hosting is agreed before access. Saudi or UAE hosting can be specified. External AI services and personal-data handling must be agreed for the engagement.',
      'نتفق على الاستضافة قبل الوصول. يمكن تحديد السعودية أو الإمارات، مع الاتفاق على خدمات الذكاء الاصطناعي الخارجية ومعالجة البيانات الشخصية.',
    ],
  },
  {
    q: ['Can we sign an NDA? Can you work with our vendor?', 'هل توقعون اتفاقية سرية؟ وهل تعملون مع موردنا؟'],
    a: [
      'An NDA can be arranged before sharing code. We can work alongside your team or vendor; regulated and government requirements are scoped separately.',
      'يمكن ترتيب اتفاقية سرية قبل مشاركة الكود. نعمل مع فريقك أو موردك، وتحدد متطلبات الجهات المنظمة والحكومية بشكل منفصل.',
    ],
  },
  {
    q: ['How do payment and invoices work?', 'كيف يتم الدفع وإصدار الفواتير؟'],
    a: [
      'The audit is SAR 750 before VAT. Engineering is SAR 18,000 per module. Payment method and tax invoice details are confirmed before purchase. The audit fee is credited when you start a build within 30 days.',
      'الفحص 750 ريال قبل الضريبة، والهندسة 18,000 ريال للوحدة. تؤكد طريقة الدفع وبيانات الفاتورة قبل الشراء. تخصم رسوم الفحص عند بدء البناء خلال 30 يومًا.',
    ],
  },
  {
    q: ['What happens after launch?', 'ماذا بعد الإطلاق؟'],
    a: [
      'You receive documented software and a handover. The Automation Sprint includes a 30-day fix warranty. Additional support is separately agreed; there is no forced retainer.',
      'تستلم برنامجًا موثقًا وشرحًا للتشغيل. تشمل أتمتة الأعمال ضمان إصلاح لمدة 30 يومًا. الدعم الإضافي باتفاق مستقل دون اشتراك إلزامي.',
    ],
  },
  {
    q: ['Does the app need to be finished? Can I re-audit?', 'هل يجب أن يكون التطبيق مكتملًا؟ وهل يمكن إعادة الفحص؟'],
    a: [
      'No. We can review unfinished and private apps after agreeing access. A separate re-audit costs SAR 750. The report is yours, with no obligation to hire us.',
      'لا. يمكن فحص تطبيق غير مكتمل أو خاص بعد الاتفاق على الوصول. إعادة الفحص المستقلة تكلف 750 ريال. التقرير ملكك دون إلزام بالتعاقد معنا.',
    ],
  },
]
