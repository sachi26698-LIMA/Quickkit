# QUICKKIT — metadata quality report

Generated from `npm run seo:report` (which calls `buildSeoReport()` in
`lib/seo/audit.ts`) on branch `arena/cd0a5f67-quickkit`.

This file is a snapshot for review. The live numbers always come from
`npm run seo:report` or the tests — never from this document, which will age.

## Totals

| Measure                              | Value                                              |
| ------------------------------------ | -------------------------------------------------- |
| Published tools                      | 56                                                 |
| Tool SEO records                     | 56                                                 |
| Category SEO records                 | 8 (7 indexable, `ai-tools` deliberately noindex)   |
| Page-level SEO records               | 17                                                 |
| Indexable tool routes                | 56                                                 |
| Indexable category routes            | 7                                                  |
| Indexable legal/trust pages          | 12                                                 |
| Tool routes with reference content   | 56                                                 |
| Sitemap URLs (production, indexable) | 80                                                 |
| Audit errors                         | **0**                                              |
| Audit warnings                       | **0**                                              |
| Audit notes                          | 56 (all `primary-keyword-absent-from-description`) |

## Budgets enforced in CI

| Rule                                 | Limit                                     |
| ------------------------------------ | ----------------------------------------- |
| Tool/category/page title, raw        | ≤ 49 characters                           |
| Rendered title (`title \| QUICKKIT`) | ≤ 60 characters                           |
| Brand inside a title                 | never                                     |
| Tool description                     | 140–160 characters                        |
| Page (hub/policy) description        | 100–160 characters                        |
| Alternative titles                   | 2 per tool record, each ≤ 49 characters   |
| Alternative description              | 1 per tool record, > 120 characters       |
| Secondary keywords per record        | ≥ 3                                       |
| Curated internal links per record    | ≥ 3, all resolving, none self-referential |
| Primary keyword uniqueness           | one route per keyword                     |

## Actual measured ranges

- Rendered tool titles: min 51, max 60, average 57.1 (budget 60).
- Tool descriptions: min 147, max 160, average 155.8.
- Page descriptions: 104 (`/faq`) to 160 (`/guides/barcode`).
- Search intent mix across tool records: transactional 48, informational 8.

The `primary-keyword-absent-from-description` notes are deliberate. For a tool
whose title already carries the exact keyword, repeating it in the snippet spends
characters on repetition instead of on the differentiator. They are reported as
notes, not warnings, so the count stays visible without crying wolf.

## What is deliberately not reported

No impressions, clicks, CTR, ranking positions, traffic estimates or keyword
difficulty figures appear anywhere in this repository. There is no authorised
Search Console integration in the codebase, so those numbers cannot be read, and
inventing them would corrupt every later decision. The admin panel says the same
thing on screen rather than showing a placeholder chart.

## Known limitations (honest list)

1. **`<lastmod>` is absent in this checkout.** The sitemap derives `lastmod` from
   real Git commit dates, ignoring shallow-boundary commits. This working copy is
   a one-commit shallow clone, so the honest output is "no verifiable date" —
   Google's documented behaviour for a missing `lastmod` is to ignore it, which
   is safer than emitting the build date. On a full clone the dates appear.
2. **Page H1s are not machine-compared to their records.** Tool H1s are checked
   against the rendered page in the tool test suites; the 17 page records carry
   an `h1` field for reviewers, verified by hand at review time, not by a
   rendering assertion.
3. **No rank tracking.** Nothing in the repo measures position, so no claim about
   "improved rankings" can be made — only that the metadata is now unique,
   budgeted and describable.
4. **Internal-link density inside body copy** is unchanged. The curated
   `internalLinks` list is validated for existence and uniqueness and drives the
   related-tools/footer reachability tests, but it is not injected into prose.
