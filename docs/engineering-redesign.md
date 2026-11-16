# Etleq engineering redesign — 2026-11-15

## Direction

Source: `../Website Spec Thani AI Engineering.md`.
The owner's follow-up takes priority over the nine-section homepage: a simple dark design, one visible audit offer and an immediate route to request the audit or book a call. Etleq remains the brand. The homepage is shorter; detailed engineering information lives on supporting pages.

## Implemented

- Charcoal, warm white and orange theme; shared responsive header/footer, reduced navigation and mobile conversion bar.
- Arabic and English homepage, audit intake, six engineering/advisory service pages, method, pricing, proof/sample, contact, about, FAQ, learning entry, audit terms and refund information.
- SAR 750 audit and SAR 18,000 / 40-hour module positioning. VAT breakdown on the audit offer. Indicative SAR/AED/USD pricing display.
- Audit requests use the existing validated/rate-limited/Turnstile-protected contact action, lead persistence and notification plumbing. Access preference and NDA request are recorded in the lead message. No source code is uploaded.
- Existing configured booking component, consent controls and company/contact records are reused. Missing identities, client quotes, registration numbers and addresses are not fabricated.
- 15-layer standard, explicit illustrative sample report, scoped service deliverables and ownership promise.
- Metadata, sitemap entries, llms.txt hubs, Service/FAQ schema and redirects from superseded sales hubs.
- Existing Arabic-at-root and English-at-/en URLs retained for compatibility; /ar links normalize through the existing middleware. Browser-language detection remains the site's existing Arabic-first behavior.

## Launch dependencies and deliberate limits

This is a website implementation, not a completed paid-audit operation. Do not claim paid checkout is live.

1. Payment gateway credentials, verified webhook, payment-to-intake linkage, refunds and ZATCA invoicing are not connected. Intake explicitly says it requests confirmation, takes no payment and starts no scan.
2. Secure repository access/ZIP storage, a verified region and retention/deletion implementation, the scan pipeline and automated bilingual PDF report delivery remain to be connected. The sample currently exists as a printable web page, not a downloadable bilingual PDF.
3. Configure and test the real booking calendar (including Sunday–Thursday availability and Ramadan adjustments), contact settings, notifications and CRM in the deployment environment. No live booking, email, WhatsApp message or payment was sent as a test.
4. The spec calls for native Arabic editorial review. Arabic implementation copy is a draft pending that review.
5. Existing privacy/terms pages still contain legal draft placeholders. Final PDPL/UAE policies, liability terms and refund commitments require the business's actual processing details. Audit policy pages therefore say these details are confirmed before purchase, without inventing guarantees.
6. Publish approved founder/team/company records, a genuine completed sample PDF and client-authorized case studies when available. The About page consumes existing founder records rather than manufacturing identities.
7. Learning content is an initial practical checklist and links to the existing journal, not three newly researched regulatory guides. No weekly conversion dashboard has been added. Only actual page views/form starts/request success and existing booking/WhatsApp events are tracked, subject to consent.
8. No production deployment, commit or push was performed.

## Verification

TypeScript and production compilation passed. Unit suite: 175 tests passed, including the production locale-link regression. Browser checks covered Arabic at phone width, conversion navigation, native required-field validation, currency switching and horizontal overflow on audit/pricing. All 44 Arabic/English production route smoke checks passed.

## Interactive homepage refinement

The follow-up adds a labelled, interactive audit preview with Security / Speed / Arabic examples and a finding-to-fix toggle. A short ring-draw entrance, subtle lighting, button feedback and once-per-section reveals add visual interest. No carousel, autoplay loop, scroll hijacking or animation dependency was introduced. Reduced-motion settings disable animation and reveal hiding.

The hero audit action now opens a native dialog on the same page; its link still works without JavaScript. The dialog supports Escape, focus restoration and a mobile scrolling form. Form verification is initialized only after opening. Preview clicks and hero conversion actions use consent-aware analytics. This makes the request path shorter; conversion uplift remains unmeasured until real traffic is available. The existing payment and audit-pipeline launch dependencies still apply.

## Modern Web Guidance applied (2026-11-15)

Source: https://github.com/googlechrome/modern-web-guidance, skill version 2026_11_09-5bcc021b. Used capability searches and retrieved six relevant guides; no dependency or animation framework was added.

- `animate-to-from-top-layer`: opacity/display/overlay transitions, top-level starting styles, actual display-transition capability probe, bounded animation-completion fallback and shared close/cancel handler.
- `light-dismiss-a-dialog`: declarative closedby="any", with bounds-based dismissal only when the native capability is absent.
- `motion`: static default, full animation opted in through prefers-reduced-motion: no-preference, visible focus-within for revealed sections. Legacy global duration reset excludes the engineering UI.
- `validate-input-after-interaction`: per-field errors after blur or invalid submission, clear on correction, associated descriptions, no initial invalid announcements.
- `forms`: explicit unique label/control IDs, input hints, 16px minimum input text, larger coarse-pointer targets, method POST, hydration-gated submit and a no-JavaScript contact alternative. Existing server validation and anti-abuse controls remain authoritative.
- `accessibility`: a native dialog trigger button after hydration, ordinary audit link before hydration, stable semantics for the finding action and scoped pricing table headers/caption. Error descriptions live outside labels to avoid repeated accessible names.

Validation: production build/TypeScript, 175 unit tests, focused ESLint and logical CSS checks passed. Chromium preview verified delayed email errors, correction, required-field focus, Escape focus restoration and mobile Arabic layout. Browser fallback branches are implemented but have not been run in Safari/Firefox; no cross-browser or performance-score claim is made. No real lead was submitted.

## Visual audit walkthrough (2026-11-15)

Replaced the earlier finding-selector panel with a three-scene motion graphic built from React, CSS and existing icons: a sample customer portal assembles, 15 review tiles reveal three illustrative risks, and a report pairs those findings with prioritized fixes and a fixed build quote. The offer and primary CTA remain alongside the graphic on desktop; the existing mobile conversion bar remains available on phones.

The 10.4-second introduction starts once when at least 35% of the graphic is visible, then rests on the report. Visitors can pause/continue, replay or select any stage; manual selection exposes the complete scene immediately. Offscreen or hidden-tab playback pauses. Reduced-motion users receive static, selectable scenes, and all visual content is visible by default before motion is enabled. The example is explicitly illustrative, with no claim to scan a visitor's app or automatically fix code. No new dependencies, video downloads, per-frame JavaScript or perpetual animation loops were added.

Validation: production build/TypeScript, 175 unit tests, focused ESLint and logical CSS checks passed. Browser checks verified automatic progression and stopping, replay, CSS pause state, manual stage selection, desktop CTA visibility and Arabic phone layout. Legacy preview CSS was removed. Payment, operational and deployment limitations above remain unchanged.
