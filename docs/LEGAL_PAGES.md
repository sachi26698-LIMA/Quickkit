# Legal & information pages — implementation record

**Status:** implemented on branch `arena/90233e12-quickkit`, verified locally, **not merged, not deployed, not indexed**. Owner approval is still required.

This document is the audit trail behind the legal/information section: what existed before, what changed, what is verified, what is still missing, and which provisions need a lawyer.

---

## 1. Pre-change audit (what was actually there)

| Area | State before this work |
|---|---|
| Existing legal routes | `/terms`, `/privacy`, `/cookies` only. All three were plain `prose` articles with no breadcrumbs, no table of contents, no related-page links, no back-to-top and no per-page navigation. |
| Missing required routes | `/disclaimer`, `/faq`, `/copyright`, `/accessibility`, `/security`, `/file-handling`, `/intellectual-property` did not exist (404). |
| `/about` | Existed, marketing layout, no policy cross-links beyond the privacy policy. |
| `/contact` | Existed, one general email, no routing by request type. |
| Footer | Five columns: brand, Tools, Company (About/Contact/Help/Help & FAQ), Legal (Privacy/Terms/Cookies), More (Security & Privacy, AI Tools, Sitemap). No trust/security group, no disclaimer, copyright, accessibility or file-handling links. |
| Header | `aria-current` on Home/All Tools/About/Help only; legal pages matched nothing. |
| Sitemap page | Listed 5 groups, only 3 legal pages. |
| XML sitemap | 10 static + 8 category + 28 tool = 46 URLs, with a hard-coded count assertion in two tests. |
| Processing model (verified in code) | Every tool runs in the browser: `workers/pdf-*.worker.ts`, `workers/image-encode.worker.ts`, pdf.js and tesseract.js **self-hosted** (`/pdfjs`, `/ocr`), no API routes (`find app -name route.ts` is empty), CSP `connect-src 'self'`, `frame-src 'none'`, Permissions-Policy camera/mic/geolocation off. |
| Storage actually used | `localStorage`: `quickkit:saved-tools`, `qk:qr-presets:v1`, `qk:qr-history:v1`, `qk:qr-history-mode:v1`, `qk:i2i-retention`, `qk:p2w-retention`. IndexedDB: `quickkit-image-to-image`, `quickkit-pdf-to-word` (opt-in history, converted outputs only, 20 items, 10 MB cap). **No cookies anywhere.** |
| Analytics / ads | None in code. No network calls except the optional contact-form endpoint, which is unset. |
| Contact details | The repository shipped `hello@quickkit.in` as a development placeholder. Phase 2 established it is **not** an owner-approved or monitored inbox, so it has been withdrawn from every surface; `contactEmail` is now `string \| null` and every page renders a marked owner-input placeholder instead. Social links remain demo values. |

## 2. What was implemented

- **12 independently routable pages**: `/terms`, `/privacy`, `/cookies`, `/disclaimer`, `/about`, `/contact`, `/faq`, `/copyright`, `/accessibility`, `/security`, `/file-handling`, `/intellectual-property`.
- **`lib/legal.ts`** — single registry: route, nav label, `<h1>`, intro, meta description, footer group, section anchors, indexability. Footer, sitemap page, XML sitemap and the shared shell all read from it, so a route cannot drift from its links.
- **`components/legal-page-shell.tsx`** — server-rendered shell with breadcrumbs, title + intro, last-updated `<time>`, table of contents, owner-input notice, related pages, back-to-top, feedback block and a legal-review note. Content stays per page; the shell is a design system, not a text template.
- **`lib/site.ts`** — `ownerDetails` block. Every empty field renders as a visibly marked *Owner to supply* placeholder; nothing is guessed. `contactChannels` resolve dedicated inboxes with a fallback to the general address, so no page can render an empty or invented contact.
- **Footer** — rebuilt into four generated groups (Tools, Company, Legal, Trust & Security), 21 links, no duplicates, no `#`.
- **Header** — legal routes mark "About" as current; `/faq` marks "Help".
- **Sitemap page** — generated from the registry + catalog; categories with no published tools are excluded.
- **XML sitemap** — now derived; includes the legal pages, still gated on `indexingEnabled` (empty until the owner approves launch).
- **CSS** — a scoped legal design system in `app/globals.css` (white/soft-lavender surfaces, purple accents, 68ch measure, dual ToC — a sticky desktop panel and a collapsible mobile disclosure — sticky table headers, responsive tables at 1080/760/430px, AA-contrast text, reduced-motion and `prefers-contrast` respected).
- **`scripts/check-site-links.mjs`** — dependency-free crawler that verifies status, `<h1>` count, titles, descriptions, canonical presence, `#` hrefs, in-page anchors and every internal link against a running build.
- **`scripts/audit-legal-pages.mjs`** — Phase 2 audit runner. For all 12 routes it checks status, title, meta description length, robots, OG/Twitter, canonical, heading structure, breadcrumbs, ToC anchors (accepting any element id, since ids sit on `<section>` and `<h2>` alike), related-page links, footer groups, owner placeholders, `<time datetime>`, and scans the rendered text for compliance claims and unverified addresses. It understands negated claims ("no claim of compliance with … HIPAA"), so an honest disclaimer is not reported as a violation.

## 3. Page-by-page coverage of the brief

| Page | Brief items covered |
|---|---|
| `/terms` | acceptance, what the service provides, no accounts, acceptable use, responsibilities, prohibited activities, your content, IP, third-party links, availability, feature limits, liability (+review flag), changes, governing law (+review flag), contact |
| `/privacy` | what is collected, no accounts, local processing, whether files leave the device (+CSP evidence), storage, analytics, third-party integrations, hosting requests, retention/deletion, security, children, rights (+review flag), updates/contact |
| `/cookies` | short version, cookies vs local storage, essential, functional (full key table), analytics, advertising, inventory, consent (+review flag), third-party, managing storage, changes, contact |
| `/disclaimer` | general, no professional advice, calculations, financial, images, PDF, OCR, translation (not implemented), QR, third-party, availability, **estimate vs guarantee table**, contact |
| `/about` | mission, categories with live counts, how privacy is designed in, supported devices, philosophy, roadmap, who runs it (placeholder), next steps |
| `/contact` | five request types with routing and the policy each one links to, form, response times, security/privacy/copyright/business sections, before-you-write |
| `/faq` | 25 questions in six groups; links into the policy pages |
| `/copyright` | own material, third-party licence table, your outputs, reporting, DMCA process (+review flag), counter-notification, repeat infringers, misrepresentation, designated contact |
| `/accessibility` | commitment, keyboard, screen readers, contrast, focus, forms, responsive, motion, how it is tested, **known limitations**, feedback, standards (no conformance claim) |
| `/security` | model, secure development, data handling, browser-side controls, headers, dependencies, reporting, disclosure, out of scope, contact, **no certifications** |
| `/file-handling` | principles, file selection, memory, storage, and per-tool sections for Merger, Splitter, Compressor, PDF to Word (+ self-hosted OCR), Translator (not implemented), Image to Image, Images to PDF, PDF to Image, PDF Studio, QR Generator, calculators; external dependencies, downloads, retention table, limitations |
| `/intellectual-property` | summary, brand, open-source table, fonts/icons, permitted use, uses needing permission, your content, requesting permission, contact |

## 4. Verified hyperlinks

Automated crawl of the production build (`node scripts/check-site-links.mjs http://127.0.0.1:3001`):

```
Crawled 53 routes (53 returned 200)
External links not fetched: 6      (the demo social profiles)
Placeholder/dead-link problems: 0
```

The crawler checks every `<a href>` it can reach, every in-page `#anchor`, and rejects `href="#"`. 53 = 1 home + tools + saved + help + sitemap page + 12 policy/information pages + 8 categories + 28 tools.

With `SITE_URL` + `LAUNCH_APPROVED` set on a scratch build, canonical and Open Graph URLs were verified on 14 hand-checked routes (the 13 legal/info/sitemap routes plus `/`), `robots` flipped to `index, follow`, `/robots.txt` emitted `Allow: /`, and all 52 sitemap URLs returned 200.

## 5. Test results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npx eslint .` | pass (0 errors, 0 warnings) |
| `prettier --check` | pass |
| `npm test` (vitest) | **942 passed / 50 files**, including the new `tests/legal-pages.test.tsx` (15 tests) |
| `npm run build` | pass, all 12 new routes prerendered static |
| `scripts/check-site-links.mjs` | 53/53 routes 200, 0 dead links, 0 placeholder hrefs |
| Playwright (`npm run test:e2e`) | **not executed in this environment** — the browser binaries cannot be downloaded here (all Playwright CDNs blocked, no system Chrome). The suites were extended (below) and must be run in CI or locally before merge. |

New/changed tests:

- `tests/legal-pages.test.tsx` (new): registry completeness and uniqueness, meta-description length, anchor uniqueness, footer group/registry agreement, no duplicate or `#` footer links, no invented owner identity, channel resolution, a certification-claim guard across all 12 rendered pages, shell structure (breadcrumbs, one `h1`, `<time>`, ToC targets exist, related links exclude self), owner notice, FAQ group anchors.
- `tests/launch.test.ts` — sitemap length assertion now derived from the registry instead of a hard-coded 46.
- `tests/split-regression.test.tsx` — same, so adding a page to the registry updates the expectation.
- `tests/e2e/quality.spec.ts` — the axe and overflow sweeps now cover all 12 legal routes at 9 widths (plus the existing tool and category routes).
- `tests/e2e/legal-pages.spec.ts` (new): per-route metadata and unique titles, breadcrumbs, ToC anchors, related links resolving (no self-link), footer groups with no duplicates and every legal route reachable from the footer, axe on all 12 routes, skip-link focus behaviour, active `aria-current`, and the sitemap page listing every legal route.

## 6. Known legal limitations (unchanged honesty position)

- **No compliance is claimed.** The site does not assert GDPR, UK GDPR, CCPA/CPRA, DPDP Act, DMCA safe-harbour, ISO 27001, SOC 2 or any other certification. The security and accessibility pages say so explicitly.
- **Operator identity, jurisdiction, postal address and registration details are absent.** They are placeholders, not inventions. Governing law, forum, liability and consumer wording are flagged for legal review in place.
- **Hosting-provider log retention is unknown.** The privacy policy says so rather than inventing a number.
- **DMCA section describes a process only.** It does not claim safe harbour or a registered agent.
- **The policies are drafts.** Every policy page carries the "Draft — pending owner details and legal review" note, and the sitemap/FAQ say the same thing.
- **Consultation guide, not legal advice.** The review notes on each page say the document should be reviewed by a qualified lawyer, not that it has been.

## 7. Remaining owner input

Everything below is a placeholder or an open decision, mirrored in `docs/OWNER_INPUTS.md`:

1. `ownerDetails.legalName` — the operating entity (individual / sole proprietor / company).
2. `ownerDetails.jurisdiction` — governing law and forum.
3. `ownerDetails.postalAddress` and `registrationNumber` — only if local law requires publication.
4. `ownerDetails.privacyEmail`, `securityEmail`, `copyrightEmail`, `businessEmail` — or explicit acceptance of one shared inbox.
5. `ownerDetails.dataProtectionContact` — only if a representative/DPO must be appointed.
6. `ownerDetails.minimumAge` — intended minimum age for independent use.
7. A **verified, monitored contact address** — `ownerDetails.publicEmail` is empty. The old development placeholder `hello@quickkit.in` was withdrawn, not renamed: setting `publicEmail` restores the mailto/`ContactLink` surface everywhere with no page edits. The six demo social URLs in `lib/site.ts` are also still open.
8. Hosting provider, region, log retention and subprocessors, to complete `Privacy Policy §9`.
9. Legal review of: liability cap, governing law/forum, consumer carve-outs, DMCA agent status, retention statements, and whether any consent mechanism is required for the existing local-storage keys.
10. Decision on source licensing (currently UNLICENSED) and the distribution notice inventory.
11. Accessibility: independent review, named contact, response commitment, and which accessibility laws apply.
12. Security: independent review, dedicated inbox, disclosure window, and the framing (`frame-ancestors`) policy for the standalone production domain.

## 7a. Phase 2 — final compliance audit and polish

Phase 2 did not rebuild the pages. It audited them against the running production build and fixed what the audit found.

**Contact address (item 3).** `hello@quickkit.in` could not be confirmed as an owner-approved, monitored inbox. It was therefore **withdrawn** rather than renamed: `lib/site.ts` now types `contactEmail` as `string | null`, derived from `ownerDetails.publicEmail`, and exports `contactEmailVerified` and `contactFormEndpoint`. Every surface branches on that type instead of interpolating the value — a `mailto:null` bug is a type-level mistake that `tsc` does not catch, because `${null}` is legal in a template literal. `components/contact-link.tsx` centralises the rendering, and `components/contact-form.tsx` disables itself with an explicit `.contact-closed` notice when no channel is configured, instead of composing an address that does not exist.

**File-handling completeness (item 5).** The tool-by-tool audit found a real gap: Image Compressor, Image Resizer and Image Cropper are live tools but had **no section** on `/file-handling`, despite the page claiming to cover "each file-handling tool". Three sections were added, written against the enforced constants in `lib/tools/image-compress.ts`, `image-resize.ts` and `image-crop.ts`, and verified to have no persistent storage at all (blob URLs and page memory only). Sections 12–20 were renumbered to 12–23 and the `sections` registry updated to match.

**Cookie policy honesty (items 6–7).** Every key in the Cookie Policy table was checked against the source: `FAVORITES_KEY`, `PRESET_STORAGE_KEY`, `HISTORY_STORAGE_KEY`, `HISTORY_MODE_KEY`, `IMAGE_HISTORY_RETENTION_KEY`, `HISTORY_RETENTION_KEY`, and the two IndexedDB database names, including the documented caps (24 presets, 20 history items, 20 outputs, 10 MB each, session/24h/7d retention with `session` as the default). The page describes **no** consent banner, analytics, ads or third-party cookies, and none exist — `document.cookie` appears nowhere in the codebase, fonts are `next/font/local`, and there is no `<iframe>`, external script, or third-party asset.

**Dates (item 8).** Every route now renders `<time datetime="…">` with the valid lowercase attribute and a visible "Last updated" line.

**Accessibility and layout (items 9–11).** The ToC became two elements — a persistent desktop panel and a mobile `<details>` disclosure — so only one is visible per breakpoint and neither duplicates an anchor id. Focus-visible styles, sticky table headers and zebra rows, a 68ch measure, and breakpoints at 1080/760/430px were added. **Browser binaries could not be installed in this environment, so no screenshot or real-viewport verification was performed** — see the verification report for what was and was not checked.

**Known limitations of this audit.** Playwright/Chromium is unavailable here (download blocked, no system browser), so the responsive and keyboard checks are static CSS/HTML inspection plus the existing component tests, not real rendering. That must be re-run on a machine with browsers before release.

## 8. How to update a policy later

1. Edit the page component in `app/<route>/page.tsx`.
2. If you add or rename a section, update the matching `sections` entry in `lib/legal.ts` — the table of contents, the shell and the tests all read from it.
3. If the processing model changes, update **`/file-handling` and `/privacy` in the same commit**; the crawler and the `legal-pages.test.tsx` certification guard will catch structural drift, not semantic drift.
4. Bump `LEGAL_LAST_UPDATED` / `LEGAL_LAST_UPDATED_ISO` in `lib/legal.ts`. Render dates with `{...isoDatetime(value)}` — Next emits a JSX `dateTime` prop verbatim as the invalid attribute `dateTime="…"`, whereas the spread produces `datetime`.
5. Run `npm run lint && npm test && npm run build`, then `node scripts/check-site-links.mjs <url>` and `node scripts/audit-legal-pages.mjs`.
