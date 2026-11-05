# QUICKKIT QR Generator V3 — Audit & Implementation Plan

**Date:** 3 November 2026
**Branch:** `arena/bc33caa6-quickkit` (continues the existing QR work; history preserved)
**Baseline:** `main` @ `012f03c` — working tree clean, `npm ci` clean, **594 unit tests / 37 files passing** before any change.
**Status:** Phase A complete. Implementation plan below; no major code changes made yet.

---

## 1. What exists today (V2, verified in code)

The QR tool is a mature, browser-only studio. Engine: `lib/tools/qr/*` (19 files, ~4,800 lines). UI: `components/tools/qr-generator/*` (13 files, ~4,200 lines). Route: `/tools/qr-generator`. There is **no backend** — no `app/api`, no database, no redirect service. Production CSP is enforced (`default-src 'self'`); dev serves the same policy report-only so hydration works.

### 1.1 Content types — 12, all with real validated payload builders

| # | Type | Payload | Notes |
|---|------|---------|-------|
| 1 | Website URL | normalized http(s) URL | scheme/credential/localhost guards, ≤2000 chars |
| 2 | Plain text | raw UTF-8 | ≤2500 chars |
| 3 | Email | `mailto:` with cc/subject/body | email regex |
| 4 | Phone | `tel:` | 3–15 digits, country code |
| 5 | SMS | `SMSTO:` | pre-filled message |
| 6 | WhatsApp | `https://wa.me/<digits>?text=` | digits-only number |
| 7 | Wi-Fi | `WIFI:T:…;S:…;P:…;H:…;E:…;` | WPA/WEP/open, hidden, EAP (tls/ttls/pwd), ISO escaping, password redacted everywhere |
| 8 | vCard contact | vCard 3.0 | 14 fields, RFC line folding, TEXT escaping |
| 9 | Location | `geo:` / Google Maps / Maps-app link | lat/lng validation, label, zoom |
| 10 | Calendar event | iCalendar `VEVENT` | all-day, floating/UTC, RFC 5545 folding |
| 11 | Social profile | platform URL | 14 platforms: Instagram, X, Facebook, LinkedIn (+company), YouTube, TikTok, Snapchat, Threads, Pinterest, GitHub, Telegram, WhatsApp, custom URL |
| 12 | App download | App Store / Play / Amazon / custom URL | App ID + package-name parsing |

### 1.2 Design options (Design Studio V2)

- **Colours:** solid / linear / radial fills for foreground *and* background, gradient angle, HEX inputs, 6 preset swatches, live worst-case contrast read-out (floor 3:1, good ≥4.5:1), transparent background, invert.
- **Patterns:** 5 verified module styles — square, rounded, dots, classy, classy-rounded — plus dot scale (55–100%) and corner radius.
- **Corners (eyes):** 5 finder styles — square, rounded, dots, classy, circle. *No independent eye colours yet.*
- **Logo:** PNG/JPEG/WebP/GIF/BMP upload (SVG deliberately refused — script risk), ≤3 MB, decoded to pixels only (EXIF stripped), scale 8–30%, X/Y offset, halo padding, square/rounded/circle mask, halo toggle, automatic error-correction boost, coverage analysis.
- **Advanced:** error correction L/M/Q/H + "strongest free level" boost, quiet zone 0–16 modules, export size 128–2048 px (+ preset chips), transparent, invert, capacity read-out.
- **Templates:** **8** premium templates (Signature, Midnight Grape, Editorial Mono, Sunrise Coral, Mint Fresh, Inverted Noir, Clear Badge, Poster Bold). No categories, search, frames, labels, layouts or print metadata. Apply resets to defaults + template, keeping the user's logo and size.

### 1.3 Exports

PNG (exact verified size), High-res PNG (2048 px, re-rendered + re-verified), SVG (same scene graph as the PNG), PDF (A4 / US Letter / 60 mm square / fit-to-code, physical mm size, caption, padding — real `pdf-lib` PDF embedding the verified PNG), transparent PNG (design toggle), clipboard copy, share link (config in `#` fragment, secrets excluded), bulk ZIP + CSV result report.
*Missing:* DPI metadata, print-sheet grid, layout PDFs (business card / poster / sticker / product label / table tent), custom dimensions surfaced in the export row.

### 1.4 Bulk CSV

Upload ≤3 MB / ≤500 rows / ≤30 columns / ≤1500 chars per cell; delimiter auto-detect (`, ; tab |`); RFC 4180 parser (quotes, embedded newlines); column mapping with synonym guessing; shared fallback values from the Content tab; per-row validation errors; duplicate detection + skip; real progress bar; **cancel**; per-row PNG download; ZIP download; CSV report; optional decode-verify per row (≤120 rows); render size 256–1024 px.
*Missing:* retry-failed, pre-generation payload preview, per-row content type (one type per batch today), SVG in ZIP.

### 1.5 History & presets

- **History:** 20 entries, "full" vs "designs-only" modes, secrets never stored, real mini-QR thumbnails, Apply design / Edit-and-regenerate, delete one / clear all. *Missing:* rename, duplicate, export/import.
- **Presets:** 24 saved designs, save/apply/delete, thumbnails, design-only (no logo, no content). *Missing:* rename, duplicate, export/import, custom templates in a gallery.

### 1.6 Verification (the core guarantee — keep it)

Every render is decoded by **jsQR** (independent decoder) from the exact rendered pixels; the decoded string must equal the payload byte-for-byte or export is blocked. A width-ladder resample + hard-threshold pass mirrors real scanner pipelines. A static safety audit (contrast, quiet zone, px/module, logo coverage, EC level) gates export too, with a "Make it safe" fixer. An on-demand scan test renders 160–1200 px frames. 88 QR unit tests + Playwright download-decode tests already exist.

### 1.7 Branding

`app/globals.css` already defines the exact requested palette (`--plum #3b1b4f`, `--rose #d6598f`, `--coral #ff6b6b`, `--blush #f4d7d4`) and the QR studio CSS aliases it. **However** the QR engine defaults, swatches and templates still use the older purple (`#2a1b5e`, `#4b19b8`), so the generated artwork is off-brand.

---

## 2. Gap analysis vs the V3 brief

| Phase | Existing | Missing / to build |
|-------|----------|--------------------|
| B — Content types | 12 real types | 15 more: Instagram, Facebook page, YouTube channel, Spotify/music, multi-social, Google Maps, Google Review, business website+contact, product/shopping, appointment booking, event/ticket, PDF/document, image gallery, video, multi-link landing page |
| C — Templates | 8, flat list | 11 categories, ≥50 templates, search + filter + preview + apply + customize-after + save-custom + duplicate + reset; per-template frame/label/logo/layout/print metadata |
| D — Design studio | colours/patterns/corners/logo/advanced | **Frames + label text** (Scan Me / Menu / Follow Us / Contact Us / Visit Website / custom), **independent eye colours**, brand preset palettes, logo background colour, **print layouts**, extra verified module styles if reliable |
| E — Smart Link | none | **Static-only** multi-link: downloadable self-contained HTML landing page + QR of the user's hosted URL. No backend exists → no dynamic editing/analytics claims |
| F — Exports | PNG/high-res/SVG/PDF/transparent/ZIP | PNG **DPI metadata (pHYs)**, custom px in export row, **A4 print-sheet grid PDF**, **layout PDFs**, optional SVG in bulk ZIP |
| G — Bulk | most of it | **Retry failed**, **preview payloads before generation**, **per-row content type column**, keep cancel/progress/errors/ZIP |
| H — History/presets | save/apply/delete | **Rename, duplicate, JSON export/import with validation**, custom templates; never clear existing storage |
| I — Branding | site palette correct | Retune QR defaults/swatches/templates to Deep Plum / Rose / Coral / Midnight / Blush; mobile template browsing |
| J — Quality | strong decode gate | Decode-test every new type, every template, frames, eye colours, gradients, logos, transparency, long payloads, bulk, ZIP, layouts, DPI; screenshots; dev + prod build |

---

## 3. Implementation plan (in execution order)

### Step 1 — Content types (Phase B)
Extend `QrContentTypeId` + registry in `lib/tools/qr/payload.ts` with 15 new definitions, each with tailored validated fields and a real builder:
- **Instagram / Facebook page / YouTube channel** — dedicated types reusing the proven social URL builders (handle or full URL; YouTube handle vs `UC…` channel ID).
- **Spotify / music** — validates `open.spotify.com` links (track/album/playlist/artist/episode/show) or any https music link.
- **Google Maps** — place/address search or lat/lng → `google.com/maps/search/?api=1&query=…` / place links.
- **Google Review** — Place ID → `search.google.com/local/writereview?placeid=…`, or a pasted review URL (validated, never fetched).
- **Business website + contact** — vCard 3.0 with ORG/URL/title/phones/email/address.
- **Product / booking / event-ticket / document / gallery / video** — validated https destination URLs with per-type guidance and domain hints; video accepts YouTube/Vimeo/direct file URLs; document accepts any https document URL. No data is fetched or pretended.
- **Multi-social / multi-link landing** — QR encodes a user-provided hosted landing-page URL; QUICKKIT additionally generates a downloadable static HTML page (Step 5).
Unit tests: exact payload strings + jsQR round-trip for all 27 types.

### Step 2 — Frames, eye colours, palettes (Phase D engine)
- Extend `QrDesign` with `frame` (style + text + colours) and optional `eyeFrame` / `eyeBall` fills.
- Frames render **outside the quiet zone** in the shared scene graph, so SVG, PNG and preview stay identical. Banner text uses a built-in single-stroke vector font (pure data, no canvas, no network font) so the rasterizer, SVG and unit tests all render the same glyphs.
- Verification decodes the **full framed artwork**; safety audit checks eye-colour contrast too.
- Brand preset palettes + retuned default foreground (Deep Plum), logo halo colour option.

### Step 3 — Template library (Phase C)
New `lib/tools/qr/templates.ts`: **55+ templates across the 11 requested categories**, each a full design + frame + label + logo position + suggested layout/print size. Gallery UI: search, category chips, real mini-QR previews, one-click Apply, customize-after, save-as-custom-template, duplicate, reset. Custom templates persist locally (backward-compatible with existing presets). A unit test renders and decodes **every** template.

### Step 4 — Exports & layouts (Phase F)
- `png.ts`: optional **pHYs DPI chunk** (72/150/300/600), verified by parsing PNG chunks in tests.
- `lib/tools/qr/layouts.ts`: real PDF layouts embedding the verified PNG — business card 85×55 mm, poster A4/A3, sticker 50 mm, product label 60×40 mm, table tent (folded A4), **A4 print sheet** (grid of N copies + captions + cut marks).
- Export row: custom pixel dimensions + DPI selector; keep every existing format and gate.

### Step 5 — Smart Link, static only (Phase E)
New "Multi-link landing page" content type + `lib/tools/qr/landing.ts`: generates a **self-contained, brand-styled HTML file** (inline CSS, no JS, no tracking) from a title/bio + up to 8 links (website, Instagram, Facebook, YouTube, WhatsApp, email, phone, custom). The user hosts it anywhere; the QR encodes that hosted URL. UI states the limitation plainly: static QR, no QUICKKIT server, no scan analytics, editing = re-upload to the same URL. No dynamic QR is claimed.

### Step 6 — Bulk upgrades (Phase G)
Retry-failed-rows button; pre-generation payload preview (build all payloads, show errors before rendering); optional per-row `type` column mapped to any registered content type; keep cancel, progress, per-row errors/downloads, ZIP + report.

### Step 7 — History & presets (Phase H)
Rename + duplicate for presets and history; export one/all as JSON; import with strict validation (known type, clamped design, secrets stripped); custom templates appear in the gallery. Existing storage keys and data are preserved and migrated, never cleared.

### Step 8 — UI, branding, responsiveness (Phase I)
Keep the page structure (Create / Bulk / History / Presets; Content / Design / Advanced / Preview). Add the template gallery, frames/layouts controls, brand palettes. Mobile: horizontally scrollable category chips, 2-column template grid, reachable controls.

### Step 9 — Quality & evidence (Phase J)
- Unit: payloads (27 types), templates (all decode), frames/eye colours/gradients/transparency/logo/long payloads, DPI chunk, layouts (PDF magic + embedded image decode), landing HTML, bulk retry/type column, storage import/export.
- E2E (Playwright): new flows + real downloads decoded back (PNG/SVG/PDF/ZIP), mobile + desktop screenshots, overflow sweep.
- Gates: `tsc`, ESLint, Prettier, full unit suite, production build, dev preview. **No CSP weakening.**
- Deliver: `docs/qr-studio-v3/QA_REPORT.md`, screenshots, feature-by-feature completion table, `TOOL_DEVELOPMENT_STATUS.md` update.

### Guardrails
- No destructive rebuild; engine files are extended, not replaced.
- No unrelated calculator/PDF/Instagram-tool changes.
- No merge/deploy without explicit owner approval.
- Every new visual feature must pass the existing decode gate before it can be exported.
