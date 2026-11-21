# QUICKKIT — Reference-Match Correction Report

Date: 2026-11-21 · Branch: `arena/1da2d577-quickkit`

This report closes the strict reference-match correction: the generated brand
artwork was re-derived directly from the two uploaded reference images
(`docs/brand/reference/file_000000009c3c821182ad9800cf209d6a.png` — orbital Q
symbol; `docs/brand/reference/IMG_20261121_101415.png` — wordmark) and verified
against actual rendered desktop and mobile screenshots. The reference files
themselves were never modified.

## What changed

1. **Symbol geometry rebuilt from reference measurements** (512 grid):
   - Main ring: centre (222, 248), outer Ø 332 (band 38), horizontal gradient
     sweep magenta-pink → violet → electric blue → cyan, top-left highlight arc.
   - Planet: dark navy disc **filling the ring opening edge to edge** (r 128 —
     the earlier version had a visible gap), speckle field preserved.
   - Lightning bolt: chunky 6-point zigzag at 85% of the planet Ø
     (`M 244 149 L 183 251 L 220 257 L 207 331 L 305 233 L 266 240 Z`), violet→
     electric-blue gradient with a soft depth shadow.
   - Orbit: thin band (26), rx 237 / ry 97 rotated −20.6°, back half behind the
     planet, front half crossing the lower/planet portion **with the dark navy
     dash-tick texture** where it overlaps the ring/planet footprint.
   - Q-tail: wide flat wedge (70) at ≈ 48° with rounded far end, tucked under
     the ring, violet→periwinkle.
   - Three sparkles upper-right: fat 4-point stars (slightly concave sides,
     sharp points) — large (442, 40) R33, medium (384, 81) R22, small
     (420, 110) R16, magenta-pink → violet gradient.
   - Draw order fixed: orbit-back → tail → ring → planet → bolt → orbit-front +
     dashes → sparkles.

2. **Wordmark block rebuilt from the wordmark reference**:
   - QUICKKIT Montserrat Black Italic, tight tracking; QUICK diagonal
     deep-purple gradient (#2E0B60 → #5E22AC), KIT vertical hot-pink gradient
     (#F055B8 → #C4157F).
   - Two sparkle stars above KIT: small violet left, large pink right.
   - Tagline “Small tasks. Quick solutions.” SemiBold Italic, deep navy,
     centred beneath the wordmark (wording/punctuation unchanged).
   - **Swoosh rebuilt as the reference's purple→pink upward crescent below the
     tagline** (the earlier build curved downward through the text — fixed).

3. **Surfaces updated**: all `public/brand/*` + `app/icon.svg`, `public/icon.svg`,
   `app/apple-icon.png`, `app/favicon.ico` regenerated; `components/brand-logo.tsx`
   re-embedded from the generated SVGs; `.brand-wordmark` CSS re-sized for the
   new viewBox (letters unchanged at 21px); OG image height adjusted; admin
   login brand row given a proper flex topline (fixed a pre-existing
   “CONTROL CENTER” / “OWNER-ONLY ACCESS” overlap visible in the BEFORE shots).

## Reference comparison — verified by rendered side-by-side sheets

Committed: `docs/brand/reference-comparison-symbol.png`,
`docs/brand/reference-comparison-wordmark.png` (reference on top / final render
below), built after inspecting rendered PNGs at multiple zoom levels.

Matched against the references:

| Check | Result |
| --- | --- |
| Symbol-to-wordmark ratio & lockup balance | matched (symbol 300u vs wordmark block in lockups) |
| Icon geometry (ring/planet/bolt/orbit/tail) | matched proportions, angles, spacing |
| Bolt position & size | matched (~85% of planet Ø, centred) |
| Orbit curve/overlap + dash ticks on the front arc | matched |
| Sparkle position (symbol upper-right ×3, wordmark above KIT ×2) | matched |
| Wordmark weight/italic angle | matched (Black Italic, tight) |
| Purple/pink split (QUICK deep purple → KIT hot pink) | matched |
| Tagline wording/punctuation/typography | matched exactly |
| Swoosh: purple→pink, convex-up crescent below tagline | matched |

### Honest residual differences (cannot be fully corrected)

1. **Letter width**: the reference letterforms are ≈ 12–17% wider per glyph than
   Montserrat Black Italic at the same cap height (their font renders
   width/cap ≈ 6.1 vs Montserrat ≈ 5.2). The brief specifies “Montserrat Black
   Italic character” and “no unnecessary letter spacing”, so Montserrat is kept
   at natural tight tracking; reproducing the exact glyph widths would need the
   original font file, which was not provided.
2. **Star silhouettes**: the reference sparkles are a touch more slender with
   slightly sharper concave sides; the vector stars (c = 0.38 bow) are very
   close but marginally fatter at small sizes.
3. **Swoosh tail**: the reference right tip curls up marginally more; the
   generated crescent is within a few units but is a smoother arc.
4. **Speckle field**: the planet texture is procedurally placed to match the
   reference’s density/tone; individual speckle positions are equivalent, not
   pixel-identical.

No other visual difference was found that could be corrected.

## QC evidence

- **Screenshots** (harness: puppeteer-core + headless Chromium, desktop
  1440×900 and mobile 390×844, networkidle + fonts.ready):
  `docs/brand/screenshots/before-*.png` and `after-*.png` × 6 views each
  (desktop/mobile header, desktop/mobile footer, desktop admin login, desktop
  tool page). All AFTER views inspected: header, footer, admin login and tool
  pages render the same identity on light backgrounds; the admin surface
  renders the same identity on dark purple.
- **Asset loading**: all CSS/JS chunks and brand asset paths return 200 on the
  production server; the inline `brand-logo.tsx` embed is byte-verified against
  the generated SVGs (20/20 paths, 32/32 gradient stops).
- **Toolchain**: `tsc --noEmit` ✓ · `eslint .` ✓ · `prettier --check` ✓ ·
  `next build` ✓ (238 static pages) · `vitest` **3495/3495 tests, 235 files** ✓.
- **One-colour/mono variants**: one-colour symbol variants knock the bolt out
  of the planet disc (verified even-odd rendering); light/dark/white lockups
  regenerated.

## Identity consistency (all surfaces)

Desktop header, mobile header, footer, loading/offline/error screens, admin
login, admin sidebar (Control Center), admin dashboard, favicon/tab
(`app/icon.svg`, `app/favicon.ico`), PWA manifest + icons (`app/manifest.ts`,
`public/brand/icon-*.png`, `apple-touch-icon.png`, `app/apple-icon.png`),
social previews (`app/opengraph-image.tsx`, `public/brand/og-image.png`) and
the Supabase email templates all use the same QUICKKIT identity. No per-page
logos and no off-brand colours remain.
