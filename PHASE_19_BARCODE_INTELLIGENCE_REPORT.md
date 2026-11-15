# Phase 19 — Real-World Barcode Intelligence & Verification Upgrade

**Branch:** `arena/6102e674-quickkit`
**Base:** `38f1c6b` (Phase 18)
**Date:** 2026-11-13
**Status:** local, uncommitted at time of writing → committed as a single local commit at the end of the phase. Nothing pushed, merged, deployed or indexed.

---

## 1. What this phase adds

Four new public pages and one guide, plus upgrades to the existing barcode studio and
scanner. Every claim in this document is backed by a test, a measured response or a
file in the repository; where something is not done it says **NOT IMPLEMENTED** rather
than describing intent.

| #   | Deliverable                                                                                    | Where                                            | State                                            |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| 1   | Code 93 encoder + reader                                                                       | `lib/tools/barcode/code93.ts`, `decode.ts`       | PASS                                             |
| 2   | QR / GS1 QR / Data Matrix / PDF417 encoder                                                     | `lib/tools/barcode/twod.ts`                      | PASS                                             |
| 3   | 2D tab in the studio with EC level, scale, padding, colours, SVG/PNG/JPEG/PDF                  | `components/tools/barcode-studio/twod-panel.tsx` | PASS                                             |
| 4   | GS1 intelligence engine (AIs, dates, HRI, Digital Link)                                        | `lib/tools/gs1/engine.ts`                        | PASS                                             |
| 5   | GS1 Intelligence page                                                                          | `/tools/gs1-intelligence`                        | PASS                                             |
| 6   | Product lookup enrichment (ingredients, allergens, nutrition, missing fields, upstream status) | `lib/tools/barcode-scanner/product-lookup.ts`    | PASS                                             |
| 7   | Product lookup page with CSV/JSON export and share                                             | `/tools/product-lookup`                          | PASS                                             |
| 8   | Batch studio (CSV → SVG/PNG ZIP + report CSV)                                                  | `/tools/batch-studio`                            | PASS (1D only)                                   |
| 9   | Comparison engine + image analyser + endpoint contract                                         | `/tools/barcode-developer`                       | PASS                                             |
| 10  | Educational guide                                                                              | `/guides/barcode`                                | PASS                                             |
| 11  | Scanner 2D decoding (QR, Data Matrix, PDF417)                                                  | `decode.ts`, scanner UI                          | PASS                                             |
| 12  | Scanner manual entry, share, typed-value labelling                                             | `components/tools/barcode-scanner/index.tsx`     | PASS                                             |
| 13  | Auto format detection surfaced in the studio                                                   | `format-panel.tsx` + `detect.ts`                 | PASS                                             |
| 14  | JPEG export for linear symbols                                                                 | `use-barcode-studio.ts`, `preview-panel.tsx`     | PASS                                             |
| 15  | `bwip-js` pinned and reproducible under `npm ci`                                               | `package.json`, `package-lock.json`              | PASS                                             |
| 16  | Batch code checker: new manufacturer research                                                  | `lib/tools/batch-code/*`                         | NOT IMPLEMENTED this phase (59 brands unchanged) |
| 17  | Second product database (beyond Open Food Facts)                                               | —                                                | BLOCKED (licence review not done)                |
| 18  | Real-device camera QA (iOS/Android hardware)                                                   | —                                                | BLOCKED (no devices in this environment)         |

## 2. Numbers

- Tools in the catalog: **49** (was 45); `QR & Barcode` now holds **9** tools.
- Sitemap routes: **132** (was 127) — +4 tools, +1 guide.
- Static pages in `next build`: **143**.
- Test files: **122**; tests: **2,089** after this phase (was 1,994 / 116).
- New test files: `barcode-code93`, `barcode-twod`, `gs1-intelligence`, `barcode-toolkit`,
  `product-lookup-intel`, `barcode-decode-2d`, plus additions inside
  `barcode-engine`.

## 3. Deliberate limits

- **1D only in the batch studio.** Mixed symbologies in one label sheet need a per-row
  layout decision a CSV cannot express; the page says so instead of silently applying
  one format to rows that expect another.
- **One product database.** Open Food Facts is ODbL/CC-BY-SA and its API shape is
  documented. Adding a second source requires a licence review that has not happened,
  so it was not added.
- **No grade claims.** The image analyser measures module width, contrast ratio, quiet
  zone and cropping. It states on every result that this is not an ISO/IEC 15416 or
  15415 grade.
- **No authenticity claim anywhere.** A GTIN check digit makes a number well formed, not
  licensed, and not proof that a label is genuine. That sentence appears in the studio,
  the scanner, the GS1 page, the lookup page and the guide.

## 4. Owner actions before this can ship

1. Review this branch and the four new pages by eye at 375 px, 768 px and 1440 px.
2. Run `tests/e2e` against a production build on a real network (see
   `PHASE_19_VERIFICATION_REPORT.md` for the one-liner used here).
3. Repeat the camera QA on an actual iOS Safari and an actual Android Chrome device —
   the sandbox has no camera hardware, so none of the camera behaviour in this phase
   was observed on a device.
4. Decide whether the batch code checker's brand list should grow in a later phase.
5. Approve the push/PR; nothing has left this machine.
