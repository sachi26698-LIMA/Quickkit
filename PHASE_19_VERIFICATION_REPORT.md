# Phase 19 — verification report

Everything below was executed in this workspace on 2026-11-13. Nothing is estimated.

## 1. Static gates

| Gate       | Command                                            | Result                                                                                                      |
| ---------- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TypeScript | `npx tsc --noEmit`                                 | 0 errors                                                                                                    |
| ESLint     | `npx eslint components app lib tests bwip-js.d.ts` | 0 errors, 0 warnings                                                                                        |
| Prettier   | `npx prettier --check <changed files>`             | clean (the repository-wide run also flags 65 pre-existing files outside this phase's diff, mostly markdown) |
| Install    | `npm ci --no-audit --no-fund`                      | 559 packages, exit 0 — proves the pinned `bwip-js` addition is reproducible                                 |
| Audit      | `npm audit`                                        | not re-run this phase; the dependency set gained only `bwip-js`                                             |

## 2. Test suite

```
npx vitest run
→ Test Files  122 passed (122)
→ Tests       2,089 passed (2,089)
```

Run after the phase commit. Before the commit, `tests/launch.test.ts` failed on two
assertions because it derives real Git timestamps for every sitemap route and uncommitted
files have none; both pass once the change is committed.

Phase-specific suites:

| Suite                                | Tests | What it proves                                                                                      |
| ------------------------------------ | ----- | --------------------------------------------------------------------------------------------------- |
| `tests/barcode-code93.test.ts`       | 15    | Table of 48 patterns, C/K check characters, decode round-trip via ZXing                             |
| `tests/barcode-twod.test.ts`         | 12    | QR / GS1 QR / Data Matrix / PDF417 build, byte caps, EC levels, SVG well-formedness, FNC1 behaviour |
| `tests/gs1-intelligence.test.ts`     | 33    | AI explanations, date rules, HRI round-trip, check digit, Digital Link parse/build                  |
| `tests/barcode-toolkit.test.ts`      | 21    | Auto-detection, image analysis thresholds, comparison verdicts                                      |
| `tests/product-lookup-intel.test.ts` | 9     | Nutrition rows, missing-field derivation, licence metadata, CSV/JSON export                         |
| `tests/barcode-decode-2d.test.ts`    | 5     | QR, Data Matrix and PDF417 each generated, rasterised and decoded; linear decode unaffected         |
| `tests/barcode-engine.test.ts`       | 61    | 12 linear formats, 10 scannable, reader metadata (12 readable ids)                                  |

## 3. Browser evidence (headless Chromium in this sandbox)

Launch recipe used (prepared earlier in the project):

```
npm i --no-save @sparticuz/chromium@153.0.0
node scripts/prepare-headless-chromium.mjs
LD_LIBRARY_PATH=/tmp/quickkit-chromium/lib node <script>
```

Scripts drove a production build served with `npx next start -H 0.0.0.0 -p 3010`:

| Journey                               | Observed                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Studio → 2D tab                       | Tab switches, 64 inline SVGs rendered, QR preview visible, format select changes to Data Matrix and the preview rebuilds                                       |
| `/tools/gs1-intelligence` → Parse     | Table rendered with `(01)` row: "GTIN — the product number: the same n…"                                                                                       |
| `/tools/batch-studio` → Encode 3 rows | 3 result rows, statuses shown, no console errors                                                                                                               |
| `/tools/product-lookup` with `12345`  | "Not sent. That is not a valid GTIN." — no network request attempted                                                                                           |
| `/tools/barcode-developer`            | Comparison verdict rendered ("Different values, one is a prefix of the other")                                                                                 |
| Studio → JPEG (linear, Code 128)      | Button enabled; a real download fired: `quickkit-barcode-code128-quickkit-2026-1521px.jpeg`; status "JPEG saved at 1521 px wide, on an opaque background."     |
| Studio → auto-detection               | Suggestion rendered from `detectBarcodeFormat`: "Looks like Code 39: Uppercase letters and the Code 39 symbols only …" — a suggestion, not an automatic switch |
| Page errors                           | none across every journey                                                                                                                                      |

## 4. HTTP smoke (production build)

| Route                                    | Status                                         |
| ---------------------------------------- | ---------------------------------------------- |
| `/tools/gs1-intelligence`                | 200                                            |
| `/tools/product-lookup`                  | 200                                            |
| `/tools/batch-studio`                    | 200                                            |
| `/tools/barcode-developer`               | 200                                            |
| `/guides/barcode`                        | 200                                            |
| `/category/qr-barcode`                   | 200 (lists all 9 barcode tools)                |
| `/tools`                                 | 200                                            |
| `/api/product-lookup?gtin=12345`         | 400                                            |
| `/api/product-lookup?gtin=4006381333931` | 502 (`reason:"network"`, sandbox egress block) |

## 5. Build

```
npm run build
→ ✓ Compiled successfully
→ 143 static pages (was 138)
```

## 6. What this report does NOT prove

- **No real camera was used.** Torch, device switching, focus and permission prompts were
  exercised only through unit tests and headless Chromium (which has no camera).
- **No live Open Food Facts success.** The sandbox blocks the host; every live attempt
  returned `reason:"network"`.
- **No device QA.** iOS Safari and Android Chrome behaviour is unverified.
- **No print verification.** Exported symbols were decoded from rasters in Node, not
  scanned from paper.
