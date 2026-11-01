# QR Code Generator V2 — QA report

**Date:** 1 November 2026  
**Branch:** `arena/9ad31977-quickkit`  
**Route:** `/tools/qr-generator`  
**Scope:** Existing QR Generator upgrade only. No QR Scanner or other roadmap tool was started.

## Verification checklist

- [x] Type-aware payload creation and validation for all 15 QR content types.
- [x] Local preview decoding against the expected payload; warnings for unconfirmed designs.
- [x] Templates, visual presets, custom canvas dimensions, palettes, undo/redo, saved designs, and local history controls.
- [x] Contrast guidance, module/finder styles, quiet zones, captions, transparent outer margins, and adjustable logo size/position/padding/plate.
- [x] PNG, JPG, SVG, PDF, clipboard image, batch ZIP, and print-sheet PDF flows.
- [x] CSV mapping, per-row validation, invalid/duplicate handling, selective generation, ZIP output, and print-sheet PDF raster decoding.
- [x] Local decoding of generated content and exported images/documents in browser tests.
- [x] Desktop, tablet, and mobile screenshots; viewport overflow and accessibility checks.
- [x] Unit tests, full Chromium E2E, lint, typecheck, formatting, production build, and production dependency audit.

## Exact results

| Check | Result |
|---|---|
| `npm test` | **139/139 passed**, 13 test files |
| Full Playwright Chromium suite | **155/155 passed**, 1 worker |
| QR Generator Playwright subset | **9/9 passed** (included in the 155 full-suite total) |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run format:check` | Passed |
| `npm run build` | Passed; seven tool routes and 19 static pages generated |
| `npm audit --omit=dev` | **0 vulnerabilities** |

### Browser environment

The E2E run used Playwright 1.64.1 with local Chromium 153.0.8010.0. The bundled Playwright Chromium shell could not start in this Debian 12 sandbox until its missing NSPR/NSS runtime libraries were supplied from `/tmp/lib`; a temporary Playwright config pointed to `/tmp/chromium153` and was removed after testing. Browser binaries/configuration were not added to the repository. Firefox/WebKit results are not claimed.

The complete Chromium command was:

```sh
LD_LIBRARY_PATH=/tmp/lib npx playwright test --config=playwright.qr-temp.config.ts --project=chromium
```

The temporary config set `use.launchOptions.executablePath` to `/tmp/chromium153` and otherwise extended `playwright.config.ts`. The screenshot test overwrites the three V2 screenshots below.

## QR-specific browser coverage

The nine QR E2E tests verify:

1. **15 content types:** generated payloads are locally decoded and compared with their expected encodings; calendar output is checked as an iCalendar event.
2. **Styled exports:** PNG, JPG, SVG, and PDF outputs are independently decoded; the PDF is rasterized with PDF.js in Chromium. Clipboard PNG bytes are read back and decoded.
3. **Visual variants:** all four error-correction settings and all 12 dot/finder-corner combinations are scan-checked.
4. **Canvas/logo/transparency:** 640×384 custom canvas, transparent outer margin, 12% logo, off-center horizontal/vertical positioning, 20% padding, backing plate, circle finder, diamond modules, and an escaped script-like caption stay scannable; exported PNG/SVG dimensions and SVG sanitization are checked.
5. **Template/history:** editable business template, undo/redo, preset comparison, style-only saved design, opt-in recent history, pause-with-preservation, and separate confirmed history clearing.
6. **Batch:** pasted-row ZIP entries decode independently. CSV test covers mapped URL/Wi-Fi rows, invalid URL, exact duplicate detection, selective generation, ZIP decoding, A4 PDF page size, and rasterized/decoded print-sheet entries.
7. **Responsive screenshots:** workspace screenshots generated at 1440×1100, 768×1024, and 390×844 viewport sizes; page width remains within each viewport.
8. **Phone workflow:** 390 px content entry and switching to batch mode remain usable without horizontal overflow.

The broader E2E suite also ran axe-based accessibility checks, keyboard navigation, no-input-transmission tests, and overflow checks at 320, 360, 375, 390, 430, 768, 1024, 1366, and 1440 px.

## Screenshot artifacts

The screenshot test saves the complete workspace element; the resulting PNG dimensions are:

| View | Viewport | Screenshot |
|---|---:|---|
| Desktop | 1440×1100 | `screenshots/qr-generator-v2-desktop.png` — 1060×2935 px |
| Tablet | 768×1024 | `screenshots/qr-generator-v2-tablet.png` — 704×3756 px |
| Mobile | 390×844 | `screenshots/qr-generator-v2-mobile.png` — 354×5173 px |

The screenshot width is the rendered workspace width; the test also asserts that the full page does not exceed the viewport width.

## Privacy and security checks

- QR generation and scan decoding run in the browser. The full Chromium suite's no-input-transmission interaction test passed.
- The generator never opens/fetches user-entered URLs. No tracking parameters or analytics were added.
- CSV, logos, and batch generation remain local. Recent-content history requires opt-in; pausing history preserves existing entries, and clearing remains a separate confirmed operation.
- SVG output XML-escapes captions and removes active/unsafe SVG content/attributes. Filenames and payloads are validated before export; duplicate ZIP names are handled safely.
- UPI creates a payment intent only; no payment is processed or verified.

## Known limits

A successful local decoder check is a useful preflight, not a guarantee for every camera, scanner, background, print process, or physical size. Designs that fail the local check show a warning and should be adjusted or tested on the intended surface. Firefox and WebKit were not run in this sandbox.

The screenshots and production build are local QA artifacts, not a public deployment. PR and merge state should be checked on the active GitHub pull request; this report does not claim that the tool has been deployed or publicly launched.
