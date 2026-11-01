# QR Code Generator — V2 feature guide

**Route:** [`/tools/qr-generator`](../../app/tools/qr-generator/page.tsx)  
**Processing model:** Local in the browser. QR content, CSV files, and logos are not sent to QUICKKIT servers.

The existing QR Generator is a single, editable studio for creating, styling, checking, and exporting common QR payloads. It does not add separate routes for Wi-Fi, vCard, batch, or payment generation.

## Content types

The generator supports 15 payload types with type-aware fields and validation:

- Text and website URL
- Wi-Fi network (SSID, password, security, hidden-network setting)
- Phone call, email, and SMS
- Contact card (vCard) and business contact card
- WhatsApp chat
- Geographic location, with coordinates and an optional map URL
- Calendar event, including an optional IANA time zone
- UPI payment intent
- Social profile and app-download/smart-link URL
- Product details and optional product URL

The page previews the encoded payload locally. It never opens or fetches an entered URL. UPI output is a payment intent only; QUICKKIT does not initiate, process, or verify payments.

## Design studio

- Ten editable starting templates and five visual presets: Classic ink, Lavender studio, Botanical, Ocean, and Warm terracotta.
- Live editing with undo/redo, preset comparison, local saved designs, and saved color palettes.
- Preset PNG sizes plus custom width/height canvases, quiet-zone margins, and QR error-correction levels L/M/Q/H.
- Solid or gradient fills; square, rounded, dot, or diamond modules; square, rounded, or circular finder corners; and independent finder-eye color.
- Contrast guidance, frame/caption styles, escaped captions, and safe filenames.
- Local logo upload (PNG/JPG/WebP, maximum 2 MB) with size (12–22%), horizontal/vertical position, padding, plate color, and optional backing plate controls. Logos are processed in the browser and are not saved with designs or history.
- Transparent PNG/SVG exports preserve an opaque, scan-friendly QR quiet zone and add a transparent outer margin. JPG/PDF use the selected background color.

Every generated preview is decoded locally against the expected payload. A warning is shown when the current visual combination cannot be confirmed; that warning is not a guarantee about every physical camera, print surface, or scanner.

## Batch studio

- Paste one item per line or import CSV locally (up to 50 data rows).
- Map QR type, payload/JSON, and filename columns. Typed CSV columns can populate each supported QR form.
- Row-by-row validation, exact-payload duplicate detection, a skip-duplicates switch, and selective row selection.
- Per-row progress/status, cancellation, retry of failed rows, and ZIP export of locally generated PNGs.
- A print-sheet PDF can lay out generated codes on A4 or Letter paper with adjustable columns, margin, and spacing.

Invalid rows and skipped duplicates are excluded from generated files. CSV data is processed in the browser and is not uploaded.

## Local data and privacy controls

- Recent QR history is off by default. Opting in stores recent form/content locally in this browser; turning history off pauses future saves without deleting existing entries.
- Clearing recent history is a separate, user-confirmed action. It does not clear saved designs or saved palettes.
- Saved designs contain style options only, not QR content or logo files. Saved palettes contain color values.
- History and saved items are browser-local; clearing browser storage removes them. No analytics, tracking URLs, or server-side QR generation are added.

## Export formats

| Format | Output |
|---|---|
| PNG | Raster image at the selected/custom canvas size |
| JPG | High-quality JPEG using the chosen background color |
| SVG | Locally generated and sanitized vector image; captions are XML-escaped |
| PDF | Print-ready single-code PDF |
| Clipboard | QR image copied locally when the browser supports image clipboard access |
| Batch ZIP | Individual scan-checked PNG files |
| Print-sheet PDF | A4 or Letter layout of selected generated batch images |

## Responsive screenshots

The full studio was captured at desktop, tablet, and mobile widths by the Chromium E2E test:

- [Desktop — 1440 px viewport](./screenshots/qr-generator-v2-desktop.png)
- [Tablet — 768 px viewport](./screenshots/qr-generator-v2-tablet.png)
- [Mobile — 390 px viewport](./screenshots/qr-generator-v2-mobile.png)

For the verification matrix and exact test results, see [`QA_REPORT.md`](./QA_REPORT.md).
