# QUICKKIT Advanced Barcode Studio — Final Report

**Tool:** Barcode Generator — **QUICKKIT Advanced Barcode Studio**
**Route:** `/tools/barcode-generator`
**Category:** QR & Barcode
**Branch:** `arena/6102e674-quickkit` (base `2ea1825`)
**Date:** 13 November 2026
**Environment:** Node 22.22.3, npm 10.9.8, Next 16.4.3, React 19.3.1, Linux sandbox

**Verdict: PASS on implementation, local verification, privacy review and build. NEEDS ATTENTION overall**, because real-browser checks (Playwright E2E, axe scans, mobile overflow sweep, camera on physical hardware, Core Web Vitals) could not be executed in this environment — the browser binary cannot be downloaded here (see §13). Nothing was pushed, merged, deployed or indexed.

---

## 1. Scope and objectives

Build a complete barcode tool at `/tools/barcode-generator` that **never silently produces an invalid barcode**, covers the eleven symbologies that retail/logistics/industrial labels actually use, styles and prints them at a real physical size, generates labels in bulk from a CSV without dropping a single bad row, and reads barcodes back from a camera or an image **entirely on the device** — integrated into the existing catalogue, theme, sitemap and SEO without touching the homepage, QR tools, PDF/image/calculator/dev tools, Supabase Auth, RLS or Master Admin security.

Everything below was implemented locally. No registration, no account, no database, no third-party request, no client secret, no new external service.

## 2. What shipped

| Area            | Files                                                                                                                                                                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route           | `app/tools/barcode-generator/page.tsx` (static, `pageMetadata`, `ToolShell`, reference + FAQ content)                                                                                                                                     |
| Workspace shell | `components/tools/barcode-studio/index.tsx` (hero, accessible tabs, flash banner, code-split panels)                                                                                                                                      |
| Panels          | `format-panel.tsx`, `customize-panel.tsx`, `preview-panel.tsx`, `bulk-panel.tsx`, `scanner-panel.tsx`, `reference.tsx` (server component)                                                                                                 |
| State engine    | `components/tools/barcode-studio/use-barcode-studio.ts` (one settings object, one derived spec/layout/SVG, one verification gate)                                                                                                         |
| Engine          | `lib/tools/barcode/{types,checksums,gs1,validate,encode,ean-tables,layout,svg,paint,raster,decode,upce-reader,verify,settings,formats,pdf,export,canvas,bulk,scan-client}.ts`                                                             |
| Worker          | `workers/barcode-scan.worker.ts` (decode off the main thread, inline fallback)                                                                                                                                                            |
| Shared helpers  | new `lib/tools/filename.ts`, `lib/tools/csv.ts`; `lib/tools/qr/export.ts` refactored to re-export them (no behaviour change, QR tests unchanged)                                                                                          |
| Tests           | `tests/barcode-engine.test.ts` (61), `tests/barcode-export-bulk.test.ts` (33), `tests/barcode-page.test.tsx` (19), `tests/barcode-studio-ui.test.tsx` (9), `tests/e2e/barcode-studio.spec.ts` (5 browser cases, written and not executed) |
| Dependency      | `@zxing/library@0.23.0` (decoder only; audit clean)                                                                                                                                                                                       |

The pipeline is one path: `buildBarcode()` → `BarcodeSpec` → `buildLayout()` → `BarcodeLayout` → SVG / canvas / raster / PDF. The preview, the clipboard copy, the PNG, the SVG, the PDF and the print document are all generated from the same rectangles, so "export equals preview" is structural rather than asserted by hand.

## 3. Format support and validation

| Format     | Encoder                                                     | Rules enforced                                         | Read back by the scanner                                         |
| ---------- | ----------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| Code 128   | Code sets B/C with automatic switching for 6+ digit runs    | printable ASCII only, 1–80 chars, mod-103 check        | yes                                                              |
| GS1-128    | Code 128 with FNC1, GS separators after variable-length AIs | AI table, field length/charset, GTIN/SSCC check digits | yes (reports as Code 128)                                        |
| Code 39    | full table + optional mod-43                                | `0-9 A-Z - . $ / + %`, lowercase upper-cased           | yes                                                              |
| EAN-13     | L/G/R tables + parity by leading digit                      | 12 digits (check calculated) or 13 (check verified)    | yes                                                              |
| EAN-8      | 7 or 8 digits                                               | check calculated or verified                           | yes                                                              |
| UPC-A      | 11 or 12 digits                                             | check calculated or verified                           | yes                                                              |
| UPC-E      | NS0/NS1, parity by check digit, UPC-A expansion             | 6–8 digits; check derived from the expansion           | yes (custom reader, ZXing 0.23's UPC-E path is broken — see §14) |
| ITF-14     | interleaved 2 of 5                                          | 13 or 14 digits, even-length padding                   | yes                                                              |
| Codabar    | A–D start/stop, configurable                                | default start A, stop mirrored                         | yes                                                              |
| MSI        | optional mod-10 / mod-11                                    | digits only                                            | no — generation only, stated in the UI                           |
| Pharmacode | 3–131070, bar widths 1/3                                    | range, integer, no check digit                         | no — generation only, stated in the UI                           |

Validation returns a stable problem code (`empty`, `length`, `charset`, `checksum`, `range`, `gs1-ai`, `gs1-data`, `gs1-check`, `gs1-syntax`, `unsupported`), a human sentence and a concrete example. A wrong check digit is refused with the correct digit named, never overwritten; a missing one is calculated and announced. Nothing is drawn until the data passes.

## 4. Live editor

Format grid (radiogroup, 11 options, grouped Retail/Logistics/Industrial/GS1), data field with `aria-invalid` + `aria-describedby`, per-format options (Code 39 mod-43, MSI mod-10/11, UPC-E number system, EAN/UPC guard-bar extension), rules fold, and a one-click example.

Customisation: bar width 0.75–8 px per module, symbol height, export scale 1–6×, bar/background colours with hex entry, transparency, contrast ratio read-out with an inversion warning, font family (5 choices), font size, human-readable text on/off, text alignment, label title (80) and description (160), quiet zone (raised to the symbology minimum), outer margin, reset. Every control is labelled; advanced options live in collapsed `<details>`.

Bars are snapped to whole pixels in the layout, so a resize changes the module width, never the ratio between bars — nothing is CSS-stretched. The preview reports symbol pixels, quiet zones in modules, millimetres at 300 dpi and the narrow-bar width in millimetres.

## 5. Scanner

- **Camera:** opens only after **Start camera** (permission prompt tied to the click), prefers the rear lens, lists cameras for switching once permission exists, torch where the track reports it, stop, 240 ms polling loop that reads frames into a canvas and decodes them through `scanRaster` (worker, transferred `ArrayBuffer`), duplicate reads suppressed by a seen-set with a counter, and a stream torn down on unmount, mode switch and `visibilitychange`.
- **Image:** file picker, drag-and-drop, `ACCEPT_ATTRIBUTE` filter, 25 MB / 40 MP caps, four rotations plus an overlapping tile sweep so several symbols in one picture are each decoded, and the same dedupe.
- **Results:** format badge (mapped back to the generator's format where possible), decoded text, source, timestamp, copy per result, clear, CSV export. `aria-live="polite"` on the list, `role="status"` on the decoding state, explicit permission/device error copy.

No camera frame, image or decoded value is uploaded or stored.

## 6. Bulk workspace

CSV choose/drop → header detection → data/title column pickers → format + encode options → label size (mm) and paper → preview thumbnails.

- Limits: 1,000 rows, 5 MB file, 30 columns, 1,500 characters per cell, enforced in the parser.
- Every row gets a status: `ok`, `duplicate` (with `duplicateOf` row number), `skipped` (duplicates, only when "skip duplicates" is chosen) or `invalid` (with the exact rule). Blank data is `invalid`, never dropped.
- Thumbnails render in batches; ZIP entries are built in batches of 50 through `processInBatches` (macrotask yield between batches, abortable), so the tab stays interactive at 1,000 rows.
- Outputs: ZIP of SVG or PNG, print-ready PDF sheet(s), report CSV (row, status, value, message) with formula-injection protection, and per-row SVG/PNG downloads in the 100-row result table.

## 7. Exports and print fidelity

PNG at 1–6× the preview density (with DPI metadata via the existing QR PNG helper), vector SVG, vector PDF labels (`a4`, `letter` or `fit`), ZIP, report CSV, clipboard SVG, and direct print.

PDF: bars are `drawRectangle` calls in millimetres-to-points (`72 / 25.4`), Helvetica for the human-readable line, one page per sheet for A4/Letter (planned by `planSheet`: 64 × 34 mm labels at 10 mm margins and 4 mm gaps → 2 × 7 = 14 per A4 page) and one page per label for `fit`. Label dimensions are clamped to 8–320 mm, margins 0–40 mm, gaps 0–30 mm.

Print uses a **hidden same-origin iframe** with the SVG inline and `window.print()` on that frame — no popup blocker, vector output, iframe removed after 60 s. (Deliberately different from the QR studio's approach, which the QR tests pin.)

## 8. Privacy and security

- Encoding, layout, rasterising, PDF/PNG/ZIP building and decoding all run in the tab. No `fetch`, no `XMLHttpRequest`, no `sendBeacon`, no third-party origin in any studio file — asserted by a test.
- Nothing is stored except the styling settings in `localStorage` (`qk:barcode-studio-settings:v1`), sanitised on read: unknown format, non-numeric sizes, out-of-range values and colour values that are not `#rrggbb` all fall back to defaults.
- SVG output is built from a closed vocabulary (rect/text/title/desc); `escapeXml()` escapes `& < > " '` and strips C0 controls; `isSvgSafe()` refuses `<script`, `foreignObject`, `on*=` handlers, `javascript:`, `xlink:href` and `ENTITY`. User text reaches the SVG only through the escaper.
- The CSV writer neutralises leading `=`, `+`, `-`, `@` so a spreadsheet does not execute a payload from a data cell.
- **Camera permissions are scoped, not site-wide.** `Permissions-Policy` keeps `camera=()` on every route and re-allows `camera=(self)` only on the two scanner pages — without that carve-out the browser refuses `getUserMedia` even after the visitor grants permission. Microphone and geolocation stay off everywhere.
- No database, no Supabase, no account, no client secret, no analytics on the values.
- Worker decodes `ArrayBuffer`s that are transferred (not copied), and a failed worker falls back to synchronous decoding rather than silently returning nothing.

## 9. SEO

- `<title>`: `Barcode Generator — Code 128, EAN-13 & GS1 | QUICKKIT` (51 rendered characters, inside the 60-character SERP budget).
- Description: 154 characters, unique, mentions validation and the local-only promise; canonical, Open Graph and Twitter cards come from the shared `pageMetadata()` helper (`SITE_URL`-driven, so no origin is hard-coded).
- One `<h1>` (the shell), `h2` for how-to/reference/FAQ, `h3` inside cards, no skipped levels.
- Breadcrumb + BreadcrumbList JSON-LD and SoftwareApplication JSON-LD come from `ToolShell`; FAQPage JSON-LD is emitted for the six FAQ entries and matches the visible copy.
- Reference block (14-row format table + seven troubleshooting entries) and a `tool-seo-content` entry with eight specs, three worked examples and a privacy note.
- The tool is in the catalogue, the QR & Barcode category listing, the `/tools` index, related-tool blocks (both directions with the two QR tools) and the sitemap (route-source mapping extended so `lastmod` follows `lib/tools/barcode` and `components/tools/barcode-studio`).
- The homepage was not touched; no other URL changed; no indexing claim is made — Search Console has not been consulted, so nothing is asserted about Google.

## 10. Accessibility and responsiveness

Keyboard: roving tab set with Left/Right arrows and `tabIndex`, native radios/checkboxes/ranges/labels, `<details>` disclosures, `aria-invalid`/`aria-describedby`/`aria-errormessage`-style help wiring, `role="alert"` for validation, `role="status"` for flash and decoding state, `aria-live` on the scanner results, `sr-only` dismiss label, `alt` text that names the symbology and payload.

Responsive: one column to 1100 px, two columns with a sticky preview column above; format grid 2 → 3 → 4 columns; scanner grid stacks on mobile; the preview stage scrolls inside its own card rather than overflowing the page; buttons become full-width under 560 px; `prefers-reduced-motion` disables the format-card transition.

## 11. Performance

- The Scanner panel (decoder) and the Bulk panel (ZIP/PDF exporter) are `next/dynamic` imports. Verified in the production build: the decode chunk (124 KB) and the bulk chunk (24 KB) are separate files, not part of the route's initial JavaScript.
- One derived state machine; no effect writes state during render, no per-render object recreation in dependency arrays (flash dismissal keys on the message, verification is derived from the SVG string it was produced for).
- Bars are drawn once into an SVG string; the preview is a single `<img>` with explicit `width`/`height`, so there is no layout shift while it paints.
- Bulk work is batched with a macrotask yield; the row table is capped at 100 rows on screen.
- Core Web Vitals were **not measured** (no browser in this environment).

## 12. Integration

`lib/catalog.ts` (entry, `phase: 15`, `icon: "barcode"`, keywords), `lib/tool-theme.ts` (warm red-shift inside the QR family), `components/icon-3d.tsx` (new `barcode` glyph + slug mapping), `components/tool-icon.tsx` (hero-search fallback icon), `lib/tool-seo-content.ts`, `lib/category-content.ts` (category copy rewritten to 3 tools, 443 words), `app/sitemap.ts` (extra route-source dirs), `app/tool-pages.css` (a scoped `.bc-*` block, ~430 lines), `app/tools/page.tsx` metadata (43 tools).

Counts updated where they are asserted as facts: 42 → 43 tools (`tests/ad-placements.test.tsx`, `tests/catalog.test.ts`, `tests/seo-structured-data.test.tsx`), 65 → 66 sitemap routes (`tests/launch.test.ts`, `tests/ad-placements.test.tsx`), and the Batch C route registry (30 → 31). No assertion was weakened or removed.

## 13. Verification evidence

| Gate                          | Command                                                             | Result                                                                                                                                                                                                                            |
| ----------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck                     | `npx tsc --noEmit`                                                  | exit 0, no output                                                                                                                                                                                                                 |
| Lint                          | `npx eslint .`                                                      | exit 0, no findings                                                                                                                                                                                                               |
| Format                        | `npx prettier --check …`                                            | “All matched files use Prettier code style!”                                                                                                                                                                                      |
| Unit/integration              | `npx vitest run`                                                    | **109 files / 1,862 tests passed** (122 of them new barcode tests)                                                                                                                                                                |
| Production build              | `npm run build`                                                     | compiled; **77 static pages**; `/tools/barcode-generator` prerendered as static (`○`)                                                                                                                                             |
| Dependency audit              | `npm audit`, `npm audit --omit=dev`                                 | 0 vulnerabilities                                                                                                                                                                                                                 |
| SSR smoke (production server) | `curl /tools/barcode-generator`                                     | HTTP 200, 121 KB, single `<h1>`, FAQPage JSON-LD, studio placeholder rendered, `/tools` lists “43 FREE TOOLS” and the new card; every route and referenced JS chunk returned 200                                                  |
| Header policy                 | `curl -I`, `tests/next-headers.test.ts`                             | `frame-ancestors 'none'` by default; `Permissions-Policy: camera=(self)` on the barcode page and the QR scanner, `camera=()` everywhere else                                                                                      |
| Preview server                | `ALLOW_SANDBOX_PREVIEW=1 npm run build && npm start -- --port 3010` | listening on `0.0.0.0:3010`; `frame-ancestors 'self' https://*.e2b.app` in the preview build only; `/`, `/tools`, `/tools/barcode-generator`, `/tools/qr-code-scanner`, `/category/qr-barcode`, `/sitemap`, `/robots.txt` all 200 |
| Decode oracle                 | ZXing 0.23.0 via `verifyBarcode`                                    | Code 128, GS1-128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14, Codabar all decode back to their own payload                                                                                                                     |
| Browser E2E                   | `npx playwright install chromium`                                   | **blocked** — `Failed to download Chrome for Testing … Download failure, code=1` (Playwright CDN unreachable from this sandbox)                                                                                                   |

What the 122 new tests cover: published EAN/UPC table symmetries, GS1 mod-10 across four payloads, Code 39 mod-43, MSI mod-10/11, UPC-E expansion + all ten check digits × NS0/NS1 parity, EAN-13 95-module bit-for-bit layout, Code 128 stop pattern and mod-103 check, ITF-14/Codabar/MSI encoding, Pharmacode round-trip 3–400 and both range ends, GS1 AI/GTIN/syntax failures, decode round-trip for nine formats, layout snapping/quiet-zone clamps/proportional scaling/text placement/transparency/mm conversion, SVG escaping and safety, format metadata vs decoder capability, settings sanitisation and storage corruption, filenames and unique bulk names, report CSV injection + quoting, bulk `ok/duplicate/skipped/invalid` semantics with row numbers, `processInBatches` order/progress/abort/yield, PDF page counts and physical page sizes (A4 595.28 × 841.89 pt, Letter 612 × 792 pt, `fit` = label size), vector-not-bitmap PDF contents, catalogue/related/sitemap/metadata/SEO wiring, CSS class contract, no-network source assertions, and jsdom interaction tests (invalid data withdraws the preview, colour reaches the SVG, tabs and lazy panels mount, camera-less path is explained).

## 14. Known limitations and honest gaps

1. **Browser E2E, axe, and 320–430 px overflow sweeps did not run** — Playwright is installed but its browser download is blocked here (`cdn.playwright.dev` unreachable; only npm/PyPI/GitHub are reachable). `tests/e2e/barcode-studio.spec.ts` was written for CI: it asserts the preview's intrinsic size, a real PNG download filename, the scanner not opening the camera before Start, a three-row CSV status table, and a 360 px viewport with no horizontal overflow and ≥ 38 px tap targets.
2. **Core Web Vitals, real-device camera, torch and clipboard** remain unmeasured/unverified.
3. **MSI and Pharmacode cannot be scanned** — ZXing has no reader for either; the UI says so in the format rules, the reference table and the FAQ instead of offering a check that would fail.
4. **UPC-E uses a hand-written reader.** ZXing 0.23.0's `UPCEReader.decodeMiddle()` returns a bare offset in 0.20.0/0.21.3/0.23.0 and its `UPCEANReader`/`UPCEReader` classes are not exported, so the studio decodes UPC-E from a binarised matrix against the EAN tables (`lib/tools/barcode/upce-reader.ts`). Covered by decode round-trip tests.
5. **GS1-128 input accepts the bracketed `(01)…(10)…` form** (recommended, validated) **or a raw digit string with GS separators**; raw input containing letters is rejected with a syntax message rather than guessed.
6. **Code 128 is ASCII-only** — accented text is refused with the offending code point named; there is no Code 128 UTF-8 mode.
7. **Printing goes through the browser's print dialog** via a hidden iframe; silent/kiosk printing is not attempted (and would need a native host).
8. **Bulk is capped at 1,000 rows / 5 MB**, by design and documented in the UI, the FAQ and the report copy.
9. **`lastmod` needs real git history.** This clone was shallow, which makes every `lastmod` undefined; `git fetch --unshallow` was run locally to restore genuine dates (no file content changed). `tests/launch.test.ts` depends on that history.
10. **No indexing claim.** Search Console was not consulted; nothing is asserted about Google indexing the new URL.
11. **Preview runbook.** The app is served inside an iframe on `https://<port>-<sandbox>.e2b.app`, and `frame-ancestors 'none'` would block it, so the preview is built and started with `ALLOW_SANDBOX_PREVIEW=1` (which names that origin and nothing else). Header rules are resolved into the build, so the flag is needed for `next build` as well as `next start`; without it the same source produces `frame-ancestors 'none'`, which the header tests pin.
12. **Not pushed, not merged, not deployed.** Work is committed locally on `arena/6102e674-quickkit` only.

### Verdict

**PASS** for: implementation completeness, validation correctness (nine formats proven by an independent decoder, two proven by round-trip encoding), export/print fidelity and physical dimensions, privacy and injection resistance, bulk semantics, accessibility wiring, SEO metadata, catalogue/sitemap integration, typecheck, lint, format, 1,862 unit/integration tests, production build and dependency audit.

**NEEDS ATTENTION** overall, solely because browser-level verification (Playwright E2E, axe, mobile overflow, Core Web Vitals, physical camera) could not be executed in this environment. Everything needed to run those checks is committed.
