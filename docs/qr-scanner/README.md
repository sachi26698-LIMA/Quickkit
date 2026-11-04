# QR Code Scanner — delivery report

**Route:** `/tools/qr-code-scanner` · **Category:** QR & Barcode · **Status:** implemented, awaiting owner approval
**Added:** 4 November 2026 · **Baseline:** `84d7d46` (tag `pre-qr-scanner-checkpoint`)

The QR Code Generator at `/tools/qr-generator` is untouched and still listed
separately. This is a new, independent tool.

---

## 1. What was built

### Scanning modes

| Mode             | Behaviour                                                                                                                                                                                                                                                                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live camera**  | `getUserMedia` with environment-facing preference, camera picker (labels appear after permission), 720p/1080p/1440p/Auto resolution, torch and zoom where the track reports them, continuous-scan toggle, pause/resume, animated reticule, and a decode loop that never runs two frames at once. Releases the stream on Stop, on unmount and when the tab is hidden. |
| **Upload image** | Drag-drop, file browse, clipboard paste (`Ctrl/⌘+V`), mobile gallery. Rotate 90°, drag-a-box crop, contrast and sharpen sliders, then "Scan again" which re-decodes the same pixels.                                                                                                                                                                                 |
| **Screenshot**   | The same upload path — a screenshot is an image, and every code in it is extracted (see §2).                                                                                                                                                                                                                                                                         |
| **Batch**        | Up to 120 files, bounded concurrency 1–6 (default 3), per-file progress with done/failed/pending/cancelled counts, cancel, retry-failed-only, export.                                                                                                                                                                                                                |

### Supported input formats (honestly)

| Format      | Works                           | Notes                                                                                                                                                            |
| ----------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JPG / JPEG  | ✅                              | Browser decode                                                                                                                                                   |
| PNG         | ✅                              | Transparent pixels composited onto white before decoding                                                                                                         |
| WebP        | ✅                              | Browser decode                                                                                                                                                   |
| GIF         | ✅ (first frame)                | Later frames are not scanned                                                                                                                                     |
| BMP         | ✅                              | Browser decode                                                                                                                                                   |
| AVIF        | ✅ where the browser decodes it | Chrome 85+, Firefox 93+, Safari 16.4+                                                                                                                            |
| HEIC / HEIF | ⚠️ Safari only                  | No other browser can decode HEIC. The file is accepted and, if the browser refuses, the message says so and names the fix rather than reporting "invalid image". |

Limits: 25 MB and 40 MP per image; capture frames are downscaled to ≤ 1440 px.

---

## 2. Decoding

Decoder: **jsQR 1.4.0** (Apache-2.0), already a repository dependency used by the
generator's verification step. No new dependency was added.

`lib/tools/qr-scanner/decoder.ts` runs a named pass ladder and records each pass:

1. original pixels (colour, alpha flattened onto white)
2. Otsu global threshold
3. contrast stretch
4. unsharp mask
5. inverted (light-on-dark symbols)
6. 90/180/270° rotations (`precise` profile only)
7. width ladder — the same frame at 100/72/50/35 % so modules land on a
   decodable pixel size
8. multi-symbol stage: one reduced frame, then overlapping tiles at 3×3, 2×2 and
   4×4 (20 % overlap) so each code reaches the decoder as its own picture
9. finder-pattern localisation (`precise` profile) for skewed or partially
   occluded symbols

**No result is ever invented.** A `DecodedSymbol` exists only if `jsQR` returned
`data` for those exact pixels. When nothing decodes, the UI shows the failure and
the list of passes that were tried — and no payload.

Two jsQR behaviours worth recording, both found by tests:

- `inversionAttempts: "onlyInvert"` throws (`matrix` is undefined) because the
  library only builds the inverted matrix alongside the normal one. Inverted
  passes therefore hand pre-inverted pixels with `"dontInvert"`.
- Its locator returns **one** symbol per call, and against a 900 px collage it
  picks whichever it finds first. Masking the found symbol and re-scanning did
  **not** find the neighbours in testing; overlapping tiles did. Both live in the
  code, tiles are the primary strategy.

Polarity (`symbol.inverted`) is measured, not assumed: the finder pattern's
centre square is sampled in the source raster — dark means normal, light means
inverted. The decoder does not report the error-correction level, so the UI shows
"not reported by the decoder" rather than a guess.

---

## 3. Content recognition

`lib/tools/qr-scanner/content.ts` — 16 types, each a parser with a real grammar:
URL, text, email (`mailto`), phone (`tel`), SMS (`sms:`/`SMSTO:`), WhatsApp
(`wa.me`, `api.whatsapp.com`, channels), Wi-Fi (`WIFI:` with backslash escapes),
vCard 3.0/4.0 and MECARD, `geo:`, iCalendar `VEVENT`, social profiles, app-store
links, payment (`upi://pay`, `solana:`), cryptocurrency (BTC/ETH/LTC/DOGE with
optional amount), product identifiers (GTIN-8/12/13/14 **with check-digit
validation**), and unknown.

Each type supplies a label, a summary, fields, and only the actions its payload
actually supports. A URL never gets an "open" action from the recogniser — that
comes from the security panel and requires confirmation.

Tests pin the negative space: prose stays text, a 7-digit run is not a phone
number, a bad GTIN check digit is reported as invalid, `geo:999,20` is not a
location.

---

## 4. Security inspection

`lib/tools/qr-scanner/security.ts` — local, rule-based, offline. Findings:
plain HTTP, raw IPv4/IPv6 literal, punycode/IDN, ≥ 5-label host, `@` in the
authority, embedded username/password, non-standard port, known URL shortener,
lookalike brand (brand token inside the host, homoglyph folding `1→l 0→o …`, and
edit-distance ≤ 1 typosquats), dangerous schemes (`javascript:`, `data:`,
`file:`, `ms-msdt:`, `intent:`, …), control characters, and markup that looks
executable.

Statuses: **No obvious warning found** / **Caution — inspect before opening** /
**High risk — treat this destination as unsafe** / **Unable to verify**.

Deliberate limits, stated in the UI:

- HTTPS is never treated as evidence of safety; "no obvious warning found" is the
  strongest positive verdict available, and the panel says why (no reputation or
  malware data is consulted, because nothing leaves the device).
- High risk disables the open button outright.
- Wi-Fi and payment payloads always carry a caution, because of what they are.
- Decoded content is rendered as text only — never as HTML.
- A recognised scheme (`WIFI:`, `UPI:`, `MECARD:`…) is not also reported as an
  "unrecognised URI scheme"; a genuinely custom scheme still is.

---

## 5. Results, history, export, settings

- **Results:** numbered cards per scan, one sub-card per decoded code, with the
  payload, parsed fields (secrets masked and tagged), a copy/share/download row,
  the security panel and an expandable decode audit (timestamp, QR version, byte
  count, which pass read it, polarity). Multi-select narrows exports.
- **History:** local only, searchable, filterable by type and date range, sortable,
  multi-select, per-record and bulk delete, export. Cleared automatically when the
  history switch is turned off.
- **Privacy rule:** payloads the recogniser marks sensitive (Wi-Fi passwords and
  similar) are stored **redacted** unless "Store sensitive payloads" is enabled.
  Image files are never stored — only names and byte sizes.
- **Export:** CSV / JSON / TXT for listed results, selected results, batch output
  and history. CSV carries a UTF-8 BOM, CRLF rows, quotes fields containing
  `, ; " \n`, doubles embedded quotes, and prefixes `= + - @ tab CR` with `'` to
  defuse spreadsheet formulas — a decoded QR payload is attacker-controlled text.
- **Settings:** continuous scanning, duplicate detection, auto-copy, sound,
  vibration, auto-clear (never/15/30/60/120 s), camera resolution, preprocessing
  (off/light/strong), sensitivity (duplicate window), history on/off, sensitive
  storage, default mode, four export toggles, reset. All values are clamped on
  read and write, so a tampered `localStorage` blob cannot produce a state the
  code has no behaviour for.

### Duplicate suppression

Two rules (`lib/tools/qr-scanner/duplicate.ts`), both tested:

1. a payload **already in the results list** is never appended again — otherwise
   a camera pointed at one code fills the list;
2. a payload read within the sensitivity window (1.2 / 3 / 6 s) is skipped.

Clearing the results releases the payload, so a deliberate rescan works. In
browser testing this changed 9 s of continuous scanning from **4 duplicate rows
to 1**.

---

## 6. Layout

Namespaced `.scanner*` classes only, so nothing here can reach another tool.
Palette from the existing tokens (`--plum`, `--rose-deep`, `--coral`,
`--blush`) on the light blush background, white rounded cards, the shared
`--shadow`, and the same type scale as the rest of the toolkit.

- ≥ 1100 px: two columns — input left, results pinned right.
- < 1100 px: one column, results stacked underneath.
- < 720 px: tab labels shorten to Camera / Upload / Batch / History.
- < 560 px: larger tap targets, stacked fields, full-width control rows.
- Keyboard: tabs use roving `tabindex` with ←/→; the payload block is focusable
  for copying; every control is a real button, checkbox or select.
- `prefers-reduced-motion` stops the scan-line animation.

---

## 7. Files

**Created**

```
app/tools/qr-code-scanner/page.tsx          route: SEO, breadcrumb, steps, FAQs
components/tools/qr-scanner/index.tsx       workspace shell (4 tabs)
components/tools/qr-scanner/camera-panel.tsx
components/tools/qr-scanner/upload-panel.tsx
components/tools/qr-scanner/batch-panel.tsx
components/tools/qr-scanner/results-panel.tsx
components/tools/qr-scanner/history-tab.tsx
components/tools/qr-scanner/settings-panel.tsx
components/tools/qr-scanner/use-scanner.ts  state, history, duplicate, cleanup
lib/tools/qr-scanner/types.ts               shared types
lib/tools/qr-scanner/raster.ts              orientation, crop, grey, Otsu, sharpen
lib/tools/qr-scanner/locator.ts             finder-pattern search
lib/tools/qr-scanner/decoder.ts             pass ladder + multi-symbol engine
lib/tools/qr-scanner/content.ts             16-type recognition
lib/tools/qr-scanner/security.ts            risk inspection
lib/tools/qr-scanner/duplicate.ts           duplicate rules
lib/tools/qr-scanner/history.ts             local history + redaction
lib/tools/qr-scanner/settings.ts            settings + clamping
lib/tools/qr-scanner/export.ts              CSV/JSON/TXT + filenames
lib/tools/qr-scanner/camera.ts              support, errors, capture
lib/tools/qr-scanner/image-source.ts        file → raster, format honesty
lib/tools/qr-scanner/scan-client.ts         worker client + fallback
workers/qr-scan.worker.ts                   off-main-thread decoding
tests/qr-scanner-decode.test.ts             24 cases on real QR pixels
tests/qr-scanner-content.test.ts            36 cases
tests/qr-scanner-data.test.ts               26 cases
tests/qr-scanner-duplicate.test.ts          9 cases
tests/qr-scanner-worker.test.ts             6 cases
tests/e2e/qr-scanner.spec.ts                10 browser cases
docs/qr-scanner/*.png                       desktop + mobile screenshots
```

**Modified** (registry and count assertions only — no behaviour of another tool
changed)

```
lib/catalog.ts              +1 tool record (phase 14)
components/tool-icon.tsx    +1 icon key ("scan" → ScanLine)
app/globals.css             appended `.scanner*` block
tests/catalog.test.ts       QR category now expects two tools
tests/split-regression.test.tsx  28 → 29 tools
tests/launch.test.ts        sitemap count 28 → 29
```

No dependency was added. `jsqr` and `qrcode` were already present.

---

## 8. Verification

All commands were run in this workspace; results are what they printed.

| Check              | Command                                            | Result                                                                         |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Unit / integration | `npx vitest run`                                   | **63 files, 1082 tests passed**                                                |
| Types              | `npx tsc --noEmit`                                 | clean                                                                          |
| Lint               | `npx eslint .`                                     | 0 errors, 3 warnings (`<img>` for blob URLs, which `next/image` cannot handle) |
| Format             | `npx prettier --check …`                           | all files clean                                                                |
| Production build   | `npm run build`                                    | succeeded; `/tools/qr-code-scanner` prerendered                                |
| Browser E2E        | `npx playwright test tests/e2e/qr-scanner.spec.ts` | **10/10 passed** against `next start`                                          |

Browser E2E covers: URL decode and type badge, Wi-Fi parse with password
withheld from `localStorage`, lookalike domain → high risk + disabled open button,
three-code collage → three cards, blank image → honest "no code" with no payload,
batch of two with CSV BOM and quoted comma in a filename, camera decode → pause →
no duplicates over 6 s → stream released on Stop, permission denial → guidance
while upload stays usable, keyboard arrow navigation, mobile overflow ≤ 1 px, and
a regression check that the QR Code Generator still renders.

Also verified manually in headless Chromium against the production build:

- the decode **worker is actually used** (`turbopack-worker-*.js` requested) — a
  wrong relative path had made every decode fall back to the main thread
  silently; fixed, and `tests/qr-scanner-worker.test.ts` now guards it;
- an inverted (white-on-dark) code decodes and is reported as inverted;
- `javascript:` and `file:` payloads are reported high risk with no open button;
- `http://192.168.0.10/admin` raises both the HTTP and raw-IP findings.

### Browser compatibility

| Browser                     | Verified how                       | Result                                                                                |
| --------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- |
| Chromium (production build) | full E2E above                     | Pass                                                                                  |
| Chrome / Edge desktop       | same engine                        | Expected pass; torch/zoom depend on hardware                                          |
| Firefox                     | not run here (no binary available) | Expected pass for upload/batch; torch unsupported, zoom partial                       |
| Safari / iOS                | not run here (no binary available) | Upload, batch and camera expected to work; HEIC decodes here; torch only on iOS 17.4+ |

Camera requires a **secure context** (HTTPS or localhost). On plain HTTP the tool
detects it and says so instead of showing a dead preview.

---

## 9. Known limitations

1. **No barcode support.** 1D formats (EAN, UPC, Code 128) are not decoded — the
   category is "QR & Barcode", but this tool reads QR only, and the copy never
   claims otherwise. Product identifiers are recognised _inside_ a QR payload.
2. **Multi-symbol extraction is bounded.** The tile sweep stops at the finest
   viable grid (4×4 above 480 px per tile); a screenshot of thirty codes will not
   yield all thirty. Everything found is genuine, nothing missed is invented.
3. **Perspective correction is not implemented.** Rotations, inversion, contrast
   and tiling are; a QR photographed at a steep angle may still fail. The UI
   reports the failure and the passes tried.
4. **Damaged codes** decode only as far as the printed error-correction level
   allows, and the decoder does not report that level.
5. **Error-correction level is never shown**, because jsQR does not expose it.
6. **Torch and zoom** appear only when the track advertises them; support varies
   by device and browser.
7. **HEIC** works only in Safari. This is a browser limitation, and the message
   says so.
8. **Security inspection is structural only.** No reputation, blocklist or
   redirect-following check exists, by design — that would require sending the
   payload to a third party.
9. **Firefox, WebKit and physical-device testing remain outstanding** (see §8).
10. **`history-off` deletes immediately** rather than archiving; that is
    intentional, and the switch copy says so.

---

## 10. Not done, by instruction

- Not merged, not deployed, not indexed.
- No change to the QR Code Generator or any other tool's behaviour.
- No backend, no upload, no analytics, no third-party request of any kind.
