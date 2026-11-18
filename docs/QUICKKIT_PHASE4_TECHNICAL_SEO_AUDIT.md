# QUICKKIT — Phase 4: Advanced Technical SEO & Search Visibility Audit

**Site:** `https://quickkit-rosy.vercel.app/`
**Branch:** `arena/c4ef22c7-quickkit`
**HEAD at start:** `beef130`
**Date:** 2026-11-16
**Method:** every finding below was measured against the **production build output**
(`.next/server/app/**/*.html`, 149 pages) or read from source — never assumed, and no
Search Console data exists (see Phase 3).

---

## 0. Summary

The site was already in good technical shape: **0 orphans, 0 redirect chains, 0 broken
links, 0 duplicate metadata, maximum indexable crawl depth 2**. One genuine gap was found
and fixed, and three smaller observations are recorded without code changes.

| Area                       | Result                                                              |
| -------------------------- | ------------------------------------------------------------------- |
| Crawlability               | Clean — no defect found                                             |
| Structured data            | **1 real gap fixed**: tool pages had no page-level `WebPage` entity |
| Snippet quality            | Clean — nothing over budget                                         |
| Internal linking           | Clean — complete in both directions                                 |
| Performance SEO            | Already optimised — no change made, no CWV claim made               |
| Brand/entity               | Consistent — no change made                                         |
| Code changed               | **2 files**, +47/−2 lines                                           |
| Tests                      | **2,846 / 2,846** passing (204 files)                               |
| Build                      | exit 0, **158 / 158** pages                                         |
| Pushed / merged / deployed | **no**                                                              |

---

## 1. Crawlability — verified, no defect

Measured across 149 built pages (81 indexable, 68 intentional `noindex`).

| Check                                       | Result                                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Sitemap URLs                                | **80**                                                                                   |
| Indexable built pages                       | **81** — the extra is `/_global-error`, the framework's 500 boundary, correctly excluded |
| Sitemap → indexable                         | **exact**, no URL in the sitemap that is not indexable                                   |
| **Orphan pages**                            | **0**                                                                                    |
| **Indexable pages deeper than 2 clicks**    | **0**                                                                                    |
| Crawl depth distribution                    | `{0:1, 1:35, 2:46, 3:59}`                                                                |
| Sources of depth-3                          | **all 59 are brand-directory pages**, `noindex` by design                                |
| Redirects                                   | **58**, all permanent                                                                    |
| Redirect chains / loops / dead destinations | **0 / 0 / 0**                                                                            |
| Duplicate canonicals                        | **0**                                                                                    |
| `robots.txt`                                | allow-all except `/api/`, explicit `Googlebot` rules, `Sitemap:` declared                |

**Accidental `noindex`:** none. The 68 `noindex` pages are 5 auth stubs, the `ai-tools`
category (0 tools), `_not-found`, and 61 brand pages. The brand pages are excluded by an
explicit product rule — `isBrandRecordIndexable` requires a citable manufacturer decoder,
so a brand with no documented decoder stays out of search rather than becoming a thin
page. That rule is correct and is preserved.

**One thing worth stating plainly:** 59 pages sitting at depth 3 is not a problem _because_
they are all `noindex`. If that policy were ever relaxed, they would immediately sit at
depth 3 for indexable content, which would be worth revisiting at that time.

---

## 2. Structured data — one real gap, fixed

### 2.1 What was measured

Walked every `application/ld+json` block, including nested `@graph`, across all 56 tool
pages. **0 parse failures.**

| Node type             | Count (56 tool pages) |
| --------------------- | --------------------- |
| `Question` / `Answer` | 277 / 277             |
| `ListItem`            | 224                   |
| `Organization`        | 56                    |
| `WebSite`             | 56                    |
| `BreadcrumbList`      | 56                    |
| `WebApplication`      | 56                    |
| `Offer`               | 56                    |
| `FAQPage`             | 56                    |
| **`WebPage`**         | **0** ← the gap       |

### 2.2 The gap

Every page type on the site had a page-level entity **except tool pages**:

| Route type                | Page entity before | After            |
| ------------------------- | ------------------ | ---------------- |
| `/` (homepage)            | `WebPage`          | `WebPage`        |
| `/tools`, `/category/*`   | `CollectionPage`   | `CollectionPage` |
| **`/tools/*` (56 pages)** | **none**           | **`WebPage`**    |

The consequence was that a tool page's only description of _itself_ was
`WebApplication`. Search engines then infer the page type from the application node
rather than being told it. This is a real, if modest, gap in explicitness.

### 2.3 The change

`toolStructuredData()` in `lib/seo.ts` now appends a `WebPage` node **after** the existing
nodes, so `@graph[0]` remains the `WebApplication` and no existing consumer shifts.

```json
{
  "@type": "WebPage",
  "@id": "https://quickkit-rosy.vercel.app/tools/merge-pdf#webpage",
  "url": "https://quickkit-rosy.vercel.app/tools/merge-pdf",
  "name": "PDF Merger — QUICKKIT",
  "description": "Combine up to 25 PDFs locally in your browser…",
  "inLanguage": "en",
  "isPartOf": { "@id": "https://quickkit-rosy.vercel.app/#website" },
  "about": { "@id": "https://quickkit-rosy.vercel.app/#organization" },
  "mainEntity": {
    "@id": "https://quickkit-rosy.vercel.app/tools/merge-pdf#app"
  }
}
```

**`mainEntity` is the important part.** It connects the page entity to the tool entity by
`@id`, so the two are structurally related rather than merely co-located. This matches the
`#collection` / `#app` / `#faq` convention already used elsewhere in the file.

### 2.4 Before / after evidence (measured from the build)

| Measure                                 | Before          | After                 |
| --------------------------------------- | --------------- | --------------------- |
| Tool pages with `WebPage`               | **0 / 56**      | **56 / 56**           |
| Distinct `WebPage` `@id`s               | 0               | **56, none repeated** |
| Pages with duplicate `WebPage`          | —               | **0**                 |
| Pages with duplicate `WebApplication`   | —               | **0**                 |
| JSON-LD parse failures                  | 0               | **0**                 |
| Expected types missing on any tool page | `WebPage` on 56 | **none**              |

### 2.5 What was deliberately not changed

- **`Offer` with `price: "0"`** — present on all 56 pages. This is **not** a fabricated
  price: the tools are genuinely free, and `isAccessibleForFree: true` accompanies it. No
  `AggregateRating`, `Review`, `ratingValue` or `reviewCount` exists anywhere on the site,
  which was verified by search — inventing them is the failure mode this audit was asked
  to guard against, and it is absent.
- **`SearchAction`** pointing at `/tools?q={search_term_string}` — I initially suspected
  this was broken, because `app/(public)/tools/page.tsx` never reads `searchParams`. On
  inspection `ToolExplorer` reads `?q=` through `useSearchParams`, and the hero search
  navigates to exactly that URL. **The markup is correct as written.**
- **Deprecated `HowTo`** — already absent, and an existing test asserts its absence.
- **`FAQPage` on all 56** — matches the visible FAQ list exactly, verified in Phase 2.

---

## 3. Search snippet quality — verified, no defect

Measured from the rendered `<title>` and `<meta name="description">` of all 56 tool pages.

| Check                                             | Result      |
| ------------------------------------------------- | ----------- |
| Titles over 60 characters (rendered, incl. brand) | **0**       |
| Title length range                                | **51–60**   |
| Descriptions over 160 characters                  | **0**       |
| Description length range                          | **147–160** |
| Duplicate titles / descriptions sitewide          | **0 / 0**   |
| Titles containing their primary keyword           | **56 / 56** |

Titles sit at 51–60 characters, so they do not truncate in a mobile SERP. Descriptions sit
at 147–160, inside the ~155–160 mobile window. Nothing was changed — shortening or
lengthening a snippet that already fits would be churn, and rewriting 56 titles to insert
phrases would be keyword stuffing.

**On "repetitive templates":** titles follow a consistent pattern (`Tool — Benefit`,
` | QUICKKIT`), which is a deliberate brand decision, but the text after the em dash is
distinct per tool. Consistency in _format_ is not duplication of _content_, and the
duplicate check above confirms no two are the same.

---

## 4. Internal linking — verified, no defect

| Check                                          | Result                                                   |
| ---------------------------------------------- | -------------------------------------------------------- |
| Category → tool links                          | **57** (7 populated categories × their tools)            |
| Tool → category links                          | **448**                                                  |
| Tool pages with **no** link back to a category | **0**                                                    |
| Related-tool links on tool pages               | **286**                                                  |
| Distinct anchor texts                          | **56** — descriptive tool names, none under 8 characters |
| Registry links to a page with no build output  | **0** of 266                                             |

Every category page links to every tool it owns; every tool links back to its category and
to 4–6 genuinely related tools. Category membership is exact — `pdf-tools` links 9,
`calculators` 12, `developer-tools` 11, and so on, matching `lib/catalog.ts`.

Anchor text earned specific scrutiny because the brief warns against repetitive
keyword-heavy anchors. The related-tool grid uses each target's **product name** (for
example "PDF Splitter"), not its keyword. That is the correct choice: it is descriptive,
it is not repetitive, and it does not stuff a phrase.

**Nothing changed.** Adding links between genuinely related tools was already done, and
adding more for its own sake would create the clutter the brief warns about.

---

## 5. Performance SEO — reviewed, nothing safely actionable

### 5.1 Measured

| Item                       | Result                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `<img>` tags in built HTML | **1** (the homepage hero)                                                                                                   |
| Images missing `alt`       | **0**                                                                                                                       |
| Hero image                 | `hero-laptop-reference.webp`, **75 KB**, `width`/`height` set, `fetchPriority="high"`, `loading="eager"`, `decoding="sync"` |
| Fonts                      | `next/font/local`, single variable woff2, `display: "swap"`, Arial fallback                                                 |
| Preloads in `<head>`       | 3                                                                                                                           |
| Stylesheets                | 3                                                                                                                           |
| Render-blocking scripts    | **1**, and it is `noModule` — a legacy-browser fallback that modern browsers ignore                                         |
| JS loaded, homepage        | 12 chunks, **713 KB**                                                                                                       |
| JS loaded, `merge-pdf`     | 14 chunks, **743 KB**                                                                                                       |
| JS loaded, `qr-generator`  | 19 chunks, **1,179 KB**                                                                                                     |
| Largest chunks             | 906 KB (`batch-studio` only), 805 KB (shared by the 3 minifiers), 552 KB (6 image tools), 446 KB (`barcode-scanner` only)   |

### 5.2 Conclusion, and why nothing was changed

The large chunks are **route-specific and lazily loaded** — each is referenced by 1–6
pages, not sitewide, and the script tags carry `async=""`, so they are not render-blocking.
They are heavy because they contain real engines (barcode encoders, WASM minifiers, PDF
libraries), not because of accidental coupling.

The honest position: **1,179 KB of JS on `/tools/qr-generator` is a lot**, and it is the
one place worth watching. But reducing it would mean re-architecting a working tool's
engine loading, which is precisely the "risky" change the brief rules out, and I have no
field measurement showing it hurts anything. The earlier mobile PSI baseline (Perf 91,
LCP 3.0 s, CLS 0) came from a real run and would need re-running to speak to this.

**No Core Web Vitals improvement is claimed.** No browser or CrUX data was available in
this environment, and lab numbers are not field data.

**Caching and compression were not touched** — `next.config.ts` headers, CSP, HSTS and
`outputFileTracingIncludes` are unchanged.

---

## 6. Brand and entity consistency — verified, no change

| Check                               | Result                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Visible-text brand casing           | **`QUICKKIT` only — 8/8 on the homepage, 0 lowercase**                       |
| Lowercase `quickkit` occurrences    | hostname/URL components only, never display text                             |
| `alternateName`                     | `"QuickKit"` on both `Organization` and `WebSite`                            |
| Hosts referenced in metadata/schema | **`https://quickkit-rosy.vercel.app` only** (428 occurrences, no other host) |
| `og:` tags on tool pages            | **complete** — title, description, url, type, site_name, image               |
| `twitter:` tags                     | **complete** — card, title, description, image                               |
| Favicon / icons                     | `favicon.ico` (64×64), `icon.svg`, `apple-touch-icon` (180×180)              |
| Entity `@id`s on homepage           | `#organization`, `#website`, `#webpage` — each defined once                  |
| Domain / brand renamed              | **no**                                                                       |

`QuickKit` appearing 578 times in raw HTML is the `alternateName` in JSON-LD and the
`og:site_name` — intentional disambiguation of a stylised uppercase brand, not
inconsistency. Visible text is uniformly uppercase.

One observation, not a defect: **there is no web app manifest.** Nothing requires one for
SEO, and adding one would be a product decision rather than a technical fix.

---

## 7. Verification results

| Gate                  | Command                          | Result                                           |
| --------------------- | -------------------------------- | ------------------------------------------------ |
| TypeScript            | `npm run typecheck`              | **clean**                                        |
| ESLint                | `npm run lint`                   | **clean**                                        |
| Prettier              | `npm run format:check`           | **"All matched files use Prettier code style!"** |
| Full suite            | `npm test`                       | **2,846 / 2,846 passed**, 204 files              |
| Production build      | `npm run build` (production env) | **exit 0**, 158 / 158 pages                      |
| SEO metadata report   | `npm run seo:report`             | **0 errors**, 0 warnings, 56 notes               |
| Keyword clusters      | (same command)                   | **56 tools, 1,464 targets, 0 errors**            |
| Structured-data audit | built HTML                       | all expected types present on 56/56              |

Build environment:

```
SITE_URL=https://quickkit-rosy.vercel.app LAUNCH_APPROVED=true VERCEL_ENV=production npm run build
```

### A failure worth reporting honestly

The first production build after my change **failed** — `next build` runs TypeScript over
the test files, and my two new test annotations used `(node: { "@type": string })` against
a `Record<string, unknown>[]`. A standalone `npx tsc --noEmit` had reported clean moments
earlier, so this was caught only by the full build. I fixed the annotations rather than
loosening the types, and the build then passed 158/158.

This is exactly why the brief asks for the build and not just typecheck. It is recorded
here rather than quietly corrected.

### Changed files

| File                                 | Change                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/seo.ts`                         | +23 — appends a `WebPage` node to `toolStructuredData()`                                                                                           |
| `tests/seo-structured-data.test.tsx` | +24/−2 — updates two exact-array contract assertions and **adds** four assertions pinning the new node's `url`, `@id`, `mainEntity` and `isPartOf` |

No route, component, tool, canonical rule, sitemap, redirect or config was modified.

### Test changes — strengthening, not weakening

Two existing assertions had to change because the node list genuinely gained a member:

- `expect(pdfTypes).toEqual(["WebApplication", "FAQPage"])` → `["WebApplication", "WebPage", "FAQPage"]`
- `expect(financeApp["@graph"]).toHaveLength(1)` → an exact-type-list equality

The second is **stricter** than what it replaced (a length check became an exact type
list). Four new assertions were added that did not exist before, so the net effect is a
tighter contract, not a looser one. No assertion was relaxed to obtain a green run.

---

## 8. Measured vs assumed vs recommended

### Measured (reproducible from the repo or the build)

All of §1–§7 above. Every count, length and boolean comes from `.next/server/app/**/*.html`
or from source.

### Assumed — clearly labelled

- That adding a `WebPage` node helps anything. The change makes the page type **explicit**;
  whether search engines reward it is **not measured** and is not claimed. It is a
  correctness improvement first and an SEO bet second.
- That `qr-generator`'s 1,179 KB of JS is harmless. It is `async` and route-specific, but
  no field data exists either way.

### Not measured at all

- Core Web Vitals, in the lab or in the field. No browser binary, no CrUX, no Search
  Console.
- Any ranking, impression, click or click-through rate. Search Console remains
  inaccessible (Phase 3).
- How Google actually parses or renders any of this.

---

## 9. Remaining recommendations

### Safe to do next, low risk

1. **Re-run the mobile PSI check** against the live site after the next deploy to confirm
   the `WebPage` addition changed nothing measurable. It should not: it is ~400 bytes of
   JSON-LD.
2. **Watch `qr-generator`'s JS payload** as a known outlier, without acting on it until
   there is field evidence.

### Needs an owner decision

3. **Whether the brand directory's `noindex` policy should ever change.** It is correct
   today; revisiting it would immediately create 59 depth-3 indexable pages, which is why
   it is a decision rather than a task.
4. **Whether to add a web app manifest.** Not an SEO requirement; a product choice.

### Owner-only

5. **Push, merge, deploy** — nothing has left this sandbox.
6. **Search Console access** — still the highest-value unblock for every question this
   audit could not answer with data. See
   [`QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md`](./QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md).
7. Any Vercel, Supabase, auth, DNS, secret or environment change.

---

## 10. Non-claims

- No Core Web Vitals improvement is claimed or implied. No browser or CrUX data was
  available; nothing in this audit measured page speed.
- No ranking, impression, click or CTR figure appears anywhere, because none was measured.
- No price, rating, review or aggregate score was invented. `price: "0"` is factually true
  and `isAccessibleForFree: true`; no `AggregateRating` or `Review` exists sitewide.
- The `WebPage` addition is a structural correctness fix whose SEO benefit is unproven.
