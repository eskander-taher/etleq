# Schema and code contract (shared by all workstreams)

Brief section 10 is the source; this file pins exact slugs, field names and module ownership so parallel work fits together. Change it only with a note in `docs/decisions.md`.

## Conventions

- Field names camelCase. `(L)` = `localized: true`.
- Every public content collection has:
  - `slug` (text, unique, index, NOT localized, lowercase Latin `^[a-z0-9]+(?:-[a-z0-9]+)*$`)
  - `translated` group: `{ ar: checkbox, en: checkbox }` (not localized). A locale is public only when ticked.
  - `isSample` checkbox (sidebar, default false)
  - `meta` group (title (L), description (L), image)
  - `drafts: true` in `src/cms/schema/collections.ts` → `_status` field (`draft` | `published`).
- Public queries ALWAYS: `locale`, `fallbackLocale: false`, `draft: false`, `where: { _status: {equals:'published'}, 'translated.<locale>': {equals: true} }`. Helper: `publicWhere(locale)` in `src/lib/queries/common.ts`.
- Schema: `src/cms/schema/**`. Types: `src/cms/content-types.ts` (hand-maintained; update it with the schema). Interface names = singular PascalCase of the slug (e.g. `Model`, `Post`, `Faq`, `News`, `ShortLink`); globals use `interfaceName` exactly as named below.
- Money: numbers in USD unless a `currency` field says otherwise. SAR = USD × 3.75 (`src/lib/format.ts`).

## Collections (slug → key fields)

| slug | fields |
| --- | --- |
| `users` | name, email (auth), role select `admin`/`editor`/`recruiter`/`sales` (saveToJWT). auth: `maxLoginAttempts: 5, lockTime: 600000` |
| `media` | upload (public), alt (L, required), caption (L), credit, focalPoint. sizes: thumbnail 400, card 800, hero 1600, og 1200x630 |
| `private-files` | upload, private (no public read), PDF only, 5 MB. Used for CVs and consent files |
| `pages` | title (L), slug, layout blocks (L) using blocks in `src/blocks`, translated, isSample, meta |
| `models` | title (L), slug, answerBox (L textarea), category (select: `booking`,`membership`,`marketplace`,`directory`,`b2b`,`vertical`,`creator`,`other`), whatItDoes (L), whoPays (L), pricingModel (L), mrr { amount number, currency text default USD, sourceName, sourceUrl, reportedAt date }, teamSize number, yearFounded number, factSources array { label (L), value (L), url, checkedAt date }, whyItWorks (L richText), runningCosts array { item (L), monthlyCost number, currency, sourceUrl, checkedAt }, gulfVersion (L richText), mvpFeatures array { feature (L) }, tier select `core`/`pro`/`vertical`, priceFrom number (USD), buildDays number default 30, fitCriteria array { criterion (L) }, reel { url, platform select `youtube`/`instagram`, posterImage upload media }, transcript (L textarea), faqs relationship→faqs hasMany, relatedModels relationship→models hasMany max 2, relatedSolution →solutions, relatedPosts →posts hasMany, reviewer relationship→authors, lastReviewedAt date, authors →authors hasMany, heroImage →media, translated, isSample, meta |
| `solutions` | title (L), slug, vertical select `clinics`/`gyms`/`salons`/`restaurants`/`training-centres`, summary (L), buyerProblems array { problem (L) }, features array { title (L), description (L), icon text }, integrations array { name, description (L) }, video { url, posterImage }, priceFrom number, steps array { title (L), description (L) }, caseStudies →projects hasMany, faqs →faqs hasMany, translated, isSample, meta |
| `projects` | kind select `own`/`client` (default `own`; missing = `client`), title (L), slug, links array { url (absolute http(s), required), label (optional; empty = derived from the URL: website / App Store / Google Play) }, clientName, clientLogo →media, consentGiven checkbox, consentFile →private-files (both required to publish when kind ≠ `own`; public queries: `kind = own OR consentGiven = true`), context (L), challenge (L richText), solution (L richText), scope array { item (L) }, stack array { name }, plannedDays, actualDays, results array { label (L), value text, verified checkbox, evidence text }, gallery array { image →media }, testimonial →testimonials, relatedModel →models, publishedAt, translated, isSample, meta |
| `posts` | title (L), slug, excerpt (L), keyTakeaways array { text (L) }, content (L richText with blocks callout/statWithSource/comparisonTable/faq/cta/video), heroImage →media, authors →authors hasMany, categories →categories hasMany, tags →tags hasMany, publishedAt, lastReviewedAt, sources array { label, url, accessedAt }, faqs →faqs, relatedPosts →posts, translated, isSample, meta |
| `news` | title (L), slug, excerpt (L), content (L richText), image →media, publishedAt, sourceLinks array { label, url }, translated, isSample, meta |
| `guides` | everything `posts` has + `type` select `cost`/`comparison`, `answerBox` (L), `comparisonTable` { columns array { label (L) }, rows array { label (L), cells array { value (L), sourceUrl } } }, reviewer →authors, lastReviewedAt |
| `jobs` | title (L), slug, team select `engineering`/`design`/`growth`/`operations`, employmentType select `FULL_TIME`/`PART_TIME`/`CONTRACTOR`/`TEMPORARY`/`INTERN`, city, country (ISO2), workplace select `onsite`/`hybrid`/`remote`, applicantLocationRequirements array { country ISO2 }, description (L richText), responsibilities array { item (L) }, requirements array { item (L) }, salary { min, max, currency, unit select `HOUR`/`MONTH`/`YEAR`, show checkbox }, datePosted date, validThrough date, status select `open`/`closed`, roleQuestions array { question (L) }, translated, isSample, meta |
| `applications` | job →jobs, name, email, phone, cv →private-files, linkedin, portfolio, answers json, consent { given, at date, policyVersion }, status select `new`/`screening`/`interview`/`offer`/`hired`/`rejected`, rating number 1-5, notes, retainUntil date, locale |
| `leads` | name, phone (E.164), email, country, company, source select `scorecard`/`contact`/`booking`/`newsletter`/`playbook`/`whatsapp`, answers json, score number, tier select `ready`/`almost`/`explore`, disqualifiers json (string[]), modelSlug, landingPage, utm { source, medium, campaign, content, term }, clickIds json, firstTouch json, lastTouch json, referrer, refCode, status select `new`/`contacted`/`booked`/`blueprint`/`won`/`lost`, owner →users, notes, message, consent { given, at, policyVersion, marketing checkbox }, locale select `ar`/`en`, retainUntil date |
| `testimonials` | person, role (L), company, photo →media, quote (L), videoUrl, consentFile →private-files, verified, relatedProject →projects |
| `faqs` | question (L), answer (L textarea), category select `price`/`ownership`/`timeline`/`payments`/`hosting`/`languages`/`equity`/`refunds`/`process`/`general`, order number, translated, isSample |
| `authors` | name (L), slug, role (L), bio (L), photo →media, credentials array { text (L) }, sameAs array { url }, user →users, translated, isSample |
| `categories`, `tags` | name (L), slug, description (L), translated |
| `short-links` | code (unique), target (text path e.g. `/models/barber-booking-app`), utm { source, medium, campaign, content } |
| `subscribers` | email, locale, consent { given, at, policyVersion }, status select `pending`/`confirmed`/`unsubscribed`, confirmToken |
| `redirects` | from plugin-redirects |

## Globals (slug → interfaceName → fields)

| slug | interfaceName | fields |
| --- | --- | --- |
| `header` | `Header` | nav array { label (L), href }, ctaLabel (L) |
| `footer` | `Footer` | columns array { title (L), links array { label (L), href } }, social array { platform, url }, legalLinks array { label (L), href } |
| `site-settings` | `SiteSettings` | slotsTotal, slotsLeft, slotsMonth (YYYY-MM, optional), foundingPriceActive, foundingPrice, foundingSlots, whatsappNumber (E.164 no +), responseTimePromise (L, optional), bookingUrls { ar, en }, contactEmail, legalEntities array { legalName (L), country ISO2, crNumber, vatNumber, address (L) }, retention { leadsMonths 24, applicationsMonths 12 }, policyVersion text |
| `offer` | `Offer` | blueprint { name (L), price 390, description (L) }, tiers array { key `core`/`pro`/`vertical`, name (L), priceFrom, description (L), features array { text (L) } }, bonuses array { name (L), statedValue, description (L) }, carePlans array { name (L), monthlyPrice, features array { text (L) } }, guarantee (L textarea), guaranteeHonestLine (L), paymentTerms (L), notIncluded array { text (L) }, confirmed checkbox |
| `scorecard-settings` | `ScorecardSettings` | questions array { key, type select `single`/`text`/`model`, prompt (L), options array { value, label (L), points } }, thresholds { ready 60, almost 40 }, disqualifiers array { questionKey, optionValue, reason (L) } |
| `seo-defaults` | `SeoDefaults` | titleTemplate (L, e.g. `%s — إطلاق`), defaultDescription (L), oneLiner (L), ogImage { ar →media, en →media }, sameAs array { url }, aiCrawlers { allowTraining checkbox default true, allowSearch default true, allowUser default true } |
| `announcement-bar` | `AnnouncementBar` | enabled, text (L, may contain `{n}` and `{total}`), link |

## Module ownership (one owner per file)

| Area | Owner workstream | Files |
| --- | --- | --- |
| Foundation | lead | package.json, configs, `src/i18n/*`, `src/proxy.ts`, `src/app/(frontend)/[locale]/layout.tsx`, `src/app/(frontend)/globals.css`, `src/lib/{utils,format,cms,env,whatsapp}.ts`, `src/components/ui/{button,container,section}.tsx`, `scripts/check-logical-css.mjs` |
| CMS | A | `src/cms/**`, `src/app/admin/**`, `src/components/admin/**`, `src/hooks/**`, `src/lib/queries/common.ts`, `src/lib/revalidate.ts`, `src/lib/indexnow.ts`, `scripts/seed.ts`, `scripts/check-samples.ts`, `scripts/dev-mongo.ts` |
| Design & shell | B | `src/components/layout/**` (Header, Footer, LanguageSwitcher, AnnouncementBar, StickyMobileBar, Logo, LanguageBanner), `src/components/ui/**` (others), `src/app/(frontend)/[locale]/{design,about,faq,contact,privacy,terms,disclaimer,cookies,accessibility}/**`, `not-found.tsx`, `[...rest]`, `public/` logos+favicons, `src/messages/*/common.json` |
| Conversion | C | `src/app/(frontend)/[locale]/{page.tsx,launch-30,how-it-works,scorecard,book,playbook,thank-you}/**`, `src/app/go/**`, `src/app/hooks/**`, `src/components/sections/home/**`, `src/components/scorecard/**`, `src/components/forms/**`, `src/lib/{scoring,leads,turnstile,rate-limit,notify}.ts`, `src/lib/validation/**`, `src/actions/**`, `src/messages/*/{home,scorecard,forms}.json`, `tests/unit/scoring.test.ts` |
| Content | D | `src/app/(frontend)/[locale]/{models,solutions,projects,cost,compare,blog,news,authors,careers}/**`, `src/components/content/**`, `src/components/RichText.tsx`, `src/lib/queries/{models,solutions,projects,posts,news,guides,jobs,authors}.ts`, `src/messages/*/{content,careers}.json` |
| SEO/GEO/analytics | E | `src/lib/{seo,schema,analytics,attribution,consent}.ts`, `src/app/{sitemap.ts,robots.ts,llms.txt,rss.xml}`, `src/app/(frontend)/[locale]/rss.xml` (en), OG image routes, `src/components/seo/**`, `src/components/analytics/**`, `src/messages/*/consent.json`, `tests/unit/{schema,seo,sitemap}.test.ts`, `playwright.config.ts`, `tests/e2e/**`, `.github/workflows/**`, `vitest.config.ts` |

## Shared APIs (signatures agents rely on)

- `getCms()` — `src/lib/cms.ts` (the data API in `src/cms/local.ts`: `find`, `findByID`, `count`, `create`, `update`, `delete`, `findGlobal`, `updateGlobal`, `sendEmail`)
- `publicWhere(locale, extra?)` — `src/lib/queries/common.ts` (A)
- `getGlobal(slug, locale)` — `src/lib/queries/common.ts` (A), cached with `unstable_cache`-free plain call (pages are ISR).
- `formatUSD(n, locale)`, `formatSAR(n, locale)`, `formatPrice(usd, locale)` (AR → `22,125 ر.س`, EN → `$5,900`), `formatDate(iso, locale)` — `src/lib/format.ts`
- `whatsappLink({ number, message, ref })` — `src/lib/whatsapp.ts`
- `buildMetadata({ locale, path, title, description, image?, alternates: {ar?: boolean, en?: boolean}, noindex? })` → Next `Metadata` — `src/lib/seo.ts` (E)
- `JsonLd({ data })` component — `src/components/seo/JsonLd.tsx` (E); graph builders in `src/lib/schema.ts` (E): `organizationNode`, `websiteNode`, `breadcrumbNode(items)`, `articleNode`, `blogPostingNode`, `newsArticleNode`, `serviceNode`, `jobPostingNode`, `personNode`, `faqPageNode`, `videoNode`, `graph(...nodes)`.
- `Breadcrumbs({ items: {label, href}[] })` — `src/components/ui/breadcrumbs.tsx` (B) — renders visible crumbs + JSON-LD via E's builder.
- `RichText({ data })` — `src/components/RichText.tsx` (D)
- `trackEvent(name, params)` client — `src/lib/analytics.ts` (E); no-op until consent.
- `Link`, `redirect`, `usePathname`, `getPathname` — `src/i18n/navigation.ts`
- Message namespaces: `common`, `home`, `scorecard`, `forms`, `content`, `careers`, `consent`, `demo`, `projects` (files in `src/messages/{ar,en}/<ns>.json`).
