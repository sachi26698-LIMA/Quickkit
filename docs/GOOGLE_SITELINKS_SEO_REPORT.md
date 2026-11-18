# QUICKKIT — Google Search Result & Sitelinks Optimization

**Branch:** `arena/c4ef22c7-quickkit`
**Base:** `7e743359b3b3405ff35667f869d208f64d61aeea` (`main`)
**Site:** https://quickkit-rosy.vercel.app/
**Scope:** Audit + safe implementation. **Nothing pushed, merged or deployed.**

> **On sitelinks specifically.** Google decides whether to show sitelinks, which
> pages appear, and what the anchors say. No markup, sitemap entry or schema can
> guarantee them; Google's own documentation states sitelinks are fully
> automated. What this work does is remove the _obstacles_ it can control:
> ambiguous site identity, inconsistent URLs, missing hierarchy signals and
> contradictory structured data. **No artificial pages were created to chase
> sitelinks**, and no claim is made that sitelinks will now appear.

---

## 1. Existing problems found

The project already had unusually strong technical SEO (canonicals on every
page, a derived sitemap, breadcrumbs with matching JSON-LD, no fake ratings).
The audit found six real defects. Each is stated with the evidence that
established it.

### P1 — The homepage had two canonical spellings (every page affected)

The most important URL on the domain was published two ways:

| surface                                | value                                           |
| -------------------------------------- | ----------------------------------------------- |
| `<link rel="canonical">`               | `https://quickkit-rosy.vercel.app`              |
| `og:url`                               | `https://quickkit-rosy.vercel.app`              |
| sitemap `<loc>`                        | `https://quickkit-rosy.vercel.app/` ← **slash** |
| breadcrumb `item` for Home             | `https://quickkit-rosy.vercel.app/` ← **slash** |
| JSON-LD `WebPage`/`CollectionPage` url | `…/` ← **slash**                                |

Canonical, `og:url` and the sitemap disagreed about the site's primary URL.
Investigated to root cause rather than guessing: Next.js's own metadata
resolver collapses any same-origin URL whose pathname is `/` to `url.origin`
(`resolveAbsoluteUrlWithPathname`, `next/dist/lib/metadata/resolvers/resolve-url.js`),
so `https://host/` **cannot** be emitted as a canonical — it always renders as
`https://host`. The sitemap and JSON-LD were the ones diverging.

Google treats these as one URL, so this was not a ranking defect. It was an
internal contradiction between five surfaces describing the same page, which is
exactly the ambiguity sitelink selection is sensitive to.

### P2 — Brand identity had no declared alias

`Organization` and `WebSite` stated `name: "QUICKKIT"` and nothing else. The
brief specifies the brand is also written "QuickKit" — a real spelling used by
people searching — but no `alternateName` existed, so nothing connected the
two spellings to one entity.

44 of the 443 "QUICKKIT" occurrences in the codebase are lowercase
"Quickkit", mostly internal (`X-Quickkit-Cache` headers, `isQuickkitDataTemplateUrl`
identifiers, a QR demo card). None are user-facing brand claims, so none were
changed — renaming an HTTP header or an exported function would be churn with
no search benefit.

### P3 — No `WebPage` entity anywhere on the site

The brief asks for WebPage structured data. A sitewide grep for `WebPage`
returned **zero** results: the site had `Organization`, `WebSite`,
`BreadcrumbList`, `CollectionPage`, `WebApplication`, `FAQPage` — but no page
entity for the homepage, so nothing tied the homepage to the site graph.

### P4 — The same breadcrumb level was labelled two different ways

The `/tools` hub is reached under two different anchor names, inconsistently:

| page type                     | label for `/tools` |
| ----------------------------- | ------------------ |
| tool pages (`tool-shell.tsx`) | **"Tools"**        |
| `/tools` page itself          | "All Tools"        |
| `/category/[slug]` pages      | "All Tools"        |
| `/guides`-style brand pages   | "Tools"            |

Two names for one destination in the site's own breadcrumb taxonomy weakens the
hierarchy signal (`Home → Category → Tool`). It also contradicted the header
navigation, which says "All Tools".

### P5 — Tool pages linked to the hub with three different anchors

Links pointing at `/tools` used `"All Tools"` (header, footer),
`"Explore All Tools"` (hero), `"All tools"` (related-tools block, sentence case)
and `"Browse all tools"`. Lowercase "All tools" is an inconsistency, not a
content decision.

### P6 — Sitemap `lastmod` granularity is date-only (not fixed, by design)

`<lastmod>` is a genuine Git commit date per route (`gitLastModifiedForFiles`),
which is correct and conservative. It is **not** a defect; recorded here only
so the "remaining recommendations" section does not re-raise it.

---

## 2. Files changed

| file                                                          | lines  | change                                                                                                         |
| ------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| `lib/seo.ts`                                                  | +84/−8 | `absoluteUrl()` helper; `webPageStructuredData()`; `alternateName`; all URL building routed through the helper |
| `app/(public)/page.tsx`                                       | +14    | homepage `WebPage` JSON-LD                                                                                     |
| `app/sitemap.ts`                                              | +2/−2  | root URL via `absoluteUrl()`                                                                                   |
| `components/tool-shell.tsx`                                   | +3/−3  | breadcrumb label + anchor unified to "All Tools"                                                               |
| `app/(public)/tools/word-to-pdf/page.tsx`                     | +2/−2  | breadcrumb + anchor unified                                                                                    |
| `app/(public)/tools/batch-code-checker/brand/[slug]/page.tsx` | +2/−2  | breadcrumb label unified (visible + JSON-LD)                                                                   |
| `tests/seo-structured-data.test.tsx`                          | +96/−1 | 8 new tests; label expectations updated                                                                        |
| `tests/launch.test.ts`                                        | +17/−4 | root-URL assertions corrected                                                                                  |
| `tests/sitewide-indexing-seo.test.tsx`                        | +14/−3 | root-URL assertions corrected                                                                                  |
| `tests/seo-registry.test.ts`                                  | +5/−2  | compares via `absoluteUrl()`                                                                                   |
| `tests/ad-placements.test.tsx`                                | +6/−2  | normalises root path                                                                                           |

**No changes** to: design/CSS, functionality, tools, Supabase data, auth,
environment variables, DNS, `next.config.ts`, `vercel.json`, or the domain.

---

## 3. Fixes implemented

### 3.1 One URL for every page (`lib/seo.ts`)

```ts
export function absoluteUrl(path: string): string | undefined {
  if (!siteOrigin) return undefined;
  if (path === "/" || path === "") return siteOrigin; // bare origin
  return siteOrigin + (path.startsWith("/") ? path : `/${path}`);
}
```

`pageMetadata` (canonical + `og:url`), `app/sitemap.ts`, `breadcrumbStructuredData`,
`collectionPageStructuredData` and `toolStructuredData` all now build URLs
through it. The bare origin was chosen because it is the spelling Next.js
enforces on the canonical — so the whole system now moves to the value the
framework actually emits, instead of three surfaces disagreeing with one.

Guarded by `absoluteUrl()` returning `undefined` without `SITE_URL`, so a
preview build still emits no structured data (existing invariant preserved).

### 3.2 Brand alias

`alternateName: "QuickKit"` on both `Organization` and `WebSite`. This is the
only alias stated: there is no legal entity, trading name or acronym to
declare, and none was invented.

### 3.3 Homepage `WebPage`

```json
{
  "@type": "WebPage",
  "@id": "https://…/#webpage",
  "url": "https://quickkit-rosy.vercel.app",
  "isPartOf": { "@id": "https://…/#website" },
  "about": { "@id": "https://…/#organization" }
}
```

Rendered **by the homepage only**, not from the public layout — the layout
wraps every public page, so a `WebPage` there would have claimed `/tools` _is_
the homepage. It references the existing `WebSite`/`Organization` nodes by
`@id`, so no duplicate entities are produced. Includes `primaryImageOfPage`
(the real OG card) and no ratings, prices, reviews or addresses.

### 3.4 Breadcrumb and anchor consistency

`/tools` is now called **"All Tools"** everywhere — matching the header nav and
the `/tools` page. Visible breadcrumb text and JSON-LD names were changed
together, keeping the level-for-level guarantee the existing test enforces.

---

## 4. Structured data validation results

Measured against the production build (149 HTML pages parsed):

| check                                                 | result                                                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages with JSON-LD parse errors                       | **0 / 149**                                                                                                                                         |
| Pages with duplicated `Organization`                  | **0**                                                                                                                                               |
| Pages with duplicated `WebSite`                       | **0**                                                                                                                                               |
| Pages emitting `WebPage`                              | **1** — homepage only                                                                                                                               |
| Pages with no schema                                  | **7** — `_global-error`, `_not-found`, `login`, `signup`, `account`, `forgot-password`, `reset-password` (all `noindex` auth/error pages — correct) |
| Visible breadcrumb vs JSON-LD names                   | **MATCH** on `/`, `/tools`, `/category/pdf-tools`, `/tools/merge-pdf`                                                                               |
| Invented rating / review / price / address / `sameAs` | **none**                                                                                                                                            |

Per-page schema shape (no duplicates):

| page                  | blocks                                                         |
| --------------------- | -------------------------------------------------------------- |
| `/`                   | Organization+WebSite · WebPage                                 |
| `/tools`              | Organization+WebSite · BreadcrumbList · CollectionPage         |
| `/category/pdf-tools` | Organization+WebSite · BreadcrumbList · CollectionPage         |
| `/tools/merge-pdf`    | Organization+WebSite · BreadcrumbList · WebApplication+FAQPage |

`SoftwareApplication` is **not** used; the site correctly uses
`WebApplication`, which describes browser-based tools. No `SearchAction`
sitelinks-searchbox misuse was added (the existing one points at the real
`/tools?q=` search, which `components/tool-explorer.tsx` genuinely reads via
`useSearchParams` — verified, not assumed).

---

## 5. Sitemap and internal-link results

**Sitemap (80 URLs):**

| check                                 | result                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| URLs                                  | 80                                                                  |
| Duplicates                            | 0                                                                   |
| Non-canonical host                    | 0                                                                   |
| Query strings / fragments             | 0                                                                   |
| Trailing-slash routes (non-root)      | 0                                                                   |
| Root entry                            | `https://quickkit-rosy.vercel.app` — now identical to the canonical |
| Every URL corresponds to a built page | **80 / 80**                                                         |

**robots.txt (built output):**

```
User-Agent: *                    Allow: /   Disallow: /api/
User-Agent: Googlebot            Allow: /   Disallow: /api/
User-Agent: Mediapartners-Google Allow: /   Disallow: /api/
Sitemap: https://quickkit-rosy.vercel.app/sitemap.xml
```

No public page is blocked. `/saved` and `/qr` are deliberately crawlable so
Googlebot can read their `noindex` (blocking them in robots.txt would prevent
that). `/api/` is correctly excluded.

**Internal links from the homepage:** 47 unique internal targets, including all
7 populated categories (`pdf-tools`, `image-tools`, `qr-barcode`,
`text-writing`, `developer-tools`, `calculators`, `security-privacy`), 10 tool
pages, and `/tools`. The empty `ai-tools` category is linked with
`rel="nofollow"` and `noindex` — correct, since it ships no tools.

**Hierarchy is intact and crawlable:** Homepage → Category → Tool, with
`/tools` as the full directory. Tool pages link back to their category, to 3–4
sibling tools, and to `/tools`. All links are ordinary `<a href>` in
server-rendered HTML — no JS-dependent navigation, no hidden links.

---

## 6. Remaining recommendations

These are **not done** and need owner decisions or data this environment does
not have. None were attempted unilaterally.

1. **Verify with Search Console, not assumptions.** Sitelinks are earned from
   crawl + authority signals. Submit the sitemap, then watch _How Google sees
   your page_ and the sitelinks report. This is the only real measurement.
2. **Domain.** The site runs on `quickkit-rosy.vercel.app` (a `vercel.app`
   subdomain). A first-party domain is the single strongest lever on branded
   search presentation. The brief forbids changing the domain, so nothing was
   changed — raised only because it outweighs every markup fix here.
3. **Social profiles (`sameAs`).** `Organization` has no `sameAs` because
   `lib/site.ts` deliberately hides unverified demo handles. If real profiles
   exist, adding them is high value for entity consolidation.
4. **Legal identity fields.** `legalName`, `postalAddress`, `registrationNumber`
   are empty by design ("Owner to supply"). Filling them would allow a fuller
   `Organization`, but inventing them is prohibited and none were fabricated.
5. **Content depth on category hubs.** Each hub already carries 300–500 words of
   unique copy (`lib/category-content.ts`). Genuine growth (comparisons,
   task-oriented guides) would help; artificial pages would not, so none were
   created.
6. **`<lastmod>` is date-granular.** Intentional and honest; a same-day edit
   does not bump it. Left as is.

---

## 7. Tests and build results

All gates run against the working tree (production env vars).

| gate       | command                | result                                                        |
| ---------- | ---------------------- | ------------------------------------------------------------- |
| TypeScript | `npm run typecheck`    | **pass**                                                      |
| ESLint     | `npm run lint`         | **pass**, 0 warnings                                          |
| Prettier   | `npm run format:check` | **pass**                                                      |
| Tests      | `npm test`             | **2,780 passed / 201 files** (baseline was 2,774 — 6 net new) |
| Build      | `npm run build`        | **exit 0**, 158/158 static pages                              |
| SEO report | `npm run seo:report`   | **0 errors, 0 warnings**, 56 notes                            |
| Sitemap    | built `sitemap.xml`    | 80 URLs, 0 duplicates, 80/80 resolve                          |
| robots.txt | built `robots.txt`     | no public page blocked                                        |
| JSON-LD    | 149 built pages parsed | 0 parse errors, 0 duplicate entities                          |

### Five pre-existing tests were updated, and why

Making the site internally consistent necessarily moved assertions that had
encoded the _old_ inconsistency. Each was corrected to assert the invariant,
not to accept a broken value — and every one was verified to fail for the right
reason before the fix:

| test                             | old assertion                    | why it broke                           |
| -------------------------------- | -------------------------------- | -------------------------------------- |
| `sitewide-indexing-seo.test.tsx` | `canonical === ORIGIN + "/"`     | asserts the spelling Next cannot emit  |
| `sitewide-indexing-seo.test.tsx` | `urls` contains `ORIGIN + "/"`   | sitemap root is now the bare origin    |
| `seo-registry.test.ts`           | `ORIGIN + path` in sitemap       | breaks for `path === "/"`              |
| `launch.test.ts`                 | every URL starts `https://host/` | root is `https://host`                 |
| `ad-placements.test.tsx`         | stripped root path `""`          | normalised to `/` for route comparison |

No test was deleted, skipped or loosened. The breadcrumb visible-vs-JSON-LD
parity test still passes **unmodified in intent** — both sides changed together.

### Not measured

- **No live search data.** No impressions, clicks, positions, CTR or sitelink
  counts are available to this environment, and none are estimated.
- **No Google Rich Results Test run.** That tool requires a deployed URL and
  external access this sandbox does not have. JSON-LD was validated instead by
  parsing all 149 built pages and asserting types, `@id` references and
  absence of forbidden properties.
- **No post-deploy crawl.** Changes are local to this branch; nothing was
  pushed or deployed.

---

## Summary

Six defects found; five fixed; one (additive `lastmod`) confirmed already
correct. The work is deliberately narrow: **no redesign, no new pages, no
content rewrites, no fabricated entities**. The substantive win is that the
site now states **one URL, one brand identity and one hierarchy** across its
canonical, Open Graph, sitemap, breadcrumbs and structured data — the
prerequisites for Google to build sitelinks, without any claim that it will.
