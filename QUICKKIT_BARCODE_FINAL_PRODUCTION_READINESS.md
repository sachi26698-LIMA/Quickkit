# QUICKKIT — Barcode Studio final master completion & production readiness

**Date:** 2026-11-13
**Branch:** `arena/6102e674-quickkit` (branched from `main` at `2ea1825`)
**Checkpoint this report continues from:** `819ceb6` (phase 17), with the phase
18 test and documentation changes uncommitted at the time of writing
**Scope:** Barcode Generator, Batch Code Checker, Barcode Scanner
**Status:** code complete; verified locally in a **real Chromium browser** as
well as in unit/integration tests; **not** production-verified for live Open
Food Facts connectivity or search indexing — each remaining blocker is named
below with exactly what was attempted and what failed.

This report supersedes the decoder section of
`QUICKKIT_BARCODE_AND_BATCH_CHECKER_FINAL_REPORT.md` (phase 16, three decoders).
Nothing has been pushed, merged, deployed, or indexed. No production
environment variable, database, or setting was changed.

---

## 1. Executive summary

| Question                                                    | Answer                                                                                                                                    | Evidence                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Do the three tools work?                                    | **Yes** — audited, unit/integration tested and exercised in a real browser                                                                | §9, §10, §14, §15                      |
| Can any of the 59 brands' lot codes be decoded?             | **No — 0 of 59**                                                                                                                          | §4, `docs/BARCODE_DECODER_RESEARCH.md` |
| Do standards-defined dates decode?                          | Yes — two GS1 carriers, fully validated                                                                                                   | §5                                     |
| Is the GTIN product lookup real?                            | Implemented against Open Food Facts v3.6; **live connectivity unverified** (no egress here)                                               | §7                                     |
| Is there a Supabase backend or admin panel?                 | **No.** Neither exists in this repository                                                                                                 | §10                                    |
| Are the automated gates green?                              | tsc 0, ESLint 0, Prettier clean, Vitest **1,994 passing in 116 files**, build 138 pages, `npm audit` 0 vulnerabilities                    | §14                                    |
| Was real-browser E2E run?                                   | **Yes — 36 tests in Chromium 153**, covering all three tools, exports, scanner camera lifecycle and five viewports from 320 px to 1440 px | §15                                    |
| Does the generator output decode in an independent decoder? | **Yes** — 9 symbols read back by ZXing (C++/WASI), not by our own reader                                                                  | §5a, §14                               |
| Can this be indexed today?                                  | Only after `SITE_URL` + `LAUNCH_APPROVED` are set by the owner; no Search Console evidence exists                                         | §13                                    |

The honest headline is the one the product itself makes: the batch-code checker
decodes standards-defined carriers and explicit dates, and otherwise says NOT
DECODABLE. That is a feature, not a gap to be papered over.

## 2. Scope, method, and what was deliberately not rebuilt

- **Audited, not rebuilt:** `/tools/barcode-generator`, `/tools/batch-code-checker`,
  `/tools/barcode-scanner`. Layout, branding and tool boundaries are unchanged.
- **Extended:** the decoder engine, the GTIN lookup pipeline, brand-data hygiene,
  SEO metadata for brand pages, and the checker's result UI.
- **Untouched:** the homepage, unrelated tools, catalogue structure, and any
  production configuration.
- **Method:** read the repository state first, then the previous report, then the
  code; verified every claim with a command whose output is quoted here. Prior
  reports were treated as claims, not evidence.

## 3. Baseline and repository state

| Item                | Value                                                                                                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node / npm          | 22.22.3 / 10.9.8                                                                                                                                                                |
| Next / React        | 16.4.3 / 19.3.1                                                                                                                                                                 |
| Start of this phase | HEAD `7b47bc3`, clean working tree                                                                                                                                              |
| Runtime HTTP egress | **blocked** — DNS and TCP succeed, TLS is reset (`self-signed certificate` / `SSL_ERROR_SYSCALL`); of the hosts tested only `registry.npmjs.org` and `github.com` are reachable |
| Agent-side reading  | available (a different egress path), so documentation was read and cited — never treated as proof that the app can reach the same hosts                                         |
| Browser             | no Playwright-downloaded Chrome, no system Chrome; a headless Chromium was obtained from an npm package instead (§15)                                                           |

No uncommitted work existed at the start of phase 17, so nothing from an earlier
session was overwritten. `819ceb6` is preserved and is the parent of this phase's
commit.

## 4. Batch-code research outcome (the decisive finding)

Full log, sources and rejection reasons: **`docs/BARCODE_DECODER_RESEARCH.md`**.

Searched: L'Oréal quality pages, Beiersdorf FAQ, Unilever quality PDFs, the EU
Cosmetics Regulation 1223/2009 (Art. 19(1)(e) and Annex VIII, via GOV.UK
guidance), and the GS1 specifications. Every concrete cosmetic code format found
(letter+digits, week-numbered, seven-digit fragrance codes) traced back only to
batch-checker aggregator sites that:

- disagree with each other about the same brand and even the same example;
- cite no manufacturer document;
- in at least one case describe their algorithms as partly supplied privately by
  "consultants and resellers".

The regulation requires _a_ batch identifier that lets the manufacturer identify
the batch and **does not prescribe a format**, so it cannot be used as authority
for a parsing rule. Result: **brand-specific verified decoders = 0**. The 59
records stay `decoderStatus: "none"` with `lastVerified: null`, and the UI
computes its coverage from those records instead of hard-coding a number.

## 5. Decoder implementation and test vectors

Four decoders ship, each with an id, a version, a status, a limitation, an
evidence reference and a `verifiedOn` date.

| Id                   | Version   | Can produce   | What changed in this phase                                                                                                                                        |
| -------------------- | --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gs1-element-string` | **2.0.0** | VERIFIED      | Now reads AI 13 (packaging), 15 (best before), 16 (sell by), 7003 (expiration date+time, `hh:mm`) and 8008 (production timestamp, `YYYYMMDDhhmm`), not just 11/17 |
| `gs1-digital-link`   | **1.0.0** | VERIFIED      | New: parses GS1 Digital Link URIs in path form, query form, or both, with the same AI validation                                                                  |
| `explicit-date`      | **1.1.0** | ESTIMATED     | Adds ISO 8601 ordinal dates (`2026-317` → 2026-11-13) and keeps every ambiguous reading visible                                                                   |
| `none`               | 0         | NOT DECODABLE | Unchanged default for all 59 brands                                                                                                                               |

Validation rules now enforced in code and tests:

- a six-digit date field must be a real calendar date; `260231` and `260230` are
  rejected, never clamped;
- the GS1 day-`00` rule means the last day of that month (`260200` → 28 Feb;
  leap year → 29 Feb);
- time components must be valid `hh:mm` (`2460` rejected);
- a GTIN must pass its check digit before any fact is reported;
- a Digital Link must start with a primary key (01/8006/00), contain only known
  AIs, and pass the same element-string validation — `https://example.com/sale/17/2026`
  is rejected;
- a GS1 date is marked VERIFIED and a pattern match stays ESTIMATED, with no code
  path that promotes one to the other.

Precedence is explicit: **printed expiry → GS1 expiry (17/7003) → GS1 best-before
(15/16) → shelf-life estimate → PAO**. A mismatch between a printed date and a
GS1 date produces a warning naming both and states that the printed date governs.
When a carrier holds only a production or packaging date, the UI says so instead
of implying an expiry exists.

The checker form now accepts GS1 element strings and Digital Link URIs (200
characters, URL punctuation allowed) and renders a "Date fields carried by the
code" list with the AI, its label, the date and any time.

### 5a. Independent decoder verification (ZXing, not our own reader)

Self-consistency is a weak test: a bug in the encoder and the same bug in the
decoder agree with each other. `tests/barcode-independent-decode.test.ts`
therefore sends the generated PNGs to `zxing-wasm` 3.1.6 — ZXing's C++ reader
compiled to WASI, a completely separate implementation — and compares what it
reports:

| Symbology           | Encoded          | ZXing read back                                          |
| ------------------- | ---------------- | -------------------------------------------------------- |
| EAN-13              | `5901234123457`  | `5901234123457`                                          |
| EAN-8               | `96385074`       | `96385074`                                               |
| UPC-A               | `036000291452`   | `036000291452` (returned as `0036000291452`; normalised) |
| Code 128            | `QUICKKIT-2026`  | `QUICKKIT-2026`                                          |
| Code 39             | `QUICKKIT39`     | `QUICKKIT39`                                             |
| ITF-14              | `10012345678902` | `10012345678902`                                         |
| Codabar             | `A123456789A`    | `A123456789A`                                            |
| EAN-13, 2 px module | `5901234123457`  | `5901234123457`                                          |
| Blank raster        | —                | no result (must not invent one)                          |

**9/9 pass.** `zxing-wasm` is a saved `devDependency` used only by this test; it
is not imported by the app and does not enter the runtime bundle.

## 6. Brand dataset audit (59 records)

| Check                | Result                                                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Records              | 59, every `decoderStatus: "none"`, every `lastVerified: null`                                                                                                                               |
| Aliases              | Normalised (whitespace collapsed), deduplicated case/accent/punctuation-insensitively, never equal to the brand's own name — `Lancôme`/`lancome`-style duplicates are dropped at build time |
| Categories           | Deduplicated, typed against `ProductCategory`, at least one per record                                                                                                                      |
| Official links       | Only `https://` URLs are kept; anything else is stored as `null` rather than shipped                                                                                                        |
| Search               | Names, aliases and parent groups; unsupported brands remain searchable and show `none`; "lancome" resolves to the L'Oréal-owned record with no decoder implied                              |
| Coverage display     | Computed from the records (`brandCoverage()`), not typed                                                                                                                                    |
| Scalability          | A new brand is one seed object; aliases/guidance are normalised centrally; no per-brand UI code                                                                                             |
| Data provenance      | Manufacturer/regulator links only; no scraped or private data                                                                                                                               |
| Second research pass | Cetaphil, Bioderma/NAOS, Lush, Galderma and Indian brands re-checked on 2026-11-13; **still 0 verified decoders** — see `docs/BARCODE_DECODER_RESEARCH.md` §2a                              |

59 static brand pages remain (SSG, `dynamicParams = false`), each with title,
description, canonical, visible breadcrumb and matching JSON-LD breadcrumb.

## 7. GTIN product lookup (Open Food Facts)

**API contract implemented** (checked 2026-11-13 against the OFF documentation):

- endpoint `GET https://world.openfoodfacts.org/api/v3.6/product/{gtin}?product_type=all&fields=…`;
  v3.6 is current and v2 is deprecated, so the previous v2 call was replaced;
- `User-Agent: QUICKKIT-BarcodeScanner/1.1 (https://quickkit.online; <contact>)`
  — OFF requires `AppName/Version (contact)`;
- 404 → "no record in the community database" (explicitly _not_ "invalid GTIN");
- 429 → `rate-limited` with `Retry-After`, nothing shown;
- 5xx → described upstream failure, nothing cached;
- timeout (8 s) and network failures are separate, bounded reasons;
- JSON that is not an object, or is not JSON at all, is rejected;
- the server that answered is detected (Food / Beauty / Products / Pet Food) and
  the record is attributed to it, because a beauty product often 302s to Open
  Beauty Facts.

**Honesty:** every record carries `manufacturerVerified: false`, a
community-database label, the ODbL licence, the CC-BY-SA image licence and the
standing disclosure. No field is invented: absent data stays absent and a record
with no name and no brand is reported as not-found rather than displayed.

**Rate limiting and caching:** a 10-token/minute bucket (below OFF's 15/min limit)
and a TTL cache (found 24 h, not-found 6 h, errors never) live in
`lib/tools/barcode-scanner/lookup-cache.ts`. Both are documented as per-process
guards, not a global quota.

**Images:** proxied through `?image=1` rather than hotlinked, so the browser makes
no third-party request. Only HTTPS URLs on the four OFF databases (or their
`images.`/`static.` subdomains) are accepted; redirects are not followed
(`redirect: "manual"`), so a redirect cannot move the request to an unapproved
host; content type must be JPEG/PNG/WebP; the body is capped at 2 MB;
`X-Content-Type-Options: nosniff` and a restrictive CSP are set.

**Live status:** unverified from the app, and now measured on two distinct
egress paths (2026-11-13):

- **From the application runtime**, against the running server:
  `curl 'http://127.0.0.1:3001/api/product-lookup?gtin=4006381333931'` →
  `HTTP 502` in **0.042 s** with
  `{"status":"error","reason":"network","message":"The lookup could not reach Open Food Facts (fetch failed). The scanned barcode itself is unaffected."}`
  — the honest taxonomy working, not a fabricated product.
- **From the agent's page reader** (a different egress path),
  `https://world.openfoodfacts.org/api/v3.6/product/4006381333931?fields=…`
  answered `{"code":"4006381333931","status":"success","product":{"brands":"Kania","product_name":"Pommes Würzsalz","quantity":"90 g",…}}`.
  That confirms the endpoint and the response shape the parser targets; it does
  **not** show that the app can reach it, and the two are never conflated.

The invalid-GTIN path was measured on the same server: `?gtin=12345` → `HTTP
400` with the check-digit message, before any fetch. All happy-path behaviour
(record mapping, 404, 429 + `Retry-After`, timeout vs network, image proxy) is
proven with mocked transports only, in `tests/product-lookup-v3.test.ts`
(19 tests).

**Owner action required:** OFF asks projects to submit its API-usage form before
substantial use. That is an owner action, not something this session can sign.

## 8. Scanner checklist

| Requirement                                      | State                                                                      | Where                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------- |
| Rear camera by default                           | `facingMode: { ideal: "environment" }`                                     | `components/tools/barcode-scanner/index.tsx`      |
| Camera starts only after user interaction        | start is bound to the button; no auto-start effect                         | same                                              |
| Permission denial / no camera / insecure context | distinct messages, no silent failure                                       | same                                              |
| Device switching                                 | device list appears after permission; switching stops the old stream first | same                                              |
| Torch                                            | capability-gated, graceful refusal message when unsupported                | same                                              |
| Start / stop                                     | explicit stop clears the timer and stops every track                       | same                                              |
| Tracks stopped on unmount / end                  | `useEffect(() => () => stopCamera())` plus stop on teardown                | same                                              |
| Duplicate prevention                             | history merges a repeated value instead of storing it twice                | `lib/tools/barcode-scanner/history.ts`            |
| Image upload                                     | multi-file input, 25 MB / 40 MP per image, local decode                    | scanner page                                      |
| Multi-symbol images                              | decoder tries multiple barcodes per image                                  | `lib/tools/barcode/scan-client.ts`, decode ladder |
| Advertised symbologies only                      | 8 readable formats; MSI and Pharmacode are generation-only and labelled so | `lib/tools/barcode/decode.ts`                     |
| Copy                                             | per-result copy with confirmation                                          | scanner page                                      |
| Local history + clear                            | localStorage, opt-out, clear-all                                           | history module + page                             |
| GTIN lookup                                      | explicit button; only the GTIN leaves the device                           | scanner page + `/api/product-lookup`              |
| No unnecessary uploads                           | camera frames decoded in-browser; the only network call is the lookup      | scanner page header comment                       |

No camera behaviour is claimed as browser-tested: jsdom has no media devices, so
those assertions cover the "unavailable here" branch only (§15).

## 9. Generator audit (audited, not rebuilt)

The generator was left functionally unchanged. Its existing coverage was
re-verified by the suite:

- symbologies and per-symbol format validation/checksums (Codabar, Code 39,
  Code 128, EAN-8/13, UPC-A/E, ITF-14, GS1-128, MSI, Pharmacode);
- independent decode checks: generated PNGs are decoded back by the decoder path
  and compared, so a rendered symbol is proven readable rather than assumed;
- exports: PNG, SVG, PDF, ZIP and CSV bulk, with duplicate detection and
  per-format print dimensions / quiet zones;
- customisation (colour, size, DPI, caption) and a mobile preview;
- no format is advertised that the studio cannot produce, and the two
  generation-only formats are labelled as such on the scanner side.

Any further generator work is scope creep for this phase and was not done.

## 10. Supabase / Master Admin assessment

**Finding: neither exists in this repository.**

- no `@supabase/*` dependency, no `SUPABASE_*` variable in `.env.example`, no
  `lib/supabase`, no migrations directory, no auth provider;
- no `/admin` route, no admin component, no `service_role` reference anywhere;
- the only API routes are `/api/product-lookup` and `/api/word-to-pdf`.

Nothing was fabricated to make an admin panel appear. The tools work fully
without a backend: generation and scanning are local, and the lookup is a
server-side proxy.

**Prerequisites before a master admin could exist** (documented, not executed):

1. Owner approval and a Supabase project (URL + anon key as environment
   variables; `service_role` never in a client bundle).
2. Tables: `brands`, `brand_aliases`, `decoders`, `decoder_versions`,
   `decoder_review_queue`, `official_sources`, `brand_shelf_life`, each with
   `created_at`, `updated_at`, `verified_on`, `source_url`, and row-level
   security policies.
3. Real staff authentication (email+password or SSO, MFA) with an allow-list of
   admin user ids; no public signup.
4. Admin actions written as append-only review events, so a decoder version can
   be audited and rolled back.
5. A migration path that keeps the static records as the fallback when the
   database is unreachable.
6. No production migration without explicit owner approval.

Because no admin authentication exists, **no admin or decoder-management surface
was built**. Building one behind a password in a query string, or with no auth,
would be worse than having none.

## 11. Admin gating decision

Decoder management is gated on three things that are all absent today: staff
auth, the database above, and an approval workflow. The current repository keeps
decoders in code with an explicit review-by-test process, which is auditable in
Git and cannot be edited anonymously. That is the correct state until the owner
approves the backend work in §10.

## 12. UX / UI audit (mobile and desktop)

- **Three separate tools remain separate.** The generator links out; the checker
  is one form and one result; the scanner is camera-or-upload plus results.
- **Autocomplete:** brand picker supports accent/apostrophe-insensitive matching,
  aliases, keyword tokens and category filtering, with a keyboard-operable
  listbox and an explicit "nothing matches" message.
- **Validation:** brand required, code shape and length, impossible calendar
  dates, inverted manufacture/expiry ranges and future dates all produce
  field-level messages, not a silent failure.
- **Evidence in results:** decoder id + version, matched AI string, evidence
  label, checked-on date, a "Date fields carried by the code" list where
  applicable, separate cards for printed / decoded / estimated / PAO, warnings,
  and notes.
- **States:** loading/decoding spinners, rate-limit, timeout, no-record,
  invalid-GTIN and upstream-failure states each have their own wording.
- **No dead buttons:** every control in the audited trees has a handler; the
  lookup and image buttons are disabled while loading.
- **Layout:** CSS modules use fluid grids, `minmax`, wrapping and `overflow-wrap`;
  tables/long lists scroll inside their own container rather than the page.
- **Branding:** QUICKKIT typography, colour tokens and layout are untouched.
- **Real-browser layout check:** `tests/e2e/barcode-tools-responsive.spec.ts`
  runs all three tools in Chromium at **320×640, 390×844, 768×1024, 1280×800 and
  1440×900** and asserts, per tool and per viewport, that the H1 renders, the
  primary control is visible and ≥38 px tall, the control sits inside the
  viewport horizontally, and `document.documentElement.scrollWidth` never
  exceeds the viewport width (no horizontal scrollbar anywhere, including
  320 px). **15/15 passed.**
- **Limit of this audit:** what remains code- and DOM-level is the _visual_
  judgement. Layout is proven as "fits and is operable", not as pixel-identical
  to a design; screenshot-diff regression testing is not claimed.

## 13. SEO verification

Verified by `tests/barcode-tools-seo.test.ts`, which computes everything from the
code rather than from this report:

| Item                 | Result                                                                                                                                                                                       |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Titles               | Unique across the three tools; brand titles include the brand name                                                                                                                           |
| Descriptions         | 120–160 characters for all three tools **and all 59 brand pages** (brand template rewritten this phase; it was 159–167)                                                                      |
| Canonicals           | `https://quickkit.online/tools/...` for each tool and each brand page                                                                                                                        |
| Open Graph           | `og:url` matches the canonical; branded title                                                                                                                                                |
| Sitemap              | 127 URLs, no duplicates, includes the three tools and all 59 brand routes                                                                                                                    |
| Robots               | Three rules (`*`, `Googlebot`, `Mediapartners-Google`) allow `/`, disallow `/api/`, sitemap declared; preview mode closes the site except `/ads.txt`                                         |
| Breadcrumbs          | Visible trail plus matching `BreadcrumbList` JSON-LD on brand pages                                                                                                                          |
| Internal links       | Checker ↔ brand records ↔ scanner ↔ generator; no orphan route                                                                                                                               |
| No misleading claims | Description of the checker names documented/verified/estimated evidence, never "all brands"                                                                                                  |
| Indexing             | **Not claimed.** The preview build emits `X-Robots-Tag: noindex` because `LAUNCH_APPROVED`/`SITE_URL` are not set here; Google indexing requires Search Console evidence that does not exist |

## 14. Automated verification

Every gate below was run in this working tree after the phase-18 changes.

| Gate                            | Command                                                                                          | Result                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types                           | `npx tsc --noEmit`                                                                               | 0 errors                                                                                                                                          |
| Lint                            | `npx eslint . --max-warnings=0`                                                                  | 0 errors, 0 warnings                                                                                                                              |
| Format                          | `npm run format:check`                                                                           | clean (scoped to app/components/lib/tests/workers/scripts/config)                                                                                 |
| Unit/integration                | `npx vitest run`                                                                                 | **116 files, 1,994 tests passed** (the phase-17 1,985 plus 9 independent-decode tests)                                                            |
| Build                           | `ALLOW_SANDBOX_PREVIEW=1 npm run build`                                                          | 138 static pages, 0 errors, 2 pre-existing Turbopack worker-resolution warnings                                                                   |
| Dependencies                    | `npm audit`                                                                                      | **0 vulnerabilities** (prod, dev, optional)                                                                                                       |
| Runtime smoke                   | `next start` on `:3010` / `:3001`                                                                | three tool pages 200, brand pages 200, `?brand=` 200, unknown brand 404, invalid GTIN 400, live lookup 502 (no egress), image 404/502 as designed |
| Browser E2E (generator)         | `npx playwright test tests/e2e/barcode-studio.spec.ts`                                           | **7 passed**                                                                                                                                      |
| Browser E2E (checker)           | `npx playwright test tests/e2e/batch-code-checker.spec.ts`                                       | **5 passed**                                                                                                                                      |
| Browser E2E (scanner)           | `npx playwright test tests/e2e/barcode-scanner.spec.ts tests/e2e/barcode-scanner-camera.spec.ts` | **4 passed**                                                                                                                                      |
| Browser E2E (layout)            | `npx playwright test tests/e2e/barcode-tools-responsive.spec.ts`                                 | **15 passed** (3 tools × 5 viewports)                                                                                                             |
| Browser E2E (existing harness)  | `npx playwright test tests/e2e/core.spec.ts`                                                     | **5 passed** — the pre-existing suite still works in the same browser                                                                             |
| Independent decode (own reader) | `tests/barcode-engine.test.ts`                                                                   | generated symbols decoded back and compared                                                                                                       |
| Independent decode (ZXing)      | `tests/barcode-independent-decode.test.ts`                                                       | **9/9** — generated PNGs read back by `zxing-wasm` 3.1.6 (C++ ZXing compiled to WASI), a separate implementation                                  |
| Decoder vectors                 | `tests/batch-code-engine.test.ts`                                                                | GS1 AIs, Digital Link, ordinal dates, calendar arithmetic, rejections                                                                             |
| GTIN validation                 | `tests/barcode-engine.test.ts`, `tests/batch-code-engine.test.ts`                                | mod-10 check digit computed and verified, wrong final digit rejected, GTIN-vs-lot confusion warned about                                          |
| Product API                     | `tests/product-lookup-v3.test.ts`                                                                | 19 mocked-transport tests, no live call claimed                                                                                                   |
| SEO                             | `tests/barcode-tools-seo.test.ts`                                                                | metadata, canonicals, sitemap, robots                                                                                                             |

**Independent decoding, in detail** (`tests/barcode-independent-decode.test.ts`):
the test builds each symbol with the product's own `buildLayout` +
`rasterizeLayout`, then hands the PNG to ZXing — not to `lib/tools/barcode/decode.ts`.
Results: EAN-13 `5901234123457`, EAN-8 `96385074`, UPC-A `036000291452`
(ZXing returns the EAN-13 form, so leading zeros are normalised before
comparison), Code 128 `QUICKKIT-2026`, Code 39 `QUICKKIT39`, ITF-14
`10012345678902`, Codabar `A123456789A`, a 2 px-per-module EAN-13, and a blank
raster that must decode to nothing. 9/9 pass.

Assertions were added, never weakened. Existing tests that pinned old behaviour
(three decoders, v2 lookup shape, 64-character code limit) were extended
deliberately, with the new behaviour named in the test title.

## 15. Real-browser E2E: run, and exactly how

Phase 17 recorded this as blocked. It is no longer blocked, and the mechanism
matters more than the claim:

1. `npx playwright install chromium` still fails:
   `Failed to download Chrome for Testing 156.0.8078.4 (playwright chromium
v1248), caused by: Error: Download failure, code=1` — `cdn.playwright.dev`
   and `storage.googleapis.com` are outside the egress allow-list (`curl` → `000`).
2. No system Chrome/Chromium exists on the image.
3. A browser was therefore obtained from a **registry that is reachable**:
   `@sparticuz/chromium@153.0.0` (npm). It ships a Brotli-compressed Chromium
   153.0.8010.0 plus an Amazon Linux 2023 library bundle. Debian-family images
   lack `libnss3`/`libnspr4`/`libnssutil3`, which is why a bare launch exits 127.
4. `scripts/prepare-headless-chromium.mjs` (added this phase, documented in its
   own header) decompresses the binary, extracts the libraries, and prints the two
   environment values needed:

   ```
   node scripts/prepare-headless-chromium.mjs
   # Chromium:  /tmp/chromium
   # Libraries: /tmp/quickkit-chromium/lib
   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/tmp/chromium \
   LD_LIBRARY_PATH=/tmp/quickkit-chromium/lib \
   TEST_BASE_URL=http://127.0.0.1:3001 \
   npx playwright test --project=chromium
   ```

The existing `playwright.config.ts` already reads
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`, so no configuration was changed to make
this work. `@sparticuz/chromium` is **not** a dependency of this repository: it
was installed with `--no-save` for local verification and the script refuses to
run without it. `zxing-wasm`, by contrast, _is_ a saved `devDependency`, because
a test imports it.

**What passed in the real browser (36 tests, 0 failures):**

| Spec                               | Tests | What it proves                                                                                                                                                                       |
| ---------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `barcode-studio.spec.ts`           | 7     | preview updates, validation messages, PNG download from the same bars, scanner handoff, bulk CSV, bulk ZIP (`PK` header) + CSV report, PNG/SVG/PDF magic bytes, 390 px mobile layout |
| `batch-code-checker.spec.ts`       | 5     | opaque lot → NOT DECODABLE, GS1 AIs 11/15/17, GS1 Digital Link, `?brand=cerave` deep link, mobile layout                                                                             |
| `barcode-scanner.spec.ts`          | 3     | generator PNG → upload → decode → history, denied-permission path, mobile tabs                                                                                                       |
| `barcode-scanner-camera.spec.ts`   | 1     | `--use-fake-device-for-media-stream` start/stop, and the camera track is stopped when navigating away                                                                                |
| `barcode-tools-responsive.spec.ts` | 15    | 3 tools × 5 viewports, no horizontal overflow, control reachable                                                                                                                     |
| `core.spec.ts` (pre-existing)      | 5     | unrelated tools still work in the same harness                                                                                                                                       |

**What this does not prove.** The browser is a headless Chromium 153 headless
shell, not the Playwright-pinned Chrome 156 build, and not Firefox or WebKit.
The camera is Chrome's synthetic device, not a phone: torch, focus, zoom,
permission-prompt UI and real-sensor rotation remain device-unverified. No
screenshot-diff or visual-regression baseline is claimed.

## 16. Performance and security

- **Dependencies:** 27 runtime dependencies unchanged; the only new package is
  `zxing-wasm` as a **devDependency** for the independent-decode test, so it is
  absent from the runtime bundle. `npm audit` clean.
- **Bundle:** static JS chunks total ≈7.4 MB across the whole app (all 45 tools);
  the barcode tools load their decoder worker lazily and the camera is
  interaction-gated.
- **Main thread:** camera frames and uploads decode in a Web Worker with a
  main-thread fallback; date maths is O(1) string work.
- **Network:** the browser makes no third-party request. CSP is not widened.
  The lookup is same-origin and sends only a GTIN; uploads and history never
  leave the device.
- **Input validation:** external JSON is treated as untrusted, every field is
  type-checked, strings are length-capped, and nothing is rendered as HTML.
- **SVG-injection protection:** existing generator SVG handling is unchanged and
  still sanitises text/labels before serialisation.
- **File limits:** scanner enforces 25 MB / 40 MP per image; the image proxy caps
  at 2 MB and an allow-list of types.
- **No API hammering:** token bucket + TTL cache + no retry on 4xx + backoff
  handling for 429/503.
- **Secrets:** none introduced; no service-role key, no admin page, no public
  signup.
- **No login required:** all three tools remain usable anonymously.

## 17. Known limitations (stated, not hidden)

1. **Zero brand-specific decoders.** No legitimate manufacturer algorithm was
   found in two research passes; coverage is 0/59 and the UI says so for every
   record.
2. **Live OFF connectivity unverified from the app.** The failure path is
   measured (502, `reason:"network"`, 42 ms) and the success path exists only
   against mocked transports. The endpoint and payload shape were confirmed from
   a different egress path (agent page reader), which is not the same thing.
3. **Browser coverage is one engine.** E2E ran in headless Chromium 153 (a
   bundled headless shell, not the Playwright-pinned Chrome 156). Firefox and
   WebKit are configured but unrun; there is no Safari/iOS evidence.
4. **Camera is synthetic.** Start/stop, track teardown and the denied-permission
   path are browser-verified with Chrome's fake device; torch, zoom, focus,
   device switching and the real permission UI are code-audited only.
5. **Per-process cache/bucket**: serverless instances each keep their own state;
   upstream 429 is still handled.
6. **GS1-only dates**: a GTIN alone carries no date, and an ordinary lot number
   cannot be decoded without a documented rule.
7. **Two-digit years**: 00–69 → 2000s, 70–99 → 1900s; disclosed in the UI, and
   ambiguous readings are shown together rather than resolved silently.
8. **No indexing evidence**: Search Console was not consulted and no indexing
   claim is made.
9. **No screenshot regression baseline**: layout is proven "fits and is usable"
   at five widths, not pixel-identical.

## 18. Owner actions before production

1. Confirm the Open Food Facts API-usage form (their documentation requires it
   for substantial use) and approve the User-Agent contact address.
2. Deploy, then verify live connectivity **from the deployment environment**: one
   real GTIN lookup and one image fetch through `/api/product-lookup`. Until that
   happens the "live unverified" label in this report stands.
3. Set `SITE_URL` and `LAUNCH_APPROVED=true` in production (never in preview),
   then confirm `robots.txt`, `sitemap.xml` and canonicals over the real origin.
4. In CI, run `npx playwright install --with-deps chromium` (the CDN is reachable
   there) and the specs listed in §15. Locally, use
   `scripts/prepare-headless-chromium.mjs` plus the two environment values it
   prints. Add Firefox/WebKit to the matrix if cross-engine parity is required.
5. Verify once on a physical phone: camera permission prompt, torch, rear/front
   switching and scanning a curved pack.
6. Decide whether the Supabase/admin work in §10 is in scope; it needs explicit
   approval, auth design and a migration plan before any code is written.
7. Keep the brand list under review: adding a brand is a data change; adding a
   decoder requires the five-step evidence process in
   `docs/BARCODE_DECODER_RESEARCH.md`.

## 19. Sign-off checklist

| Criterion                                                  | Status                                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Three tools audited, not rebuilt                           | ✅                                                                                       |
| Brand-specific decoders restricted to evidence             | ✅ (0 claimed, two research passes)                                                      |
| VERIFIED / ESTIMATED / NOT DECODABLE kept distinct         | ✅ (types + UI + tests)                                                                  |
| 59-brand dataset deduplicated, normalised, searchable      | ✅                                                                                       |
| GTIN lookup uses the official endpoint and honest taxonomy | ✅ (mocked tests + measured failure path)                                                |
| Scanner checklist implemented                              | ✅ (camera lifecycle browser-verified with a synthetic device)                           |
| Generator audited against its own tests                    | ✅                                                                                       |
| Generator output verified by an independent decoder        | ✅ (ZXing 9/9)                                                                           |
| Supabase/admin assessed without fabrication                | ✅ (absent; prerequisites documented)                                                    |
| UX/UI states and validation audited                        | ✅ (DOM-level + real-browser layout at 5 widths)                                         |
| SEO verified without indexing claims                       | ✅                                                                                       |
| Automated gates green                                      | ✅ (tsc 0, ESLint 0, Prettier clean, 1,994 tests, 138-page build, 0 vulnerabilities)     |
| Playwright E2E                                             | ✅ 36 tests passed in Chromium 153 (three tools, exports, camera lifecycle, 5 viewports) |
| Firefox / WebKit E2E                                       | ⛔ not run (Chromium only)                                                               |
| Physical-device camera test                                | ⛔ not possible in this environment                                                      |
| Live Open Food Facts call from the app                     | ⛔ blocked — no runtime egress; measured 502 with an honest message                      |
| Production deployment / indexing                           | ⛔ not attempted, by instruction                                                         |

**Verdict:** the three barcode tools are production-ready as audited and as
tested in a real browser, with unit, integration, independent-decoder and E2E
evidence attached. Two verifications remain outside this environment and are
named rather than papered over: a **live Open Food Facts call from the deployed
runtime**, and **cross-engine / physical-device camera** coverage. Neither is a
code defect, and neither is claimed to have passed. Nothing has been pushed,
merged, deployed or indexed.
