# QUICKKIT QR Studio V3 — QA & Feature Completion Report (Stage 2: Phases B + C + D)

**Date:** 5 November 2026 (Stage 1: 3 November 2026)
**Branch:** `arena/bc33caa6-quickkit` (continues the existing QR history — no rebuild)
**Scope:** Stage 1 delivered Phase B (content types) + Phase C (template library). On the owner's
"Continue" go-ahead, Stage 2 adds **Phase D** (frames + labels, independent eye colours, brand
palettes, logo background). Phases F / G / H / E follow; J (browser e2e) when a browser is available.
**Baseline before changes:** 594 unit tests / 37 files passing, clean `npm ci`.

---

## 1. Phase B — Content types: 12 → 27 (all real, all decode-verified)

Every type has its own validated fields and a real payload builder. Nothing is a dropdown label
without a payload. Destination-link types encode **user-provided https URLs only** — QUICKKIT never
fetches, opens or pretends to retrieve account/document data.

| # | Type | Payload mechanism | Validation | Status |
|---|------|-------------------|-----------|--------|
| 1 | Website URL | normalized http(s) URL | scheme/credential/localhost guards | preserved |
| 2 | Plain text | raw UTF-8 | ≤2500 chars | preserved |
| 3 | Email | `mailto:` + cc/subject/body | email regex | preserved |
| 4 | Phone | `tel:` | 3–15 digits | preserved |
| 5 | SMS | `SMSTO:` | number + message | preserved |
| 6 | WhatsApp | `wa.me/<digits>?text=` | digits-only number | preserved |
| 7 | Wi-Fi | `WIFI:` (WPA/WEP/open, hidden, EAP) | ISO escaping, secret redaction | preserved |
| 8 | vCard contact | vCard 3.0, RFC folding | 14 fields | preserved |
| 9 | Location | `geo:` / Maps / Maps-app | lat/lng range | preserved |
| 10 | Calendar event | iCalendar `VEVENT` | real dates, UTC/floating | preserved |
| 11 | Social profile | 14 platform URLs | handle/URL normalization | preserved |
| 12 | App download | App Store / Play / Amazon / custom | App ID + package parsing | preserved |
| 13 | **Instagram profile** | `instagram.com/<handle>/` | handle or full URL | **new** |
| 14 | **Facebook page** | `facebook.com/<page>` | page name or URL | **new** |
| 15 | **YouTube channel** | `youtube.com/@handle` or `/channel/UC…` | handle / channel ID / URL | **new** |
| 16 | **Spotify / music** | `open.spotify.com` content link or any https music URL | Spotify path must be track/album/playlist/artist/episode/show/user | **new** |
| 17 | **Google Maps location** | `google.com/maps/search/?api=1&query=…` | place, lat/lng range, or Google Maps link host check | **new** |
| 18 | **Google Review link** | `search.google.com/local/writereview?placeid=…` | Place ID format, or g.page/Google review link | **new** |
| 19 | **Business website + contact** | vCard 3.0 with ORG/URL/TITLE/TEL/EMAIL/ADR | name + website required, vCard escaping | **new** |
| 20 | **Product / shopping link** | validated https URL | dangerous schemes refused | **new** |
| 21 | **Appointment booking** | validated https URL | dangerous schemes refused | **new** |
| 22 | **Event / ticket link** | validated https URL | dangerous schemes refused | **new** |
| 23 | **PDF / document link** | validated https URL | dangerous schemes refused | **new** |
| 24 | **Image gallery link** | validated https URL | dangerous schemes refused | **new** |
| 25 | **Video link** | validated https URL | dangerous schemes refused | **new** |
| 26 | **Multi-social links** | validated https link-in-bio URL | dangerous schemes refused | **new** |
| 27 | **Multi-link landing page** | validated https hosted-page URL | dangerous schemes refused | **new** |

**Verification:** `tests/qr-payload.test.ts` asserts the exact payload string for every type and
renders each into a PNG that **jsQR decodes back to the identical string**. New validation edge cases
(bad coordinates, non-Google review hosts, non-content Spotify paths, missing business name/website,
`javascript:` schemes) are covered. `tests/qr-v3-evidence.test.ts` re-renders all 27 from realistic
samples and decodes each; with `QR_EVIDENCE=1` it emits the actual PNGs to `evidence/content-*.png`.

**Note on multi-social / multi-link:** these encode a single hosted landing-page URL (the only honest
static-QR mechanism). The downloadable landing-page *builder* is Phase E and is not yet built; the
field help says so plainly. No dynamic/editable QR or analytics is claimed.

**Small additive fix:** the shared email regex now accepts valid multi-label domains
(`hello@mail.example.com`) while still rejecting empty/consecutive-dot labels — needed for business
contacts; no previously-valid input is rejected and no existing test changed its expectation.

---

## 2. Phase C — Template library: 8 → 55, categorized gallery

**55 distinct templates across the 11 required categories** (5 each): Business, Restaurant & Cafe,
Social Media, Events, Marketing, Product Packaging, Personal, Education, Retail, Travel, Real Estate.
The original 8 (Signature, Midnight Grape, Editorial Mono, Sunrise Coral, Mint Fresh, Inverted Noir,
Clear Badge, Poster Bold) are retained within their categories.

Each template defines: **colour scheme** (solid/linear/radial), **background**, **module pattern**,
**corner/eye style**, **logo positioning** (on logo-oriented templates), a **label/caption**, a
suggested **print layout** and **physical print size (mm)**. Applying a template pre-fills the real
PDF caption + print-width options, so it changes printable output, not just on-screen colour.

**Gallery features (all real, wired to the engine):**
- **Search** across name, blurb, caption and category label (case-insensitive).
- **Filter by category** chips (All + 11 categories + My templates), horizontally scrollable on mobile.
- **Template preview** — every card shows a genuine rendered mini-QR (`QrThumb`), never a swatch.
- **One-click Apply** — resets to defaults + template (no blending), keeps the user's logo image/size.
- **Customize after applying** — all Design Studio controls remain live.
- **Save custom template** — name + category, persisted to a new localStorage key.
- **Duplicate** any built-in or custom template into an editable copy.
- **Reset** to the house look.
- **Delete** custom templates.

**Verification:** `tests/qr-render.test.ts` renders and decodes **all 55** templates.
`tests/qr-templates.test.ts` (13 tests) checks ≥50 distinct ids, all 11 categories, per-template
metadata, the original 8 names, search/filter behavior, and the save/duplicate/delete round-trip —
including that custom templates **never write to the preset or history storage keys**.
`tests/qr-v3-evidence.test.ts` emits one rendered PNG per category to `evidence/template-*.png`.

**Note (updated in Stage 2):** templates express their look through colour/pattern/eyes/logo plus the
caption + print metadata that drive the real PDF. Frames are now a live, decode-verified Design Studio
control (Phase D below) that can be layered on any template; template cards still show the unframed
symbol so the preview is never a mock-up.

---

## 3. Phase D — Frames, labels, eye colours, brand palettes, logo background (Stage 2)

All new design state is clamped from untrusted input, carried in share links, and preserved by
presets/history. Every combination below is **decode-verified by jsQR before export** — a frame that
would break scanning is blocked, never silently shipped.

| Feature | What was built | Status |
|---------|----------------|--------|
| **Frame presets** | Scan Me / Menu / Follow Us / Contact / Visit — rounded plum border + bottom CTA banner drawn outside the quiet zone; the square symbol shrinks into a code region above the banner | **new, verified** |
| **Custom frame text** | Free-text banner (≤40 chars), uppercased and auto-fitted to the banner width | **new, verified** |
| **Stroke-font labels** | New `lib/tools/qr/font.ts`: pure polyline glyphs (A–Z, 0–9, punctuation) on a 4×6 grid, shared by the rasterizer, SVG and tests — no canvas, no network font, no licensing question. Round-cap strokes | **new, verified** |
| **Frame colours** | Border/text colour + banner fill, both HEX-editable | **new, verified** |
| **Independent finder colours** | Optional `eyeFrame` (ring) + `eyeBall` (centre) overrides with toggles + HEX pickers; safety audit blocks/cautions a finder that loses contrast against the field | **new, verified** |
| **Brand palette quick-picks** | Deep Plum / Rose on blush / Coral on cream / Midnight / Plum→rose gradient swatches in the Colours fold | **new, verified** |
| **Logo background colour** | Optional halo-colour override (`logo.bg`) with toggle + HEX picker; defaults to the field colour | **new, verified** |
| **`line` shape** | New scene shape rendered analytically (capsule SDF) in the rasterizer and as round-cap `<line>` strokes in SVG | **new, verified** |

**How scannability is preserved:** the frame border and banner sit *outside* the symbol's quiet zone;
the symbol keeps its full margin. The verification module-count hint now reflects the smaller code
region (`scene.size / scene.modulePx`), so the decode ladder targets the right module size for framed
codes. The safety audit's px/module check uses the same code-region ratio, and a new finder-contrast
check guards the independent eye colours.

**Verification:** `tests/qr-render.test.ts` (+12 tests) decodes every frame preset, a long custom
label, independent eye colours, a logo with an explicit background, frame+logo together, a framed
transparent PNG, asserts the SVG carries the stroke geometry, and asserts the safety audit flags a
near-invisible finder. `tests/qr-studio.test.tsx` (+3 tests) drives the Frame tab and the finder-colour
toggle through the real engine in jsdom. `tests/qr-v3-evidence.test.ts` emits six framed/eye/logo
artworks to `evidence/design-*.png`, all decoded.

---

## 4. Branding

Templates, the gallery **and now the Design Studio itself** use the requested QUICKKIT palette — Deep
Plum `#3B1B4F`, Rose Pink `#D6598F` / deep rose `#B93A73`, Coral `#FF6B6B` / deep coral `#C93A3A`,
Midnight `#1A0F2E`, Soft Blush `#F4D7D4` — on the existing premium light theme. The Signature template
is the plum→rose house look; Phase D adds one-click brand-palette swatches (incl. a plum→rose gradient)
to the Colours fold, and frames default to a plum border on a blush banner. Page structure (Create /
Bulk / History / Presets; Content / Design / Advanced / Preview) is unchanged; the design card now has
six folds (Colours / Pattern / Corners / Logo / **Frame** / Templates).

---

## 5. Test & build evidence

| Gate | Result |
|------|--------|
| TypeScript (`tsc --noEmit`) | clean |
| ESLint (changed files) | clean |
| Prettier (changed files) | formatted |
| Unit suite | **703 passing / 39 files** (was 682/39 at Stage 1, 594/37 baseline; +21 in Phase D) |
| Independent decode | every content type + all 55 templates + 11 category samples + 6 framed/eye/logo designs decoded by jsQR to the exact payload |
| Production build (`npm run build`) | clean; `/tools/qr-generator` prerendered static |
| Dev preview | running on port 3000 (live preview) |
| Rendered artifacts | 44 real PNGs + `report.json` in `docs/qr-studio-v3/evidence/` |

**CSP:** untouched. No production policy was weakened.

### Screenshot limitation (honest)
Browser screenshots could **not** be captured in this sandbox: the Playwright Chromium CDN
(`cdn.playwright.dev`) and Debian package repositories are both outside the sandbox's allowed network
hosts, and no system browser is present. Instead, this stage provides (a) the **live dev preview** for
interactive desktop/mobile inspection and (b) **engine-rendered, decode-verified QR PNGs** as concrete
visual evidence. The Playwright e2e suite (which includes the overflow sweep and download-decode
checks) is unchanged and ready to run wherever a browser is available. UI screenshots will be captured
in a browser-enabled environment before final sign-off.

---

## 6. Preserved functionality (no regressions)

All pre-existing studio UI tests pass (the layout test now expects six design folds / ten tabs; the
picker label list covers 27 types). Wi-Fi secret redaction, history/presets storage, bulk CSV, the
decode gate, the safety audit, exports (PNG/high-res/SVG/PDF), copy/share and the "Try sample protects
a typed URL" guard all still work. Existing localStorage keys are untouched; custom templates use a
new key. Unframed designs render byte-for-byte as before (the frame path only activates when a frame
style is chosen).

---

## 7. Remaining stages (Stage 2 continues)

- **Phase F:** PNG DPI metadata, custom px in the export row, A4 print-sheet grid, layout PDFs
  (business card / poster / sticker / product label / table tent / A4 sheet).
- **Phase G:** bulk retry-failed, pre-generation preview, per-row content type.
- **Phase H:** history/preset rename, duplicate, JSON export/import with validation.
- **Phase E:** static multi-link landing-page builder (downloadable HTML) — no backend, no analytics.
- **Phase J:** full e2e + browser screenshots in a browser-enabled environment.

**Status: Stage 2 — Phases B + C + D implemented and verified; F / G / H / E in progress. Awaiting
owner review. Not merged, not deployed.**
