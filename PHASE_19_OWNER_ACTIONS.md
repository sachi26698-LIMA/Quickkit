# Phase 19 — owner actions and open risks

Nothing in this phase has been pushed, merged, deployed or indexed. The branch is local.

## Must happen before release

1. **Visual review.** Four new pages and one guide were checked in headless Chromium only.
   Walk `/tools/gs1-intelligence`, `/tools/product-lookup`, `/tools/batch-studio`,
   `/tools/barcode-developer` and `/guides/barcode` at 375 px, 768 px and 1440 px.
   The studio's new **2D symbols** tab and the scanner's new **typed value** panel need the
   same pass.
2. **Real camera QA.** The sandbox has no camera, so rear/front selection, torch control,
   focus and permission handling were not observed on hardware. Test on one iOS device
   and one Android device: rear camera default, torch toggle (Android Chrome only in most
   builds), permission denial, permission "blocked" state, and the dedupe behaviour while
   pointing at one label.
3. **Live network QA of the lookup.** In this sandbox `openfoodfacts.org` is blocked, so
   every live request returned `reason:"network"` (HTTP 502). On a real network confirm:
   a found record, a 404 for a valid-but-unknown GTIN, and that the rate limiter produces
   a 429 with `Retry-After` rather than a hang.
4. **E2E suite.** `tests/e2e` was not re-run end-to-end in this phase. Run it against a
   production build; the recipe is in `PHASE_19_VERIFICATION_REPORT.md`.
5. **Decide on nav depth.** `QR & Barcode` now holds 9 tools. If that reads as too many
   for the category grid, the guide (`/guides/barcode`) is the natural hub page to link
   from instead of adding a tenth tool.

## Known limitations, stated as limitations

- **Batch studio is linear-only.** QR/Data Matrix batches are generated one symbol at a
  time from the 2D panel. Mixed-symbology sheets are not supported and the page says so.
- **One product database.** Adding a second source needs a licence review (ODbL
  compatibility, attribution format, rate limits). Not started.
- **No batch-code research this phase.** The brand list is still the 59 records from
  Phase 16–18; no manufacturer document was verified, so the verified-decoder count
  remains 0.
- **JPEG is lossy.** A JPEG symbol re-encoded at low quality can fail to scan; the studio
  exports at quality 0.95 and the page recommends SVG or PNG for print.
- **2D decoding is slower than linear.** The camera path now asks ZXing for three 2D
  readers as well; worst-case frame decode was measured at ~0.3 s for a full image
  profile in Node. If a low-end phone drops frames, restrict the reader hints to the
  formats the user selects.

## Deliberate non-changes

- Homepage, SEO metadata shape, URLs, sitemap structure, legal pages and every other tool
  were left alone apart from count assertions that had to move (49 tools, 132 routes,
  143 pages).
- No analytics, no accounts, no server-side storage of scans, no Supabase.
- Fourteen existing tests were updated, all for counts or for behaviour this phase
  intentionally changed (studio tab list, "gs1" search now resolves to the dedicated GS1
  page, readable-format count 9 → 12, sitemap/tool totals). No test was weakened: every
  changed expectation is paired with a new assertion that covers the new behaviour.
