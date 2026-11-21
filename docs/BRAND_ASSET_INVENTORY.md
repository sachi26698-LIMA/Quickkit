# QUICKKIT Brand Asset Inventory

Complete manifest of every official brand asset. Colour rules, construction
and usage law live in [`BRAND_GUIDELINES.md`](BRAND_GUIDELINES.md); this file
records what exists, where it lives and what it is for.

**Regeneration:** all vector and raster assets below are produced by
`scripts/brand/generate-assets.mjs` from one geometry definition and genuine
Montserrat glyph outlines. The generator is not part of the build — assets are
committed. To rebuild: `npm install --no-save opentype.js @resvg/resvg-js
@expo-google-fonts/montserrat && node scripts/brand/generate-assets.mjs`.
After regenerating, re-embed the inline components (see “In-app components”)
and update this manifest if the set changes.

---

## 1. Reference artwork (do not overwrite)

| File                                                             | Purpose                                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `docs/brand/reference/IMG_20261121_101415.png`                   | Original uploaded wordmark reference                                   |
| `docs/brand/reference/file_000000009c3c821182ad9800cf209d6a.png` | Original uploaded symbol reference                                     |
| `docs/brand/preview-sheet.png`                                   | One-page visual index of every logo variant, favicon sizes and palette |

## 2. Vector logos — `public/brand/`

| File                            | Contents                                                                              | Primary use                                       |
| ------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `logo-symbol.svg` (4.6 KB)      | Full-colour orbital symbol, transparent                                               | App icons, favicons, schema logo, standalone mark |
| `logo-wordmark.svg` (16.7 KB)   | QUICKKIT wordmark + tagline + swoosh, transparent                                     | Wordmark-only placements                          |
| `logo-horizontal.svg` (21.3 KB) | Symbol + wordmark horizontal lockup                                                   | Headers, documents, wide slots                    |
| `logo-vertical.svg` (21.3 KB)   | Stacked lockup                                                                        | Square slots, posters, social profiles            |
| `logo-white.svg` (17.6 KB)      | Horizontal lockup, 100% white                                                         | Dark Navy / dark photography backgrounds          |
| `logo-dark.svg` (17.6 KB)       | Horizontal lockup, Dark Navy `#17132F`                                                | Light backgrounds, documents, print               |
| `logo-mono.svg` (17.6 KB)       | Horizontal lockup, pure black                                                         | Strict single-ink reproduction                    |
| `logo-mono-white.svg` (17.6 KB) | Horizontal lockup, pure white                                                         | Single-ink on dark                                |
| `favicon.svg` (1.9 KB)          | Rounded-square badge: white simplified mark on Deep Purple → Electric Purple gradient | Browser favicon, app icon source                  |

## 3. Raster assets — `public/brand/`

| File                    | Size     | Purpose                                                        |
| ----------------------- | -------- | -------------------------------------------------------------- |
| `favicon-16.png`        | 16×16    | Classic favicon (small)                                        |
| `favicon-32.png`        | 32×32    | Classic favicon (standard)                                     |
| `favicon-48.png`        | 48×48    | Classic favicon (large) / ICO entry                            |
| `favicon-192.png`       | 192×192  | Home-screen icon                                               |
| `favicon-512.png`       | 512×512  | Splash / store listing                                         |
| `icon-192.png`          | 192×192  | PWA icon (`manifest.ts`, purpose `any`)                        |
| `icon-512.png`          | 512×512  | PWA icon (`manifest.ts`, purpose `any`)                        |
| `icon-512-maskable.png` | 512×512  | PWA maskable icon (full-bleed gradient)                        |
| `apple-touch-icon.png`  | 180×180  | iOS home screen                                                |
| `logo-symbol.png`       | 512×512  | Raster symbol, transparent                                     |
| `logo-horizontal.png`   | 1400×437 | Raster horizontal lockup (docs, email where SVG is unsuitable) |
| `logo-vertical.png`     | 1000×897 | Raster vertical lockup                                         |
| `og-image.png`          | 1200×630 | Static social/share card (email, external tools)               |

## 4. App-route assets

| File                      | Purpose                                                                     |
| ------------------------- | --------------------------------------------------------------------------- |
| `app/icon.svg`            | Next.js icon route (`/icon.svg`) — favicon badge                            |
| `app/favicon.ico`         | Multi-size ICO (16/32/48, PNG-compressed entries)                           |
| `app/apple-icon.png`      | Next.js apple icon route (180×180)                                          |
| `public/icon.svg`         | Static copy for the manifest + service worker                               |
| `app/opengraph-image.tsx` | Live social card (1200×630) rendered from the same inline vector components |

## 5. In-app components

| File                        | Exports                                             | Notes                                                                                         |
| --------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `components/brand-logo.tsx` | `BrandSymbol`, `BrandWordmark`, `BrandWordmarkFull` | Inline SVG embedded from the vector files — header, footer, admin, error screens render these |
| `components/brand.tsx`      | `Brand` (default)                                   | Header/footer lockup link; adapts when an admin renames the site                              |

Consumers: public header + footer (`components/header.tsx`,
`components/footer.tsx`), admin sidebar and login
(`components/admin/admin-shell.tsx`, `app/admin/login/page.tsx`), 404
(`app/not-found.tsx`), global error (`app/global-error.tsx`).

## 6. Metadata & system surfaces

| Surface         | File(s)                                         | Brand element                                                          |
| --------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| PWA manifest    | `app/manifest.ts`                               | `theme_color #30105F`, `background_color #FAF8FF`, icon set            |
| Social preview  | `app/opengraph-image.tsx`                       | Symbol + wordmark + tagline                                            |
| Structured data | `lib/seo.ts` (`siteStructuredData`)             | Organization `logo` → `/brand/icon-512.png`                            |
| Email templates | `supabase/email-templates/templates/*.html` (6) | Two-tone wordmark, official tagline, official palette, signature block |
| Email subjects  | `supabase/email-templates/subjects.json`        | QUICKKIT naming                                                        |

## 7. Design tokens

The palette and typography tokens (`--brand-*`, `--font-*`) are defined in
`app/globals.css`; the same hexes live in `PALETTE` inside
`scripts/brand/generate-assets.mjs`. Change both together, then regenerate.

---

_Last generated: 2026-11-21 (generator v1)._
