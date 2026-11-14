# Barcode Studio — Phase 20: final completion and real-world validation

**Branch** `arena/6102e674-quickkit` · base commit `2ea18259` · Phase 19 checkpoint
`0d5c51a` · this phase adds one commit on top of it.
**Date** 13–14 November 2026 (UTC) · Node 22.22.3 · Next 16.4.3 · React 19.3.1.
**Evidence** every number here is reproduced, with the commands, in
`BARCODE_TEST_EVIDENCE.md`.

Nothing was pushed, merged, deployed or indexed, and no production setting was
changed. No manufacturer verification, API response, camera result or browser
result is asserted that did not execute on this machine.

---

## 1. Verdict at a glance

| #   | Requirement                                                                                                                                        | Classification                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Batch Studio: safe mixed-symbology CSV generation, per-row validation, separate files, ZIPs, detailed reports, large/malformed data                | **PASS**                                                                                                              |
| 2   | Batch Code Intelligence: continue manufacturer research across all 59 records, add brands only on evidence, real decoders, vectors, no fabrication | **PASS (research + mechanism) / BLOCKED (any actual brand decoder)**                                                  |
| 3   | Real product lookup: diagnose the OFF failure, test valid/invalid GTINs, evaluate alternatives                                                     | **PARTIAL** — failure diagnosed and security fixed; live success path BLOCKED by sandbox egress                       |
| 4   | Real camera testing on hardware                                                                                                                    | **PARTIAL / BLOCKED** — full stream lifecycle verified on Chromium's synthetic device; no physical camera exists here |
| 5   | Playwright E2E across all nine barcode pages, both viewports, real interactions and downloads                                                      | **PASS** (18/18 visits, 0 errors, downloads verified)                                                                 |
| 6   | SEO / Search Console readiness                                                                                                                     | **PASS (markup + sitemap) / BLOCKED (Search Console)**                                                                |
| 7   | Final security, performance, audit, build, tests                                                                                                   | **PASS** — with one CLS regression found and fixed                                                                    |
| 8   | Reports                                                                                                                                            | **PASS** — this file, `BARCODE_TEST_EVIDENCE.md`, `MASTER_PROJECT_PROGRESS.md`                                        |

The honest summary: everything that can be executed without a phone, a live
third-party API or Search Console was executed and passes. The four items that
need those things are named, measured as far as they can be, and left labelled
BLOCKED rather than dressed up.

---

## 2. What was built

### 2.1 Batch Studio — mixed symbologies (`/tools/batch-studio`)

The Phase 19 batch panel already handled one symbology per sheet. A CSV from a
real label job is usually mixed, so this phase adds a separate studio rather than
bending the old panel into two jobs.

- `lib/tools/barcode/bulk-mixed.ts` — per-row symbology resolution
  (`resolveMixedFormat` accepts ids, display names, loose spellings such as
  `EAN 13`, and 2D aliases such as `QR`, `GS1 QR`, `dm`), `buildMixedRows`
  (every row validated on its own), `mixedFormatGroups`, `mixedCounts`,
  `exportableMixedRows`, `isTwoDFormat`.
- `components/tools/batch-studio/index.tsx` — paste or upload a CSV, column
  detection with overrides, a fallback format, a result table grouped by
  symbology, a per-format ZIP and a combined ZIP, and the report CSV.
- `lib/tools/barcode/export.ts` — `bulkReportCsv` gains a `format` column, but
  only for mixed runs; a single-format report keeps its historical
  `row,status,value,message` header so existing spreadsheets still parse. The
  CSV formula-defusing behaviour is unchanged.
- `app/tools/batch-studio/page.tsx` — metadata, headings, steps and FAQs
  rewritten for mixed sheets (title 58 chars, description 151).
- `components/tools/barcode-studio/bulk-panel.tsx` — the old panel keeps its
  single-format job and cross-links to the studio.

Design decisions that matter:

1. **A mixed sheet is never flattened into one archive.** Each format gets its
   own folder plus a `README.txt` manifest, and each format can be downloaded on
   its own. A Code 128 label and a QR code cannot share a print run without
   per-row layout decisions, so pretending they are one file would be a lie the
   printer would discover.
2. **An unrecognised format cell is an error, not a fallback.** The row is
   reported invalid, quoting the visitor's cell, rather than silently encoded as
   the fallback symbology.
3. **Duplicates are flagged, not dropped.** A repeated value stays in the report
   as `duplicate` and remains exportable — a label job legitimately prints the
   same SKU twice.
4. **Limits are shared with the existing engine:** 1,000 rows, 5 MB, 30 columns,
   1,500 characters per cell.

Verified end to end in Chromium: a five-row sample produced a ZIP of
**89,351 bytes** containing `ean13/ itf14/ code128/ qrcode/ datamatrix/` and
`README.txt`, a per-format archive of 3,047 bytes, and a report with the mixed
header. A 1,000-row mixed encode runs in **107 ms** (test measurement).

### 2.2 Batch Code Intelligence — a place for a real decoder, and none invented

The research result did not change: no manufacturer publishes a lot-number date
algorithm for any of the 59 brands. What changed is that the product can now
accept a real rule safely.

- `lib/tools/batch-code/brand-decoders.ts` (new) — a registry, `validateBrandDecoder`,
  `brandDecoderFor`, `decodeBrandCode`. A decoder is only shippable with an https
  evidence URL, the date the source was read, and at least two reproducible
  vectors; the validator checks that each vector really reproduces. The shipped
  registry is **empty**, and a test asserts that every brand record claiming a
  brand decoder has one registered.
- `check.ts` — the brand decoder sits between "a date printed on the pack" and
  "a date-shaped pattern in the code". A match produces a `verified` manufacture
  date whose evidence line names the decoder version and the source URL.
  `CheckOptions` lets a caller inject a registry, so the integration is tested
  with a fixture that never ships.
- `types.ts` — `DateSource` gains `"brand-decoder"`.
- `brands.ts` — the two records that had no official page (`avene`,
  `cle-de-peau`) now link to pages that were fetched successfully:
  `https://www.aveneusa.com` (avene.com redirects there) and
  `https://www.cledepeaubeaute.com`. All 59 records now carry a guidance URL;
  all 59 still say `lastVerified: null`.

Evidence rule, restated because it is the whole point: a third-party checker
publishing a per-brand algorithm is not a manufacturer document, cannot be
audited, and is frequently wrong. Such pages were found again this phase
(`skincarisma.com`, `lotexp.com`, `nanamall.com`, `perfumeson.com`) and rejected
again. **No decoder was written from them.**

### 2.3 Two real defects found in the checker, and fixed

Both were found by driving the page with a real GS1 element string, not by
reading code.

1. **The result contradicted itself.** A valid
   `(01)09506000134352(17)270930(10)LOT-9` produced a VERIFIED verdict naming
   `gs1-element-string v2.0.0` and the date `30 Sep 2027`, and in the same panel
   warned _"No usable date came out of this check."_ The warning condition only
   looked at printed, estimated and PAO dates. `decodedExpiry` now participates.
2. **A decoded code was described as undecodable.** The
   "Why this code cannot be decoded" block rendered whenever the _brand_ had no
   published lot-code rule (`brand.source.kind === "none"`), even when the code
   had been read perfectly as a GS1 carrier. It now renders only when the verdict
   is `undecodable`; the brand limitation still appears in the notes, where it
   belongs.

Both have regression tests, and the undecodable path (`28H300` on Nivea) still
explains itself, including the PAO guidance.

### 2.4 Batch code checker — a 1,176 ms and 0.145 CLS regression

`<Suspense fallback={null}>` around a component that called `useSearchParams()`
meant the entire 1,669 px workspace was client-only. On a phone, the form appeared
~500 ms after first paint and pushed the page down: LCP 1,664 ms, **CLS 0.145**.
The preset is now read through `useSyncExternalStore` (hydration-safe, no
boundary), so the form ships in the static HTML. Re-measured: LCP **488 ms**,
CLS **0.000**. Clearing a preset brand also no longer snaps back to the preset.

### 2.5 Product lookup — the network failure, explained; the redirect hole, closed

`world.openfoodfacts.org` resolves (`151.115.132.10`) and TCP connects in 176 ms,
but the TLS handshake is reset by this sandbox's egress allow-list
(`SSL_ERROR_SYSCALL`, no peer certificate), and plain HTTP gets an empty reply.
Allow-listed hosts complete TLS and return 200. So the environment — not OFF and
not the app — is the reason the route reports `502 reason:"network"`.

The audit did find a real security defect: the lookup followed redirects blindly
(`redirect: "follow"`), so OFF's edge could have redirected this server to any
host, including a link-local address. Redirects are now followed by hand with
every hop validated against the OFF family (four databases plus national,
`images` and `static` subdomains), capped at three hops, and a blocked hop is
reported instead of requested. Ten tests cover it, including a caller-supplied
`&url=`/`&host=` that must be ignored.

Alternative providers were evaluated and **not** adopted. USDA FoodData Central
is the only strong candidate: its data are public domain (CC0 1.0) and its API is
documented, but every request needs a data.gov API key that the holder must keep
private (so a deployment secret and rate-limit handling), it is US food only, and
it cannot be reached from this sandbox at all — adding it now would ship an
unverified path. That decision and its reasoning are recorded rather than
implemented blind.

### 2.6 Camera

Chromium's synthetic capture device exercised the whole lifecycle:
`enumerateDevices()` found one video input, Start camera acquired a stream and
played it (`640 × 480`), Stop camera ended **every** track, and there were no
page errors. The torch control correctly did not appear, because that track
reports no torch capability.

What that does **not** prove: a real phone's permission prompt, rear/front
switching on a device with two cameras, torch hardware, repeated scans of the
same pack, autofocus behaviour at close range, or glare. There is no camera
hardware in this environment. Real-device validation remains open.

---

## 3. Verification

Full detail and reproduction commands: **`BARCODE_TEST_EVIDENCE.md`**.

- **Tests:** 125 files / **2,135** tests pass (Phase 19: 122 / 2,089).
- **Static:** `tsc` 0, ESLint 0, Prettier clean on every changed file.
- **Build:** 143/143 static pages.
- **Audit:** `npm audit` and `npm audit --omit=dev` both **0 vulnerabilities**.
- **Browser:** 9 pages × 2 viewports = 18 visits, all HTTP 200, 0 overflow,
  0 page errors, 0 console errors; five real interactions and three downloads
  verified byte-for-byte.
- **Mobile CWV:** LCP 380–656 ms, CLS 0.000 on every measured page.
- **SEO:** in launch configuration, every page has a unique title (53–60 chars),
  a description (133–158), a canonical, `index, follow`, one H1, and tool-level
  JSON-LD; the sitemap carries 132 URLs, 68 barcode-related, none duplicated, all
  68 returning 200. With the launch gate closed — the shipped default — robots
  disallows everything and the sitemap is empty, which is the intended state.

---

## 4. Still blocked, and what unblocks it

| Blocker                  | What is needed                                                               | Who                 |
| ------------------------ | ---------------------------------------------------------------------------- | ------------------- |
| Live product lookup      | a network that can reach `world.openfoodfacts.org` (or an approved provider) | environment / owner |
| Second product provider  | approval of API terms plus a secret-managed key and live verification        | owner               |
| Real camera validation   | a phone with a rear camera, on a reachable build                             | owner / manual test |
| Any manufacturer decoder | a manufacturer document describing a lot-code date rule                      | research, ongoing   |
| Indexing                 | `SITE_URL` + `LAUNCH_APPROVED=true` in production, then Search Console       | owner               |
| Firefox / WebKit         | reachable browser download hosts                                             | environment         |

No workaround in this repository can substitute for those six.

---

## 5. Files changed in this phase

**Added** `lib/tools/barcode/bulk-mixed.ts` · `lib/tools/batch-code/brand-decoders.ts` ·
`components/tools/batch-studio/index.tsx` · `tests/barcode-bulk-mixed.test.ts` ·
`tests/batch-brand-decoders.test.ts` · `tests/product-lookup-redirect-guard.test.ts` ·
`BARCODE_STUDIO_PHASE20_REPORT.md` · `BARCODE_TEST_EVIDENCE.md`.

**Changed** `lib/tools/barcode/bulk.ts` · `lib/tools/barcode/export.ts` ·
`lib/tools/batch-code/check.ts` · `lib/tools/batch-code/types.ts` ·
`lib/tools/batch-code/brands.ts` · `lib/tools/barcode-scanner/product-lookup.ts` ·
`components/tools/batch-code-checker/index.tsx` ·
`components/tools/barcode-studio/bulk-panel.tsx` ·
`app/tools/batch-studio/page.tsx` · `app/tools/batch-code-checker/page.tsx` ·
`tests/batch-code-engine.test.ts` · `tests/batch-code-checker-ui.test.tsx` ·
`tests/product-lookup-v3.test.ts` · `MASTER_PROJECT_PROGRESS.md`.

Phase 1–19 work is untouched apart from the fixes listed above, and every
previous commit is preserved.
