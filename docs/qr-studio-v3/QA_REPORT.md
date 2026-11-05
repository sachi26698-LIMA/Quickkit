# QUICKKIT QR Studio V3 — QA & Feature Completion Report (Stage 2: Phases B + C + D + F + G + H + E)

**Date:** 5 November 2026 (Stage 1: 3 November 2026)
**Branch:** `arena/bc33caa6-quickkit` (continues the existing QR history — no rebuild)
**Scope:** Stage 1 delivered Phase B (content types) + Phase C (template library). On the owner's
"Continue" go-ahead, Stage 2 adds **Phase D** (frames + labels, independent eye colours, brand
palettes, logo background), **Phase F** (DPI metadata, custom-size export, print layouts, A4 cut
sheet), **Phase G** (bulk preview, per-row content type, retry-failed), **Phase H** (history/preset
rename, duplicate, validated config export/import) and **Phase E** (static Smart Link landing-page
builder). Phase I (brand-swatch retune) follows; J (browser e2e) when a browser is available.
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

## 4. Phase F — Exports: DPI, custom size, print layouts, A4 sheet (Stage 2)

Every export still wraps the **same decode-verified pixels** the preview shows — no format is a second
rendering, and nothing is offered for a code that has not been read back.

| Feature | What was built | Status |
|---------|----------------|--------|
| **PNG DPI metadata** | `withPngDpi` stamps a standard `pHYs` chunk (72/150/300/600 DPI) into PNG + high-res exports. Metadata only — pixels unchanged, so the file still decodes. `readPngDpi` reads it back | **new, verified** |
| **Custom-size export** | A 64–4096 px input re-renders at the requested size and re-verifies before saving; out-of-range values disable the button | **new, verified** |
| **Business card** | 85 × 55 mm PDF — code right, wrapped name left | **new, verified** |
| **Sticker** | 50 × 50 mm PDF — code fills the face, optional caption | **new, verified** |
| **Product label** | 70 × 40 mm PDF — code left, caption right | **new, verified** |
| **Poster** | A4 PDF — large 130 mm code + bold caption | **new, verified** |
| **Table tent** | A4 landscape PDF — fold guide, two faces (one printed inverted so both read upright when folded) | **new, verified** |
| **A4 cut sheet** | cols×rows grid of identical codes with cut guides, clamped to fit A4; columns/rows/code-width/gap controls | **new, verified** |
| **Single (preserved)** | The original centre-on-paper PDF with paper/size/padding/caption | preserved |

**Verification:** `tests/qr-layouts.test.ts` (11 tests) proves DPI round-trips at 72/150/300/600 and the
stamped PNG still decodes to the exact payload (and that a second stamp replaces, not duplicates, the
chunk); every layout reloads via `PDFDocument.load` as a valid one-page PDF at its promised millimetre
dimensions; the table tent is A4 landscape; the sheet grid clamps an oversized request to fit A4 and
renders the right page. `tests/qr-studio.test.tsx` (+4 tests) drives the DPI select, custom-size guard,
layout selector and the sheet/fixed-layout control visibility through the real UI.

---

## 5. Phase G — Bulk CSV: preview, per-row type, retry-failed (Stage 2)

The V2 bulk pipeline (column mapping, per-item errors, progress, cancel, dedup, decode-verify, ZIP +
CSV report) is preserved. Phase G adds three honest upgrades:

| Feature | What was built | Status |
|---------|----------------|--------|
| **Pre-generation preview** | "Preview rows" validates every payload + flags duplicates with no pixels rendered, so mapping can be fixed before generating | **new, verified** |
| **Per-row content type** | An optional "type" column mixes types in one CSV; each row resolves its type and re-guesses its field mapping. The type column is excluded from field guessing (a "type" header collides with the Wi-Fi-encryption synonym). Unknown/empty cells fall back to the batch default | **new, verified** |
| **Retry-failed** | Re-validates + re-renders only failed rows, keeping successful codes by matching payload | **new, verified** |
| **Skip-duplicates fix** | The V2 toggle had no effect (duplicates were always skipped); they now render when the toggle is off | **fixed, verified** |

**Verification:** `tests/qr-bulk-export.test.ts` (+5 tests) covers `resolveRowType` (known/unknown/empty/
out-of-range cells), `mappingForRow` (reuse vs re-guess, type-column exclusion) and a mixed-type CSV
building a URL payload and a Wi-Fi payload from adjacent rows. `tests/qr-studio.test.tsx` (+3 tests)
drives preview-without-render, the per-row Type column, and retry-failed (a bad row stays failed while
the good row is kept) through the real UI in jsdom.

---

## 6. Phase H — History & presets: rename, duplicate, export/import (Stage 2)

| Feature | What was built | Status |
|---------|----------------|--------|
| **Preset rename** | Inline rename (Enter saves, Escape cancels); empty name keeps the old one | **new, verified** |
| **Preset duplicate** | Editable "… copy" with a new id; original kept | **new, verified** |
| **History rename** | Inline label rename | **new, verified** |
| **History duplicate** | Fresh row (new id + timestamp), secrets re-sanitized | **new, verified** |
| **Config export** | Presets + history → portable JSON (secrets stripped, designs clamped) | **new, verified** |
| **Config import** | Validates app marker + version, then **merges**: dedup by id, invalid rows skipped + counted, caps respected. **Never clears or overwrites existing data** | **new, verified** |
| **Restore / apply** | Pre-existing preset apply + history "edit and regenerate" preserved | preserved |

**Never silently clear:** import is additive only; loading existing storage stays lenient (a legacy
row with a missing/unknown type is kept with its design clamped, not dropped). The "Clear all" and
"delete my data" controls remain explicit user actions.

**Verification:** `tests/qr-bulk-export.test.ts` (+7 tests) covers preset/history rename + duplicate,
export round-trip with secret-stripping, import merge (keeps existing), dedup-by-id, foreign/malformed/
newer-version rejection without touching storage, and skipping invalid history rows while keeping valid
ones. `tests/qr-studio.test.tsx` (+3 tests) drives preset rename/duplicate, history rename and the
export/import controls through the real UI.

---

## 7. Phase E — Static Smart Link landing page (Stage 2)

| Feature | What was built | Status |
|---------|----------------|--------|
| **Builder UI** | "Build a Smart Link page" fold for the *landing* and *socials* types: title, bio, accent, up to 8 links, live preview | **new, verified** |
| **Download HTML** | One self-contained file: inline CSS, system fonts, **no JS, no external requests, no tracking** | **new, verified** |
| **Safety** | All text HTML-escaped; every link passes the http(s)-only `normalizeUrl` (javascript:/data: refused); validation refuses an empty/broken config | **new, verified** |
| **Static limitation notice** | Plain-language note: host it yourself, no analytics, printed QR cannot be edited, no dynamic redirect | **new, verified** |
| **QR of hosted URL** | The existing *landing*/*socials* URL field encodes the public URL where the user hosted the page | preserved |

**No backend, no hosting, no analytics.** QUICKKIT only generates the file; the user hosts it. This is
deliberately static and the UI says so — no dynamic-QR / edit-after-print / permanent-link claim is made.

**Verification:** `tests/qr-landing.test.ts` (9 tests) covers self-containment (no `<script>`, no
external `src`/stylesheet), HTML escaping of hostile titles/labels, dangerous-scheme rejection, accent
colour, title/link validation, the 8-link cap, length/accent sanitisation and `escapeHtml`.
`tests/qr-studio.test.tsx` (+3 tests) drives the builder through the real UI: the limitation notice,
downloading a real HTML blob (asserted to contain the title + link and no script), and the
disabled-until-valid / 8-link-cap behaviour.

---

## 8. Branding

Templates, the gallery **and now the Design Studio itself** use the requested QUICKKIT palette — Deep
Plum `#3B1B4F`, Rose Pink `#D6598F` / deep rose `#B93A73`, Coral `#FF6B6B` / deep coral `#C93A3A`,
Midnight `#1A0F2E`, Soft Blush `#F4D7D4` — on the existing premium light theme. The Signature template
is the plum→rose house look; Phase D adds one-click brand-palette swatches (incl. a plum→rose gradient)
to the Colours fold, and frames default to a plum border on a blush banner. Page structure (Create /
Bulk / History / Presets; Content / Design / Advanced / Preview) is unchanged; the design card now has
six folds (Colours / Pattern / Corners / Logo / **Frame** / Templates).

---

## 9. Test & build evidence

| Gate | Result |
|------|--------|
| TypeScript (`tsc --noEmit`) | clean |
| ESLint (changed files) | clean |
| Prettier (changed files) | formatted |
| Unit suite | **748 passing / 41 files** (was 682/39 at Stage 1, 594/37 baseline; +21 D, +15 F, +8 G, +10 H, +12 E) |
| Independent decode | every content type + all 55 templates + 11 category samples + 6 framed/eye/logo designs decoded by jsQR to the exact payload; DPI-stamped PNGs still decode |
| Print layouts | every layout reloads as a valid PDF at its promised mm size; A4 sheet grid clamped to fit |
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

## 10. Preserved functionality (no regressions)

All pre-existing studio UI tests pass (the layout test now expects six design folds / ten tabs; the
picker label list covers 27 types). Wi-Fi secret redaction, history/presets storage, bulk CSV, the
decode gate, the safety audit, exports (PNG/high-res/SVG/PDF), copy/share and the "Try sample protects
a typed URL" guard all still work. Existing localStorage keys are untouched; custom templates use a
new key. Unframed designs render byte-for-byte as before (the frame path only activates when a frame
style is chosen).

---

## 11. Remaining stages (Stage 2 continues)

- **Phase I:** retune the six off-brand preset swatches to the brand palette (Deep Plum, Rose Pink,
  Coral, Midnight, Soft Blush) — premium light theme and page structure already preserved.
- **Phase J:** full e2e + browser screenshots in a browser-enabled environment.

**Status: Stage 2 — Phases B + C + D + F + G + H + E implemented and verified; I in progress. Awaiting
owner review. Not merged, not deployed.**
