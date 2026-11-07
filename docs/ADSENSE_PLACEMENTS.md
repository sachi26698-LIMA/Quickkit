# AdSense placements and advertising policy

Publisher `ca-pub-1478767466279341`. Ad loader: **one**, in `app/layout.tsx`.
Ad units: one reusable component, `components/ad-unit.tsx`, configured from
`lib/ads.ts`.

## Where ads appear

| Surface | Routes | Units per page | Placements |
|---|---|---|---|
| Homepage | `/` | 3 | `home-after-hero`, `home-mid-content`, `home-bottom` |
| Tool pages (shell) | 41 (`/tools/*`, including the 12 calculators) | 3 | `tool-after-intro`, `tool-after-faq`, `tool-bottom` |
| Word to PDF studio | `/tools/word-to-pdf` | 2 | `tool-after-intro`, `tool-bottom` |
| Tool index | `/tools` | 1 | `tools-index-bottom` |
| Categories | 7 published (`/category/*`) | 1 | `category-bottom` |
| Help centre | `/help` | 2 | `help-after-guides`, `help-bottom` |
| Policy pages | 9 via `components/legal-page-shell.tsx` (`/terms`, `/privacy`, `/cookies`, `/disclaimer`, `/copyright`, `/accessibility`, `/security`, `/file-handling`, `/intellectual-property`) | 1 | `legal-article-end` |
| About / FAQ | `/about`, `/faq` | 1 each | `about-end`, `faq-end` |

**63 of the 65 sitemap URLs carry advertising; 149 placements in total.**

Two deliberate deviations from "three per tool page":

- `/tools/word-to-pdf` is a single continuous studio surface (toolbar, panes,
  Convert / Download controls). It gets one unit under its intro band and one
  after the studio — never between the panes, where it would sit beside the
  controls.
- A category with no published tools yet (`/category/ai-tools`) renders a
  "coming soon" placeholder and gets no unit; the slot is conditional on the
  listing being non-empty.

## Deliberately ad-free

| Route | Why |
|---|---|
| `/contact` | Built around a message form — ads next to a Send button invite mis-clicks, and the page has little editorial content. |
| `/sitemap` | A pure index of links; there is no content for an ad to sit beside. |
| `/saved` | `noindex`, and it renders the visitor's own browser-local favourites — an empty shell to a crawler. |
| `/api/*`, `/_next/*` | Not pages. |

`AD_EXCLUDED_ROUTES` in `lib/ads.ts` is the source of truth; a new route that is
neither covered by an `<AdUnit>` nor listed there fails `tests/ad-placements.test.tsx`.

## Rules the implementation keeps

1. **One loader.** `tests/ad-unit.test.tsx` asserts the script appears in
   `app/layout.tsx` only, once, and that no component contains the URL.
2. **No invented slot ids.** `AD_SLOTS` lists only units that exist in the
   AdSense account. The single responsive display unit (`1553253144`) is reused
   by every placement — normal AdSense usage, not duplication.
3. **No duplicate units.** Every `<AdUnit>` requires a `placement`, which is
   written to the DOM as `data-ad-placement`; tests fail if a page repeats one,
   mounts more than three, or renders two `<ins>` per slot.
4. **Away from controls.** Tool slots sit above the workspace (as a full-width
   block with its own margin), after the how-to/FAQ block, and at the end of the
   page. Nothing sits inside a workspace or beside Convert / Download / Reset /
   Upload, and no slot contains a link or button.
5. **Space reserved.** `--ad-min-height` in `app/globals.css` reserves height per
   format (`auto`, `horizontal`, `rectangle`) and breakpoint, so a late ad
   cannot shift the layout. Width is never fixed; units are full-width
   responsive on phone, tablet and desktop.
6. **Unfilled slots stay quiet.** No border, no grey box, no fake creative — a
   small "Advertisement" label and whitespace only.
7. **Google-managed formats.** Anchor and vignette ads are switched on and off in
   the AdSense account, not in code. The CSP (`next.config.ts`) allows the Google
   hosts those formats need, including their own dismissal controls, and nothing
   wider.

## Honest status

Ads are **not live** until Google approves the site and serves creatives. Until
then every slot renders as reserved empty space with its label. No claim of live
advertising should be made before that.
