# Etleq Website Build Prompt

Oct 16, 2026 · Eskander

A complete, staged prompt for Claude Code to build etleq.com: an Arabic-first, bilingual, premium site that converts visitors into booked calls, ranks in Google, gets cited by AI assistants, and runs blog, news, projects and careers from a Payload CMS backend.

## How to use this prompt (for the founders)

This document is the prompt. Everything from section 1 onward is written to Claude Code; this short section is for you.

1. Export this doc as Markdown and save it in your repo as `docs/etleq-site-brief.md`.
2. In the repo root, keep a short `CLAUDE.md` (or the `AGENTS.md` that `create-next-app` now generates) with one line: *"The full product brief is in docs/etleq-site-brief.md. Read it before any task."*
3. Run one stage at a time (section 15). Start each session with:

```text
Read docs/etleq-site-brief.md. Execute Stage N only.
Before writing code, post a short plan for this stage and the questions you need answered from section 16.
Stop when every acceptance criterion of Stage N passes, and report the evidence for each one.
```

4. Review the evidence yourselves. Move to the next stage only when every criterion is met. Timing is yours to decide; the brief never asks Claude Code to estimate it.
5. When you change a decision (price, colour, a page), edit this brief first, then tell Claude Code to re-read it. The brief stays the single source of truth.

**Analogy:** treat this brief like an architect's drawing set. Claude Code is the contractor. It builds floor by floor, and a floor is signed off only when the inspector (you) checks it against the drawings.

## 1. Role and mission

You are the lead engineer, product designer, conversion strategist and technical SEO for **etleq.com**. You work inside the founders' repository with full access to it. Two senior full-stack engineers own the business; they review every stage.

**Mission:** build an Arabic-first, bilingual (Arabic/English) website that a premium brand would be proud of and that turns visitors into booked calls. In order of priority, the site must:

1. **Convert:** turn visitors from Instagram reels, search and AI assistants into qualified leads who complete the scorecard and book a fit call.
2. **Rank and be cited:** earn organic traffic in Arabic and English Google search, and be cited by AI assistants (Google AI Overviews and AI Mode, ChatGPT, Gemini, Perplexity, Claude, Copilot).
3. **Run itself:** let the founders publish models, projects, blog posts, news and job openings from an admin panel without touching code.
4. **Hire:** publish jobs and receive applications.

**How you work:**

- Work one stage at a time (section 15). At the start of a stage, post a plan and list any decision you need from the founders (section 16). Do not invent a missing business fact; ask.
- Treat acceptance criteria as the definition of done. Finish a stage by reporting evidence for every criterion: command output, screenshots, Lighthouse or validator reports, test results.
- Commit in small, named commits. Keep `CHANGELOG.md` and a `docs/decisions.md` log of every decision and why.
- Write tests for business logic: lead scoring, access control, form validation, structured data output, sitemap and hreflang generation.
- Prefer boring, well-documented choices over clever ones. When this brief and an official library doc disagree on an API detail, follow the current official doc and record the difference in `docs/decisions.md`.

## 2. Business context

**What Etleq is:** a SaaS launch studio. An engineering team led by the two co-founders builds a client's software product on a reusable codebase ("Etleq Core") and takes it live in 30 working days at a fixed price, with Arabic, mada payments, ZATCA-ready invoicing and hosting built in. The client runs the business; Etleq runs the technology. The name means "launch" (إطلاق).

**Positioning statement (use it, don't print it verbatim):** For Gulf business owners and creators who want their own software product without hiring a tech team, Etleq is the SaaS launch studio that takes a proven model live in 30 working days at a fixed price, and the client owns the code. Unlike agencies, we charge for outcomes, not hours; unlike AI app builders, we deliver a business that takes payments, not a demo.

**The offer ("Etleq Launch 30" / «إطلاق ٣٠»):**

| Product | Price (USD) | What it is |
| --- | --- | --- |
| SaaS Blueprint | $390, credited to a build, money-back guarantee | 90-minute paid scoping session, written scope and fixed quote within 48 hours |
| Launch 30 — Core | from $5,900 | Single-role SaaS (booking, memberships, directory) on Etleq Core |
| Launch 30 — Pro | from $8,900 | Multi-role, marketplace or B2B portal |
| Launch 30 — Vertical | from $12,000 | Clinic, restaurant, gym operations systems with ZATCA invoicing |
| Care plans | $290 / $590 / $1,200 per month | Hosting, backups, security, monthly change hours |

Prices are managed in the CMS, never hard-coded. Show SAR equivalents at the fixed 3.75 peg on Arabic pages. Prices exclude VAT.

**Delivery promise:** always "30 working days" (AR «30 يوم عمل»), never "30 days", in every headline, meta text and content page (owner decision, 22 Oct 2026). The product name stays «اطلق 30» / "Launch 30".

**Guarantee:** live within 30 working days of the signed scope, or 10% of the build fee is refunded for each late week and building continues free. The clock pauses while client inputs are overdue. There is no revenue guarantee: the client's commercial results are the client's responsibility.

**Blueprint guarantee (owner decision, 22 Oct 2026):** if, after the 90-minute session and receiving the written scope and fixed quote, the client feels it wasn't worth the Blueprint fee, they tell us within 7 days and we refund it in full; they keep the scope document. If they go ahead with the build, the fee is credited to it. AR: «إن رأيت بعد الجلسة واستلام النطاق المكتوب والسعر الثابت أنها لا تستحق 390$، أخبرنا خلال 7 أيام ونعيد لك المبلغ كاملًا، ويبقى مستند النطاق لك. وإن بدأت البناء معنا، تُخصم رسوم الجلسة من قيمته.» Shown in the home guarantee section, on `/launch-30` (offer, guarantee and Blueprint card), on the Blueprint row of the offer stack and in the FAQ. The figure always comes from the offer global.

**Code ownership (owner decision, 22 Oct 2026):** the client owns the code and the data. AR «ملكك بالكامل: الشيفرة والبيانات», EN "Yours: the code and the data".

**Who buys (in priority order):**

1. **Business owners** in Saudi Arabia and the UAE: clinics, gyms, salons, restaurant groups, training centres, service companies. 30–50 years old, budget $5k–15k.
2. **Creators and community owners** who want to sell software to their audience.
3. **Investors** who want a tech asset built.
4. **Aspiring founders**, served by free content and a low-ticket playbook, not by $5k builds.

**The funnel the site must serve:**

> Instagram/TikTok/Snapchat/YouTube reel about a real SaaS success story → the model's page on etleq.com → 11-question scorecard → score 60+ books a free 15-minute fit call; under 60 gets WhatsApp help and the playbook or newsletter → paid Blueprint (money-back guarantee) → contract → build in 30 working days → launch → Care plan → referral.

Most visitors arrive on a phone from a reel, already curious about one specific model. Search and AI visitors arrive with a question ("how much does it cost to build a clinic booking app in Saudi?").

**Markets:** Saudi Arabia first, UAE second, the rest of the Arab world as audience. Arabic is the primary language of the site; English serves UAE and international visitors.

**Founders (owner-supplied, 16 Oct 2026):**

- Eskander Taher (اسكندر طاهر), co-founder: BSc in software engineering; MSc in data-driven management, RUDN University; MSc in data science, MISIS University.
- Hazim Al-Haidari (حازم الحيدري), co-founder: MSc in data science, MISIS University; PhD researcher, Bauman Moscow State Technical University.
- Etleq has a team beyond the founders; copy never implies the founders work alone.

**Voice:** direct, specific, warm, never hype. Numbers over adjectives. Show prices openly. Arabic copy in clear Modern Standard Arabic with a light, modern tone; never machine-translated. English copy in plain international English.

**MRR rule (a founder decision):** model pages show the success story's MRR. Each figure names the company, links its source, shows the date it was reported, and sits next to a disclaimer that the number belongs to that company and is not a forecast for the client.

## 3. Non-negotiables and guardrails

Break none of these, even when a design or conversion idea would benefit.

1. **Nothing fake.** No invented testimonials, client logos, ratings, statistics, case-study results, "as seen in" badges or user counts. Sample content is allowed only in development and must carry an `isSample` flag; the production build fails if any published document has `isSample: true`.
2. **Real scarcity only.** The "slots left this month" counter reads from a CMS global the founders update. No countdown timers that reset, no invented urgency.
3. **Sourced numbers.** Every statistic on the site (market figures, competitor prices, MRR) stores its source URL and date in the CMS and renders a visible citation.
4. **Arabic is the primary product, not a translation.** Arabic pages are designed, written and reviewed first. English pages may differ in wording and examples.
5. **One language per page.** Never mix Arabic and English body copy on a page, never show side-by-side translations, and never silently fall back to the other language's content on a public page.
6. **No automatic language redirects.** Do not redirect by IP or browser language. Offer a visible language switcher and, at most, a dismissible suggestion banner.
7. **Logical CSS only.** Use logical properties and utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`). A lint rule or CI grep fails the build on physical direction utilities (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`) outside an allowlist.
8. **Server-render everything indexable.** Indexable content must be in the HTML response, never behind client-only tabs, carousels or "load more" without crawlable links.
9. **Performance and accessibility are acceptance criteria**, not polish: Core Web Vitals "good" thresholds and WCAG 2.2 AA (section 14).
10. **Consent before tracking.** No analytics or ad pixels load before the visitor consents to that category.
11. **Stable versions only.** Pin dependency versions. Use the stable Payload 3.x line; do not use Payload 4 canary releases in this project.
12. **No secrets in the repo.** Environment variables only, with a committed `.env.example`.
13. **Honest claims in copy.** Never promise a client revenue. Promise the build, the launch date, the guarantee and the support.
14. **Ask, don't guess.** If a fact, price, name, legal detail or asset is missing, add it to the open-questions list for the founders and use a clearly marked placeholder.

## 4. Tech stack and architecture

One Next.js application serves the public site and the Payload admin, backed by MongoDB, on the founders' VPS. Versions below were checked on 16 Oct 2026; confirm the npm `latest` tag before installing and pin what you install.

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16.x, App Router, TypeScript strict | 16.4 was released on 6 Oct 2026 ([Next.js blog](https://nextjs.org/blog)). Turbopack is the default. In Next 16 the middleware file is `proxy.ts` |
| CMS | Payload 3.x (stable line), installed inside the same Next app | Payload 3.73+ is used with Next 16 in published upgrade guides ([buildwithmatija](https://www.buildwithmatija.com/blog/nextjs-16-payload-cms-compatibility)). Payload 4 is still canary; do not use it ([buildwithmatija](https://buildwithmatija.com/blog/payload-4-0)) |
| Database | MongoDB via `@payloadcms/db-mongodb` (`mongooseAdapter`) | Setup per [Payload 3 docs](https://payloadcms.com/docs/v3/database/mongodb.md). Run MongoDB as a replica set (managed, or a single-node replica set) so transactions work |
| Rich text | Payload Lexical editor | Custom blocks: callout, stat-with-source, comparison table, FAQ, CTA, video |
| Routing i18n | `next-intl` | `defineRouting({ locales: ['ar','en'], defaultLocale: 'ar', localePrefix: 'as-needed', localeDetection: false })`. Call `setRequestLocale` in every layout and page to keep static rendering ([guide](https://www.buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025)) |
| Content i18n | Payload field-level localization | Locales `ar` (label العربية, `rtl: true`) and `en`; `defaultLocale: 'ar'` ([Payload docs](https://payloadcms.com/docs/v3/configuration/localization.md)). Public queries pass `fallbackLocale: false` |
| Styling | Tailwind CSS v4 with tokens in `@theme` | Logical utilities only (guardrail 7) |
| Components | shadcn/ui initialised with `--rtl` | RTL support shipped Jan 2026; the CLI converts physical classes to logical ones ([shadcn changelog](https://ui.shadcn.com/docs/changelog/2026-01-rtl)) |
| Icons | lucide-react | Directional icons get `rtl:rotate-180` |
| Motion | CSS transitions first; `motion` (Motion for React) only for the hero and the stepper | Respect `prefers-reduced-motion` |
| Forms | react-hook-form + Zod, schemas shared by client and server | Server actions or route handlers; Cloudflare Turnstile on every public form |
| Email | Payload email adapter (nodemailer + a transactional SMTP provider) | SPF, DKIM and DMARC on etleq.com |
| Booking | Cal.com embed (preferred) | Verify Arabic UI and RTL before committing; otherwise build a simple booking page on Google Calendar |
| Media | Payload uploads to S3-compatible storage (`@payloadcms/storage-s3`, e.g. Cloudflare R2) in production; local disk in development | `sharp` for image sizes; AVIF/WebP via `next/image` |
| Monitoring | Sentry (or self-hosted GlitchTip) + an uptime monitor | Alerts to the founders |
| Hosting | VPS, current Node LTS, PM2, Nginx reverse proxy, Cloudflare in front | A persistent Node server suits Payload better than serverless ([buildwithmatija](https://www.buildwithmatija.com/blog/nextjs-16-payload-cms-compatibility)) |
| CI/CD | GitHub Actions: typecheck, lint, test, build, Lighthouse CI; deploy over SSH with `pm2 reload` | Separate `staging` and `production` environments |

**Folder structure:**

```text
src/
  app/
    (frontend)/[locale]/        public site (next-intl); Arabic served at / via as-needed prefix
    (payload)/admin/            Payload admin (generated)
    (payload)/api/              Payload REST/GraphQL (generated)
    robots.ts  sitemap.ts       generated per locale and collection
  collections/  globals/  blocks/   Payload schema (section 10)
  components/ui/                shadcn components (RTL)
  components/sections/          page sections and block renderers
  i18n/                         routing.ts, request.ts, navigation.ts
  messages/                     ar.json, en.json (UI strings only; content lives in Payload)
  lib/                          seo.ts, schema.ts, scoring.ts, analytics.ts, whatsapp.ts, indexnow.ts
  payload.config.ts
  proxy.ts                      next-intl proxy; matcher excludes /admin, /api, /_next and files
```

**Rendering:** static generation with on-demand revalidation for all content pages. Payload `afterChange` hooks revalidate the affected paths and tags in both locales, then ping IndexNow. Forms and the scorecard submit through server actions with Zod validation.

**Environment variables (`.env.example`):** `DATABASE_URL`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_SITE_URL`, `S3_*`, `SMTP_*`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `CAL_BOOKING_URL`, `WHATSAPP_NUMBER`, `GA4_ID`, `CLARITY_ID`, `META_PIXEL_ID`, `META_CAPI_TOKEN`, `SNAP_PIXEL_ID`, `SNAP_CAPI_TOKEN`, `TIKTOK_PIXEL_ID`, `TIKTOK_EVENTS_TOKEN`, `INDEXNOW_KEY`, `GOOGLE_INDEXING_SA_JSON`, `SENTRY_DSN`, `LEAD_ALERT_EMAILS`, `LEAD_ALERT_WEBHOOK`.

## 5. Sitemap, URL structure and bilingual routing

Arabic lives at the root, English under `/en`, and both share the same short Latin slugs so every link stays clean when pasted into WhatsApp, an Instagram DM or a reel caption.

### Pages

| Page | Arabic URL | English URL | Job of the page | Primary CTA |
| --- | --- | --- | --- | --- |
| Home | `/` | `/en` | Explain the offer, prove it, route to the scorecard | Take the scorecard |
| Launch 30 offer | `/launch-30` | `/en/launch-30` | Full value stack, tiers, guarantee, slot counter | Take the scorecard |
| How it works | `/how-it-works` | `/en/how-it-works` | Process from scorecard to Care | Take the scorecard |
| Models library | `/models` | `/en/models` | Filterable library of SaaS success stories | Open a model |
| Model detail | `/models/[slug]` | `/en/models/[slug]` | Landing page for each reel | Scorecard, pre-filled with the model |
| Solutions (verticals) | `/solutions/[slug]` | `/en/solutions/[slug]` | Clinics, gyms, salons, restaurants, training centres | Book a demo call |
| Projects | `/projects`, `/projects/[slug]` | `/en/projects`, `/en/projects/[slug]` | Case studies (only real ones) | Take the scorecard |
| Cost guides | `/cost/[slug]` | `/en/cost/[slug]` | High-intent "how much does it cost" answers | Get a fixed quote |
| Comparisons | `/compare/[slug]` | `/en/compare/[slug]` | Etleq vs agency, freelancer, AI builders | Take the scorecard |
| Blog | `/blog`, `/blog/[slug]`, `/blog/category/[slug]` | same under `/en` | Education, SEO and GEO authority | Newsletter, scorecard |
| News | `/news`, `/news/[slug]` | same under `/en` | Launches, announcements, press | Newsletter |
| Careers | `/careers`, `/careers/[slug]` | same under `/en` | Jobs with an apply form on each job page | Apply |
| About | `/about` | `/en/about` | Founders, story, entities, values | Book a fit call |
| Authors | `/authors/[slug]` | `/en/authors/[slug]` | Expertise pages for founders and writers | Follow, read more |
| FAQ | `/faq` | `/en/faq` | Objection handling | Take the scorecard |
| Contact | `/contact` | `/en/contact` | WhatsApp, email, addresses | WhatsApp |
| Scorecard | `/scorecard` | `/en/scorecard` | 11-question qualifier | Finish the scorecard |
| Scorecard result | `/scorecard/result` (noindex) | `/en/scorecard/result` (noindex) | Score, tier, next step | Book or get the playbook |
| Book | `/book` | `/en/book` | Booking embed for qualified leads | Confirm booking |
| Playbook | `/playbook` | `/en/playbook` | Lead magnet for scores under 60 | Download |
| Thank-you pages | `/thank-you/[type]` (noindex) | same under `/en` | Confirm, set expectations, fire conversion events | Add to calendar, WhatsApp |
| Legal | `/privacy`, `/terms`, `/disclaimer`, `/cookies`, `/accessibility` | same under `/en` | Compliance and trust | — |
| Reel short links | `/go/[code]` | — | 301 to a model page with UTM parameters set | — |
| Machine files | `/sitemap.xml`, `/robots.txt`, `/rss.xml`, `/en/rss.xml`, `/llms.txt` (optional) | — | Crawling and feeds | — |
| Admin | `/admin` | — | Payload admin, blocked in robots.txt | — |

### URL rules

- **Slugs are short, lowercase Latin words, identical in both locales** (`/models/barber-booking-app`, `/en/models/barber-booking-app`). Google accepts localised words in URLs ([Google](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)), but percent-encoded Arabic slugs look broken in DMs and captions, and the reel channel matters more here. Arabic keywords go in titles, headings and body copy.
- **One slug per document**, stored once (not localized), so the language switcher and hreflang map 1:1.
- **Trailing slashes:** none. Enforce one canonical form with 301s.
- **Reel short links:** a `ShortLinks` collection maps a code to a target page plus `utm_source`, `utm_medium`, `utm_campaign` and `utm_content` (the reel ID). Every reel and story uses one.

### Bilingual routing rules

- `next-intl` with `localePrefix: 'as-needed'`: Arabic has no prefix, English uses `/en`. `localeDetection: false`; never redirect by browser language or IP ([Google](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)).
- `<html lang="ar" dir="rtl">` on Arabic pages and `<html lang="en" dir="ltr">` on English pages.
- A page exists in a locale only when that locale is marked translated in the CMS. Untranslated pages return 404 in that locale; they never show the other language's text.
- The language switcher links to the same document in the other locale. If it doesn't exist there, it links to that locale's section index (e.g. `/en/blog`) with a short note.
- A dismissible banner may suggest the other language when the browser language differs. It never redirects.

## 6. Brand identity and premium design system

Etleq has only a name, so you will define a first identity. The direction is **"ignition at dusk"**: the calm moment before a launch. Deep ink night, warm desert sand, and one ignition orange. Premium comes from restraint: about 90% neutral, 10% accent, generous space, big confident type, real product imagery.

### Colour

| Token | Hex | Use | Contrast rule |
| --- | --- | --- | --- |
| `ink-950` | #0B0F14 | Dark sections, primary text on light | — |
| `ink-800` | #1C2430 | Cards and borders on dark | — |
| `ink-600` | #3A4553 | Secondary text on light | ≈9:1 on `sand-50` |
| `stone-500` | #6B6459 | Muted text, captions | ≈5.5:1 on `sand-50` |
| `sand-50` | #FAF7F2 | Page background | — |
| `sand-100` | #F3EEE6 | Alternate sections, cards | — |
| `sand-300` | #E3D9CA | Dividers, card borders | — |
| `ignition-500` | #FF5A1F | Primary buttons, key highlights | Use **ink text** on it (≈6:1). Never white text (≈3:1 fails AA) |
| `ignition-700` | #C2410C | Accent text and links on light backgrounds | ≈4.8:1 on `sand-50` |
| `verified-600` | #15803D | "Verified" and "source" badges only | — |

Recompute every contrast ratio with a checker during Stage 1 and adjust the hex values if any pairing fails WCAG 2.2 AA.

### Typography

| Role | Font | Notes |
| --- | --- | --- |
| Display (both scripts) | Alexandria, variable | Modern, elegant Arabic display face suited to headlines ([Lemonade](https://lemonadedigitalmedia.com/en/free-arabic-fonts-every-designer-needs/)). Verify Latin glyph coverage; fallback: Readex Pro |
| Arabic text | IBM Plex Sans Arabic | Highly readable for long text and UI ([Lemonade](https://lemonadedigitalmedia.com/en/free-arabic-fonts-every-designer-needs/)) |
| Latin text | IBM Plex Sans | Same family as the Arabic text face, so both languages feel like one brand |
| Data | IBM Plex Mono | Prices, MRR figures, step numbers, code |

Typography rules:

- Load fonts with `next/font` (subsets `arabic` and `latin`, `display: 'swap'`, variable weights). Preload only the display and text weights used above the fold.
- Arabic needs a slightly larger size and more line height than Latin: body around 17–18px with line-height 1.75 for Arabic, 16–17px and 1.6 for English. Use a fluid `clamp()` scale for headings.
- **Never apply letter-spacing to Arabic text**; it breaks the joined script. Never italicise Arabic; use weight for emphasis.
- Use Western digits (0–9) for prices, MRR and statistics in both languages: `Intl.NumberFormat('ar-SA-u-nu-latn')`. Currency: "22,125 ر.س" in Arabic and "SAR 22,125" or "$5,900" in English. Gregorian dates.

### Logo (temporary)

Create a typographic wordmark for Stage 1: «إطلاق» in Alexandria Bold paired with "Etleq" in the same face. Explore one simple mark: the rising stroke of the alef/hamza drawn as a launch trajectory arc. It must read at 16px (favicon) and in one colour. Deliver SVG lockups (Arabic, English, stacked) and a favicon set. The founders will commission a final logo later; keep the logo swappable from one component.

### Imagery

- Real founder photography (natural light, sand and ink tones) and real product UI in Arabic: Etleq Core demo screens in device frames, short screen recordings.
- Abstract "trajectory" line graphics as the recurring motif.
- Never: stock handshakes, AI-generated people, rocket clip-art, fake dashboards with invented numbers.

### Layout and components

- 12-column grid, max content width 1200px, section padding about 112px desktop and 64px mobile. Alternate `sand-50`, `sand-100` and `ink-950` sections for rhythm; one idea per section.
- Bento grids for "what's included"; large numerals for prices and timelines; comparison tables with sticky first column on mobile.
- Buttons: primary = `ignition-500` background, `ink-950` text, 12px radius, 48px minimum height; secondary = ink outline. Cards: 20px radius, 1px `sand-300` border, no heavy shadows.
- Mobile first. Every section must look intentional at 360px wide.

### Motion

- 150–300ms ease-out transitions. Reveal-on-scroll once, never repeatedly.
- The hero trajectory line draws once on load. Number tickers only for real numbers.
- No scroll-jacking, no heavy parallax. Everything degrades cleanly under `prefers-reduced-motion`.

### Mood references (study, never copy)

linear.app and stripe.com for precision and type; vercel.com and raycast.com for product-led visuals; tabby.ai and tamara.co for polished Gulf Arabic product sites; thmanyah.com for Arabic editorial typography.

### Tokens (Tailwind v4)

```css
@theme {
  --color-ink-950: #0B0F14;  --color-ink-800: #1C2430;  --color-ink-600: #3A4553;
  --color-stone-500: #6B6459;
  --color-sand-50: #FAF7F2;  --color-sand-100: #F3EEE6;  --color-sand-300: #E3D9CA;
  --color-ignition-500: #FF5A1F;  --color-ignition-700: #C2410C;
  --color-verified-600: #15803D;
  --font-display: var(--font-alexandria);
  --font-sans: var(--font-plex-sans), var(--font-plex-arabic);
  --font-mono: var(--font-plex-mono);
  --radius-card: 20px;  --radius-button: 12px;
}
```

Build an internal `/design` route (noindex, staging only) that renders every token and component in both directions.

## 7. Home page blueprint

The home page is a long-form sales page in a fixed order: promise, proof, mechanism, offer, risk reversal, action. Every section is a Payload block so the founders can reorder and edit it. A primary CTA appears at least once per screen height on mobile through the sticky bar.

| # | Section | What it shows | Why it converts | Data source |
| --- | --- | --- | --- | --- |
| 0 | Announcement bar | "{n} of {total} launch slots left this month" linking to `/launch-30` | Real scarcity (Priestley: demand before supply) | `SiteSettings` global |
| 1 | Header | Wordmark, nav (Launch 30, Models, Solutions, Projects, Blog, About, Careers), language switch, "Take the scorecard" button, WhatsApp icon | One clear action; WhatsApp is the Gulf default channel | `Header` global |
| 2 | Hero | H1 promise with price and timeline, subhead, primary CTA, secondary 60-second founder video, trust row (mada, Apple Pay, cards; KSA, UAE and Oman entities), animated Arabic product mockup with a Day 1 → Day 30 trajectory (working days) | States dream outcome, time and price above the fold (Hormozi value equation) | `Pages` block |
| 3 | Proof strip | Only true facts: founders' shipped products, years of experience, live client launches once they exist | Credibility before claims | `Pages` block, each item sourced |
| 4 | Problem | Three cards: agencies (SAR 35k–65k ([Sendan](https://www.sendantech.com/en-SA/mobile-app-development-cost-saudi-arabia)); no delivery-time comparison, since 30 working days is about six weeks), freelancers (disappear after launch), AI app builders (from $25/month ([eesel](https://eesel.ai/blog/lovable-pricing)), stall at payments, Arabic, ZATCA and hosting) | Names the visitor's current options and their failure points | `Pages` block with sources |
| 5 | Mechanism: Etleq Core | Bento grid of what already exists before day one: Arabic RTL UI, mada and Apple Pay billing, ZATCA invoicing, admin panel, OTP login, hosting, backups | Raises perceived likelihood of success | `Pages` block |
| 6 | Models teaser | 6 model cards from the library: what it does, reported MRR with source, "Gulf version from $X in 30 working days" | Mirrors the reel that brought them; shows a concrete path | `Models` collection |
| 7 | Offer stack | Core deliverables plus named bonuses with stated values, total value vs price, three tiers and Care plans | Hormozi Grand Slam Offer: value far above price | `Offer` global |
| 8 | How it works | 7-step stepper: Scorecard → Fit call → Blueprint (money-back guarantee) → Build in 30 working days (demo on day 10) → Launch → First 10 customers sprint → Care | Reduces uncertainty and effort | `Pages` block |
| 9 | Guarantee | Launch-date guarantee and the Blueprint money-back guarantee, plus the honest line about revenue | Risk reversal; honesty builds trust | `Offer` global |
| 10 | Comparison table | Etleq vs agency vs freelancer vs AI builder on price, a launch date guaranteed in the contract, mada, ZATCA, Arabic interface, code ownership, support after launch. We don't compete on raw speed; unsourced cells for the others read "Depends on the agreement" | Makes the choice obvious; every cell sourced | `Pages` block |
| 11 | Founders and team | The two co-founders (photos, two-line bios, 60-second video, links to their accounts) plus a line on the wider team linking to careers | People buy from people (Key Person of Influence) | `Authors` collection |
| 12 | Projects and testimonials | Real case studies and verified testimonials; until they exist, the founding-client offer (3 clients at $4,500 in exchange for a filmed case study). Wording must stay true whether or not shipped apps are listed: the offer is about the first published client case studies, never "we haven't built anything" | Social proof without fabrication | `Projects`, `Testimonials` |
| 13 | FAQ | 8–10 objections, these first: do you market it for me, is the fit call free, why trust a new studio, who owns the code, what if the scope changes; then price (pointing to the offer section, no hardcoded figures), delays, payments, hosting location, languages, equity, Blueprint refund | Handles objections before the call | `FAQs` collection |
| 14 | Final CTA | Scorecard, booking and WhatsApp side by side | Last chance, three channels | `Pages` block |
| 15 | Footer | Legal entity names, CR and VAT numbers, addresses, phone, WhatsApp, email, socials, newsletter, legal links, language switch | Trust and entity signals for search and AI | `Footer` global |
| — | Sticky mobile bar | "Take the scorecard" + WhatsApp, appears after the hero | Keeps the action one tap away on phones | Component |

### Copy drafts (founders approve before launch)

**Announcement bar**

- AR: «متبقٍّ {n} من {total} مقاعد إطلاق هذا الشهر»
- EN: "{n} of {total} launch slots left this month"

**Hero**

- AR H1: «فكرة مجرّبة، ومنصّتك جاهزة تستقبل المدفوعات خلال 30 يوم عمل»
- AR sub: «نبني لك منصّة SaaS متكاملة بالعربية: دفع عبر مدى وApple Pay، فوترة متوافقة مع ZATCA، استضافة وصيانة، بسعر ثابت يبدأ من 22,125 ر.س. أنت تركّز على عملائك، ونحن نتولّى التقنية.»
- AR CTA: «ابدأ التقييم (دقيقتان)» · secondary: «شاهد كيف نعمل في 60 ثانية»
- AR microcopy: «أسئلة قصيرة، نتيجة فورية، دون أي التزام.»
- EN H1: "A proven idea, live and taking payments in 30 working days."
- EN sub: "We build your complete software product, Arabic-first, with mada and Apple Pay, ZATCA-ready invoicing, hosting and maintenance, at a fixed price from $5,900. You run the business. We run the tech."
- EN CTA: "Take the 2-minute scorecard" · secondary: "See how it works in 60 seconds"
- EN microcopy: "Short questions. Instant result. No commitment."

**Problem**

- AR: «ثلاث طرق شائعة لبناء منصّة، وكلّها تتعثّر عند النقطة نفسها»
- EN: "Three common ways to build a SaaS, and where each one stalls"

**Mechanism**

- AR: «Etleq Core: معظم منصّتك جاهز قبل اليوم الأول»
- EN: "Etleq Core: most of your product exists before day one"

**Guarantee**

- AR: «إذا تأخّرنا، ندفع نحن: نردّ 10% من قيمة البناء عن كل أسبوع تأخير ونواصل العمل مجانًا.»
- AR honest line: «لا نَعِدك بأرباح. نَعِدك بمنصّة تعمل، وتاريخ إطلاق، ودعم بعد الإطلاق.»
- EN: "If we're late, we pay: 10% of the build fee back for every late week, and we keep building for free."
- EN honest line: "We don't promise you profit. We promise a working product, a launch date and support after launch."
- AR Blueprint guarantee: «ضمان جلسة التخطيط: إن رأيت بعد الجلسة واستلام النطاق المكتوب والسعر الثابت أنها لا تستحق {السعر}، أخبرنا خلال 7 أيام ونعيد لك المبلغ كاملًا، ويبقى مستند النطاق لك. وإن بدأت البناء معنا، تُخصم رسوم الجلسة من قيمته.»
- EN Blueprint guarantee: "If, after the session and receiving the written scope and fixed quote, you feel it wasn't worth {price}, tell us within 7 days and we refund it in full. You keep the scope document. If you go ahead with the build, the session fee is credited to it."

**Comparison**

- Launch-date row, Etleq: AR «تاريخ إطلاق مضمون في العقد (30 يوم عمل)» · EN "Launch date guaranteed in the contract (30 working days)". Others: «حسب الاتفاق» / "Depends on the agreement".
- Code ownership, Etleq: AR «ملكك بالكامل: الشيفرة والبيانات» · EN "Yours: the code and the data".

**Founders**

- AR: «يقودها مهندسون ويبنيها فريق هندسي، لا مندوبو مبيعات»
- EN: "Led by engineers, built by an engineering team, not salespeople"
- Never present Etleq as a two-person shop: the founders lead a team of engineers and specialists (owner decision, 16 Oct 2026).

**Final CTA**

- AR: «اعرف خلال دقيقتين إن كانت فكرتك مناسبة للإطلاق»
- EN: "Find out in two minutes whether your idea is ready to launch"

Write all body copy at a simple reading level. Pages written at a 5th–7th-grade level converted at about 11.1% versus 5.3% for professional-level copy in Unbounce's 2024 benchmark ([Hartzer summary](https://www.hartzer.com/blog/unbounce-2024-conversion-benchmark-report/)). In Arabic: short sentences, common words, no jargon without a one-line explanation.

## 8. Page templates

Every template below is built once and fed from Payload. Each has one primary CTA, server-rendered content, breadcrumbs, structured data that matches the visible content, and both locales.

### Model detail (`/models/[slug]`) — the most important template

This is where every reel lands, so it must load fast on a phone and continue the reel's story.

1. Breadcrumb: Home › Models › {Model}
2. H1 — AR: «{النموذج}: كيف تبني نسخته الخليجية» · EN: "{Model}: how to build its Gulf version"
3. **Answer box** (40–60 words): what the product does, its reported MRR with source and date, what the Gulf version costs and how long it takes.
4. Fact table: what it does, who pays, pricing model, reported MRR (company, source link, date), team size, year founded. Every row has a source.
5. Why it works: three short points.
6. Running costs table: hosting, payment fees, tools, each with a source and date.
7. The Gulf version: MVP feature list, what changes for this market (Arabic, mada, ZATCA, WhatsApp notifications), tier, price from, timeline, Care plan.
8. Who should build it: fit criteria in plain words.
9. The reel embedded (Instagram or YouTube), with its full transcript below in the page language.
10. FAQ: 3–5 questions.
11. MRR disclaimer, always visible near the figure.
12. CTA: scorecard pre-filled with this model; WhatsApp with the message pre-filled («شاهدت مقطع {النموذج} وأريد أن أعرف أكثر»).
13. Related: two models, one solution page, one blog post.

Schema: `Article` (author `Person`), `BreadcrumbList`, `VideoObject` when a video is embedded. **Quality gate:** Payload validation blocks publishing unless the analysis fields (why it works, Gulf version, fit criteria) contain original text. Mass-producing thin pages counts as scaled content abuse under Google's spam policies ([Google, Mar 2024](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)).

### Launch 30 offer (`/launch-30`)

Full value stack with each bonus's stated value, the three tiers, Care plans table, payment terms (50/40/10), guarantee terms in full, what is not included, process, live slot counter, FAQ, CTA. Schema: `Service` with `Offer` (price from, currency, `areaServed` SA and AE), `provider` = Organization.

### Solutions (`/solutions/[slug]`)

One page per vertical (clinics, gyms, salons, restaurants, training centres). H1 names the software in the buyer's words, e.g. AR «نظام إدارة عيادات بالعربية متوافق مع ZATCA». Sections: daily problems in that business, feature grid, 60–90-second workflow video, integrations (mada, WhatsApp, ZATCA), price from, implementation steps, case study when one exists, FAQ, CTA "Book a demo call". Schema: `Service`, `BreadcrumbList`.

### Projects (`/projects/[slug]`)

Published only with written client consent (a required CMS checkbox plus an uploaded consent file). Sections: client and context, challenge, solution, scope, stack, planned vs actual timeline, results (each result has a `verified` flag and evidence; unverified results are hidden), screenshots, testimonial video, CTA "Build something like this". Schema: `Article`. Never add `Review` or `AggregateRating` markup about Etleq itself.

### Cost guides (`/cost/[slug]`) and comparisons (`/compare/[slug]`)

Cost guides answer one high-intent question each, e.g. AR «كم تكلفة برمجة تطبيق حجوزات في السعودية؟». Structure: answer box with sourced market ranges and Etleq's fixed price, cost-factor table, how to reduce cost, comparison of options, CTA "Get a fixed quote". Optional later: a simple cost estimator (feature checkboxes → range → scorecard). Comparison pages are fair: they say when an agency, freelancer or AI builder is the better choice. Schema: `Article`, `BreadcrumbList`.

### Blog post (`/blog/[slug]`)

Key-takeaways box at the top (answer first), table of contents, question-style headings, short paragraphs, sourced statistics, founder quotes, comparison tables where useful, inline CTA blocks, sources list, author box with credentials, published and updated dates, related posts. Schema: `BlogPosting` with `author` (Person, `sameAs`), `datePublished`, `dateModified`.

### News (`/news/[slug]`)

Short, dated announcements (launches, partnerships, press). Schema: `NewsArticle` for genuine news only.

### Careers (`/careers`, `/careers/[slug]`)

- **List page:** open roles grouped by team, filters (team, location, remote), how we hire (steps), what working here is like. No `JobPosting` markup on the list page.
- **Job page:** title, location, employment type, salary range if the founders allow, responsibilities, requirements, hiring steps, and the apply form on the same page: name, email, phone, CV (PDF only, max 5 MB), LinkedIn, portfolio or GitHub, 2–3 role questions, PDPL consent.
- **Schema:** `JobPosting` on each job page with the required properties `datePosted`, `description`, `hiringOrganization`, `jobLocation`, `title`, plus `validThrough`, `employmentType`, `directApply: true`, and `baseSalary` when shown ([Google](https://developers.google.com/search/docs/appearance/structured-data/job-posting)). Remote roles use `jobLocationType` and `applicantLocationRequirements`.
- **Expiry:** closing a job sets `validThrough` in the past or removes the page, and notifies Google through the Indexing API, which Google recommends for job URLs ([Google](https://developers.google.com/search/docs/appearance/structured-data/job-posting)).

### About (`/about`) and authors (`/authors/[slug]`)

Story, mission, founders (photos, bios, credentials, links), legal entities (names, CR numbers, countries), values, press mentions, CTA. Schema: `AboutPage`, `Person` for each founder with `sameAs`, `Organization` with `founder`.

### FAQ, contact and 404

- FAQ grouped by topic. `FAQPage` markup is fine for meaning, but Google has shown FAQ rich results only for well-known government and health sites since August 2023 ([Search Engine Journal](https://www.searchenginejournal.com/google-downgrades-visibility-of-howto-and-faq-rich-results/)), so don't expect them.
- Contact: WhatsApp first, email, office address per entity, response-time promise, short form. `Organization` `contactPoint` schema.
- 404: friendly, search box, top links, scorecard CTA.

### Legal pages

Privacy policy (PDPL), terms, MRR/earnings disclaimer, cookie policy, accessibility statement. Draft the structure with clearly marked placeholders; the founders' lawyer writes the final text.

## 9. Conversion system

The site has one conversion path (scorecard → fit call) and one fallback channel (WhatsApp). Everything else supports those two.

### Evidence to design against

| Finding | Source | What it means here |
| --- | --- | --- |
| Median landing-page conversion rate 6.6% across 41,000 pages and 464M visitors (2024) | [Unbounce](https://unbounce.com/landing-page-benchmarks/) | A first benchmark for the home, offer and model pages |
| Copy at a 5th–7th-grade reading level converted \~11.1% vs 5.3% for professional-level copy | [Unbounce 2024 via Hartzer](https://www.hartzer.com/blog/unbounce-2024-conversion-benchmark-report/) | Plain Arabic and English, short sentences |
| Mobile sends \~5× more traffic; desktop converts \~8% higher | [Unbounce 2024 via Hartzer](https://www.hartzer.com/blog/unbounce-2024-conversion-benchmark-report/) | Mobile-first design; let desktop-minded visitors continue on WhatsApp |
| A 0.1s faster mobile site lifted retail conversions 8.4% and lead-gen progression to the form page 21.6% | [Deloitte / web.dev](https://web.dev/case-studies/milliseconds-make-millions) | Speed budgets are conversion work |
| 92% of Saudis use WhatsApp (2022 survey of 1,220 adults) | [Arab News](https://arabnews.com/node/2054631) | WhatsApp is the fallback channel on every page |

### Scorecard (`/scorecard`)

Priestley-style scorecard: one question per screen, progress bar, back button, under two minutes. Contact details (name, WhatsApp number, email) are asked after the last question, before the result, with the reason shown: «لنرسل لك نتيجتك المفصّلة».

Question order (owner decision, 22 Oct 2026): easy, identity-building questions first, money last. The model question is skipped when the model page pre-fills it, so most visitors see 10 or 11 questions. Points are unchanged.

| # | Question | Answers → points | Max |
| --- | --- | --- | --- |
| 1 | Which model or idea interests you? | Routing only (pre-filled from the model page, then skipped) | 0 |
| 2 | When do you want to launch? | Within a month 10 · 1–3 months 7 · 3–6 months 3 · later 0 | 10 |
| 3 | Country | KSA or UAE 5 · other GCC 3 · elsewhere 1 | 5 |
| 4 | Do you run a business today? | No 0 · under SAR 1M revenue 10 · SAR 1–5M 15 · over SAR 5M 20 | 20 |
| 5 | Existing customers or audience | None 0 · under 500 4 · 500–5,000 7 · 5,000+ 10 | 10 |
| 6 | Who will market the product? | Me or my team 10 · I hope Etleq will 0 | 10 |
| 7 | Have you sold anything online before? | Yes 5 · No 0 | 5 |
| 8 | Hours per week you can give the launch | under 3 0 · 3–8 3 · 8+ 5 | 5 |
| 9 | Do you have a commercial registration? | Yes 5 · No 0 | 5 |
| 10 | Are you the final decision-maker? | Yes 10 · I decide with a partner 6 · No, someone else decides 0 | 10 |
| 11 | Budget available in the next 60 days | under $2k 0 · $2–5k 5 · $5–10k 15 · $10k+ 20 | 20 |

The free-text "What would success in 6 months look like?" is no longer asked on the site (it opened the phone keyboard right before the contact step). The Cal.com booking form asks it instead; answers already stored on older leads stay readable.

**Routing:**

- **Hard disqualifiers** (no booking offered, whatever the score): budget under $5k, "No, someone else decides", launch later than 6 months, or "I hope Etleq will market it". "I decide with a partner" is not a disqualifier; the ready result asks the visitor to bring the partner to the same call («ادعُ شريكك في القرار إلى المكالمة نفسها.» / "Invite your co-decision-maker to the same call.").
- **60–100, no disqualifier → "Ready to launch":** result page with the booking embed inline, pre-filled.
- **40–59 → "Almost ready":** WhatsApp is the primary next step («تحدّث معنا على واتساب عمّا ينقصك» / "Talk to us on WhatsApp about what's missing") until the playbook PDF exists; the one-tap playbook sign-up is secondary; plus an invitation to retake later.
- **0–39 → "Explore first":** free content and the newsletter.

Keep weights and thresholds in a `ScorecardSettings` global so the founders can tune them; the scoring function lives in `lib/scoring.ts` with unit tests for every band and disqualifier.

### Booking

Cal.com embed on the result page and `/book`, with event types "Fit call, 15 min" in Arabic and English, default time zone Asia/Riyadh, name and email pre-filled. A booking webhook updates the lead to `booked` and triggers the conversion events.

### WhatsApp

Every page has a click-to-chat link (`https://wa.me/{number}?text={encoded}`) with a page-specific message and a reference code, e.g. «مرحبًا، شاهدت صفحة {النموذج} على موقع إطلاق (ref: M-123)». Track `whatsapp_click` with the page and placement.

### Lead handling and speed to lead

- Every form and scorecard submission creates a `Leads` record with answers, score, tier, page, model, UTM parameters and first-touch referrer.
- Instant alerts to the founders by email and webhook (Telegram, Slack, or WhatsApp Business API later).
- An instant auto-reply to the lead, in their language, with what happens next.
- The response-time promise shown on the site is a CMS setting the founders control.

### Forms

- Fewest possible fields; phone input with country picker defaulting to +966, validated to E.164; correct `autocomplete` and `inputmode` attributes.
- Zod validation with Arabic and English messages written by hand, not translated.
- Cloudflare Turnstile (invisible mode), a honeypot field and per-IP rate limiting. No puzzle captchas.

### CTA and trust rules

- One primary CTA label site-wide ("Take the scorecard" / «ابدأ التقييم»), plus WhatsApp as secondary. Button text says what happens next.
- Show "from" prices on the home, offer, model and solution pages.
- Social proof must be real: named person, company, photo and recorded consent; a "verified" badge links to the case study.
- No pop-ups on mobile. On desktop, at most one gentle slide-in offering the scorecard after 50% scroll, once per session.
- Thank-you pages confirm, set expectations ("we'll call you on {date}"), offer add-to-calendar and a preparation video, and fire conversion events exactly once.

### Testing backlog (in order)

Hero headline; price shown vs "from" price; founder video vs product video in the hero; scorecard with 11 vs 8 questions; CTA label. Run A/B tests only when a variant can collect enough conversions to decide; until then, learn from session recordings and short user tests with real prospects.

## 10. CMS specification (Payload)

The founders must be able to publish a model, a blog post, a project, a news item or a job in either language without a developer. (L) marks a localized field.

### Collections

| Collection | Key fields | Who can edit |
| --- | --- | --- |
| `Users` | name, email, role (`admin`, `editor`, `recruiter`, `sales`) | admin |
| `Media` | file, alt (L, required for each translated locale), caption (L), credit, focal point; generated sizes | admin, editor |
| `Pages` | title (L), slug, `layout` blocks (L), SEO group (L), `translated.ar` / `translated.en`, `isSample` | admin, editor |
| `Models` | title (L), slug, answer box (L), category, what it does (L), who pays (L), pricing model (L), reported MRR (number), MRR currency, MRR source name and URL, MRR reported date, team size, year founded, fact sources (array: label, URL, checked date), why it works (L, rich), running costs (array: item (L), monthly cost, currency, source URL, checked date), Gulf version (L, rich), MVP features (L, array), tier, price from, build days (default 30), fit criteria (L), reel URL, transcript (L), FAQs, related models / solution / posts, translated flags, `isSample`, SEO (L) | admin, editor |
| `Solutions` | title (L), slug, buyer problems (L), features (L, array), integrations, video, price from, case studies, FAQs, translated flags, SEO (L) | admin, editor |
| `Projects` | title (L), slug, client name and logo, consent checkbox + consent file (both required to publish), challenge (L), solution (L), scope, stack, planned days, actual days, results (array: label (L), value, `verified`, evidence), gallery, testimonial, related model | admin, editor |
| `Posts` | title (L), slug, excerpt (L), key takeaways (L, array), content (L, Lexical with custom blocks), hero image, authors, categories, tags, published date, "last reviewed" date, sources (array: label, URL, accessed date), FAQs, related posts, translated flags, SEO (L) | admin, editor |
| `News` | title (L), slug, excerpt (L), content (L), image, published date, source links, translated flags, SEO (L) | admin, editor |
| `Guides` | type (`cost` or `comparison`), same fields as `Posts` plus a structured comparison table block | admin, editor |
| `Jobs` | title (L), slug, team, employment type (enum matching schema.org values), city, country, workplace (onsite / hybrid / remote), applicant location requirements, description (L), responsibilities (L), requirements (L), salary min / max / currency / unit + `showSalary`, date posted, valid through, status (`open` / `closed`), role questions (L), translated flags | admin, recruiter |
| `Applications` | job, name, email, phone, CV (private bucket, PDF only, max 5 MB), LinkedIn, portfolio, answers, consent (boolean + timestamp + policy version), status (`new`, `screening`, `interview`, `offer`, `hired`, `rejected`), rating, notes, retain-until date | admin, recruiter (never public) |
| `Leads` | name, WhatsApp phone, email, country, company, source (`scorecard`, `contact`, `booking`, `newsletter`), answers (JSON), score, tier, disqualifiers, model, landing page, UTM group, first-touch referrer, status (`new`, `contacted`, `booked`, `blueprint`, `won`, `lost`), owner, notes, consent, retain-until date | admin, sales (never public) |
| `Testimonials` | person, role, company, photo, quote (L), video, consent file, `verified`, related project | admin, editor |
| `FAQs` | question (L), answer (L), category, order | admin, editor |
| `Authors` | name (L), slug, role (L), bio (L), photo, credentials (array), `sameAs` links, linked user | admin, editor |
| `Categories`, `Tags` | name (L), slug, description (L) | admin, editor |
| `ShortLinks` | code, target, UTM source / medium / campaign / content | admin, editor |
| `Subscribers` | email, locale, consent, double opt-in status | admin, sales |

### Globals

| Global | Fields |
| --- | --- |
| `Header`, `Footer` | navigation (L), CTA labels (L), social links, legal links |
| `SiteSettings` | slots total, slots left, founding price active, WhatsApp number, response-time promise (L), booking URLs per locale, legal entities (array: legal name (L), country, CR number, VAT number, address (L)) |
| `Offer` | tiers (name (L), price from, description (L)), bonuses (name (L), stated value, description (L)), Care plans, guarantee text (L), payment terms (L) |
| `ScorecardSettings` | questions (L), options (L) with points, thresholds, disqualifier rules |
| `SeoDefaults` | title templates (L), default OG images per locale, organization `sameAs`, AI crawler policy toggles (section 12) |
| `AnnouncementBar` | enabled, text (L), link |

### Plugins and integrations

`@payloadcms/plugin-seo` (per-locale meta title, description, image, with generate helpers), `@payloadcms/plugin-redirects`, `@payloadcms/storage-s3`, and the MongoDB adapter. Build forms and the scorecard as custom code (section 9), not with a form-builder plugin.

### Editorial workflow

- Drafts, versions and autosave on all content collections; scheduled publishing for posts, news and jobs.
- Live preview in both locales for pages, models, solutions and posts.
- **Translation status:** ticking `translated.en` (or `.ar`) makes that locale's required fields mandatory and publishes the page in that locale. Unticked locales return 404 publicly.
- **Slugs:** generated from the English title, lowercase Latin, unique, editable. Changing the slug of a published document creates a 301 in the redirects collection automatically.
- **Publishing hooks:** on publish or unpublish, revalidate the affected paths and tags in both locales, regenerate the sitemap entries, ping IndexNow, and for jobs call the Google Indexing API.
- **Admin UI:** Arabic locale set with `rtl: true` so editing Arabic content is right-to-left ([Payload](https://payloadcms.com/docs/v3/configuration/localization.md)). Offer the admin interface in Arabic and English if the installed Payload translations include Arabic.
- **Retention:** a scheduled job anonymises leads and applications after their retain-until date.
- **Seed script:** `pnpm seed` creates sample content in both languages, every document flagged `isSample: true`. The production build fails if any published document is a sample.
- **Access tests:** automated tests prove that `Leads`, `Applications` and CV files are never readable by anonymous users or by the wrong role.

## 11. SEO plan

Goal: rank in Arabic for what buyers search before they spend money (how much a clinic booking system costs, which SaaS idea works in Saudi), and make every page easy for Google and Bing to crawl, understand and trust. Most of this is built once in code (Stage 5); the rest is a publishing habit (Stage 8).

### Technical requirements

| Area | Requirement |
| --- | --- |
| Rendering | Every indexable page is static and revalidated on publish (section 4). Text, links and JSON-LD are in the server HTML; nothing indexable depends on client-side JavaScript. |
| Host | One canonical host, `https://www.etleq.com`; the apex and `http` redirect to it with 301. Lowercase paths, no trailing slash. |
| Language URLs | One URL per language, no cookie- or IP-based switching and no automatic redirects, as Google recommends ([Google](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)). |
| Canonical | Self-referencing canonical per locale, stripped of UTM and click-ID parameters. Paginated lists canonicalise to themselves, not to page 1. `/go/` short links answer with 302 so their targets can change. |
| hreflang | Set `alternates.languages` in `generateMetadata`: `ar`, `en`, and `x-default` pointing to the Arabic URL ([Google on x-default](https://developers.google.com/search/blog/2013/04/x-default-hreflang-for-international-pages)). Emit it only when both locales are published, always in both directions. A page that exists in one language gets none. |
| Titles and descriptions | Unique per page and locale, written natively in each language, never machine-translated. Pattern from `SeoDefaults`, e.g. `تكلفة نظام حجز لعيادة في السعودية — إطلاق`. |
| Sitemaps | `sitemap.ts` with `generateSitemaps`: one sitemap per collection, each URL with `lastModified` and its language alternates. Exclude drafts, samples, noindex pages, thank-you pages and scorecard results. |
| robots.txt | `robots.ts` disallows `/admin`, `/api`, `/scorecard/result`, `/thank-you` and `/design`, and links the sitemaps. AI crawler rules come from `SeoDefaults` (section 12). Staging sends `X-Robots-Tag: noindex` on every response. |
| Status codes | Real 404 for missing or untranslated pages. Slug changes 301 (section 10). A closed job drops its JobPosting markup and returns 410, with links to open roles. |
| Feeds | RSS for blog and news per locale: `/rss.xml` and `/en/rss.xml`. |
| Images | `next/image` with AVIF or WebP, explicit dimensions, localized alt text and descriptive Latin file names. Prioritise the LCP image. |
| Social cards | A 1200×630 Open Graph image per page and locale via `next/og`. Test Arabic: letters must join and read right to left. If the renderer cannot shape Arabic, render the cards with Playwright on publish and store them in `Media`. |
| Breadcrumbs | Visible on every page except home, mirrored in `BreadcrumbList`. |
| Internal links | Each model links to its solution, a cost guide, two related models and the scorecard. Each post links to at least two models or guides. Hubs link to all their children. A CI crawl fails if any published page has no internal link pointing to it. |

### Structured data

Build JSON-LD in `lib/schema.ts`, typed with `schema-dts`, one `@graph` per page. Markup must match what the page visibly shows.

| Page | Types | Notes |
| --- | --- | --- |
| Every page | `Organization`, `WebSite`, `BreadcrumbList` | Full `Organization` on home and about, an `@id` reference elsewhere: `name` Etleq, `alternateName` إطلاق and منصة اطلق, logo, `sameAs`, founders, `contactPoint` with areas served (SA, AE, OM) and languages (ar, en) |
| Launch 30, solutions | `Service` with `Offer` and `PriceSpecification` (`minPrice`) | No rich result exists for this; it helps search engines and assistants read the offer correctly |
| Models, guides | `Article`, plus `VideoObject` for the reel with its transcript | `dateModified` is the last-reviewed date |
| Blog | `BlogPosting` | `author` points to the author's `Person` `@id` |
| News | `NewsArticle` |  |
| Jobs | `JobPosting` | Required and recommended properties per [Google](https://developers.google.com/search/docs/appearance/structured-data/job-posting); remote roles use `jobLocationType` and `applicantLocationRequirements` |
| Authors | `ProfilePage` with `Person` | Credentials and `sameAs` |
| Projects | `Article` about the client `Organization` | Never `Review` or `AggregateRating` about Etleq on Etleq's own site |
| FAQ blocks | `FAQPage`, optional | Since August 2023 FAQ rich results show only for well-known government and health sites ([Google](https://developers.google.com/search/blog/2023/08/howto-faq-changes)); keep it only as machine-readable context |

Unit tests parse every template's JSON-LD. In Stage 5, run one page of each type through Google's Rich Results Test and the Schema Markup Validator.

### Keyword clusters

Size each cluster with the keyword tool the founders choose (section 16), then with Search Console data once live. Write Arabic first; create the English mirror only where English demand exists.

| Cluster | Searcher | Example Arabic queries | Page type | CTA |
| --- | --- | --- | --- | --- |
| Cost | Ready to budget | تكلفة تطوير تطبيق، كم تكلفة برمجة منصة، تكلفة نظام حجز مواعيد | `/cost/[slug]` | Scorecard |
| Vertical software | Business owner with a problem | نظام إدارة عيادات، برنامج حجز صالون، نظام اشتراكات نادي رياضي، نظام إدارة مطعم، نظام مركز تدريب | `/solutions/[slug]` | Book a call |
| SaaS ideas and models | Deciding what to build | أفكار مشاريع SaaS، مشروع برمجي مربح، أفكار مشاريع تقنية في السعودية | `/models`, `/models/[slug]` | Scorecard, pre-filled |
| How-to and compliance | Already building, stuck on a problem | ربط بوابة دفع مدى، الدفع المتكرر عبر مدى، الفوترة الإلكترونية فاتورة، نظام حماية البيانات الشخصية | Blog | Playbook, then scorecard |
| Comparisons | Choosing how to build | شركة برمجة أم مستقل، منصات بدون كود أم برمجة خاصة | `/compare/[slug]` | Scorecard |
| Brand | Already knows Etleq | إطلاق، منصة اطلق، Etleq، اطلق 30 | Home, about, Launch 30 | Scorecard |

Arabic search rules:

- Many people type without hamza and with ه for ة (اطلق، تكلفه، منصه). Spell headings correctly and let common variants appear naturally in FAQs and `alternateName`. Never stuff variants.
- Buyers use different nouns for the same product: تطبيق، برنامج، نظام، منصة، موقع. Put the one search data favours in the title and use the others in the body.
- Write Modern Standard Arabic that reads naturally to a Gulf buyer. Gulf phrasing is fine in FAQ questions (كم يكلف…).
- Show prices in SAR and USD, with Western digits (section 6).

### Programmatic pages without spam

Models, solutions and cost guides share templates. That is fine only when each page carries unique substance: Google's scaled content abuse policy targets many pages made mainly to rank, however they are produced ([Google](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)). The publish gate (section 10) blocks a model or guide without an answer box, at least three sourced and dated facts, a Gulf analysis, a named reviewer and a last-reviewed date. Never bulk-create pages from a spreadsheet without a human review of each one.

### Local and off-site

- Google Business Profile and Bing Places for each entity with an address that can be shown, using the same name, address and phone as the footer.
- The same name, logo and one-line description on LinkedIn, X, Instagram, TikTok, Snapchat, YouTube and agency directories; list every profile in `Organization.sameAs`.
- Earn links and mentions from Arabic tech media, podcasts, payment-provider partner listings where they exist, founders' guest posts and the data assets in section 12. Never buy links.

### Measurement

- Search Console (domain property) and Bing Webmaster Tools verified at launch, sitemaps submitted (Stage 7).
- Monthly report: impressions and clicks by cluster and locale, non-brand clicks, indexed versus submitted URLs, Core Web Vitals pass rate, scorecard starts and leads from organic, and the top 20 queries with no matching page (the next pages to write).

## 12. GEO: getting cited by AI assistants

GEO means being the source that ChatGPT, Gemini, Google's AI Overviews and AI Mode, Perplexity, Claude and Copilot quote when someone asks how to build software or a SaaS in the Gulf. Analogy: SEO puts you on the shelf; GEO gets the shop assistant to recommend you by name. Most of it is good SEO plus stronger evidence on the page and a brand people talk about.

### What the evidence says

| Finding | Source |
| --- | --- |
| Google needs no special files, markup or schema for AI Overviews or AI Mode; a page only has to be indexed and eligible for a snippet. These features may run several related searches per question (query fan-out) | [Google, Dec 2025](https://developers.google.com/search/docs/appearance/ai-features) |
| AI Overviews (May 2025) and AI Mode (Oct 2025) work in Arabic | [Google MENA](https://blog.google/intl/en-mena/product-updates/explore-get-answers/bringing-ai-overviews-to-mena-and-in-arabic-globally/), [Google MENA](https://blog.google/intl/en-mena/product-updates/explore-get-answers/introducing-ai-mode-in-arabic/) |
| An AI Overview correlates with a 58% lower click-through rate for the top-ranking page (300k keywords, Dec 2023 vs Dec 2025) | [Ahrefs, Feb 2026](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/) |
| Adding quotations (+41%), statistics (+31%) and cited sources (+27.5%) raised a source's visibility in generative answers; keyword stuffing lowered it (−8%) | [GEO paper, KDD 2024](https://arxiv.org/html/2311.09735v3) |
| Brand signals correlate most with AI visibility: YouTube mentions about 0.74, branded web mentions 0.66–0.71; backlinks only weakly (about 75k brands) | [Ahrefs, Dec 2025](https://ahrefs.com/blog/ai-brand-visibility-correlations) |
| Share of gen-AI website visits in May 2026: ChatGPT about 53%, Gemini 27–28%, Claude about 9% | [Similarweb](https://aisearch.similarweb.com/blog/gen-ai-stats/) |
| 97% of llms.txt files received zero requests in May 2026 | [PPC Land, citing Ahrefs](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/) |
| Bing Webmaster Tools' AI Performance report (preview since Feb 2026) shows how often Copilot and Bing's AI answers cite your pages, and the grounding queries behind them | [GEO Toolbox](https://geotoolbox.ai/blog/bing-webmaster-tools) |

What it means for Etleq: a ranking earns fewer clicks than it used to, so being named and linked inside the answer matters as much as ranking.

### Crawler access (build)

`robots.ts` reads this policy from `SeoDefaults`, so the founders can change it without a deploy.

| User agent | Owner | What it does | Policy |
| --- | --- | --- | --- |
| `Googlebot`, `Bingbot` | Google, Microsoft | Search, AI Overviews, AI Mode and Copilot answers | Allow |
| `OAI-SearchBot` | OpenAI | Shows sites in ChatGPT search; blocked sites are not shown | Allow |
| `ChatGPT-User` | OpenAI | Fetches a page when a user asks; robots.txt may not apply | Allow |
| `OAI-AdsBot` | OpenAI | Checks pages submitted as ChatGPT ads | Allow |
| `PerplexityBot` | Perplexity | Perplexity search results | Allow |
| `Perplexity-User` | Perplexity | User-requested fetches; generally ignores robots.txt | Allow, and never block it in the firewall |
| `Claude-SearchBot`, `Claude-User` | Anthropic | Claude search quality and user-requested fetches | Allow |
| `GPTBot`, `ClaudeBot`, `Google-Extended` | OpenAI, Anthropic, Google | Model training; `Google-Extended` also covers Gemini grounding and does not affect Google Search | Founders decide (section 16). Recommended: allow, because the content is marketing |

Sources: [OpenAI](https://developers.openai.com/api/docs/bots), [Anthropic](https://support.claude.com/en/articles/8896518-what-is-claudebot), [Perplexity](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md), [Google](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers).

- **Cloudflare:** its AI crawler controls (announced July 2026) set separate policies for Search, Agent and Training crawlers, with new defaults for domains added from 15 September 2026. Help Net Security reports that blocking Training also blocks crawlers that do both jobs, such as Googlebot and Bingbot, even when Search is allowed ([Help Net Security](https://www.helpnetsecurity.com/2026/07/02/cloudflare-ai-crawler-controls/)). So set Search and Agent to allow, do not block Training unless a test proves Googlebot and Bingbot still get through, and keep any generic block-AI-bots rule off. After launch, check Cloudflare's security events and Search Console's crawl stats for blocked bots.
- **Bing and IndexNow:** verify the site in Bing Webmaster Tools and ping IndexNow on every publish, update and unpublish (section 10). IndexNow tells Bing and other participating engines what changed; Google does not use it ([GEO Toolbox](https://geotoolbox.ai/blog/bing-webmaster-tools)).
- **Text, not pixels:** everything worth quoting is HTML text: prices, tables, steps, answers and video transcripts. No key fact lives only inside an image or a video.
- **llms.txt:** optional. Generate `/llms.txt` from the CMS (site summary plus links to hubs and top pages) because it costs little, but expect no effect.

### Content rules for every model, guide and post

1. **Answer first.** The first 40–60 words answer the page's question with a number or a clear verdict (the answer box field).
2. **Cover the follow-up questions.** Use question-style H2s for the sub-questions assistants fan out to: cost, time to launch, risks, alternatives and Gulf specifics (payments, VAT, data rules).
3. **Evidence on the page.** Statistics with source and date, short quotes from named people (founders, consenting clients, experts) and links to sources: the three tactics that helped most in the GEO paper.
4. **Visible dates.** Published and last-reviewed dates, both on the page and in the markup.
5. **Tables for numbers.** Costs, comparisons and feature lists go in HTML tables so assistants can lift the figures cleanly.
6. **Original data.** Publish assets only Etleq can produce: a yearly Gulf SaaS build-cost index (from Etleq's own quotes and public sources, with methodology) and statistics from the models library. Each gets a permanent URL, a methodology section and a CSV download.
7. **One consistent entity.** Always the same names (Etleq and «إطلاق»), the same one-line description (stored in `SeoDefaults`), and the same founder names and titles, on and off the site.

### Off-site signals (founders' job; the site supports it)

- Publish every reel on YouTube too (Shorts and longer cuts) with Arabic titles, captions and a description linking to the model page. YouTube mentions had the strongest correlation in the Ahrefs study.
- Get Etleq mentioned where buyers and assistants look: podcasts, Arabic tech and business media, the founders' LinkedIn posts, founder and SME communities, and agency directories with real client reviews.
- A bet to test: fewer well-sourced Arabic pages exist on these topics than English ones, so Arabic pages may get cited sooner. The prompt panel below measures it.

### Measuring GEO

- **GA4 channel group “AI assistants”:** session source matches `chatgpt.com|chat.openai.com|perplexity.ai|gemini.google.com|copilot.microsoft.com|claude.ai|deepseek.com|grok.com|meta.ai`. Clicks from Google's AI Overviews and AI Mode cannot be separated; they count as Google organic in Search Console's Web report.
- **Monthly prompt panel:** 30 fixed prompts (15 Arabic, 15 English) asked in ChatGPT, Gemini, Google AI Mode, Perplexity, Claude and Copilot. Log for each answer whether Etleq is mentioned, whether it is linked, which page, and which competitors appear. Track the share over time. Examples: «كم تكلفة برمجة نظام حجز مواعيد لعيادة في السعودية؟», «أفضل شركة لبناء منصة اشتراكات في السعودية», “How much does it cost to build a SaaS MVP in Saudi Arabia?”, “Who can build and launch a SaaS in 30 days in the Gulf?”. A paid tracking tool can replace the manual panel later (section 16).
- **Bing AI Performance:** monthly citations and grounding queries.
- **Server logs:** monthly count of AI crawler hits by user agent, checking IPs against each vendor's published ranges to catch fakes.

## 13. Analytics, attribution and experiments

Measure the whole path from first visit to paid Blueprint, and only after consent. The numbers feed the founders' weekly KPI scorecard and tell the ad platforms which leads are worth paying for.

### Tools

| Tool | Job | Rules |
| --- | --- | --- |
| GA4 | Traffic, funnel, key events | Loaded with `@next/third-parties` only after analytics consent; Consent Mode v2 signals (`analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization`) set from the banner |
| Microsoft Clarity | Heatmaps and session recordings | After analytics consent; strict masking of all inputs and lead data; never on `/admin` |
| Meta Pixel + Conversions API | Instagram and Facebook ads | Browser and server events share one `event_id` so Meta counts each once |
| Snap Pixel + Conversions API | Snapchat ads | Server events from the lead and booking endpoints, deduplicated the same way ([Snap](https://developers.snap.com/api/marketing-api/Conversions-API)) |
| TikTok Pixel + Events API | TikTok ads | Same `event_id` deduplication |
| Search Console, Bing Webmaster Tools | Organic and AI search | Sections 11 and 12 |
| Payload admin dashboard | Lead pipeline | Counts by status, tier, source and locale, plus median time to first response |

No Google Tag Manager by default: events live in typed, reviewed and tested code (`lib/analytics.ts`). Revisit if a marketer joins, and record the decision in `docs/decisions.md`.

### Consent

- A banner in the page language with **Accept all**, **Reject all** and **Settings**, equally prominent. Categories: necessary, analytics, marketing. A cookie-settings link in the footer reopens it.
- Default is basic mode: no analytics or ad tag loads until the visitor accepts. Moving to Consent Mode's advanced mode (cookieless pings) is a founders' decision after legal advice (section 16).
- Store the choice with a timestamp and policy version; ask again when the policy version changes.
- Server-side events go to ad platforms only for leads who accepted marketing.

### Attribution

- On landing, read UTM parameters, click IDs (`gclid`, `fbclid`, `ttclid`, `ScCid`), referrer and landing page. Keep them in session storage; persist them in a first-party cookie only after analytics consent.
- Every lead stores first touch, last touch, click IDs, landing page and the `ref` code from WhatsApp links or `ShortLinks`.
- **Offline conversions:** when sales moves a lead to `booked`, `blueprint` or `won` in the CMS, a hook sends a server event to GA4 (Measurement Protocol) and to the ad platforms, with its value. The ads then optimise for buyers, not form-fillers.

### Event taxonomy

| Event | Fires when | Key parameters | Key event |
| --- | --- | --- | --- |
| `cta_click` | A primary CTA is clicked | `cta_id`, `location` |  |
| `scorecard_start` | First answer given | `source_page`, `model_slug` |  |
| `scorecard_step` | Each step completed | `step`, `question_id` |  |
| `scorecard_complete` | Result shown | `score`, `tier` |  |
| `generate_lead` | Lead saved (scorecard or contact form) | `source`, `tier`, `score` | Yes |
| `qualify_lead` | Lead scores 60 or more | `score`, `model_slug` | Yes |
| `disqualify_lead` | A disqualifier is hit | `reason` |  |
| `booking_scheduled` | Cal.com webhook confirms a booking | `event_type` | Yes |
| `whatsapp_click` | A WhatsApp link is opened | `location`, `ref_code` | Yes |
| `video_play`, `video_progress` | Reel played; 50% watched | `model_slug`, `percent` |  |
| `model_view` | Model page viewed | `model_slug`, `category` |  |
| `language_switch` | Language switched | `from`, `to` |  |
| `job_view`, `job_apply_submit` | Job viewed; application sent | `job_slug` | `job_apply_submit` |
| `newsletter_signup`, `playbook_download` | Sign-up or download | `source_page` |  |
| `close_convert_lead` | Lead marked `blueprint` or `won` (server-side) | `value`, `currency` | Yes |

`generate_lead`, `qualify_lead`, `disqualify_lead` and `close_convert_lead` are GA4's recommended lead-generation events ([Google](https://support.google.com/analytics/answer/9267735)). Map each event to the ad platforms' closest standard event (for Meta: `Lead`, `Schedule`, `Purchase`) in one table in `lib/analytics.ts`. Every event carries `locale`.

### Dashboards

- **Founders' weekly KPI scorecard** (a GA4 exploration or Looker Studio, plus the Payload dashboard): visitors → scorecard starts → completions → leads by tier → bookings → paid Blueprints → builds, split by channel and locale, plus median lead response time.
- **Monthly:** the SEO and GEO reports (sections 11 and 12), conversion rate per page, top exit pages and form-field drop-off from Clarity.

### Experiments

- Test only when a page earns enough conversions: detecting a 20% lift on a 5% conversion rate needs roughly 8,000 visitors per variant (95% confidence, 80% power). Until then, improve from session recordings, scorecard drop-off and sales-call notes.
- Tool: GrowthBook or PostHog (section 16). Assign variants in `proxy.ts` with a cookie and rewrite to a pre-rendered variant, so pages stay static with no flicker or layout shift. Log `experiment_exposure` with `experiment_id` and `variant`.
- Test big levers first: hero promise, offer framing, scorecard length, order of proof. One primary metric per test (scorecard completion or booking rate), run in whole weeks, with the sample size fixed before starting.

## 14. Performance, accessibility, security and compliance

These are acceptance criteria, not polish (section 3).

### Performance

| Metric | Target |
| --- | --- |
| Core Web Vitals, field data, mobile, 75th percentile | LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 ([thresholds](https://specification.website/spec/performance/core-web-vitals/)) |
| Lighthouse CI, mobile, key templates in both locales | Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO 100 |
| First-load JavaScript per route | The empty shell's size (measured in Stage 1) plus at most 50 KB compressed; CI fails above it |
| Hero image | ≤ 200 KB, AVIF or WebP, responsive sizes |
| Fonts | Self-hosted with `next/font`, subset to Arabic and Latin, at most three files preloaded per locale, `font-display: swap` |

- No third-party script loads before consent; after consent, load them `afterInteractive` or `lazyOnload`.
- Cal.com loads when the visitor opens the booking step, not on page load. Reels and YouTube videos use a lightweight facade (poster plus play button) until clicked.
- Animate only `transform` and `opacity`, and respect reduced motion (section 6).

### Accessibility (WCAG 2.2 AA)

- Keyboard access everywhere, with a visible focus ring that the sticky header and mobile bar never cover (2.4.11).
- Touch targets at least 24×24 px (2.5.8); Etleq's buttons are 48 px high.
- Help sits in the same place on every page (3.2.6): the WhatsApp and contact links.
- No flow asks for the same information twice (3.3.7): the scorecard pre-fills what it already knows.
- Admin login works with password managers and paste (3.3.8).
- Text contrast at least 4.5:1, or 3:1 for large text; `ignition-500` only behind ink text (section 6).
- Correct `lang` and `dir` on `<html>`. Latin words, numbers, emails and phone numbers inside Arabic text are wrapped in `<bdi>` or `dir="ltr"`; free-text inputs use `dir="auto"`.
- Every field has a label; errors are linked with `aria-describedby` and announced.
- Tests: axe-core in Playwright on every template in both locales, with zero serious or critical issues; a manual pass with VoiceOver (iPhone, Arabic) and NVDA (Windows, English) on home, scorecard and job application. Publish an accessibility statement in both languages.

### RTL quality checklist

- The layout mirrors fully. Directional icons (arrows, chevrons, back) flip with `rtl:rotate-180`; media controls, check marks and logos do not.
- Phone numbers, prices, URLs, code and English brand names keep their order inside Arabic sentences (test with `+966 5X XXX XXXX` and `SAR 22,125`).
- Arabic copy uses Arabic punctuation («،» and «؟»).
- Carousels swipe, and progress bars fill, in reading direction.
- Diacritics are never clipped: test headings containing shadda and tanween («مجرّبة», «جديدًا») at every heading size.
- Playwright screenshots of every template in both directions at 360, 768 and 1280 px, reviewed at the end of each stage.

### Security

- **Headers:** a Content Security Policy with nonces and an allow-list for analytics, pixels, Cal.com, Turnstile and YouTube; HSTS; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; a `Permissions-Policy` denying camera, microphone and geolocation; `frame-ancestors 'self'` (live preview needs it).
- **Back office:** put `/admin` and Payload's REST API behind Cloudflare Access (or an IP allow-list). Public forms post to server actions that use the Local API. Serve public media straight from the bucket's CDN domain (`disablePayloadAccessControl` on the public media collection), so nothing public depends on `/api`. Disable GraphQL if unused. Webhooks live under `/hooks/*` and verify signatures. Turn on Payload's `maxLoginAttempts` and `lockTime`.
- **Abuse:** rate limits on forms and login (Nginx `limit_req` plus app checks), and Turnstile and a honeypot on every public form (section 9).
- **Uploads:** CVs are checked by file signature, not just extension; maximum 5 MB; stored in a private bucket; recruiters open them through short-lived signed URLs. A ClamAV scan is optional.
- **Dependencies:** Renovate or Dependabot; watch the Next.js, React and Payload security advisories and patch critical ones promptly.
- **MongoDB:** authentication on, not reachable from the internet, a least-privilege app user, replica set.
- **Backups:** a daily encrypted database dump plus bucket versioning, stored off the server; restore tested before launch and after every major upgrade.
- **Monitoring:** uptime checks, error tracking, and alerts on 5xx spikes and low disk space. Logs never contain form bodies, CVs or tokens.

### Privacy and compliance

- **Saudi PDPL:** it applies to personal data of people in Saudi Arabia even when the processing happens abroad, and sending personal data outside the Kingdom needs a permitted purpose and safeguards such as SDAIA's standard contractual clauses ([King & Spalding, Nov 2025](https://www.kslaw.com/news-and-insights/international-personal-data-transfers-under-saudi-arabias-data-protection-law)). Hosting location is therefore a legal decision (section 16). Keep all personal data (`Leads`, `Applications`, `Subscribers`, CVs) in one database and one private bucket so it can move, and make the region a configuration choice.
- **UAE and Oman:** the lawyer confirms each entity's local data-protection duties; the same consent, rights and retention features cover them.
- **Privacy notice** in Arabic and English, written or approved by the lawyer: what is collected (scorecard answers, contact details, CVs, analytics), why, on what basis, how long, who receives it (email, booking, hosting, ad platforms with consent), transfers abroad, rights and contact. Claude Code builds the pages and CMS fields, never the legal text.
- **Consent records:** every form stores a timestamp, the policy version and what was agreed. Marketing opt-in is a separate, unticked checkbox.
- **Retention:** defaults in `SiteSettings` for the founders and lawyer to confirm: leads 24 months after last contact, applications 12 months after the decision, subscribers until they unsubscribe. A scheduled job anonymises expired records (section 10).
- **Rights requests:** an admin action exports or deletes everything held about an email or phone number across collections and files, and logs the request.
- **Claims:** the MRR disclaimer and the no-revenue-guarantee line (section 2) appear wherever results are shown, in wording the lawyer approves.

## 15. Build stages and acceptance criteria

The founders set the timing; Claude Code never estimates durations. A stage is done only when every criterion passes and the founders sign off.

**Rules for every stage**

1. Start with a short plan for the stage and the section 16 questions that block it.
2. Work on a branch, deploy to staging, keep CI green.
3. Finish with an evidence report: for each criterion, the proof (test output, screenshots in both languages, Lighthouse reports, staging links).
4. Update `CHANGELOG.md` and `docs/decisions.md`.
5. Do not start the next stage until the founders approve. Stage 8 never ends.

### Overview

| Stage | Outcome | Gate in short |
| --- | --- | --- |
| 0. Foundation | Repo, environments, CI/CD, database, storage, monitoring | Staging deploys from `main`; a backup restore works |
| 1. Design system and bilingual shell | Tokens, fonts, components, RTL and LTR shell, `/design` | Founders approve `/design` in both directions |
| 2. CMS core | Collections, roles, localization, workflows, seed | Access tests pass; Arabic-only publishing works |
| 3. Conversion engine | Home, Launch 30, scorecard, booking, WhatsApp, leads | A test lead flows from scorecard to CRM, alert and booking |
| 4. Content templates and careers | Models, solutions, projects, guides, blog, news, authors, careers | Founders publish a model, a post and a job unaided |
| 5. SEO and GEO layer | Metadata, hreflang, sitemaps, robots, schema, social cards, IndexNow | Automated crawl and validators show zero errors |
| 6. Analytics and consent | Consent, GA4, Clarity, pixels and server events, attribution, dashboards | No tracking before consent; events and deduplication verified |
| 7. Quality and launch | Performance, accessibility, RTL, security, legal pages, real content, go-live | Section 14 targets met; production live and verified |
| 8. Growth loop | Publishing, reporting, experiments | The founders' targets from the business plan |

### Stage 0. Foundation

Build: Next.js 16.x and Payload 3.x in one TypeScript-strict app with pnpm; ESLint, Prettier and the logical-CSS rule; Vitest and Playwright; GitHub Actions (typecheck, lint, test, build); staging and production on the VPS (PM2, Nginx, Cloudflare); a MongoDB replica set with auth; public and private buckets; error tracking and uptime monitoring; `.env.example`; `CLAUDE.md` or `AGENTS.md` pointing to this brief.

Done when:

- `pnpm dev` runs the site and the admin, and an admin can log in locally and on staging.
- CI runs on every pull request and blocks merging on failure.
- Merging to `main` deploys to staging; production deploys with one documented command, and a rollback has been rehearsed once.
- Staging is password-protected and sends `noindex`.
- MongoDB is unreachable from the internet, and a backup has been restored onto a clean staging database.
- Every section 16 input marked Stage 0 is answered or has a recorded default.

### Stage 1. Design system and bilingual shell

Build: `@theme` tokens, fonts, shadcn/ui with RTL, header, footer, language switcher, next-intl routing (Arabic at `/`, English at `/en`), `<html lang dir>`, localized 404 pages, and `/design` showing every token and component in both directions.

Done when:

- `/` serves Arabic right to left and `/en` English left to right; a request to `/` with `Accept-Language: en` still gets Arabic.
- `/design` shows every component in both directions, and the founders approve it.
- The lint rule and a CI grep find no physical-direction classes (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `rounded-l`, `rounded-r`, `border-l`, `border-r`); any exception carries a comment explaining why.
- Every text colour pair in use passes WCAG AA contrast.
- The shell scores Lighthouse mobile Performance ≥ 95 and Accessibility 100 in both locales, and its first-load JavaScript is recorded as the budget baseline (section 14).

### Stage 2. CMS core

Build: every collection and global in section 10, roles and access control, localization with `rtl: true`, drafts, versions, scheduled publishing, live preview, the SEO, redirects and storage plugins, hooks (revalidation, slugs, redirects, publish gate, `isSample` guard), the retention job, the seed script, and the admin in Arabic.

Done when:

- Every collection, global and field in section 10 exists, and Arabic content is edited right to left.
- Access tests pass: anonymous users and editors cannot read `Leads`, `Applications` or CV files; recruiters see applications only; sales sees leads only.
- A test proves that a document published in Arabic only is returned for `ar` and not for `en` on public queries (no fallback).
- Changing a published slug creates a 301 automatically.
- The publish gate rejects a model without an answer box, three sourced facts, a Gulf analysis or a reviewer.
- `pnpm seed` fills both languages with content flagged `isSample`, and a test proves the production build fails while any published sample exists.

### Stage 3. Home, Launch 30 and the conversion engine

Build: home (section 7), Launch 30, How it works and contact; the scorecard with `lib/scoring.ts` and a result page per tier; Cal.com booking; WhatsApp links with ref codes; lead storage, alerts and auto-replies; thank-you pages; the slot counter and offer from CMS globals; the sticky mobile bar; every form in section 9.

Done when:

- Home and Launch 30 render every section from CMS data in both locales, and changing a price or the slots left in the admin updates the live page without a deploy.
- Scoring unit tests cover every question, every disqualifier and the tier boundaries (39/40 and 59/60).
- A Playwright test completes the scorecard in Arabic and in English, reaches the right tier, and the lead appears in `Leads` with answers, score, tier and UTMs.
- The founders receive the lead alert by email and webhook within a minute, and the lead receives the auto-reply in their language.
- A booking made through Cal.com moves the lead to `booked`.
- WhatsApp buttons open the right number with the pre-filled message and ref code, in both languages, on iPhone and Android.
- Forms reject invalid numbers with hand-written Arabic and English messages, and a scripted spam run is stopped by Turnstile, the honeypot and rate limiting.
- At 360 px one primary CTA is always visible and nothing pops up.
- The founders have approved all copy, and no placeholder text remains on these pages.

### Stage 4. Content templates and careers

Build: models library and detail, solutions, projects, cost guides, comparisons, blog (list, category, post), news, authors, FAQ, about, careers list, job detail and application, legal page shells, newsletter and playbook capture.

Done when:

- Every template renders from CMS data in both locales with breadcrumbs, related links and its CTA, and a document missing a translation returns 404 in that locale.
- Model pages show the answer box, sourced and dated facts, MRR with source, date and disclaimer, the reel with its transcript, and the pre-filled scorecard link.
- A project cannot be published without a consent file, and an unverified result cannot be published as a number.
- A recruiter publishes a job; a candidate applies in Arabic with a PDF CV; the recruiter is alerted; the CV opens only for recruiters and admins through a signed link; a non-PDF or a file over 5 MB is rejected with a clear message.
- Closing a job removes it from the careers list and the sitemap and drops its JobPosting markup.
- The founders publish one real model, one post and one job end to end with no developer help.

### Stage 5. SEO and GEO technical layer

Build: the technical requirements in sections 11 and 12: metadata, canonicals, hreflang, sitemaps, `robots.ts` with the AI policy from `SeoDefaults`, RSS, JSON-LD for every template, Open Graph cards per locale, IndexNow, the Google Indexing API for jobs, the orphan-page check, and optionally `llms.txt`.

Done when:

- An automated crawl of the staging sitemap shows that every indexable URL has a self-canonical and a unique title and description per locale; hreflang pairs are reciprocal and exist only for published translations; no indexable URL is missing from the sitemap and no noindex URL is in it; there are no orphan pages.
- `robots.txt` matches the policy in `SeoDefaults`, and changing a toggle changes the file without a deploy.
- One page of each type passes Google's Rich Results Test (where a rich result exists) and the Schema Markup Validator with zero errors.
- Arabic Open Graph cards show joined, right-to-left text in WhatsApp and LinkedIn share previews.
- Publishing a post revalidates both locales and calls IndexNow; publishing and closing a job each notify the Indexing API. On staging these calls run as logged dry runs.

### Stage 6. Analytics, consent and experiments

Build: the consent banner and settings, GA4 with key events, Clarity with masking, the Meta, Snap and TikTok pixels with server events and deduplication, UTM and click-ID capture, offline conversions on status changes, the AI-assistants channel group, the weekly dashboard and the experiment setup.

Done when:

- Without consent, a Playwright network log shows zero analytics or ad requests; after consent, the section 13 events fire.
- Every event in the taxonomy appears in GA4 DebugView with its parameters, in both locales.
- Meta Events Manager shows browser and server `Lead` events deduplicated, and Snap and TikTok receive test events.
- A test lead's UTMs and click IDs appear on its record, and moving it to `blueprint` sends the offline conversion with its value.
- Clarity recordings show masked inputs.
- A visit referred by `chatgpt.com` lands in the AI-assistants channel group.
- The weekly dashboard shows the full funnel by channel and locale.
- A dummy experiment runs with server-side assignment, logs exposures and causes no layout shift.

### Stage 7. Quality, content and launch

Build: performance tuning, accessibility and RTL fixes, security headers, the back-office lock-down, production backups and monitoring, the lawyer's legal texts, the accessibility statement, the launch content, the production cutover, Search Console and Bing Webmaster Tools.

Done when:

- Lighthouse CI (mobile) meets section 14 on the home, Launch 30, model, post, job and scorecard pages in both locales.
- axe reports zero serious or critical issues on every template in both locales, and the manual keyboard and screen-reader passes are done.
- The RTL checklist passes at 360, 768 and 1280 px.
- The section 14 security headers are present (checked with an external scanner), the admin is reachable only through the chosen protection, and login lockout works.
- A production backup restores onto a clean server.
- The privacy notice, terms, cookie policy and accessibility statement are live in both languages with lawyer-approved text.
- No published document is flagged `isSample`; the founders have checked every price, offer and claim; every number on the site has a source.
- The launch content minimum from section 16 is published.
- After go-live, both search consoles are verified, sitemaps are submitted, their page reports show no errors after the first crawl, and uptime and error alerts reach the founders.

### Stage 8. Growth loop (ongoing)

Run: a model page goes live before each reel posts; content is published cluster by cluster; the monthly SEO, GEO and conversion reports and the prompt panel are produced; one experiment runs at a time once traffic allows; fixes come from recordings and sales calls.

The site is working when the founders' targets, taken from the business plan's stage table, are met:

- non-brand organic clicks keep growing from one monthly report to the next;
- Etleq appears in a rising share of prompt-panel answers;
- scorecard completion, lead-to-booking and booking-to-Blueprint rates reach the business plan's targets;
- every lead gets a first response within the promise shown on the site.

## 16. Founder inputs and open decisions

Claude Code asks for these at the start of the stage that needs them and never invents an answer. The founders record each answer in `docs/decisions.md`. Where a default exists, work continues on it until the founders change it; a blocking item stops that stage.

| # | Input or decision | Needed by | Default if unanswered |
| --- | --- | --- | --- |
| 1 | GitHub repo, VPS access, domain registrar and Cloudflare account | Stage 0 | Blocking |
| 2 | Where personal data is hosted in production: in Saudi Arabia, or abroad with transfer safeguards (decide with the lawyer, section 14) | Stage 0 for staging, Stage 7 for production | Staging on the current VPS; production waits for the decision |
| 3 | Storage for media and CVs (any S3-compatible service) and error tracking (Sentry or self-hosted GlitchTip) | Stage 0 | Same region as item 2; Sentry's free tier |
| 4 | Logo and identity: approve section 6 or supply a designer's identity | Stage 1 | Section 6 identity with the temporary wordmark |
| 5 | Names and roles for admin, editor, recruiter and sales accounts | Stage 2 | Both founders as admins |
| 6 | Founders' photos, bios, titles, LinkedIn links and an intro video | Stage 3 | Sample placeholders, which cannot be published |
| 7 | Offer confirmation: tiers, prices, bonuses, guarantee wording, founding-client price and slots | Stage 3 | Section 2 values, flagged unconfirmed until approved |
| 8 | Scorecard questions, points and thresholds | Stage 3 | Section 9 |
| 9 | The lead response-time promise shown on the site | Stage 3 | Not shown until set |
| 10 | WhatsApp Business number per country, Cal.com account and event types (check the Arabic booking page), SMTP provider and sending domain, lead-alert emails and webhook | Stage 3 | Blocking for Stage 3 |
| 11 | Playbook (lead magnet) file | Stage 3 | The form collects emails and promises delivery when ready |
| 12 | Legal entity names, CR and VAT numbers and addresses per country | Stage 4 | Footer and schema omit them until provided |
| 13 | Which pages get English at launch | Stage 4 | Home, Launch 30, How it works, solutions, about, careers and legal pages |
| 14 | Reel hosting: YouTube embeds or self-hosted video | Stage 4 | YouTube with a facade and an on-page transcript |
| 15 | Careers: roles to post, salary display, remote policy | Stage 4 | Salary hidden; remote roles state the allowed countries |
| 16 | Newsletter sending tool | Stage 4 | Collect sign-ups with double opt-in; pick the tool later |
| 17 | AI training crawlers (`GPTBot`, `ClaudeBot`, `Google-Extended`): allow or block | Stage 5 | Allow |
| 18 | Keyword research tool | Stage 5 | Search Console plus Google Keyword Planner |
| 19 | Social profile URLs for `sameAs` | Stage 5 | Only profiles that exist |
| 20 | GA4 property, Clarity project, and Meta, Snap and TikTok ad accounts with server tokens | Stage 6 | Each tool stays off until provided |
| 21 | Consent Mode basic or advanced (after legal advice) | Stage 6 | Basic |
| 22 | Experiment tool and GEO tracking tool | Stage 6 | No experiments until traffic allows; manual prompt panel |
| 23 | Lawyer-approved privacy notice, terms, cookie policy, MRR disclaimer, guarantee terms and retention periods | Stage 7 | Blocking for launch; retention defaults in section 14 |
| 24 | Back-office protection: Cloudflare Access or an IP allow-list | Stage 7 | Cloudflare Access |
| 25 | Launch content minimum | Stage 7 | 10 model pages, 5 solution pages, 3 cost guides and 6 posts in Arabic, plus one real project or the founding-client offer |
| 26 | Business-plan targets the Stage 8 success criteria use | Stage 8 | The business plan's stage table |

## 17. Sources

Every page below was opened while writing this brief (checked up to 16 Oct 2026). Versions and statistics change: re-check versions before installing, and re-check any figure before it appears on the public site.

### Stack

- [Next.js blog: release notes](https://nextjs.org/blog)
- [Next.js 16 and Payload CMS compatibility (buildwithmatija)](https://www.buildwithmatija.com/blog/nextjs-16-payload-cms-compatibility)
- [Payload 4.0 status (buildwithmatija)](https://buildwithmatija.com/blog/payload-4-0)
- [Payload 3: MongoDB adapter](https://payloadcms.com/docs/v3/database/mongodb.md)
- [Payload 3: localization](https://payloadcms.com/docs/v3/configuration/localization.md)
- [Next.js internationalization with next-intl (buildwithmatija)](https://www.buildwithmatija.com/blog/nextjs-internationalization-guide-next-intl-2025)
- [shadcn/ui RTL support, Jan 2026](https://ui.shadcn.com/docs/changelog/2026-01-rtl)

### Design

- [Free Arabic fonts every designer needs (Lemonade Digital Media)](https://lemonadedigitalmedia.com/en/free-arabic-fonts-every-designer-needs/)

### Market and conversion

- [Mobile app development cost in Saudi Arabia (Sendan)](https://www.sendantech.com/en-SA/mobile-app-development-cost-saudi-arabia)
- [Lovable pricing (eesel)](https://eesel.ai/blog/lovable-pricing)
- [Landing page benchmarks (Unbounce)](https://unbounce.com/landing-page-benchmarks/)
- [Unbounce 2024 conversion benchmark summary (Hartzer)](https://www.hartzer.com/blog/unbounce-2024-conversion-benchmark-report/)
- [Milliseconds make millions (Deloitte study, web.dev)](https://web.dev/case-studies/milliseconds-make-millions)
- [WhatsApp use in Saudi Arabia (Arab News)](https://arabnews.com/node/2054631)

### SEO

- [Managing multi-regional and multilingual sites (Google)](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)
- [x-default hreflang (Google)](https://developers.google.com/search/blog/2013/04/x-default-hreflang-for-international-pages)
- [JobPosting structured data (Google)](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
- [Changes to HowTo and FAQ rich results, Aug 2023 (Google)](https://developers.google.com/search/blog/2023/08/howto-faq-changes)
- [Google downgrades HowTo and FAQ rich results (Search Engine Journal)](https://www.searchenginejournal.com/google-downgrades-visibility-of-howto-and-faq-rich-results/)
- [March 2024 core update and spam policies (Google)](https://developers.google.com/search/blog/2024/03/core-update-spam-policies)
- [Core Web Vitals thresholds (specification.website)](https://specification.website/spec/performance/core-web-vitals/)

### GEO and AI crawlers

- [AI features and your website (Google)](https://developers.google.com/search/docs/appearance/ai-features)
- [Google's common crawlers, including Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- [AI Overviews in MENA and in Arabic (Google)](https://blog.google/intl/en-mena/product-updates/explore-get-answers/bringing-ai-overviews-to-mena-and-in-arabic-globally/)
- [AI Mode in Arabic (Google)](https://blog.google/intl/en-mena/product-updates/explore-get-answers/introducing-ai-mode-in-arabic/)
- [AI Overviews reduce clicks by 58%, Feb 2026 (Ahrefs)](https://ahrefs.com/blog/ai-overviews-reduce-clicks-update/)
- [Brand factors and AI visibility, Dec 2025 (Ahrefs)](https://ahrefs.com/blog/ai-brand-visibility-correlations)
- [GEO: Generative Engine Optimization (Aggarwal et al., KDD 2024)](https://arxiv.org/html/2311.09735v3)
- [Generative AI statistics (Similarweb)](https://aisearch.similarweb.com/blog/gen-ai-stats/)
- [llms.txt adoption and AI requests (PPC Land)](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/)
- [Bing Webmaster Tools AI Performance report (GEO Toolbox)](https://geotoolbox.ai/blog/bing-webmaster-tools)
- [Overview of OpenAI crawlers (OpenAI)](https://developers.openai.com/api/docs/bots)
- [Anthropic's crawlers (Claude Help Center)](https://support.claude.com/en/articles/8896518-what-is-claudebot)
- [Perplexity crawlers (Perplexity)](https://docs.perplexity.ai/docs/resources/perplexity-crawlers.md)
- [Cloudflare AI crawler controls, Jul 2026 (Help Net Security)](https://www.helpnetsecurity.com/2026/07/02/cloudflare-ai-crawler-controls/)

### Analytics

- [Snap Conversions API (Snap)](https://developers.snap.com/api/marketing-api/Conversions-API)
- [GA4 recommended events (Google)](https://support.google.com/analytics/answer/9267735)

### Privacy

- [International personal data transfers under Saudi Arabia's PDPL, Nov 2025 (King & Spalding)](https://www.kslaw.com/news-and-insights/international-personal-data-transfers-under-saudi-arabias-data-protection-law)
