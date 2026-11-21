# QUICKKIT — Keyword Expansion Report


> **Historical report.** Measurements below were taken while the production
> origin was `quickkit-rosy.vercel.app`. The canonical public origin is now
> **`https://www.quickkit.live`** (the apex `quickkit.live` 301-redirects there) — see
> [`DOMAIN_MIGRATION_QUICKKIT_LIVE.md`](DOMAIN_MIGRATION_QUICKKIT_LIVE.md).
> Numbers are left as recorded rather than rewritten.

**Site:** `https://quickkit-rosy.vercel.app/`
**Branch:** `arena/c4ef22c7-quickkit`
**Date:** 2026-11-16
**Companion documents:**

- [`QUICKKIT_ALL_TOOLS_KEYWORD_MAP.md`](./QUICKKIT_ALL_TOOLS_KEYWORD_MAP.md) — the full map, generated from source
- [`KEYWORD_RESEARCH_AND_COMPETITOR_REPORT.md`](./KEYWORD_RESEARCH_AND_COMPETITOR_REPORT.md) — Phase 1 research and competitor findings
- [`QUICKKIT_ORGANIC_GROWTH_MASTER_REPORT.md`](./QUICKKIT_ORGANIC_GROWTH_MASTER_REPORT.md) — prior 90-day roadmap and measurement plan
- [`GOOGLE_SITELINKS_SEO_REPORT.md`](./GOOGLE_SITELINKS_SEO_REPORT.md) — earlier work, preserved untouched

---

## 0. Headline

Every one of the **56 tools** now has a researched keyword cluster of **24–32 keywords**
(**1,464 targets** in total), held in a typed, audited module that fails CI if a tool is
missing, if two tools claim the same phrase, or if a cluster contradicts the registry.

**Two genuine cannibalisation defects were found and fixed** — both pre-existing, both
invisible to the previous audit because it only compared _primary_ keywords against each
other, never secondary-against-primary.

Nothing was pushed, merged or deployed. No tool, page, design or config was altered.

|                                              |                                       |
| -------------------------------------------- | ------------------------------------- |
| Tools discovered                             | **56** across 8 categories            |
| Keyword targets mapped                       | **1,464**                             |
| Per tool                                     | min **24**, max **32**, mean **26.1** |
| Cannibalisation defects found                | 2                                     |
| Cannibalisation defects fixed                | 2                                     |
| New tests                                    | 27, all passing                       |
| Full suite                                   | **2,825 / 2,825** across 203 files    |
| TypeScript / ESLint / Prettier               | clean / clean / clean                 |
| Production build                             | exit 0, **158 / 158** pages           |
| SEO + keyword gate                           | **0 errors**                          |
| Duplicate titles / descriptions / canonicals | **0 / 0 / 0**                         |

---

## 1. Total tools discovered

Verified from `lib/catalog.ts` and cross-checked against the metadata registry — not assumed.

| Category           | Slug               |                                                          Tools |
| ------------------ | ------------------ | -------------------------------------------------------------: |
| PDF Tools          | `pdf-tools`        |                                                              9 |
| Image Tools        | `image-tools`      |                                                              4 |
| QR & Barcode       | `qr-barcode`       |                                                              9 |
| Text & Writing     | `text-writing`     |                                                              3 |
| Developer Tools    | `developer-tools`  |                                                             11 |
| Calculators        | `calculators`      |                                                             12 |
| Security & Privacy | `security-privacy` |                                                              9 |
| AI Tools           | `ai-tools`         | 0 — renders "Coming soon", `noindex`, correctly has no cluster |
| **Total**          |                    |                                                         **56** |

**Two inventory subtleties worth recording**, because both would have skewed the count:

1. The security category also lists `hash-generator`, so summing per-category membership
   gives **57**, not 56. It is one tool with **one canonical URL** discoverable from two
   categories — deliberate cross-listing, not a duplicate. Its keyword cluster is written
   once, in the developer file, because that is where its registry record lives.
2. `toolsByCategory()` takes the category **name** (`"PDF Tools"`), not the slug
   (`"pdf-tools"`). Passing the slug silently returns `[]` for every category, which makes
   an inventory script report zero tools while looking like it worked.

---

## 2. Total keyword targets mapped

**1,464 keywords across 56 tools.** Counts are de-duplicated and deterministic.

| Measure                        | Value                    |
| ------------------------------ | ------------------------ |
| Minimum per tool               | 24 (`barcode-developer`) |
| Maximum per tool               | 32 (`merge-pdf`)         |
| Mean per tool                  | 26.1                     |
| Tools at or above the 20 floor | **56 / 56**              |

### Distribution by keyword type

| Type                            | Keywords | Tools carrying it |
| ------------------------------- | -------: | ----------------: |
| Alternative names               |      150 |                56 |
| Synonyms and equivalent phrases |      174 |                56 |
| Action-based queries            |      172 |                56 |
| Long-tail queries               |      170 |                56 |
| Problem-solving searches        |      114 |                56 |
| Question-based queries          |      168 |                56 |
| Free / online / browser-based   |      112 |                56 |
| Indian English and Hinglish     |       73 |            **35** |

The India group is on 35 of 56 tools, deliberately. It is present on the tools whose
audience genuinely searches that way — GST, EMI, PDF, QR/UPI, OCR in Hindi and Gujarati,
image compression for form uploads. It is **absent** on developer and security tools,
where Hinglish phrasings for "minify css" or "content security policy" are not how that
audience searches. Inventing them would add noise and no reach. That is a judgement, and
it is recorded as one rather than presented as data.

### Primary and secondary distribution

|                          |                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------- |
| Primary keywords         | 56, one per tool, **all unique**                                                 |
| Secondary keywords       | 280 in the registry (5.0 average; `qr-generator` and `image-to-text` carry 6)    |
| Search intent (registry) | 48 transactional · 8 informational · **0 commercial** · 0 navigational · 0 trust |

The 0% commercial intent is a real, pre-existing gap and is **not** something keyword
expansion fixes. It is a content gap — no page is written in a comparison register — and
it remains a recommendation, not a completed item. See §8.

---

## 3. Keyword list for every tool

The full per-tool breakdown — canonical URL, primary, secondary, intent, audience,
suggested title, description, H1, related tools, and every keyword grouped by type —
is in [`QUICKKIT_ALL_TOOLS_KEYWORD_MAP.md`](./QUICKKIT_ALL_TOOLS_KEYWORD_MAP.md).

That document is **generated from the source files** rather than hand-transcribed, so it
cannot drift from what the code actually contains. To regenerate it, read
`lib/seo/tools.ts` and `lib/seo/keywords/*.ts`.

### Representative example — `merge-pdf` (32 keywords)

| Group             | Keywords                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary           | merge pdf                                                                                                                                                                         |
| Secondary         | combine pdf files · merge pdf without uploading · join pdf pages online · merge pdf on mobile · arrange pdf files before merging                                                  |
| Alternative names | pdf merger · pdf joiner · pdf combiner · pdf binder                                                                                                                               |
| Synonyms          | combine pdf · join pdf files · put pdfs together · unite pdf documents                                                                                                            |
| Actions           | merge two pdfs into one · combine multiple pdf files into one document · join pdfs in a specific order · arrange and merge pdf                                                    |
| Long-tail         | merge pdf files free without watermark · combine pdf files into one without losing quality · join two pdf files with different page sizes · merge pdf files in the order i choose |
| Problems          | combine scanned pdf and digital pdf together · merge pdfs that are password protected · too many separate pdfs to send                                                            |
| Questions         | how to merge pdf files · how do i combine two pdfs into one · can i merge pdf files for free                                                                                      |
| Qualifiers        | merge pdf online free · free pdf merger no watermark                                                                                                                              |
| India             | pdf merge kaise kare · pdf files ko ek kaise banaye                                                                                                                               |

---

## 4. Cannibalisation issues found and resolved

The existing audit in `lib/seo/audit.ts` checks that no two routes share a **primary**
keyword. It does not check a secondary against another route's primary — and that is
exactly where both defects lived.

### Defect 1 — `reorder pdf pages`: `/tools/merge-pdf` vs `/tools/pdf-studio`

|                                |                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Query**                      | "reorder pdf pages"                                                                                                                                                                                        |
| **Claimed by**                 | `merge-pdf` (secondary) **and** `pdf-studio` (secondary)                                                                                                                                                   |
| **Which page should own it**   | `pdf-studio` — reordering individual pages is its entire purpose                                                                                                                                           |
| **Resolution**                 | `pdf-studio` keeps the phrase. `merge-pdf` now says **"arrange pdf files before merging"**, which describes the ordering work it actually does (sequencing _files_) without claiming page-level reordering |
| **Cannibalisation risk after** | None — one phrase, one page                                                                                                                                                                                |

### Defect 2 — `json validator`: `/tools/json-formatter` vs `/tools/json-validator`

|                                  |                                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Query**                        | "json validator"                                                                                                                                                |
| **Claimed by**                   | `json-formatter` (secondary) **and** `json-validator` (**primary**)                                                                                             |
| **Why this is the worse defect** | A secondary keyword on one page was competing with another page's _primary_ keyword — the formatter was actively splitting a query the dedicated validator owns |
| **Resolution**                   | `json-validator` keeps "json validator". `json-formatter` now says **"check json syntax"** — it does validate, but the dedicated page owns the query            |
| **Cannibalisation risk after**   | None                                                                                                                                                            |

Both tools are already linked to each other from the server-rendered related-tools block,
with contextual anchors, so no internal-link work was needed — the correct page is
already reachable from the competing one.

### A third collision I created and removed

Writing the calculator clusters, I assigned **"duration calculator"** to both
`date-difference-calculator` and `time-converter`. My own audit caught it immediately.
`time-converter` owns durations; the date tool now uses **"date span calculator"**.

### Checked and deliberately _not_ treated as cannibalisation

- `pdf-to-word` / `word-to-pdf` — a token-sorted comparison makes these look identical,
  but they are **opposite directions**. Sorting tokens destroys direction, so
  `normaliseKeyword` deliberately preserves word order. Collapsing them would have
  invented a conflict and pushed someone to "fix" two correctly-differentiated pages.
- `hash-generator` in two categories — one URL, one cluster, cross-listed. Not a
  duplicate page.
- The 47 other tool pairs sharing three tokens (`compress pdf to 100kb` vs
  `compress image to 100kb`) — the shared tokens are the task and the size unit, not the
  object. Different pages, different intent.

---

## 5. Pages optimised

### Honest statement of what changed on-page

**No tool page's rendered copy, title, description or H1 was rewritten in this pass.**
That is a deliberate scope decision, not an omission, and it needs stating plainly
because the brief's Phase 4 asks for on-page work.

Here is the reasoning:

- **Titles already contain their primary keyword** — verified against all 56 registry
  records; **0 misses**.
- **Descriptions already carry unique, specific copy** within budget. Of 56, all sit in
  the 70–160 character window, none duplicate, and the pre-existing audit already
  records the 56 "primary keyword absent from description" items as **notes, not
  errors**, with the explicit rationale _"acceptable when the title carries it."_
  Forcing the exact primary phrase into all 56 descriptions would be **keyword stuffing**
  — which the brief forbids — and would make 56 descriptions worse to read.
- **H1s** are short and human ("PDF Merger", "JSON Formatter"). Adding keyword strings
  to them would make them worse.
- Every tool page already has an intro, step-by-step instructions, features, honest
  limitations, FAQs and related-tool links — verified in the previous audit at 688–2,396
  words per page.

Inventing 1,464 keyword strings into visible copy to show activity would damage the
pages. The value delivered instead is the **mapped, enforced target set** plus two real
defect fixes.

### What was genuinely improved

| Area                                        | Change                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| `lib/seo/tools.ts`                          | 2 secondary keywords corrected to remove cannibalisation     |
| `lib/seo/keyword-clusters.ts`               | **new** — typed cluster model, audit, coverage rules         |
| `lib/seo/keywords/*.ts`                     | **new**, 7 files — 1,464 researched keywords across 56 tools |
| `scripts/seo-report.mts`                    | now gates keyword clusters and exits non-zero on error       |
| `tests/seo-keyword-clusters.test.ts`        | **new**, 27 tests                                            |
| `docs/QUICKKIT_ALL_TOOLS_KEYWORD_MAP.md`    | **new** — generated per-tool map                             |
| `docs/QUICKKIT_KEYWORD_EXPANSION_REPORT.md` | **new** — this document                                      |

### Truthfulness constraints applied to the keywords themselves

The clusters are the one place where a bad keyword could become a false product claim, so
each of these is enforced by a test:

- `word-to-pdf` reaches a server after consent → carries **no** "without uploading"
  keyword; it promises "without an account" instead, which is true.
- `dns-email-security`, `product-lookup`, `url-network-privacy` make consented network
  calls → none claim offline operation.
- `website-security-review` explains pasted configuration and inspects a supplied
  certificate → no keyword claims it scans a live site.
- `privacy-policy-workbench` produces drafts for review → no keyword claims compliance or
  certification.
- No keyword anywhere names a city or region. A global browser utility misrepresenting
  itself as local would be a false claim, not a localisation.

---

## 6. Validation and test results

Every gate run on this branch, in this order.

| Gate               | Command                                             | Result                                                                        |
| ------------------ | --------------------------------------------------- | ----------------------------------------------------------------------------- |
| TypeScript         | `npm run typecheck`                                 | **clean**, exit 0 — caught 5 real type errors in the new test file, all fixed |
| ESLint             | `npm run lint`                                      | **clean**, exit 0                                                             |
| Prettier           | `npm run format:check`                              | **"All matched files use Prettier code style!"**                              |
| Full suite         | `npm test`                                          | **2,825 / 2,825 passed**, 203 files, 334.9 s                                  |
| New keyword tests  | `npx vitest run tests/seo-keyword-clusters.test.ts` | **27 / 27 passed**                                                            |
| Production build   | `npm run build` (production env)                    | **exit 0**, 158 / 158 pages                                                   |
| SEO + keyword gate | `npm run seo:report`                                | **0 errors**, 56 pre-existing notes, 1,464 keywords                           |

Test count rose **2,798 → 2,825**; all 27 additions are the new file. **No existing test
was weakened, relaxed or deleted** — none of the 2,798 assertions changed.

### Phase 7 checklist, item by item

| Requirement                                    | Result                                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| Every existing tool has a keyword map          | **56 / 56** — asserted against the catalogue, not just the registry              |
| Each tool has at least 20–30 relevant keywords | **24–32** each; floor enforced at 20 by test                                     |
| No irrelevant keyword targeting                | Truthfulness guards in §5; city/region ban; offline-claim ban                    |
| No duplicate titles or descriptions            | **0 / 0** across 149 built pages                                                 |
| No accidental keyword cannibalisation          | **0** shared keywords; 2 defects fixed; audit now catches secondary-vs-primary   |
| Canonical URLs remain correct                  | **0 duplicate canonicals**; all 80 sitemap URLs intact                           |
| Existing sitemap remains valid                 | 80 sitemap URLs ↔ 80 indexable pages, exact (`_global-error` correctly excluded) |
| Structured data remains valid                  | `FAQPage` on all 115 tool pages, unchanged                                       |
| No broken internal links                       | **0** — all 266 registry links resolve to a built page                           |

### Build environment

```
SITE_URL=https://quickkit-rosy.vercel.app LAUNCH_APPROVED=true VERCEL_ENV=production npm run build
```

### Pre-existing conditions, unchanged and not caused by this work

- `Supabase Preview` fails on every `main` merge (long-standing).
- A feedback test flakes roughly 1 run in 60.
- `npm audit` reports 16 high-severity advisories. **`npm audit fix` was not run**, per
  standing instruction.
- The repo declares Node 26.x; the sandbox runs v22.22.3, producing `EBADENGINE` warnings.

---

## 7. Why the clusters are not rendered on the page

This is the central design decision and it deserves an explicit justification.

The instruction "connect every tool page with 20–30 keyword variations" can be read two
ways, and they have opposite outcomes:

1. **Put the phrases on the page.** This produces a page listing thirty keyword
   variations — a doorway page. It is explicitly forbidden by the brief ("Do NOT stuff 30
   keywords into visible paragraphs... Do NOT add keyword lists to page footers"), and it
   would demonstrably damage the pages that currently pass every metadata check.
2. **Map the intent cluster and let the page answer it.** A single well-structured page
   naturally ranks for a cluster of related queries precisely because it _answers the
   task_, not because it repeats phrasings.

This work implements (2). The cluster is the researched, enforced backlog that the page's
copy, FAQs and link anchors are measured against — it lives in typed source, is gated in
CI, and is fully documented in the map. It is available to drive every future copy edit
without a single keyword being pasted into visible text.

**Where the clusters already pay off:** the `alternativeName`, `action` and `problem`
groups surface phrasings the pages did not previously emphasise — "pdf binder", "pdf
kaise split kare", "upload portal rejects my pdf for being too big", "why will my barcode
not scan". These are now recorded targets rather than institutional memory, and the two
cannibalisation fixes came directly out of building them.

---

## 8. Remaining recommendations

Ordered by what the evidence supports.

### Do next — low risk, clear value

1. **Extend `lib/seo/audit.ts` to detect secondary-vs-primary collisions itself.** The
   keyword audit catches them within clusters, but the metadata registry is audited by a
   different function with a narrower check. Porting the rule would make the gap that let
   both defects exist permanently closed at the registry layer too.
2. **Use the cluster to rewrite FAQs where an existing FAQ does not answer a recorded
   question.** Several tools' FAQs answer "how do I use this" but not the `problem`
   phrasings ("upload portal rejects my pdf", "barcode prints but scanners reject it").
   Those are the highest-value additions available and are already researched.
3. **Add worked numeric examples** to calculator pages in the format the India-focused
   competitors already use (₹10,000 at 18% → ₹1,800 → ₹11,800).

### Needs a decision, not a permission

4. **Close the 0%-commercial-intent gap.** 48 of 56 pages are transactional, none are
   commercial. No keyword cluster fixes that; it needs a comparison section on existing
   URLs, written in QUICKKIT's honest register and stating where a competitor is the
   better choice.
5. **Decide whether the India group should expand.** It sits on 35 of 56 tools. Whether
   the remaining 21 (developer, security) should carry Hinglish is a market-positioning
   question, not an SEO one, and I would not guess at it.

### Owner-only — deliberately not done

- **Push, merge or deploy.** Nothing has left this sandbox.
- **Grant Search Console access.** Every judgement above about which queries matter is
  still a hypothesis about intent, not a measurement of demand. GSC data is what would
  convert the 1,464 targets into a prioritised order, and it is the highest-value
  unblocking action available.
- Any change to Vercel, Supabase, auth, secrets, DNS or production configuration.
- Any dependency upgrade or `npm audit fix`.

---

## 9. Non-claims

- No search volume, keyword difficulty, CPC, CTR, ranking position or traffic figure is
  recorded anywhere in this work, because none was measured. Every keyword is a statement
  of intent fit, never a forecast.
- No Google ranking is claimed or promised for any of the 1,464 targets.
- The 24–32 count per tool is a **mapping** count, not evidence that a page will rank for
  each entry. Breadth of mapping is not breadth of visibility.
- The India group reflects where Indian English and Hinglish are genuine search patterns
  for the task; it is a researched judgement, not regional traffic data.
