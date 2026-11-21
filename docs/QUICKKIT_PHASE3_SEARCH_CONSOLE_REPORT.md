# QUICKKIT — Phase 3: Search Console Data-Driven SEO


> **Historical report.** Measurements below were taken while the production
> origin was `quickkit-rosy.vercel.app`. The canonical public origin is now
> **`https://www.quickkit.live`** (the apex `quickkit.live` 301-redirects there) — see
> [`DOMAIN_MIGRATION_QUICKKIT_LIVE.md`](DOMAIN_MIGRATION_QUICKKIT_LIVE.md).
> Numbers are left as recorded rather than rewritten.

**Site:** `https://quickkit-rosy.vercel.app/`
**Branch:** `arena/c4ef22c7-quickkit`
**Date:** 2026-11-16
**Checkpoint:** `0197c2a` (see §0 — the commit had to be recovered before this phase could start)

---

## 0. Result in one line

> **Search Console data is not accessible from this environment. No clicks, impressions,
> CTR or position figures exist, so none are reported, estimated or inferred.** The
> analysis machinery is built and tested and will produce the full priority plan the
> moment a real export is supplied. Owner steps: see
> [`QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md`](./QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md).

This is the outcome the brief anticipated: _"If Search Console access is unavailable, stop
and provide the exact owner steps needed to export the data."_ That document does exactly
that, and §7 below repeats the essentials.

---

## 1. Repository state — a required detour

Before any Phase 3 work, the starting checkpoint had to be recovered.

The workspace reset **again** and dropped the commit objects for `9385db2`, `99dfd6a` and
`0197c2a` while preserving their working-tree content. HEAD was back at `7e74335`.

| Check                              | Result                                                    |
| ---------------------------------- | --------------------------------------------------------- |
| `git log --all`                    | only `7e74335` and `33ea9c4`                              |
| `git cat-file -t 0197c2a`          | _Not a valid object name_                                 |
| Working-tree files                 | **intact** — 56 clusters, 1,464 keywords, both test files |
| Cluster audit on recovered content | 56 clusters, 1,464 keyword targets, **0 errors**          |

I verified the content was complete before re-committing rather than trusting it, then
restored everything as **`033aadc`**. `node_modules` was also wiped and reinstalled with
`npm ci`.

**This is now the third reset that has destroyed local commits.** It is worth saying
plainly: until this branch is pushed, the SEO work exists only in a sandbox that
periodically discards it. Pushing is an owner decision, but the risk is real and growing.

---

## 2. Search Console integration — what inspected out

### 2.1 There is no integration in the app

| Check                                                                          | Result     |
| ------------------------------------------------------------------------------ | ---------- |
| `webmasters` / `searchAnalytics` client anywhere in `app/`, `lib/`, `scripts/` | **none**   |
| Service-account credential or GSC env var                                      | **none**   |
| `google-site-verification` meta tag in served HTML                             | **absent** |
| Any GSC reading at build or request time                                       | **none**   |

The application has never read Search Console. Any Phase 3 data therefore has to be
supplied externally; there is nothing to "switch on".

That missing verification tag matters: if the property was verified by **HTML meta tag**,
it may have lost verification. If by **DNS** or **Google Analytics**, it is a non-issue.
This cannot be determined from outside and is one of the items in §7.

### 2.2 No connector provides it

| Connector               | Result                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `google_search_console` | **`unsupported`** — Arena does not offer one                                                                                              |
| `vercel`                | **enabled**, 47 tools — all deployment, project, domain, env-var, team and webhook operations. **No analytics or Search Console tool.**   |
| `google_drive`          | **enabled** — searched for Search Console exports; 7 files found, all QUICKKIT demo assets (zip, mp4, png, folder). **No export exists.** |
| `supabase`              | enabled; not a source of search data                                                                                                      |

### 2.3 The network path to Google is closed

| Host                                   | HTTP status                   |
| -------------------------------------- | ----------------------------- |
| `https://www.googleapis.com`           | **`000`** (connection failed) |
| `https://searchconsole.googleapis.com` | **`000`**                     |
| `https://github.com`                   | **`200`**                     |

Egress works — it is specifically Google APIs that are blocked. So even with a valid
token, no Search Console API call could be made from here. (A GSC token appears in earlier
project context; it is the owner's credential, it was never meant to enter a sandbox, and
the network block means it could not be exercised anyway.)

**Verdict: data unavailable. Proceed to the fallback the brief specifies.**

---

## 3. Data coverage

| Metric                                        | Coverage    |
| --------------------------------------------- | ----------- |
| Dates covered                                 | **none**    |
| Queries                                       | **none**    |
| Pages with impressions                        | **none**    |
| Clicks / impressions / CTR / position         | **none**    |
| Windows analysed (current / previous 28 days) | **0 of 2**  |
| Tools with any performance data               | **0 of 56** |

There is no partial data, no stale export and no cached copy. Every table below that
would normally hold numbers is replaced by the reason it is empty.

---

## 4. What _is_ verified — site-side readiness

So that the analysis is not blocked by an SEO defect the moment data arrives. All of this
is reproducible from the repo or a live fetch.

| Check                                         | Result                                                        | Source           |
| --------------------------------------------- | ------------------------------------------------------------- | ---------------- |
| `robots.txt` served                           | allow-all except `/api/`, `Sitemap:` declared                 | live fetch       |
| Googlebot rules                               | explicit `Allow: /`, `Disallow: /api/`                        | live fetch       |
| Sitemap URLs ↔ indexable built pages          | **80 ↔ 80**, exact                                            | production build |
| Canonical origin                              | `https://quickkit-rosy.vercel.app` on every page              | built HTML       |
| Duplicate titles / descriptions / canonicals  | **0 / 0 / 0** across 149 pages                                | built HTML       |
| Indexable crawl depth                         | **2**                                                         | link-graph BFS   |
| `noindex` pages                               | 68, all intentional (auth stubs, brand directory, `ai-tools`) | built HTML       |
| Tools with a keyword cluster                  | **56 / 56**, 1,464 targets, 0 errors                          | cluster audit    |
| Tool pages with FAQPage matching visible FAQs | **56 / 56**                                                   | built HTML       |

**Nothing on the site side is blocking measurement.** If the data shows poor performance,
the cause will not be crawlability or metadata duplication.

---

## 5. Mapping queries to tools — the mapper, ready and tested

The brief asks for queries mapped to the 56 tool pages and the 1,464 researched targets.
That mapper is written and tested; it has simply had no real rows to run on.

`toolForQuery()` in `lib/seo/gsc-analysis.ts`:

1. normalises the query and looks for an **exact** match against any of the 1,464
   researched phrases (primary, secondary, or grouped);
2. failing that, picks the **longest researched phrase whose words all appear** in the
   query;
3. failing that, returns `undefined` — it does **not** guess.

Anything derived from step 2 is labelled `inferred` wherever it is used, because word
overlap is a heuristic, not a measurement of Google's judgement. Step 1 is exact and is
labelled `measured`.

Verified by test:

| Query                           | Maps to          | How              |
| ------------------------------- | ---------------- | ---------------- |
| `merge pdf`                     | `merge-pdf`      | exact            |
| `compress pdf to 100kb`         | `compress-pdf`   | exact            |
| `bmi calculator in kg and cm`   | `bmi-calculator` | exact            |
| `zzz unrelated gibberish query` | _unmapped_       | refuses to guess |

---

## 6. The five requested findings — machinery built, no data through it

Each is implemented, thresholded and tested. None has fired, because there is nothing to
fire on.

| Requested finding              | Detection rule                                                    | Basis          | Fired       |
| ------------------------------ | ----------------------------------------------------------------- | -------------- | ----------- |
| High-impression, low-CTR       | ≥50 impressions **and** CTR <2%                                   | `measured`     | **no data** |
| Ranking just outside top 10    | position 11–20 with ≥50 impressions                               | `measured`     | **no data** |
| Impressions but weak clicks    | 0 clicks with ≥50 impressions, and the action differs by position | `measured`     | **no data** |
| Genuine cannibalisation        | one query, ≥2 URLs, ≥10 combined impressions                      | `measured`     | **no data** |
| Query not matching page intent | researched-intent tool ≠ landing page                             | **`inferred`** | **no data** |

Two extras the brief did not ask for, added because their absence is how this analysis
usually goes wrong:

- **`no-impressions`** — a tool with zero impressions has a **discovery or indexing**
  problem, not a copy problem. Conflating the two is the most common failure mode, and it
  is reported separately.
- **`gained/lost-visibility`** — window-over-window movement above 30% and 50 impressions,
  so a change is never mistaken for a trend.

Every finding quotes the figures behind it and states its `basis`, so measured and
inferred can never be read as one thing.

### What it does when given nothing

`npm run gsc:analyse` with no argument prints the owner-steps reference and exits **2**.
Given a file missing `current.rows`, it lists exactly which fields are missing and exits
**2**. There is no sample file, no fallback and no default data — a report full of invented
impressions would be worse than no report.

---

## 7. Your next actions — the unblocking steps

Full detail in [`QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md`](./QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md). The short version:

**Route A — CSV export (~10 minutes, recommended).**

1. <https://search.google.com/search-console> → select the property. Note whether it is
   the URL-prefix property `https://quickkit-rosy.vercel.app/` or a **domain** property —
   say which.
2. **Performance → Search results** → **Last 28 days** → **Export → Download CSV**
   (`gsc-current-queries.csv`).
3. Repeat for the **previous 28 days** (`gsc-previous-queries.csv`).
4. Switch to the **PAGES** tab, export both windows
   (`gsc-current-pages.csv`, `gsc-previous-pages.csv`).
5. Also capture: **Indexing → Pages** counts and reasons; **Settings → Sitemaps** status
   and last-read date; **Settings → Ownership verification** method.
6. Put everything in a Drive folder named **`QUICKKIT GSC Export`** and tell me the name.

> **Known limitation of Route A:** the CSV export gives queries and pages **separately**.
> It contains no query→page pairing, so **cannibalisation and intent-mismatch cannot be
> computed from CSVs alone**. The analysis will report that those two could not be
> assessed rather than guessing at them.

**Route B — API with query→page pairs (~30 minutes).** Needed only if you want those two
findings. Requires a service account with the Search Console API enabled and Full or
Restricted access to the property, then `dimensions: ["query","page"]` for both windows.
**Do not paste the JSON key into chat and do not commit it** — put only the resulting data
in the Drive folder.

**Also worth confirming** (resolves open questions no export answers):

- Which verification method is on the property — if it is an **HTML meta tag**, that tag is
  not currently in the served HTML and the property may have lost verification.
- The exact property string, so canonical URLs and the property are known to agree.
- Whether `sitemap.xml` still shows the _"Temporary processing error"_ recorded in
  `GOOGLE_SEARCH_CONSOLE_FINAL_AUDIT.md`. That report explicitly declined to call it
  cleared, and I am not calling it cleared here either.

---

## 8. Prioritized action plan — evidence-based, with its basis stated

The brief asks for a plan with **exact URLs and evidence**. Since no performance evidence
exists, this plan is built on **verified site-side evidence and the researched keyword
map**, and each item says which it rests on. It is a plan for when data arrives — not a
substitute for it. **No item claims a ranking will improve.**

| #   | Action                                                                      | Exact scope           | Evidence / basis                                 | Blocked on     |
| --- | --------------------------------------------------------------------------- | --------------------- | ------------------------------------------------ | -------------- |
| 1   | **Supply Search Console data**                                              | —                     | §2: no API, no connector, no export              | **You**        |
| 2   | Confirm property + verification method                                      | property settings     | verification tag absent from served HTML (§2.1)  | **You**        |
| 3   | Re-check sitemap processing status                                          | `/sitemap.xml`        | prior audit left this explicitly unresolved      | **You**        |
| 4   | Run `npm run gsc:analyse -- export.json`                                    | all 56 tools          | analyser built, 21 tests passing                 | #1             |
| 5   | Investigate any `no-impressions` tools as **indexing** issues               | reported URLs         | rule exists in analyser; treats discovery ≠ copy | #4             |
| 6   | Rewrite titles/descriptions **only** where a measured low-CTR finding fires | reported URLs         | threshold ≥50 impressions, CTR <2%               | #4             |
| 7   | Work position 11–20 queries with a direct-answer section                    | reported URLs         | threshold position 11–20                         | #4             |
| 8   | Resolve measured cannibalisation, strongest page wins                       | reported query + URLs | ≥2 URLs, ≥10 impressions                         | #4 (+ Route B) |
| 9   | Review inferred intent mismatches by hand before acting                     | reported pairs        | **inferred**, not measured                       | #4 (+ Route B) |

**Explicitly not in this plan:** new pages, doorway pages, or keyword-stuffed copy. Every
item above is a change to an existing URL or a measurement step.

### Why nothing lower-priority is claimed

Without data, any statement like _"`compress-pdf` is our best opportunity"_ would be
invention. The researched keyword map says `compress-pdf` answers a large cluster
(`compress pdf to 100kb`, `compress pdf for email attachment`, …) — that is a statement
about the map, **not** about demand. The two are not interchangeable and are not treated
as such here.

---

## 9. Verification results

| Gate                  | Command                                     | Result                                           |
| --------------------- | ------------------------------------------- | ------------------------------------------------ |
| TypeScript            | `npm run typecheck`                         | **clean**, exit 0                                |
| ESLint                | `npm run lint`                              | **clean**, exit 0                                |
| Prettier              | `npm run format:check`                      | **"All matched files use Prettier code style!"** |
| Full suite            | `npm test`                                  | **2,846 / 2,846 passed**, 204 files              |
| New tests             | `npx vitest run tests/gsc-analysis.test.ts` | **21 / 21 passed**                               |
| Production build      | `npm run build` (production env)            | **exit 0**, 158 / 158 pages                      |
| SEO + keyword gate    | `npm run seo:report`                        | **0 errors**; 56 tools, 1,464 targets            |
| Analyser without data | `npm run gsc:analyse`                       | exits **2** with instructions                    |

Test count rose **2,825 → 2,846**; all 21 additions are the GSC analyser. No existing test
was weakened, relaxed or deleted.

The new tests use **synthetic** numbers, fabricated inside the test file to exercise the
arithmetic and thresholds. The file says so at the top. None of it describes QUICKKIT's
actual performance.

I also confirmed the tests bite: lowering the CTR threshold from `0.02` to `0.0001`
produced 1 failure; restoring it returned 21/21.

### Files changed

| File                                            | Change                                                    |
| ----------------------------------------------- | --------------------------------------------------------- |
| `lib/seo/gsc-analysis.ts`                       | **new** — thresholds, mapper, five finding rules, no data |
| `scripts/gsc-analyse.mts`                       | **new** — CLI; refuses to run without a real export       |
| `tests/gsc-analysis.test.ts`                    | **new** — 21 synthetic-data tests                         |
| `package.json`                                  | adds `gsc:analyse` script                                 |
| `docs/QUICKKIT_SEARCH_CONSOLE_DATA_REQUEST.md`  | **new** — owner steps                                     |
| `docs/QUICKKIT_PHASE3_SEARCH_CONSOLE_REPORT.md` | **new** — this report                                     |

No production code, route, component, tool, canonical rule or sitemap was modified.

### Pre-existing conditions, unchanged

- `Supabase Preview` fails on every `main` merge (long-standing).
- One feedback test flakes roughly 1 run in 60.
- 16 high-severity `npm audit` advisories; **`npm audit fix` not run**.
- Repo declares Node 26.x; sandbox runs v22.22.3 (`EBADENGINE` warnings only).

---

## 10. Limitations

1. **No performance data of any kind.** Not a partial sample — none.
2. **Cannibalisation and intent-mismatch need query→page pairs**, which CSV exports do
   not contain. Route B is required for those two.
3. **Property verification status is unknown** and the meta tag is absent from served HTML.
4. **Sitemap processing status in Google is unknown**; the earlier audit explicitly
   declined to call it resolved, and neither do I.
5. **Field Core Web Vitals are unknown.** No CrUX or GSC field report was available. The
   Lighthouse figures in earlier reports are lab measurements, not field data.
6. **The keyword map is intent research, not demand data.** It says which phrasings a page
   is built to answer; it says nothing about how many people search them.

---

## 11. Non-claims

- No clicks, impressions, CTR, average position, index count or traffic figure appears in
  this report, because none was measured.
- No keyword is claimed to rank, or to be likely to rank, anywhere.
- No page is described as underperforming — that judgement requires the missing data.
- The synthetic figures in `tests/gsc-analysis.test.ts` are test fixtures and are not
  evidence about QUICKKIT.
