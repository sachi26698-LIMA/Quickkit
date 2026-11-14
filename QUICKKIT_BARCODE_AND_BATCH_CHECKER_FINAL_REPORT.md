# QUICKKIT — Barcode Generator, Batch Code Checker & Barcode Scanner: final report

**Date:** 13 November 2026 (UTC)
**Branch:** `arena/6102e674-quickkit` (base `2ea1825`)
**Scope:** three separate tools — an existing barcode generator (verified, not rebuilt), a new
batch-code checker, and a new stand-alone barcode scanner.
**Status:** implemented locally. Not pushed, not merged, not deployed, not indexed, not
owner-approved.

---

## 1. Executive summary and verdict

### Verdict: **PASS** — for everything that can be built and verified in this repository.

Three **NEEDS ATTENTION** items remain, and every one of them is an external dependency rather
than missing work:

| #   | Item                                              | Why it is not a failure of this work                                                                                                                                     |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Supabase tables/RLS + Master Admin review surface | Neither exists in this repository: no Supabase client, no migrations, no database dependency, no `/app/admin`, no `middleware.ts`. Nothing to review, nothing to extend. |
| 2   | Browser E2E (Playwright) and real-device checks   | The Playwright browser download host is unreachable from this sandbox. No E2E was run and none is claimed.                                                               |
| 3   | A live GTIN product lookup                        | This sandbox has no outbound route to Open Food Facts. The route is implemented, unit-tested with mocked transports, and fails honestly here.                            |

What **was** built and verified:

- `lib/tools/batch-code` — 59 brand records, three decoders, calendar maths, PAO and shelf-life
  kept separate from decoding, an orchestrator that returns exactly three verdict states.
- `/tools/batch-code-checker` — the checker plus an A–Z brand directory and **59 statically
  generated brand record pages**.
- `/tools/barcode-scanner` — on-device camera/image scanning, local history, optional GTIN lookup
  through a same-origin proxy.
- `/tools/barcode-generator` — already present from Phase 15 (11 symbologies, check-digit
  validation, PNG/SVG/PDF/ZIP, bulk CSV, independent decode check). Verified again, not rebuilt.
- SEO, accessibility, security headers, catalogue/sitemap integration, and **75 new tests**.

Evidence: `tsc` 0 errors, ESLint clean, `npm run format:check` clean, **Vitest 113 files /
1,937 tests passed**, production build clean with **138 static pages**, all new routes HTTP 200 on
a production server.

---

## 2. Requirement → delivery map

| Requirement (PART)                                     | Delivered                                                                                                                                                                                                                           | Where                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1. Barcode generator, real encoding engine             | Already shipped in Phase 15 and re-verified: 11 symbologies, checksums, colours, PNG/SVG/PDF, bulk CSV/ZIP, independent decode check. **Not rebuilt**, to avoid two divergent encoders.                                             | `app/tools/barcode-generator`, `lib/tools/barcode`, `components/tools/barcode-studio` |
| 2. Batch code checker, three states only               | VERIFIED / ESTIMATED / NOT DECODABLE, enforced by one typed result.                                                                                                                                                                 | `lib/tools/batch-code/check.ts`, `components/tools/batch-code-checker`                |
| 3. Scalable brand/decoder data engine                  | BrandRecord: name, aliases, categories, decoder id + version, status, pattern, date logic, source reference, limitation, shelf-life + source, last verified.                                                                        | `lib/tools/batch-code/types.ts`, `brands.ts`                                          |
| 4. Brand pages documenting decoders/coverage           | 59 static record pages with decoder table, limitation, shelf-life source, official site, FAQ, coverage counts.                                                                                                                      | `app/tools/batch-code-checker/brand/[slug]/page.tsx`                                  |
| 5. Only evidence-backed decoders; no invented coverage | Three decoders, one of them `none`. **0 brand-specific decoders claimed**, because no manufacturer document was verifiable.                                                                                                         | `decoders.ts`, `brands.ts`                                                            |
| 6. Separate barcode scanner                            | Live camera (rear default, switching, described failures), image upload, multi-symbol, copy, local history, GTIN lookup with the product-database/manufacturer distinction, explicit "no batch/date/expiry/authenticity" statement. | `app/tools/barcode-scanner`, `components/tools/barcode-scanner`                       |
| 7. Supabase / RLS                                      | **Not built — blocked, documented.** No schema, no client, no backup strategy to review in this repository.                                                                                                                         | §15                                                                                   |
| 8. SEO                                                 | Unique title/description/canonical per route, breadcrumbs + FAQ JSON-LD, brand FAQ schema, sitemap entries, internal links, `?brand=` view noindexed.                                                                               | `app/sitemap.ts`, `lib/seo.ts`, pages                                                 |
| 9. Tests                                               | 75 new tests; whole suite 1,937 passing; QR/barcode Studio suites unchanged and green.                                                                                                                                              | `tests/batch-code-*.ts*`, `tests/barcode-scanner.test.tsx`                            |
| 10. Master Admin integration                           | **Not built — blocked.** No Master Admin exists in this repository.                                                                                                                                                                 | §15                                                                                   |

---

## 3. Repository facts that shaped the design

Verified before writing code, because each one forbids a shortcut:

| Fact                                                                           | Consequence                                                                                     |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| No `app/admin`, no Master Admin code                                           | PART 10 cannot be "integrated": there is nothing to integrate with. Documented, not faked.      |
| No `supabase/` directory, no `@supabase/*`, prisma, drizzle or `pg` dependency | PART 7 tables/RLS cannot be authored against a verified schema, and no migration was applied.   |
| No `middleware.ts`                                                             | No place to add admin gating; none was invented.                                                |
| Only one API route (`/api/word-to-pdf`)                                        | The GTIN lookup needed a new route, which is the minimum surface for a third-party read.        |
| Existing barcode Studio already satisfies most of PART 1                       | Reused rather than duplicated; a second encoder would be worse than one verified encoder.       |
| `TOOL_SEO_CONTENT` is asserted to hold exactly 31 slugs                        | New pages carry scoped reference components instead of polluting that registry.                 |
| Global counts asserted in five suites                                          | Tools 43→45, sitemap 66→127, brand-pattern/registry counts updated together, not one at a time. |

---

## 4. Batch-code data engine

`lib/tools/batch-code/`

| File            | Responsibility                                                                                                                                                                                                 |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types.ts`      | The data model: `BrandRecord`, `DecoderVerdict`, `DateFact`/`DateSource`, `CheckInput`/`CheckResult`/`CheckOutcome`, `PaoMonths`.                                                                              |
| `brands.ts`     | 59 records built from a typed seed list. Every record defaults to `decoderId: "none"`, `decoderStatus: "none"`, `source.kind: "none"`, `lastVerified: null`. Coverage is **computed**, never asserted in copy. |
| `decoders.ts`   | Calendar helpers (leap years, month-end clamping, day-00, two-digit years), the explicit-date scanner, the GS1 reader, the decoder registry with version + evidence, and `decodeCode()`.                       |
| `shelf-life.ts` | Eight categories of unopened guidance with a stated source, the PAO ladder (3/6/9/12/18/24/36M) and the EU Regulation citation.                                                                                |
| `search.ts`     | Accent/apostrophe-insensitive normalisation, ranked prefix/alias search, category filters, A–Z grouping.                                                                                                       |
| `check.ts`      | Validation, decode, four separate date calculations, precedence, warnings, notes, deterministic `today`.                                                                                                       |

**Date arithmetic that is actually tested:** `2026-01-31 + 1 month = 2026-02-28`,
`2024-01-31 + 1 month = 2024-02-29`, negative months, `isIsoDate` rejecting `2026-02-30` and month
13, `monthsBetween`/`daysBetween` in UTC, and the displayed relative phrase.

---

## 5. Decoders and their evidence

| Decoder              | Version | Status    | What it actually does                                                                                                                                                                                              | Evidence                                                             |
| -------------------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `gs1-element-string` | 1.0.0   | standards | Reads AI 11 (production date), AI 17 (expiration date) and AI 10 (batch) from a GS1 element string; a day of `00` means the last day of that month. Only a real GS1 string qualifies; a bare GTIN carries no date. | GS1 General Specifications (AI table), linked in the UI.             |
| `explicit-date`      | 1.0.0   | pattern   | Finds a date the manufacturer typed into the code: `06/2027`, `2027-06-12`, `20270612`, `260612`, `12/06/2027`. Lists **every** reading when the digits are ambiguous; rejects impossible calendar dates.          | ISO 8601 notation, explicitly labelled "not a manufacturer decoder". |
| `none`               | 0       | none      | Claims nothing, explains the limitation, links the brand's official site when one is verified, asks for the printed date.                                                                                          | "No public manufacturer batch-code documentation identified".        |

Design consequences:

- `readGs1Facts()` returns `null` when a string carries none of AI 01/10/11/17, so an unrelated
  `(99)` string is not misreported as a GS1 match.
- The ambiguous case is a **feature of the result**, not a silent pick: two readings are shown side
  by side and the manufacture date is withheld (`null`) until the user can tell which is real.
- Nothing anywhere converts an opaque serial such as `28H300` into a date.

---

## 6. Brand records and coverage — the honest numbers

Computed from `BRANDS` at build time and asserted in tests:

| Metric                                              | Value                                                                               |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Brand records                                       | **59**                                                                              |
| Brand-specific decoders verified against a document | **0**                                                                               |
| Pattern-only brand decoders                         | **0**                                                                               |
| Documented as undecodable                           | **59**                                                                              |
| Records with a verified official brand site         | **57**                                                                              |
| Categories represented                              | 8 (skincare, haircare, makeup, fragrance, bodycare, personal care, sun care, other) |
| `lastVerified` set                                  | **none** — `null` everywhere, until a human actually reviews a record               |

Brands include L'Oréal Paris, Garnier, Maybelline, Lancôme, CeraVe, La Roche-Posay, Vichy,
Kiehl's, NYX, YSL Beauty, Armani Beauty, Mugler, Nivea, Eucerin, Neutrogena, Aveeno, Estée Lauder,
Clinique, MAC, The Ordinary, Origins, Bobbi Brown, La Mer, Shiseido, NARS, Clé de Peau, Dove,
Vaseline, Lakmé, Pond's, TRESemmé, Olay, Pantene, Head & Shoulders, Himalaya, Biotique, Mamaearth,
Aqualogica, The Derma Co, Minimalist, Plum, Nykaa, Forest Essentials, WOW Skin Science, Dot & Key,
Dr. Sheth's, Cetaphil, Bioderma, Avène, Chanel, Dior, Guerlain, Versace, Hugo Boss, Calvin Klein,
Paco Rabanne, Carolina Herrera, Jean Paul Gaultier, Bvlgari.

**Why zero decoders?** A decoder needs a public description of the lot format (a manufacturer
document or equivalent). None could be verified from this environment, and guessing one — or
scraping a competitor's private database — was explicitly out of bounds. The records therefore say
"no decoder", each with its own limitation text, rather than pretending to a format they cannot
prove.

---

## 7. The three result states, and the four date boxes

`checkBatchCode()` returns one of exactly three states, plus separate date facts:

| State             | Trigger                                                                                               |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| **VERIFIED**      | A GS1 element string supplied AI 11/17, or the manufacture date you typed in was printed on the pack. |
| **ESTIMATED**     | An explicit date-shaped token in the code, or manufacture + published category shelf-life guidance.   |
| **NOT DECODABLE** | No standards field, no readable date token. The code is treated as a serial and explained as one.     |

The result panel never blends them:

1. **Decoded from the code** — with decoder id, version, matched substring and evidence.
2. **Printed expiry** — the user's own reading of the pack; outranks everything below.
3. **Manufacture + shelf life (estimate)** — method text states `manufacture date + N months of
category guidance`, confidence chip reads "Estimate", evidence names the guidance source.
4. **Opened + PAO** — a third window, computed only from the opened date and the jar number, citing
   EU Regulation 1223/2009 Annex VIII.

Then: a "What governs" line (printed → estimate → PAO), warnings (past dates, future manufacture,
ambiguous readings, GTIN-in-the-lot-field, undecodable notice), notes, official support, and a
disclaimer stating that the printed date takes precedence and that none of this is a safety
guarantee.

Validation is strict and never auto-corrects: unknown brand, empty/too short/too long code,
characters a lot number does not use, impossible calendar dates, inverted manufacture/expiry,
future opened/purchase dates, out-of-range PAO. Every problem is listed with the field that caused
it and an `aria-invalid` marker.

---

## 8. Brand surface

- **Autocomplete:** `role="combobox"` with `aria-expanded`, `aria-controls`, `aria-activedescendant`,
  arrow keys, Enter, Escape, and an explicit "no record matches" message instead of a fabricated
  suggestion.
- **Search quality:** `loreal`, `l'oreal`, `L'Oréal`, `YSL`, `deciem`, `la roche`, `plum goodness`
  all resolve; empty query lists the catalogue.
- **Category filters:** eight chips with real counts, usable in both the picker and the directory.
- **Directory:** A–Z with letter jump links, parent group and "no decoder" on every row, live filter.
- **Record pages (59, static):** breadcrumbs + JSON-LD (BreadcrumbList and FAQPage), decoder table
  (id, version, status, pattern, date logic, source, last verified, limitation), shelf-life guidance
  with source, official support, PAO explanation, computed coverage, sibling brands, and a CTA that
  preselects the brand via `/tools/batch-code-checker?brand=<slug>`.

---

## 9. Stand-alone barcode scanner

`/tools/barcode-scanner` — separate route, separate component, no sharing of the Studio's UI state.

| Area     | Delivered                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Camera   | Requested only on click; rear lens preferred; device list and switching appear after permission (browsers hide labels before); torch where the track reports it; permission-denied, no-camera, in-use, insecure-context and unsupported each get their own message. |
| Images   | Multiple files, 25 MB / 40 MP limits, PNG/JPEG/WebP/GIF/BMP, several symbols per photo via the existing tile sweep, rejected files counted and reported.                                                                                                            |
| Formats  | EAN-13, EAN-8, UPC-A, UPC-E, Code 128, GS1-128 (Code 128 + FNC1 separator), Code 39, ITF-14, Codabar. MSI/Pharmacode are generation-only and the copy says so.                                                                                                      |
| Decoding | Existing worker client (`scanRaster`) with the established main-thread fallback; nothing leaves the tab.                                                                                                                                                            |
| Results  | Symbology-labelled cards, monospace value, copy button, GTIN badge, duplicate suppression counter, clear.                                                                                                                                                           |
| History  | Browser-local (`qk:barcode-scanner-history:v1`), capped at 100, de-duplicated with a visit counter, opt-out checkbox, per-record remove, clear-all, corrupt entries dropped on load.                                                                                |
| Honesty  | The first panel on the page: a barcode carries a GTIN, **not** the batch, manufacture date, expiry date or proof of authenticity — with a link to the batch-code checker.                                                                                           |

---

## 10. GTIN product lookup — what it is, and what it is not

- Triggered only by a button, only for 8/12/13/14-digit values with a **valid check digit**.
- The browser calls **`/api/product-lookup?gtin=…`** (same origin). That route validates the GTIN
  before any network call, fetches Open Food Facts v2 with a 6-second timeout and a descriptive
  User-Agent, and normalises the response.
- Results are one of `found`, `not-found`, `invalid`, `error`. A record with no name and no brand is
  reported as **not found**, not rendered as an empty product.
- The UI labels the source as a **community database** ("Volunteer-maintained, not the
  manufacturer"), shows the licence (ODbL 1.0) and the record's last-edit date, and repeats the
  disclosure that a match says nothing about batch, date, expiry or authenticity.
- Remote product images are deliberately **not** rendered: they would require widening `img-src` and
  would leak a third-party request per scan. The record links to its source page instead.
- With no outbound route here, the route returns `502` with the honest message "could not reach Open
  Food Facts … the scanned barcode itself is unaffected". No caching of failures.

---

## 11. SEO

| Item                | Implementation                                                                                                                                                              |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titles/descriptions | Unique per route; `/tools/batch-code-checker` 139-character description, `/tools/barcode-scanner` 133-character — both inside the repo's 120–160 budget, asserted in tests. |
| Canonicals          | `pageMetadata(path)` on every route; the `?brand=` preselection is `noindex, follow` and canonicals to the clean tool URL.                                                  |
| Structured data     | Tool shell emits WebApplication + HowTo + FAQPage; brand pages emit BreadcrumbList + FAQPage; visible breadcrumbs match the JSON-LD.                                        |
| Sitemap             | 127 URLs: 4 static + 12 legal + 7 categories + 45 tools + **59 brand records**; `routeSourceFiles()` maps brand routes so `<lastmod>` stays Git-derived.                    |
| Internal links      | Each of the three barcode pages links the other two; brand pages cross-link siblings and the checker.                                                                       |
| Distinctness        | Tested: three different titles, three different descriptions, no shared phrasing that would make the pages compete for one query.                                           |
| No false claims     | No "universal expiry detection", no "authenticity guaranteed", no indexing claim (Search Console evidence does not exist here).                                             |

---

## 12. Accessibility, mobile, performance

- Combobox/listbox semantics with full keyboard operation; `aria-invalid` + `aria-describedby` on
  failing fields; `role="alert"` for validation; `role="status"`/`aria-live` for the verdict and
  result counts; labelled controls throughout; `sr-only` labels where visual context supplies the
  meaning; `type="button"` on every control so no form submits implicitly.
- Cards and controls are CSS-module scoped, stack below 640 px, and use existing theme tokens
  (`--t-rgb`, `--gradient-primary`) so both tools inherit the tool page's tone.
- No new dependency, no new font, no client-side library for date maths — the engine is plain
  TypeScript, so the pages add no measurable bundle weight beyond their own components.
- Brand pages are fully static (SSG); the checker's interactive subtree is client-rendered behind a
  `Suspense` boundary, so the static HTML still carries the shell, steps, FAQ and brand directory.

---

## 13. Security, privacy, data flows

| Concern                  | Position                                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Batch codes / dates      | Never sent anywhere. The check is a pure function in the browser; no API route exists for it and no account is involved.                                                       |
| Camera frames / images   | Decoded in a worker in the tab, buffers transferred then discarded; no upload path exists.                                                                                     |
| Scan history             | `localStorage` only, opt-out, capped, user-deletable; never synced.                                                                                                            |
| The one outbound request | `/api/product-lookup`, carrying a GTIN only, and only after a click. Same-origin, so `connect-src 'self'` is unchanged.                                                        |
| Injection                | No `dangerouslySetInnerHTML` with user input; codes and names are rendered as text; control characters and `<>` stripped from names; codes restricted to a safe character set. |
| Headers                  | Camera `Permissions-Policy` widened for `/tools/barcode-scanner` only; `frame-ancestors 'none'` unless `ALLOW_SANDBOX_PREVIEW=1`; `camera=()` site-wide otherwise.             |
| Secrets                  | None added. No service-role key, no third-party token, no env var change.                                                                                                      |
| Ads                      | New pages inherit the shared shell's existing slots; no new placement, no ad next to the submit button.                                                                        |

---

## 14. Test and verification evidence

Executed in this repository on Node 22.22.3 / Next 16.4.3:

| Gate                       | Command                                 | Result                                                                                                                                                                                                                           |
| -------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                 | `npx tsc --noEmit`                      | **0 errors**                                                                                                                                                                                                                     |
| ESLint                     | `npx eslint .`                          | **clean**                                                                                                                                                                                                                        |
| Prettier (project gate)    | `npm run format:check`                  | **All matched files use Prettier code style**                                                                                                                                                                                    |
| Unit/integration           | `npx vitest run`                        | **113 files / 1,937 tests passed**                                                                                                                                                                                               |
| Production build           | `ALLOW_SANDBOX_PREVIEW=1 npm run build` | **138 static pages**, compiled successfully                                                                                                                                                                                      |
| Routes on the built server | `curl` against `:3010`                  | `/tools/batch-code-checker`, `/tools/batch-code-checker/brand/nivea`, `/brand/la-roche-posay`, `/tools/barcode-scanner`, `/tools/barcode-generator`, `/tools/qr-code-scanner`, `/category/qr-barcode`, `/sitemap`, `/` → **200** |
| Lookup route               | `curl '…/api/product-lookup?gtin=123'`  | **400** (rejected before any network call); valid GTIN here → **502** with an honest "unreachable" body                                                                                                                          |
| Camera policy              | `curl -I /tools/barcode-scanner`        | `Permissions-Policy: camera=(self), microphone=(), geolocation=()`                                                                                                                                                               |
| Preview framing            | `curl -I /tools/batch-code-checker`     | `frame-ancestors 'self' https://*.e2b.app` with the opt-in flag, `'none'` without it                                                                                                                                             |

**75 new tests:**

| File                                   | Tests | Covers                                                                                                                                                                                                                  |
| -------------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/batch-code-engine.test.ts`      | 37    | leap years, clamping, impossible dates, every explicit-date form, ambiguity, GS1 AI 11/17/10 + day-00, verdicts, brand completeness, search, validation, all four date calculations, precedence, GTIN note, determinism |
| `tests/batch-code-checker-ui.test.tsx` | 16    | form refusal paths, NOT DECODABLE, printed-vs-estimate separation, PAO, ambiguity listing, GTIN warning, `?brand=` preselection, directory filters, brand page + metadata + 404                                         |
| `tests/batch-code-pages.test.tsx`      | 5     | both routes through the real shell, FAQ JSON-LD, three distinct titles/descriptions/canonicals                                                                                                                          |
| `tests/barcode-scanner.test.tsx`       | 17    | history merge/cap/corruption/opt-out, GTIN validation, payload parsing, transport failures, route status codes and caching, page honesty copy, camera fallback, tab switching                                           |

No existing assertion was weakened, deleted or skipped. The QR Code Scanner and Barcode Studio
suites pass unchanged (the Studio's 122 barcode tests included).

**Not run:** Playwright/E2E, axe, Lighthouse/Core Web Vitals, real-device camera, real clipboard.
None is claimed.

---

## 15. Blockers, limitations and next steps

### 15.1 PART 7 and PART 10 — not built, and why

This repository contains **no database and no admin surface whatsoever**: no `supabase/`
directory, no `@supabase/*`/prisma/drizzle/pg dependency, no migrations, no `/app/admin`, no
`middleware.ts`, and a single API route (`/api/word-to-pdf`). Consequently:

- **No Supabase client was added.** Adding one would mean inventing a schema, an RLS policy set, a
  service-role configuration and a recovery story without reviewing the existing data model — the
  exact thing the instructions forbid.
- **No migration was applied.** There is no migration history to append to, and no backup or
  recovery strategy to check first.
- **No admin route, signup or review queue was created.** With no Master Admin to extend, a new
  public admin surface would be a security regression, not an integration.
- **Unverified decoder submissions are not stored at all**, so the "never becomes active
  automatically" rule is satisfied trivially: there is no ingestion path.

To unblock, the owner needs to supply: the Supabase project (URL + anon key with RLS, never a
service-role key in the client), the existing schema/migration directory and backup policy, and the
Master Admin route and auth model to extend. Then the table set would be
`brands`, `brand_aliases`, `decoders`, `decoder_versions`, `decoder_review_queue`,
`official_sources`, `brand_shelf_life` — with public `SELECT` on active rows only and writes behind
an authenticated admin role. That design is recorded here; it was **not** executed.

### 15.2 Other limitations, stated plainly

1. **Zero brand-specific decoders.** No manufacturer document could be verified from this sandbox.
   The value of the tool today is the standards path, the explicit-date path, the printed-date
   arithmetic and the honesty of the rest.
2. **No live GTIN lookup.** The route and its parsing are tested against mocked transports; the real
   service was unreachable here. Open Food Facts is also food-oriented, so cosmetics coverage will
   be thin even in production — the UI says so.
3. **No browser E2E.** Camera, clipboard and download behaviour are covered by unit tests and by
   honest fallbacks, not by a real browser.
4. **Bundler warning.** Turbopack reports "Module not found" for the worker URL in
   `lib/tools/barcode/scan-client.ts` (pre-existing, also used by the Studio). The client already
   falls back to main-thread decoding when the worker cannot be constructed, so scanning works; the
   warning is recorded rather than silenced.
5. **Shelf lives are category guidance**, not brand statements. The printed date always wins, and
   the UI repeats that on every result.
6. **Cosmetic-regulation scope.** PAO is defined by EU law; other jurisdictions may use different
   conventions. The tool cites the regulation instead of implying global applicability.

### 15.3 Recommended next steps

1. Review and verify brand records one at a time against manufacturer documentation, filling
   `lastVerified` and flipping `decoderStatus` only when a source is actually cited (each flip
   should come with a decoder test vector).
2. Configure `SITE_URL` + `LAUNCH_APPROVED` in production and confirm the sitemap's 127 URLs and the
   `?brand=` noindex in Search Console before making any indexing claim.
3. Run Playwright in a real browser environment (camera permission flows, upload, clipboard) and an
   axe/Lighthouse pass — the specs exist for the neighbouring tools and the new pages should join
   them.
4. If product lookup proves useful, add a small cache and a cosmetics-specific dataset review; keep
   the community-database labelling regardless.
5. Only after 15.1's prerequisites exist, build the Supabase review queue and admin surface, with a
   migration reviewed against a verified backup.

---

## Files added or changed in this phase

**Added**

- `lib/tools/batch-code/{types,brands,decoders,shelf-life,search,check}.ts`
- `lib/tools/barcode-scanner/{history,product-lookup}.ts`
- `app/tools/batch-code-checker/page.tsx`
- `app/tools/batch-code-checker/brand/[slug]/page.tsx`
- `app/tools/barcode-scanner/page.tsx`
- `app/api/product-lookup/route.ts`
- `components/tools/batch-code-checker/{index,brand-picker,brand-directory,reference}.tsx` + `checker.module.css`
- `components/tools/barcode-scanner/{index,reference}.tsx` + `scanner.module.css`
- `tests/{batch-code-engine,batch-code-checker-ui,batch-code-pages,barcode-scanner}.test.ts(x)`
- `QUICKKIT_BARCODE_AND_BATCH_CHECKER_FINAL_REPORT.md` (this file)

**Changed**

- `lib/catalog.ts` (2 tools, 2 affinity lists, QR & Barcode now 5)
- `components/icon-3d.tsx` (two bespoke glyphs: `barcodeScan`, `batchCheck`)
- `app/sitemap.ts` (brand routes + `routeSourceFiles` mapping)
- `next.config.ts` (camera policy for `/tools/barcode-scanner`; `?brand=` noindex)
- `tests/{catalog,launch,ad-placements,seo-structured-data,split-regression,next-headers}` (counts and camera list)
- `MASTER_PROJECT_PROGRESS.md`, `TOOL_DEVELOPMENT_STATUS.md` (Phase 16)
- Two pre-existing Prettier divergences (`components/tools/barcode-studio/use-barcode-studio.ts`,
  `components/tools/convert-shared/report.ts`) formatted so the project's `format:check` gate is
  green again.

**Commit:** `89c83cc` — "Add a batch code checker and a stand-alone barcode scanner" (plus a
follow-up commit for the icon glyphs, catalogue affinities and these documents). No push, PR, merge
or deployment was performed.
