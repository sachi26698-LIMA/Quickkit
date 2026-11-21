# QUICKKIT — Organic Growth Master Report


> **Historical report.** Measurements below were taken while the production
> origin was `quickkit-rosy.vercel.app`. The canonical public origin is now
> **`https://www.quickkit.live`** (the apex `quickkit.live` 301-redirects there) — see
> [`DOMAIN_MIGRATION_QUICKKIT_LIVE.md`](DOMAIN_MIGRATION_QUICKKIT_LIVE.md).
> Numbers are left as recorded rather than rewritten.

**Site:** `https://quickkit-rosy.vercel.app/`
**Branch:** `arena/c4ef22c7-quickkit`
**Date:** 2026-11-16
**Companion document:** [`KEYWORD_RESEARCH_AND_COMPETITOR_REPORT.md`](./KEYWORD_RESEARCH_AND_COMPETITOR_REPORT.md) (Phase 1 research, full 56-tool keyword map, competitor findings)
**Prior work preserved:** [`GOOGLE_SITELINKS_SEO_REPORT.md`](./GOOGLE_SITELINKS_SEO_REPORT.md) — commit `d461fdf`. Its fixes are untouched and its conclusions are not repeated here.

---

## 0. Headline

> **Phases 2, 3 and 5 were already complete when this task began, and Phase 4 was almost complete.
> Rather than manufacture work to fill the brief, this pass audited the live build against every
> acceptance criterion, and fixed the two real defects the audit found.**

What changed in code: **6 files** — the 404 page and 5 auth stubs — plus one new test file.
What changed in the product: nothing. No tool, no feature, no page and no design was removed or
altered.

|                                                 |                                    |
| ----------------------------------------------- | ---------------------------------- |
| Defects found by audit                          | 2 (both cosmetic, both fixed)      |
| Duplicate titles sitewide, before → after       | 1 → **0**                          |
| Duplicate descriptions sitewide, before → after | 6 pages → **0**                    |
| New tests                                       | 18, all passing                    |
| Full suite                                      | **2,798 / 2,798** across 202 files |
| TypeScript / ESLint / Prettier                  | clean / clean / clean              |
| Production build                                | exit 0, **158 / 158** pages        |
| SEO metadata report                             | **0 errors, 0 warnings**           |
| Pushed / merged / deployed                      | **no**                             |

---

## 1. Keyword map for every tool

The complete 56-tool map — primary, secondary, recorded long-tails, comparison terms and intent —
is **§4 of the keyword research report**, kept in one place to avoid two documents drifting apart.
Summary of the structure that already existed and what this pass concluded:

| Group                  | Registry field                | Coverage                      | Action taken                    |
| ---------------------- | ----------------------------- | ----------------------------- | ------------------------------- |
| Primary                | `primaryKeyword`              | 56/56, all unique             | none needed                     |
| Secondary              | `secondaryKeywords` (5.0 avg) | 56/56                         | none needed                     |
| Long-tail              | inside `secondaryKeywords`    | present, unseparated          | documented, **not** re-schema'd |
| Question-based         | on-page FAQs                  | 56/56 pages carry FAQs        | none needed                     |
| Comparison/alternative | `alternativeTitles`           | present, not tagged as intent | flagged as the real gap         |

**The genuine finding is intent skew, not keyword shortage:** 48 transactional / 8 informational /
**0 commercial** / 0 trust. The tool pages are all built to "do the task"; nothing is built to
"help someone choose". Every competitor SERP examined in the research was a comparison register.
This is a content gap, not a metadata gap, and it is why it is listed under _recommendations_
rather than _completed_ — closing it means writing new copy, which is a separate decision.

**A deliberate non-change:** the registry was not expanded with four new keyword fields. That
touches the file every metadata assertion in the suite reads from, renders nowhere, and produces no
user-visible improvement. The grouping lives in the research report instead.

---

## 2. Competitor findings

Full detail in §5 of the research report. The three structural findings that matter:

1. **PDF:** the SERP is roundup-shaped. Every comparison page fetched ranks tools on _privacy
   ("no upload"), free-tier limits, DPI/vector control, batch/API_. QUICKKIT already processes
   locally and already states real limits (25 files / 50 MiB / 1,000 pages) — a stronger, more
   specific story than the generic claims used by comparison pages, but no page on the site speaks
   in the comparison register.
2. **QR:** owned by dedicated SaaS listicles. The recurring "catch" list — scan caps, codes that
   die when a subscription lapses, watermarks, ads at the destination — describes precisely what
   QUICKKIT structurally does _not_ do. Static, no-signup, no-expiry, local generation is the
   defensible position.
3. **Calculators (India):** GST/EMI intent is well served by formula-led pages. QUICKKIT's
   `gst-calculator` is already at feature parity (CGST/SGST/IGST, inclusive/exclusive, reverse —
   verified in the built HTML). Only the _worked ₹ example_ format is missing.

---

## 3. Files changed

Six route files, one test file. **No tool, page, layout, style or config was removed or redesigned.**

| File                                             | Change                         | Why                                                    |
| ------------------------------------------------ | ------------------------------ | ------------------------------------------------------ |
| `app/(public)/login/page.tsx`                    | + own `title`, + `description` | Rendered `… \| QUICKKIT \| QUICKKIT`                   |
| `app/(public)/signup/page.tsx`                   | + own `title`, + `description` | same                                                   |
| `app/(public)/account/page.tsx`                  | + own `title`, + `description` | same                                                   |
| `app/(public)/forgot-password/page.tsx`          | + own `title`, + `description` | same                                                   |
| `app/(public)/reset-password/page.tsx`           | + own `title`, + `description` | same                                                   |
| `app/not-found.tsx`                              | + `metadata` export            | 404 shipped the homepage's exact title and description |
| `tests/metadata-uniqueness.test.ts`              | **new**, 18 tests              | stops either defect from returning                     |
| `docs/KEYWORD_RESEARCH_AND_COMPETITOR_REPORT.md` | **new**                        | Phase 1 deliverable                                    |
| `docs/QUICKKIT_ORGANIC_GROWTH_MASTER_REPORT.md`  | **new**                        | this document                                          |

### Defect 1 — doubled brand in page titles

A route with no `title` of its own inherits the layout's `title.default` (which already ends in
`" | QUICKKIT"`), and then the layout `title.template` appends the brand a second time. Five auth
stubs had no metadata title, so all five rendered:

```
Free Online PDF, Image, QR, Code & Math Tools | QUICKKIT | QUICKKIT
```

All five are `noindex`, so this never cost traffic — it was cosmetic. Fixed by giving each route a
real title. Verified in a fresh production build:

```
/login             → Sign in | QUICKKIT
/signup            → Create an account | QUICKKIT
/account           → Your account | QUICKKIT
/forgot-password   → Reset your password | QUICKKIT
/reset-password    → Choose a new password | QUICKKIT
```

### Defect 2 — the 404 page claimed to be the homepage

`app/not-found.tsx` exported no metadata, so it inherited the root layout's default title **and
description verbatim**. Two different URLs advertised themselves as the same page. It is `noindex`,
so the practical risk was small, but it is exactly the kind of duplicate the brief's Phase 4 asks
to be eliminated. Fixed with its own title (`Page not found`) and a description that explains what
to do next. Verified: `<title>Page not found | QUICKKIT</title>`, `robots: noindex`.

The 5 auth stubs also shared one inherited description; each now has its own.

### The test that keeps them fixed

`tests/metadata-uniqueness.test.ts` reads the route files, not a build, so it fails in CI before
anything ships. **Verified to actually catch the regression** — reverting the `login` stub to its
old form produced 3 failures; restoring the fix returned 18/18 passing. It asserts:

- each of the 5 stubs declares its own literal `title`, a `description`, and `index: false`;
- the 404 declares `title: "Page not found"`, stays `noindex`, and does **not** reuse the homepage
  copy;
- no two stubs share a description;
- every `(public)` route directory has a non-trivial `page.tsx`.

---

## 4. Implemented improvements

Beyond the two fixes, this pass **verified** the state of Phases 2–5 rather than changing them.
Verification was done against **built HTML** (`158` pages under `.next/server/app`) and live HTTP
responses, never against source alone.

| Phase | Criterion                                           | Result                                                                              |
| ----- | --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 2     | Unique title per tool, ≤60 chars rendered           | 56/56, 0 over budget, 0 duplicates                                                  |
| 2     | Unique description, 70–160 chars                    | 56/56, 0 out of range, 0 duplicates                                                 |
| 2     | Exactly one H1 per tool page                        | 115/115 built pages                                                                 |
| 2     | Helpful intro, steps, use cases, specs, limitations | present on every tool page                                                          |
| 2     | Intent-based FAQs                                   | 56/56 (50 via content maps, 6 inline in their own page files)                       |
| 2     | Links to genuinely related tools                    | 0 tools with fewer than 2; 0 links to unbuilt targets                               |
| 2     | Descriptive alt text                                | 0 images missing/empty alt, sitewide                                                |
| 2     | Valid structured data only                          | `FAQPage` on all 115 tool pages                                                     |
| 3     | Category page with original copy                    | 7 populated categories, **648–1,059 words**, 7 `h2` each, links to every tool       |
| 3     | No doorway / thin keyword pages                     | none exist; brand directory `noindex` policy preserved                              |
| 4     | Crawlability & index depth                          | **max depth 2** (0:1, 1:33, 2:46), 0 unreachable                                    |
| 4     | Orphans                                             | **0** of 80 sitemap URLs                                                            |
| 4     | Broken internal links                               | **0**                                                                               |
| 4     | Sitemap ↔ indexable parity                          | 80 ↔ 80 exact                                                                       |
| 4     | Redirects                                           | 58, **0 chains / 0 loops / 0 dead destinations**                                    |
| 4     | Duplicate titles / descriptions / canonicals        | **0 / 0 / 0**                                                                       |
| 4     | Mobile usability                                    | viewport present on 100% of pages                                                   |
| 4     | Caching & performance config preserved              | untouched — CSP, HSTS, Permissions-Policy and `outputFileTracingIncludes` unchanged |
| 5     | Truthful privacy claims                             | per-tool notices state what stays local and what does not                           |
| 5     | No fabricated reviews/ratings/authors               | none present; no `AggregateRating` markup anywhere                                  |
| 5     | Written for people                                  | verified by reading live pages, not word counts alone                               |

**One finding that looked like a gap and was not:** six barcode-cluster tools have no entry in
`TOOL_SEO_CONTENT`, which initially read as missing FAQ/spec content. They define their FAQs,
specifications and examples inline in their own page files — each renders 5–7 FAQ items, a
specifications block and worked examples. Not a gap; nothing to change.

**Another that looked like a defect and was not:** my first pass reported 64 "broken" registry
links and 2 indexable pages missing from the sitemap. Both were bugs in my _analysis script_, not
the site — the link check didn't resolve category/policy paths, and the sitemap check collided
`/` with the build artefact `index.html`. Re-verified correctly: **0 broken links**, and the only
indexable page outside the sitemap is `_global-error`, the framework's 500 boundary, which
correctly must not be listed.

---

## 5. Tests and build results

Every gate run on this branch, in this order, in this pass.

| Gate                          | Command                                            | Result                                           |
| ----------------------------- | -------------------------------------------------- | ------------------------------------------------ |
| TypeScript                    | `npm run typecheck`                                | **clean**, exit 0                                |
| ESLint                        | `npm run lint`                                     | **clean**, exit 0                                |
| Prettier                      | `npm run format:check`                             | **"All matched files use Prettier code style!"** |
| Full suite                    | `npm test`                                         | **2,798 / 2,798 passed**, 202 files, 336.8 s     |
| Production build              | `npm run build` (production env)                   | **exit 0**, 158 / 158 pages                      |
| SEO metadata report           | `npm run seo:report`                               | **0 errors, 0 warnings**, 56 notes               |
| New test file                 | `npx vitest run tests/metadata-uniqueness.test.ts` | **18 / 18 passed**                               |
| Regression check on new tests | revert `login`, re-run                             | **3 failed** → proves the tests bite             |

Test count rose 2,780 → **2,798**; all 18 additions are the new file. **No existing test was
weakened, relaxed or deleted** — the count only went up.

Build environment (required for a production-shaped build):

```
SITE_URL=https://quickkit-rosy.vercel.app LAUNCH_APPROVED=true VERCEL_ENV=production npm run build
```

> **Known, pre-existing, not caused by this work:** the `Supabase Preview` check fails on every
> `main` merge (long-standing), and there is a flaky feedback test (~1 in 60 runs). `npm audit`
> reports 16 high-severity findings in the dependency tree; **`npm audit fix` was not run**, per
> standing instruction. The repo declares Node 26.x while the sandbox runs v22.22.3, producing
> `EBADENGINE` warnings only.

---

## 6. Remaining technical issues

Honest list of what is still imperfect. None of these is a Phase 2–4 failure.

| #   | Issue                                                                | Severity                    | Status                                                                                                                                                                  |
| --- | -------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `ai-tools` category renders "Coming soon" with 0 tools and 242 words | low                         | **intentional** — it is `noindex`; indexing an empty category would be a thin page                                                                                      |
| 2   | 65 brand pages are `noindex`                                         | low                         | **intentional and correct** — `isBrandRecordIndexable` excludes brands with no citable decoder; they stay reachable from the Brand Directory so nothing 404s            |
| 3   | 40 of 266 registry internal links are one-way (no backlink)          | **cosmetic**                | not a defect; a related-tools grid is not expected to be fully reciprocal, and max crawl depth is still 2                                                               |
| 4   | 56 SEO "notes" — mostly `primary-keyword-absent-from-description`    | **not a defect**            | the description paraphrases instead of repeating the primary keyword; the audit itself classifies this as acceptable when the title carries it. Deliberate, not stuffed |
| 5   | No comparison-register content anywhere on the site                  | **the real gap**            | requires new copy — listed as a recommendation, not silently patched                                                                                                    |
| 6   | Core Web Vitals                                                      | **measured, not estimated** | live mobile PSI baseline: Perf 91, A11y/BP/SEO 100; FCP 1.7 s, LCP 3.0 s, TBT 90 ms, CLS 0, SI 4.3 s. Not re-measured this pass; nothing affecting CWV was changed      |
| 7   | 16 high-severity dependency advisories                               | low (supply chain)          | **out of scope by instruction**; `npm audit fix` forbidden                                                                                                              |

---

## 7. Recommended next 90 days

Ordered by evidence strength. Each step has an acceptance test attached, so none is unfalsifiable.

### Days 1–14 — measure before building

1. **Baseline Search Console.** Capture 28-day impressions, clicks, CTR, average position, indexed
   page count and query count for the 56 tool pages. This is the only step that turns the
   assumptions in the research report into facts. No content decisions before this exists.
2. **Confirm the index state.** Check that the 80 sitemap URLs are indexed and the 65 brand pages
   remain excluded. Do **not** submit individual URLs repeatedly — one sitemap submission is enough.
3. **Segment queries per tool into head vs long-tail**, using the long-tail phrasings already
   recorded in the registry (§4 of the research report). This tests the biggest assumption directly.

### Days 15–45 — close the commercial-intent gap, on existing URLs only

4. **Add a comparison section to the highest-impression tool pages** — not new URLs. For PDF tools,
   a privacy/limits/export-format table in QUICKKIT's own honest register. _Acceptance:_ every
   claim is checkable against the tool's actual behaviour, and the page states where a competitor
   is the better choice.
5. **Add worked numeric examples** to calculator pages (₹10,000 at 18% GST → ₹1,800 → ₹11,800),
   matching the format the India-focused competitors already use.
6. **Strengthen the static-QR story** on `qr-generator`: no expiry, no scan cap, no watermark, no
   account — all true today and all structurally unavailable to dynamic-QR vendors.

### Days 46–90 — authority, carefully

7. **Productivity/developer directory submissions** — genuine, relevant, no paid links.
8. **Editorial outreach** to roundups that already compare PDF/QR tools, offering the honest
   numeric-limits angle. Many of the pages examined invite exactly this.
9. **Review the measurement data against the assumptions in §6 of the research report** and retire
   whichever ones the data contradicts.

### Explicitly not recommended

- Buying links, joining link schemes, or automating outreach at volume.
- Fabricating reviews, ratings, `AggregateRating` markup or testimonials to compete with the
  listicle SERPs.
- Generating hundreds of thin keyword pages or brand pages. The existing `noindex` policy for
  decoderless brands is the correct model and should not be loosened to chase count.
- Mass re-submission of URLs for indexing.

---

## 8. Baseline metrics and measurement plan

### 8.1 Real data available today — VERIFIED, first-party

| Metric                           | Value                                                | Source                       |
| -------------------------------- | ---------------------------------------------------- | ---------------------------- |
| Indexable pages in sitemap       | 80                                                   | built `sitemap.xml`          |
| Tools with unique metadata       | 56 / 56                                              | registry ↔ built HTML        |
| Pages with duplicate title       | 0                                                    | built HTML, 149 pages        |
| Pages with duplicate description | 0                                                    | built HTML, 149 pages        |
| Max internal crawl depth         | 2                                                    | BFS from `/` over built HTML |
| Orphan pages                     | 0                                                    | sitemap ↔ link graph         |
| Broken internal links            | 0                                                    | registry → built output      |
| Redirect chains                  | 0                                                    | `next.config.ts` resolution  |
| Mobile Lighthouse baseline       | Perf 91 · A11y 100 · BP 100 · SEO 100                | live PSI, before this task   |
| Field CWV                        | FCP 1.7 s · LCP 3.0 s · TBT 90 ms · CLS 0 · SI 4.3 s | live PSI, before this task   |

### 8.2 Not available — and therefore not stated

The following were **not obtainable** while writing this report and are recorded as unavailable
rather than estimated:

- impressions, clicks, CTR, average position — any query or page;
- number of indexed pages as reported by Google;
- search volume, keyword difficulty or CPC for any keyword;
- competitor traffic, rankings or market share;
- any "before/after" traffic effect of this pass.

**These must come from Search Console (first-party) or another named source. They are never
estimated in this document, and no number above is a forecast.**

### 8.3 Measurement framework (Phase 7)

Once granted Search Console access, populate this table weekly. It is the decision surface for the
roadmap in §7 — nothing in §7 should proceed on vibes.

| Metric                         | Dimension                                 | Cadence | Decision it drives                                  |
| ------------------------------ | ----------------------------------------- | ------- | --------------------------------------------------- |
| Impressions                    | per tool, per query                       | weekly  | which tools have demand but no ranking              |
| Clicks                         | per tool                                  | weekly  | which tools convert impressions                     |
| CTR                            | per page                                  | weekly  | title/description rewriting priority                |
| Average position               | per query band (1–3 / 4–10 / 11–20 / 21+) | weekly  | striking-distance targets                           |
| Indexed pages                  | sitewide                                  | monthly | catch accidental `noindex` or crawl waste           |
| Queries per tool               | per tool                                  | monthly | breadth of each tool's keyword coverage             |
| Pages gaining visibility       | sitewide                                  | monthly | what to reinforce                                   |
| Pages losing visibility        | sitewide                                  | monthly | what regressed, and why                             |
| Long-tail share of impressions | per tool                                  | monthly | tests the central assumption in the research report |

**Rules for reading it:**

- Separate **first-party measured** data (GSC, PSI) from **third-party observed** data and from
  **assumption**. Never let an assumption sit in a measured column.
- A page needs roughly 28 days of data before any CTR conclusion; judge nothing on a single week.
- "Striking distance" (position 4–10) is the highest-leverage bucket and should be worked first.
- **Never** request indexing for all URLs repeatedly; it does not accelerate indexing and it
  pollutes the diagnosis.

---

## 9. Completed / Recommended / Owner approval

### ✅ Completed on this branch (no approval needed, nothing deployed)

- Audited Phases 2–5 against built HTML and live responses; confirmed 2, 3 and 5 already complete.
- Fixed doubled brand in 5 auth page titles (`… | QUICKKIT | QUICKKIT` → clean, unique titles).
- Fixed the 404 page claiming the homepage's exact title and description.
- Gave the 5 auth stubs distinct descriptions.
- Added `tests/metadata-uniqueness.test.ts` (18 tests), **verified to fail when the bug returns**.
- Wrote the two deliverable reports.
- Ran every gate: typecheck, lint, format, 2,798 tests, production build 158/158, SEO report 0/0.
- **No tool, feature, page, design or config was removed or altered.**

### 📋 Recommended (needs a decision, not a permission)

- Close the 0%-commercial-intent gap with comparison sections on **existing** URLs.
- Add worked numeric examples to calculator pages.
- Lead QR positioning on static / no-expiry / no-watermark / no-scan-cap.
- Directory submissions and editorial outreach, honestly framed.

### 🔒 Owner-only actions — deliberately not taken

- **Push, merge or deploy.** Nothing has left this sandbox. Standing instruction is no push, no
  merge, no deploy without separate approval.
- **Grant Search Console access** so §8.2 can become real data. This is the single highest-value
  unblocking action available, and it cannot be done from here.
- Any change to Vercel/Supabase settings, env vars, DNS, secrets, RLS or database schema.
- Any dependency upgrade or `npm audit fix`.
- Any decision to publish new comparison copy (needs editorial sign-off).
- Resolving the pre-existing `Supabase Preview` check failure.

---

## 10. Non-claims

This report does not claim that QUICKKIT ranks or will rank for any keyword, that Google sitelinks
or rich results are achievable or guaranteed, or that anything in the roadmap will produce traffic.
Every measurement above is first-party and reproducible; every missing measurement is named as
missing rather than filled with a plausible number.
