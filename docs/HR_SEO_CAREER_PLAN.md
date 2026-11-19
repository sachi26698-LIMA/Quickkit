# QUICKKIT — HR, SEO & Career Ecosystem: Audit, Architecture and Roadmap

Status: implementation record for the branch it ships on. Everything below was
read from the repository before any code was written.

## 1. Repository audit (as found)

| Area               | Finding                                                                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework          | Next.js 16.4.6, React 19, strict TypeScript, npm, no animation library                                                                                                                                 |
| Catalogue          | 62 `slug:` records in `lib/catalog.ts` (56 routed tools + suite entries), 8 categories                                                                                                                 |
| Routing            | Dedicated dirs under `app/(public)/tools/<slug>/` win over the dynamic `[calculator]` segment; `[calculator]` serves the 12 calculators (`lib/calculator-info.ts`) and the consolidated security suite |
| Categories         | `lib/catalog.ts` `categoryMeta` → `lib/nav-categories.ts` (header copy, guarded by `tests/nav-categories.test.ts`) → `/category/[slug]`                                                                |
| SEO                | `lib/seo/registry.ts` types; records in `lib/seo/tools.ts` + `lib/seo/categories.ts`; `lib/seo/audit.ts` fails tests on duplicate titles, keyword cannibalisation, budget overflow, missing researchId |
| Reference content  | `lib/tool-seo-content.ts` (`TOOL_SEO_CONTENT`) — the audit warns when a tool has no entry                                                                                                              |
| Privacy claims     | `lib/tool-processing.ts`; **absent = local by default**, so a local tool needs no entry                                                                                                                |
| Admin              | `admin-resource-table` already manages `display_order`, `is_published`, `seo_title`, `description_override` generically — new categories need **no schema change**                                     |
| Counts             | `lib/catalog-counts.ts` derives every number; no hand-typed totals                                                                                                                                     |
| Reusable utilities | `lib/tools/csv.ts` (`csvCell`/`csvRow`/`csvDocument`), `lib/tools/download.ts` (`downloadBlob`/`downloadText`/`formatBytes`), `components/tool-shell.tsx`, `components/icon-3d.tsx`                    |
| PR #69             | Already **merged** into `main` (`78439ff`), the base of this branch. Nothing to preserve or disturb.                                                                                                   |

### Constraints discovered that shape the design

1. **Every catalogue tool must have an SEO record** (`missing-tool-record`), a
   unique title, a unique description, a unique primary keyword, ≥3 secondary
   keywords, ≥3 internal links, a `researchId`, and reference content.
2. **`title` must not contain "QUICKKIT"** and must be ≤ the raw budget; the
   description is 140–160 characters.
3. **`h1` in the record must match what the page renders.**
4. **New categories must be mirrored in `nav-categories.ts`** or the header
   diverges (test-guarded).
5. A category with published tools must be indexable; an empty one must be
   `noindex` — so categories ship only once they hold real tools.

## 2. Honest scope decision

The brief lists ~172 tools. Building all of them to the stated standard
(real engine, validation, states, a11y, privacy disclosure, reference content,
tests) is roughly 50,000+ lines and cannot be done well in one pass. The brief's
own final rule is explicit: **quality takes priority over inflated tool counts,
and a tool is not complete because its page renders.**

So this branch ships a **complete, verified platform** (3 categories, engines,
SEO, admin, tests) plus **every tool whose engine is genuinely implemented**.
Tools that would need a paid API, live SERP data or a legal data source are
listed as deferred with the exact owner requirement rather than shipped as
convincing-looking stubs.

## 3. Architecture

```
lib/tools/hr/payroll.ts       Indian payroll math: CTC ⇄ gross ⇄ net, PF, ESI, PT, TDS slabs, gratuity, FNF
lib/tools/hr/attendance.ts    attendance %, overtime, leave balance, shift/holiday helpers
lib/tools/hr/documents.ts     salary slip, letters (offer/experience/relieving/warning/increment)
lib/tools/hr/text-kit.ts      JD, KPI, policy, interview-question generators (rule-based, no fake AI)
lib/tools/hr/reports.ts       CSV/report builders for registers, directories, attendance sheets

lib/tools/seo/analyze.ts      pixel-width title/description budgets, keyword density, n-grams, readability
lib/tools/seo/schema.ts       JSON-LD builders (Organization/WebSite/Article/Product/FAQ/Breadcrumb/LocalBusiness)
lib/tools/seo/technical.ts    robots.txt, sitemap, canonical, hreflang, redirect chain analysis
lib/tools/seo/text-kit.ts     titles, meta descriptions, content briefs, outlines, alt text
lib/tools/seo/audit.ts        on-page analyzer, duplicate-content similarity, cannibalisation

lib/tools/career/resume.ts    ATS scoring, keyword match, bullet/summary generation, comparison
lib/tools/career/salary.ts    salary conversions, notice period, experience, growth, relocation
lib/tools/career/text-kit.ts  cover letters, follow-ups, STAR, bios, LinkedIn sections
```

Every engine is a **pure function module** with no React and no network, so it is
unit-testable directly and runs entirely in the browser (privacy by
construction). UI lives in `components/tools/{hr,seo,career}/` as shared
workspaces; each tool gets its own thin route that renders the shared workspace
with a mode.

## 4. Data, security and privacy

- All new tools are **browser-local**. No new network calls, no new API routes,
  no new tables, no Supabase schema change, no env var.
- `lib/tool-processing.ts` therefore needs no new entries (absent = local).
- No employee data, CVs or salary records are transmitted or persisted. Export is
  a client-side Blob download the user controls.
- Nothing is added to the CSP, headers or permissions policy.

## 5. Implementation roadmap (this branch)

- [x] Audit, plan, engines
- [x] 3 categories registered in catalogue, nav, tints, icons, SEO
- [x] Category landing pages (introduction, searchable directory, subgroups,
      related categories)
- [x] Tool routes for every implemented tool, with SEO records, reference
      content and tests
- [ ] Deferred tools (see §6) — documented below, not stubbed

## 6. Deferred tools and their owner requirement

| Tool group                                                                                       | Why deferred                                                                                       | What the owner must supply                                          |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Backlink profile analyzer, keyword difficulty, search volume, keyword suggestions from real data | Requires a paid SERP/backlink API. Fabricating numbers is explicitly forbidden.                    | A vendor API key (Ahrefs/Semrush/DataForSEO) and a budget for quota |
| Live site crawl (broken links, site-wide audit, Core Web Vitals field data)                      | Needs a server-side crawler or the CrUX API. A browser cannot crawl a third-party site under CORS. | A crawl service key, or approval to add a server crawler jar        |
| Google Business Profile / local ranking, NAP consistency against Google                          | Needs Google Places API                                                                            | Places API key                                                      |
| AI resume builder / cover letter "AI"                                                            | No LLM provider is configured. Rule-based generation ships instead, clearly labelled.              | An LLM API key and cost approval                                    |
| Job listings, live vacancies, real salary benchmarks                                             | Needs a jobs API (e.g. Adzuna/LinkedIn partner). Never fabricated.                                 | Jobs API credentials                                                |
| Search Console data                                                                              | Owner-only OAuth; already handled by the existing `scripts/gsc-analyse.mts`                        | Owner runs it with their own credentials                            |
