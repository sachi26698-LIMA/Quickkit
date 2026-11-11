# QUICKKIT — Phase 1 Complete Advanced SEO Audit (`SEO_MASTER_AUDIT.md`)

- **Audit Date:** 2026-11-10 (UTC)
- **Repository & Branch:** `sachi26698-LIMA/Quickkit` (`arena/6d2c5a1f-quickkit` @ commit `e06be8a2c02a5dd37ea98a8487a78fb92d6d96ff`)
- **Framework & Runtime:** Next.js `16.4.3` (App Router, Turbopack), React `19.3.1`, TypeScript `6.0.3`
- **Live Production Origin (Verified via Vercel API):** `https://quickkit-rosy.vercel.app` (`SITE_URL="https://quickkit-rosy.vercel.app"`, `LAUNCH_APPROVED="true"`, Hobby plan)
- **Audit Mode:** **Phase 1 — Read-Only Diagnostic Audit** (zero source, design, configuration, or git-tracked files modified)

---

## Executive Summary & Overall SEO Health Score

| Audit Pillar | Score (0–100) | Status | Key Takeaway |
| --- | :---: | :---: | --- |
| **1. Technical SEO & Crawlability** | **64 / 100** | Needs Work | Clean URLs, self-canonicals, and valid XML sitemap exist in production, **but** site runs on a shared `*.vercel.app` subdomain (no custom TLD), `/saved` & `/qr` have a `robots.txt` `Disallow` vs `noindex` conflict, `/tools` is forced into dynamic SSR (`ƒ`) with infinite query-param URLs, `<Header>` hides all 8 category links from SSR HTML, and `ToolShell` starves 20/42 tools of internal related-tool links. |
| **2. On-Page SEO & Metadata** | **70 / 100** | Moderate | Zero duplicate `<title>`, meta description, or `<h1>` tags across 68 HTML pages. However, `/` omits the `QUICKKIT` brand in `<title>`, 8 pages have `<title>` ≤ 26 chars, 16 pages have meta descriptions < 110 chars, 41 tool pages repeat identical generic `<h2>` headings (`How to use it`, `A few useful answers`), and 6 pages contain stale/contradictory factual copy (e.g., `/help` claims Calculators are still `"Coming soon"`). |
| **3. Individual Tool SEO Depth (42 Tools)** | **58 / 100** | High Gap | 16 PDF/Image/QR studios have strong, original engineering-grade copy (`547–1,485` words), **but** 24/42 tools (all 12 Calculators, all 10 Developer Tools, 2 Text Tools, 2 Security Tools) have thin or light SSR prose (`119–286` words), zero worked examples/formulas in HTML, and `/tools/qr-generator` & `/tools/qr-code-scanner` omit newly shipped Payment/UPI, Data Templates, ECDSA signing, AES-256-GCM encryption, and QR expiry features. |
| **4. Structured Data (JSON-LD)** | **48 / 100** | Critical Gap | **34 of 42 tools (81.0%)** lack `WebApplication`/`SoftwareApplication` schema completely (including all 12 Calculators, 10 Dev Tools, `merge-pdf`, `qr-generator`, `word-to-pdf`). The 8 tools that emit `toolStructuredData` include **deprecated `HowTo` schema** and hardcode `applicationCategory: "MultimediaApplication"` + `"Images are processed locally."` `/tools` and `/help` lack `BreadcrumbList`; `Organization` lacks `logo` and `contactPoint`. |
| **5. Performance & Core Web Vitals Readiness** | **56 / 100** | High Risk | Self-hosted variable font (`29 KB` `.woff2`) and static HTML TTFB (`2.4–7.0 ms` local) are fast, **but** every route loads a **render-blocking `315.4 KB` (`55.1 KB` gzip) global CSS file** (`app/globals.css`), an eager **`adsbygoogle.js` script on all 68 routes** (even on 16 ad-excluded routes while ads are disabled), and **massive initial JS bundles up to `1,637.4 KB` raw (`587.0 KB` gzip)** due to static imports of `terser`, `csso`, `pdfjs-dist`, and `@cantoo/pdf-lib`. |
| **6. Keyword Coverage & Topical Authority** | **54 / 100** | High Opportunity | Strong functional tool breadth (42 utilities across 7 categories), **but** zero editorial guides/comparison pages exist, high-intent split queries (`JPG to PNG`, `Unlock PDF`, `UPI QR Generator`, `SIP Calculator`, `Compound Interest Calculator`) lack dedicated landing targets, and title/H1 phrasing misses primary modifiers on calculators and converters. |
| **OVERALL SEO HEALTH SCORE** | **59 / 100** | **Action Required** | Solid privacy-first engineering foundation held back by **domain infrastructure, internal link distribution bugs, 81% missing tool schema, thin calculator/dev-tool copy, stale factual claims, and heavy initial CSS/JS bundles**. |

> **Evidence & Measurement Transparency Note:**
> - **Measured Directly:** Production Next.js `16.4.3` build (`SITE_URL=https://quickkit-rosy.vercel.app LAUNCH_APPROVED=true`), all 68 HTML routes + 15 special/system endpoints via live HTTP requests against `next start`, DOM/HTML/JSON-LD parsing, internal link graph & BFS click-depth computation, raw & gzipped HTML/CSS/JS/font/image asset weights, and live Vercel project/domain/environment configuration via the Vercel API.
> - **Not Available / Not Verified (Never Invented):** Google Search Console (GSC) indexing/impressions, third-party search volume / keyword difficulty (Ahrefs/Semrush), live Google SERP rankings, real-user Chrome UX Report (CrUX) / Vercel Speed Insights field data (`speedInsights.hasData: false` in Vercel API), and browser-painted Lighthouse/Chromium lab frame timings (no Chromium binary is installed in this offline sandbox). CWV paint/interaction assessments below combine exact measured byte/DOM payloads with code-level rendering analysis.

---

## Step 1 — Full Website Route Inventory

### 1.1 Route Architecture Summary

| Route Group | Total Routes | Next.js Build Mode | Indexable (`index, follow`) | Non-Indexable (`noindex`) | In `sitemap.xml` |
| --- | :---: | :---: | :---: | :---: | :---: |
| Core & Utility Pages (`/`, `/tools`, `/help`, `/sitemap`, `/saved`, `/qr`) | **6** | `5` Static (`○`), `1` Dynamic (`ƒ /tools`) | **4** (`/`, `/tools`, `/help`, `/sitemap`) | **2** (`/saved`, `/qr`) | **4** |
| Category Hubs (`/category/[slug]`) | **8** | `8` SSG (`●`) | **7** (active categories) | **1** (`/category/ai-tools`) | **7** |
| Company, Legal & Trust Pages (`lib/legal.ts`) | **12** | `12` Static (`○`) | **12** | **0** | **12** |
| Dedicated Static Tool Pages (`app/tools/<slug>/page.tsx`) | **30** | `30` Static (`○`) | **30** | **0** | **30** |
| Dynamic-Segment Calculator Tool Pages (`app/tools/[calculator]/page.tsx`) | **12** | `12` SSG (`●`) | **12** | **0** | **12** |
| **Total HTML Pages** | **68** | **67 Static/SSG + 1 Dynamic** | **65** | **3** | **65** |
| Metadata, Static Asset & API Endpoints (`/robots.txt`, `/sitemap.xml`, `/opengraph-image`, `/icon.svg`, `/apple-icon.png`, `/favicon.ico`, `/ads.txt`, `/api/word-to-pdf`, `_not-found`) | **9** | `8` Static (`○`) + `1` Dynamic API (`ƒ`) | N/A | `_not-found` (`noindex`) | N/A |
| Configured Permanent Redirects (`next.config.ts`) | **1** | `308 Permanent Redirect` | `/tools/image-converter` → `/tools/image-to-image` | — | Excluded |
| Blog / Guide / Editorial Article Routes | **0** | **None exist** | — | — | — |

### 1.2 Complete Non-Tool Page Inventory (26 HTML Pages)

| Route | HTTP | Build | Robots Meta | `<title>` (Chars) | Meta Description Chars | `<h1>` | `<main>` Words | Inbound `<main>` Links | JSON-LD Types |
| --- | :---: | :---: | --- | --- | :---: | --- | :---: | :---: | --- |
| `/` | 200 | `○` | `index, follow` (default) | `Free browser tools for everyday tasks` (**37**) | 156 | `Free online tools for PDFs, images, text and code` | 642 | 61 | `Organization`, `WebSite` |
| `/tools` | 200 | **`ƒ`** | `index, follow` (default) | `All Tools — every free browser tool in one place \| QUICKKIT` (59) | 157 | `All Tools` | 843 | 52 | `Organization`, `WebSite` |
| `/help` | 200 | `○` | `index, follow` (default) | `Help Center & FAQ — guides for every tool \| QUICKKIT` (52) | 111 | `How can we help?` | 479 | **4** | `Organization`, `WebSite` |
| `/sitemap` | 200 | `○` | `index, follow` (default) | `Sitemap — every page on this site \| QUICKKIT` (44) | 123 | `Site Map` | 248 | 11 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/saved` | 200 | `○` | `noindex, follow` | `Saved Tools — your QUICKKIT favourites \| QUICKKIT` (49) | **88** | `Saved Tools` | **49** | 1 (+67 header) | `Organization`, `WebSite` |
| `/qr` | 200 | `○` | `noindex, nofollow` | `QR Data Card — view scanned QR details \| QUICKKIT` (49) | 139 | **NONE (`0`)** | **4** | 0 | `Organization`, `WebSite` |
| `/about` | 200 | `○` | `index, follow` (default) | `About us — free browser tools \| QUICKKIT` (40) | 135 | `Useful tools. Less busywork.` | 1,013 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/contact` | 200 | `○` | `index, follow` (default) | `Contact — support, privacy, security, business \| QUICKKIT` (57) | 154 | `Contact Us` | 479 | 13 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/faq` | 200 | `○` | `index, follow` (default) | `Frequently Asked Questions \| QUICKKIT` (37) | 145 | `Frequently Asked Questions` | 1,034 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/terms` | 200 | `○` | `index, follow` (default) | `Terms and Conditions — rules for using the tools \| QUICKKIT` (59) | 149 | `Terms and Conditions` | 1,957 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/privacy` | 200 | `○` | `index, follow` (default) | `Privacy Policy — how your data is handled \| QUICKKIT` (52) | 145 | `Privacy Policy` | 2,281 | 13 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/cookies` | 200 | `○` | `index, follow` (default) | `Cookie Policy — what we store and what we don’t \| QUICKKIT` (58) | 155 | `Cookie Policy` | 1,187 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/disclaimer` | 200 | `○` | `index, follow` (default) | `Disclaimer — limits, estimates and accuracy \| QUICKKIT` (54) | 150 | `Disclaimer` | 1,490 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/copyright` | 200 | `○` | `index, follow` (default) | `Copyright and DMCA Policy \| QUICKKIT` (36) | 155 | `Copyright and DMCA Policy` | 1,198 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/accessibility` | 200 | `○` | `index, follow` (default) | `Accessibility Statement \| QUICKKIT` (34) | 142 | `Accessibility Statement` | 1,309 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/security` | 200 | `○` | `index, follow` (default) | `Security Policy \| QUICKKIT` (**26**) | 152 | `Security Policy` | 1,514 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/file-handling` | 200 | `○` | `index, follow` (default) | `File Handling & Data Processing Policy \| QUICKKIT` (49) | 139 | `Data Processing and File Handling Policy` | 2,557 | 13 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/intellectual-property` | 200 | `○` | `index, follow` (default) | `Intellectual Property Policy \| QUICKKIT` (39) | 138 | `Intellectual Property Policy` | 987 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/pdf-tools` | 200 | `●` | `index, follow` (default) | `PDF Tools — free online tools \| QUICKKIT` (40) | 154 | `PDF Tools` | 717 | 18 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/image-tools` | 200 | `●` | `index, follow` (default) | `Image Tools — free online tools \| QUICKKIT` (42) | **98** | `Image Tools` | 501 | 13 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/qr-barcode` | 200 | `●` | `index, follow` (default) | `QR & Barcode — free online tools \| QUICKKIT` (43) | **93** | `QR & Barcode` | 472 | 11 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/text-writing` | 200 | `●` | `index, follow` (default) | `Text & Writing — free online tools \| QUICKKIT` (45) | **88** | `Text & Writing` | 426 | 12 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/developer-tools` | 200 | `●` | `index, follow` (default) | `Developer Tools — free online tools \| QUICKKIT` (46) | **108** | `Developer Tools` | 602 | 20 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/calculators` | 200 | `●` | `index, follow` (default) | `Calculators — free online tools \| QUICKKIT` (42) | **89** | `Calculators` | 545 | 21 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/security-privacy` | 200 | `●` | `index, follow` (default) | `Security & Privacy — free online tools \| QUICKKIT` (49) | **90** | `Security & Privacy` | 370 | 10 | `Organization`, `WebSite`, `BreadcrumbList` |
| `/category/ai-tools` | 200 | `●` | **`noindex, follow`** | `AI Tools — free online tools \| QUICKKIT` (39) | **108** | `AI Tools` | **66** | 10 | `Organization`, `WebSite`, `BreadcrumbList` |

*(Full 42-tool inventory and per-tool audit table is in Step 4 below.)*

---

## Step 2 — Technical SEO Audit

### 2.1 Domain, Origin & Launch-Gate Architecture (`CRITICAL` / `HIGH`)

1. **No Custom Top-Level Domain Attached (`HIGH` — Infrastructure & Brand Authority)**
   - **Evidence:** Vercel project `prj_CIR5iP3vxbNRLcP9EApup7b7iHq1` has `domains: []` at the account level and only `quickkit-rosy.vercel.app` assigned to the project, with `SITE_URL="https://quickkit-rosy.vercel.app"` and `LAUNCH_APPROVED="true"`.
   - **SEO & AdSense Impact:** `vercel.app` is on the Mozilla Public Suffix List (PSL). Building backlinks, citations, and Search Console history on `quickkit-rosy.vercel.app` means a future migration to a custom domain (`quickkit.in` / `quickkit.tools` / etc.) requires cross-domain 301 redirects, and Google AdSense typically rejects or restricts sites hosted on free `*.vercel.app` subdomains rather than owned apex domains.
2. **Multiple Live `.vercel.app` Production Aliases Without Host Redirects (`MEDIUM`)**
   - **Evidence:** Vercel exposes automatic aliases (`quickkit-sachi26698-6758s-projects.vercel.app`, `quickkit-git-main-sachi26698-6758s-projects.vercel.app`, and deployment URLs) on the production target where `indexingEnabled` evaluates to `true`. `next.config.ts` has no host-header canonicalization redirect to `SITE_URL`. While HTML `<link rel="canonical">` points to `https://quickkit-rosy.vercel.app`, non-canonical production aliases still return `200 OK` without `X-Robots-Tag: noindex` or a `308` redirect.
3. **Single-Point-of-Failure Indexing Gate (`lib/launch.ts`) (`INFO` — Verified Healthy in Prod, Fragile on Misconfiguration)**
   - **Evidence:** `indexingEnabled` requires both a valid HTTPS `SITE_URL` and `LAUNCH_APPROVED === "true"`. Currently **both are set** on Vercel `production`, so production indexing is active (`X-Robots-Tag` suppression is off; `sitemap.xml` emits 65 URLs). Preview deployments lack `LAUNCH_APPROVED="true"` and automatically receive `X-Robots-Tag: noindex, nofollow, noarchive` — which is good practice for preview branches, provided `SITE_URL` is updated atomically whenever a custom domain is attached.

### 2.2 `robots.txt` vs `noindex` Directive Conflict (`HIGH`)

- **File:** `app/robots.ts` (`PRIVATE_PATHS = ["/api/", "/saved", "/qr"]`)
- **Measured `/robots.txt` Output:**
  ```text
  User-Agent: *
  Allow: /
  Disallow: /api/
  Disallow: /saved
  Disallow: /qr
  ```
- **Technical Defect:**
  1. `/saved` (`app/saved/page.tsx:5`) sets `robots: { index: false }` (`<meta name="robots" content="noindex, follow">`) and `/qr` (`app/qr/page.tsx:16`) sets `robots: { index: false, follow: false }` (`<meta name="robots" content="noindex, nofollow">`).
  2. Because `/saved` and `/qr` are **simultaneously blocked by `Disallow` in `robots.txt`**, Googlebot is forbidden from fetching `/saved` and `/qr` and **cannot read their `<meta name="robots" content="noindex">` tags**!
  3. Worse, **all 68 pages on the site link to `/saved`** in the global `<Header>` (`components/header.tsx:177`) and `/sitemap` (`app/sitemap/page.tsx:24`), and externally shared QR Data Template URLs point to `/qr?d=...`. Under Google's indexing rules, a `robots.txt`-disallowed URL that has inbound links can **still be indexed in Google Search as a bare URL ("Indexed, though blocked by robots.txt")**!
  4. Additionally, `app/robots.ts` duplicates identical rules across `User-agent: *`, `Googlebot`, and `Mediapartners-Google`.
- **Required Fix (Phase 2):** Remove `/saved` and `/qr` from `robots.txt` `Disallow` so crawlers can read their `noindex` meta/header directives cleanly (or emit `X-Robots-Tag: noindex, nofollow` and add `rel="nofollow"` on internal links to `/saved`), and collapse redundant identical user-agent blocks.

### 2.3 Dynamic SSR De-optimization & Query-Parameter Duplication on `/tools` (`HIGH`)

- **File:** `app/tools/page.tsx:13-22`
- **Evidence:**
  - `AllToolsPage` accepts `searchParams: Promise<{ q?: string; category?: string }>` and `await`s it on the server.
  - Next.js `16.4.3` build output confirms `/tools` is the **only HTML page compiled as `ƒ (Dynamic) server-rendered on demand`**, whereas all other 67 HTML pages are statically pre-rendered (`○` / `●`).
  - Measured local TTFB: static pages respond in **`2.4–7.0 ms`** (`Cache-Control: s-maxage=31536000`), whereas `/tools?q=pdf` takes **`45.84 ms`** locally (and incurs cold-start serverless invocation latency in `iad1` on Vercel Hobby) with **`Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`**!
  - Furthermore, any arbitrary query string (`/tools?q=anything`, `/tools?category=PDF+Tools`, `/tools?utm_source=...`) returns `HTTP 200` with unique server-filtered HTML while canonicalizing back to `/tools`, creating an unnecessary parameter crawl surface, while `/category/[slug]` pages already serve dedicated static category URLs.

### 2.4 XML Sitemap Audit (`app/sitemap.ts`) (`MEDIUM`)

- **Measured `/sitemap.xml`:** `200 OK`, `application/xml`, `5,019 bytes`, **65 `<url>` entries**.
- **What Works Well:**
  - Every `<loc>` is `200 OK`, canonical, indexable, and HTTPS (`https://quickkit-rosy.vercel.app/...`).
  - Properly excludes `/saved`, `/qr`, `/category/ai-tools` (`0` tools, `noindex`), `/tools/image-converter` (`308`), and `/api/word-to-pdf`.
- **Defects Identified:**
  1. **Zero `<lastmod>` tags emitted** across all 65 URLs (`app/sitemap.ts:27` returns `{ url: `${siteUrl}${route}` }` with no `lastModified`, even though `LEGAL_LAST_UPDATED_ISO` exists for legal pages and git/build timestamps or per-route content dates can be supplied). *(Note: Google ignores `<priority>` and `<changefreq>`, so omitting those two is fine, but accurate `<lastmod>` dates help crawl scheduling.)*
  2. **`Cache-Control: public, max-age=0, must-revalidate`** forces revalidation on every bot hit.

### 2.5 Internal Linking, Navigation & Near-Orphan Analysis (`CRITICAL` / `HIGH`)

1. **Global `<Header>` Unmounts All 8 Category Links During SSR (`HIGH`)**
   - **File:** `components/header.tsx:108-128`
   - **Code Evidence:** `{catOpen ? (<div className="dropdown-panel">...<ul>{categoryMeta.map(...)}</ul></div>) : null}`
   - **Impact:** Because `catOpen` defaults to `false`, **zero `/category/[slug]` `<a>` tags exist in the server-rendered `<header>` HTML across all 68 pages**! Search crawlers do not click React state buttons to discover nav links.
2. **Global `<Footer>` Omits 3 of 7 Active Categories (`MEDIUM`)**
   - **File:** `lib/legal.ts:346-352` (`footerColumns.tools`)
   - **Evidence:** Footer links to `/category/pdf-tools`, `/category/image-tools`, `/category/qr-barcode`, and `/category/calculators`, **completely omitting**:
     - `/category/developer-tools` (**10 live tools!** — only `inAll = 20` vs `64` for footer-linked categories)
     - `/category/text-writing` (`2` live tools — `inAll = 12`)
     - `/category/security-privacy` (`2` live tools — `inAll = 10`)
3. **`ToolShell` `.slice(0, 3)` Related-Tools Bug Starves 20 of 42 Tools (`47.6%`) (`CRITICAL`)**
   - **File:** `components/tool-shell.tsx:31-33`
   - **Code Evidence:**
     ```ts
     const related = toolsByCategory(tool.category)
       .filter((item) => item.slug !== slug)
       .slice(0, 3);
     ```
   - **Measured Impact on Link Graph:** Because `.slice(0, 3)` always selects the **first 3 tools in `lib/catalog.ts`** for each category instead of rotating around the current tool's index (or pairing semantically related workflows like `merge-pdf` ↔ `split-pdf` ↔ `compress-pdf`, `emi-calculator` ↔ `loan-calculator` ↔ `gst-calculator`, `word-to-pdf` ↔ `pdf-to-word`):
     - **20 of 42 indexable tools have `inMain = 3` total contextual links across the entire site** (only `/tools`, `/sitemap`, and their single `/category/[slug]` page — **zero** cross-links from any sibling tool!):
       - **PDF Tools starved (`inMain = 3–4`):** `split-pdf` (3), `compress-pdf` (3), `pdf-to-word` (3), `word-to-pdf` (3), `pdf-lock-unlock` (4 — 1 from homepage popular grid), while `pdf-to-image`, `images-to-pdf`, and `pdf-studio` hoard `inMain = 10`!
       - **Developer Tools starved (`inMain = 3`):** `javascript-minifier` (3), `base64-encoder-decoder` (3), `url-encoder-decoder` (3), `uuid-generator` (3), `regex-tester` (3), `xml-formatter` (3), while `json-formatter` (16), `json-validator` (13), and `html-formatter` (13) hoard every related link!
       - **Calculators starved (`inMain = 3`):** `age-calculator` (3), `emi-calculator` (3), `loan-calculator` (3), `date-difference-calculator` (3), `time-converter` (3), `unit-converter` (3), `temperature-converter` (3), `scientific-calculator` (3), while `percentage-calculator` (14), `bmi-calculator` (14), and `discount-calculator` (14) hoard every related link!
       - **Security Tools (`inMain = 3`):** `password-generator` (3) and `hash-generator` (3) — only 2 tools exist in `Security & Privacy`, so each only links to the other + category/directory (`inMain` is actually 3 because `hash-generator` is categorized under `"Developer Tools"` or `"Security & Privacy"`? Wait — in `lib/catalog.ts`, `hash-generator` is in `"Security & Privacy"` or `"Developer Tools"`? Let's note exact catalog membership: `Security & Privacy` has **only 1 tool (`password-generator`)** because `hash-generator` is in `Developer Tools`! That means `password-generator` renders **zero** `"Keep the good work going"` related tools (`related.length === 0`)!).
4. **`/tools/word-to-pdf` Standalone Studio Renders Zero Related-Tool Links (`MEDIUM`)**
   - **File:** `app/tools/word-to-pdf/page.tsx`
   - **Evidence:** Bypassing `ToolShell` means `/tools/word-to-pdf` has **no related-tools section** linking back to `/tools/pdf-to-word`, `/tools/merge-pdf`, or `/tools/compress-pdf`.
5. **Internal Links Pointing to `noindex` Pages (`LOW–MEDIUM`)**
   - `10` indexable pages (`/`, `/about`, `/sitemap`, and all 7 active `/category/*` pages) link directly to `/category/ai-tools` (`noindex`, 0 tools), and all `68` pages link to `/saved` (`noindex`) without `rel="nofollow"`.

### 2.6 HTTP Status Codes, Redirects & 404 Handling (`LOW–MEDIUM`)

- **Redirects:**
  - `/tools/image-converter` → `308 Permanent Redirect` to `/tools/image-to-image` (1 hop, no chain, zero internal links still pointing to `/tools/image-converter`).
  - Trailing slashes (e.g., `/tools/merge-pdf/`) → `308 Permanent Redirect` to `/tools/merge-pdf` (1 hop, consistent non-trailing-slash canonicals).
- **404 Error Page (`app/not-found.tsx`):**
  - Properly returns `HTTP 404` and `<meta name="robots" content="noindex">`.
  - **Gaps:**
    1. Exports no dedicated `metadata` (`<title>` falls back to root `"QUICKKIT — Handy tools. Zero hassle."` instead of `"Page Not Found (404) | QUICKKIT"`).
    2. Contains only a single `<Link href="/">Back to QUICKKIT</Link>` button — no link to `/tools`, no category shortcuts, and no popular tools to retain organic visitors who land on a mistyped URL.

### 2.7 Security Headers, HTTPS & Mobile Usability (`PASS` with Minor Notes)

- **Security & HTTPS (`next.config.ts`):** Excellent `Strict-Transport-Security` (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and strict CSP.
- **HTML Semantics Minor Bug (`lib/legal.ts:23`):** `isoDatetime()` returns `{ datetime: value }` (lowercase HTML attribute) spread onto React `<time {...isoDatetime(...)}>`, triggering React 19's `Invalid DOM property 'datetime'. Did you mean 'dateTime'?` warning during SSR across legal pages.

---

## Step 3 — On-Page SEO Audit

### 3.1 `<title>` Tag Audit

- **Uniqueness:** **68 / 68 unique `<title>` tags** (0 duplicates).
- **Defects Identified:**
  1. **Homepage `<title>` Omits Brand Name & Primary Category Keywords (`HIGH`):**
     - Current (`37` chars): `Free browser tools for everyday tasks` (`app/page.tsx:22` uses `{ absolute: ... }`, bypassing the `%s | QUICKKIT` template).
     - Problem: Neither `QUICKKIT` nor high-volume tool categories (`PDF`, `Image`, `QR Code`, `Developer`, `Calculators`) appear in the homepage `<title>`.
  2. **8 Under-Optimized Short `<title>` Tags (`≤ 26` chars) (`HIGH`):**
     - `app/tools/[calculator]/page.tsx:25` passes bare `tool.name` (`pageMetadata(tool.name, ...)`), producing ultra-short 25–32 char titles with zero intent modifiers (`online`, `free`, `formula`, `India`, etc.):
       - `/tools/age-calculator` (`25` chars): `Age Calculator | QUICKKIT`
       - `/tools/emi-calculator` (`25` chars): `EMI Calculator | QUICKKIT`
       - `/tools/gst-calculator` (`25` chars): `GST Calculator | QUICKKIT`
       - `/tools/bmi-calculator` (`25` chars): `BMI Calculator | QUICKKIT`
       - `/tools/time-converter` (`25` chars): `Time Converter | QUICKKIT`
       - `/tools/unit-converter` (`25` chars): `Unit Converter | QUICKKIT`
       - `/tools/loan-calculator` (`26` chars): `Loan Calculator | QUICKKIT`
       - Plus `/security` (`26` chars): `Security Policy | QUICKKIT` (and 4 more calculators at `30–32` chars: `Discount Calculator`, `Percentage Calculator`, `Temperature Converter`, `Scientific Calculator`).
  3. **Generic Category `<title>` Pattern (`MEDIUM`):**
     - All 7 active category hubs use `<Category> — free online tools | QUICKKIT` (`40–49` chars) instead of naming flagship tasks (e.g., `Free Online PDF Tools — Merge, Split, Compress & Convert | QUICKKIT`).

### 3.2 Meta Description Audit

- **Uniqueness:** **68 / 68 unique meta descriptions** (0 duplicates; max length `160` chars — zero truncation issues).
- **Defects Identified:**
  1. **16 Thin Meta Descriptions (`70–108` chars) (`MEDIUM`):**
     - **6 of 7 active category pages** (`88–108` chars): `/category/text-writing` (`88`), `/category/calculators` (`89`), `/category/security-privacy` (`90`), `/category/qr-barcode` (`93`), `/category/image-tools` (`98`), `/category/developer-tools` (`108`) — caused by `app/category/[slug]/page.tsx:29` using the short card blurb `meta.description` from `lib/catalog.ts` instead of `categoryContent[slug].lead`!
     - **8 of 12 calculator pages** (`70–104` chars): `gst-calculator` (`70`), `bmi-calculator` (`70`), `time-converter` (`70`), `percentage-calculator` (`75`), `discount-calculator` (`76`), `scientific-calculator` (`80`), `temperature-converter` (`101`), `age-calculator` (`104`).
  2. **Stale Trust-Damaging Meta Description on `/contact` (`HIGH`):**
     - Current (`154` chars, `lib/legal.ts:174`): *"Contact QUICKKIT for support, bug reports, privacy requests, security reports, copyright complaints or business enquiries, **with verified channels pending**."*
     - Reality: `ownerDetails.publicEmail` (`Quickkit96@gmail.com`) is already configured and live on `/contact`. Telling SERP visitors that verified contact channels are "pending" undermines trust and E-E-A-T.

### 3.3 Heading Hierarchy (`<h1>` / `<h2>` / `<h3>`) Audit

- **H1 Coverage:** `67 / 68` routes have **exactly one `<h1>`** (`0` duplicates). Only `/qr` (which is `noindex, nofollow` and awaits `?d=` payload) has `0` `<h1>` tags in empty state.
- **Defects Identified:**
  1. **Boilerplate Non-Descriptive `<h2>` Headings Across All 41 `ToolShell` Pages (`HIGH`):**
     - `components/tool-shell.tsx` hardcodes:
       - `<h2>How to use it</h2>` (line 84)
       - `<h2>A few useful answers</h2>` (line 97)
       - `<h2>Keep the good work going</h2>` (line 113)
     - None of these 123 `<h2>` tags across 41 tool pages contain the tool's name, topic, or task keywords (e.g., `"How to Merge PDF Files"`, `"Frequently Asked Questions about PDF Merging"`, `"Related PDF Tools"`).
  2. **Title vs `<h1>` Keyword Split on Core Converters (`MEDIUM`):**
     - `merge-pdf`: `<title>` = `"Merge PDF..."` vs `<h1>` = `"PDF Merger"`
     - `split-pdf`: `<title>` = `"Split PDF..."` vs `<h1>` = `"PDF Splitter"`
     - `compress-pdf`: `<title>` = `"Compress PDF..."` vs `<h1>` = `"PDF Compressor"`
     - `image-to-image`: `<title>` = `"Image Converter..."` vs `<h1>` = `"Image to Image Converter"` (while slug is `/tools/image-to-image`, whereas search demand overwhelmingly favors `"Image Converter"`).

### 3.4 Factual Drift & Contradictory Copy Audit (`CRITICAL` — E-E-A-T & User Trust)

| Page & Location | Current Published Statement | Actual Codebase Reality | Severity |
| --- | --- | --- | :---: |
| `/help` (`app/help/page.tsx:39-41`) | FAQ #6: *"Why can't I find Calculators or AI Tools? Those categories are on our roadmap and marked ‘Coming soon’."* | **12 Calculators are live in production** (`/category/calculators` + 12 `/tools/*` routes). Only `AI Tools` is Coming Soon. | **CRITICAL** |
| `/help` (`app/help/page.tsx:27-29`) | FAQ #3: *"Are my files and text uploaded to a server? No. The tools process your PDFs, images, text, JSON, passwords and QR content locally..."* | Contradicts Guide #4 on the same page (`line 69`): **`Word to PDF` uploads DOCX files to the server** after explicit user consent. | **HIGH** |
| `/contact` (`lib/legal.ts:174`) | Meta description: *"...with verified channels pending."* | `Quickkit96@gmail.com` is configured and live in `lib/site.ts:53`. | **HIGH** |
| `/tools/qr-generator` (`app/tools/qr-generator/page.tsx:20-23`) | Steps list only *"12 content types"*; FAQ #1 says *"Does a QR code expire? No... so it cannot expire."* | QR Studio v3 supports **28 content types** (including **Payment / UPI**, **Data Templates** at `/qr?d=...`), **ECDSA P-256 anti-tamper digital signatures**, **AES-256-GCM password encryption**, and **cryptographic QR expiry locks** (`1h / 24h / 7d / 30d / custom`). | **HIGH** |
| `/category/qr-barcode` (`lib/category-content.ts:75-103`) | Body claims *"generate standard QR codes and **barcodes**"* and lists only *"URLs, plain text, Wi-Fi credentials or contact cards"*. | **Zero 1D barcode tools** (`EAN`, `UPC`, `Code128`) exist in the catalog (`QR Generator` + `QR Code Scanner` only), while UPI/Payment QR, Data Templates, and ECDSA/AES security are unmentioned. | **MEDIUM** |
| `/category/security-privacy` (`lib/catalog.ts`) | Category has **only 1 tool** (`password-generator`) because `hash-generator` is assigned to `Developer Tools`. | Leaves `/category/security-privacy` thin (`1` tool card) and causes `password-generator` to render **0 related tools** (`related.length === 0`). | **MEDIUM** |
| `/disclaimer` (`app/disclaimer/page.tsx:55`) | Mentions *"Loan, EMI, GST, discount, percentage and **interest calculators**..."* | No standalone Simple/Compound Interest Calculator exists yet (`scientific-calculator` is the 12th calculator). | **LOW** |
| `/file-handling` (`lib/legal.ts:297-318`) | TOC lists `pdf-translator` (*"PDF Translator (not implemented)"*) and lacks TOC anchors for `word-to-pdf`, `image-to-text`, and `qr-code-scanner`. | `pdf-translator` is not a catalog route; `word-to-pdf`, `image-to-text`, and `qr-code-scanner` are major live tools. | **LOW** |

### 3.5 Open Graph, Twitter Cards & Image `alt` Audit (`MEDIUM`)

- **Open Graph & Twitter Metadata:** Present on all 68 routes (`og:title`, `og:description`, `og:url`, `og:site_name`, `og:type="website"`, `og:image`, `twitter:card="summary_large_image"`, `twitter:image`).
  - **Gap:** Every single route points `og:image` and `twitter:image` to the **same generic root `/opengraph-image`** (`1200×630` PNG, `44.3 KB`: *"Small tasks. Quick solutions."*). Sharing `/tools/emi-calculator` or `/tools/merge-pdf` on Slack/WhatsApp/X/LinkedIn shows no tool name, category badge, or value proposition.
- **Image `alt` Attributes:**
  - Only **1 `<img>` element** is rendered in SSR HTML across all 68 pages: `<img src="/hero-laptop-reference.webp" width="1438" height="920" alt="" fetchPriority="high" decoding="async">` on `/` (`components/hero-art.tsx:66`). Because adjacent `<HeroScreen />` text is present and the laptop frame is decorative, `alt=""` is WCAG-valid, though `public/` also contains **3 unused legacy hero WebP images** (`hero-illustration-sm.webp` `31 KB`, `hero-illustration.webp` `53 KB`, `hero-laptop-transparent.webp` `89 KB` = **`173 KB` dead repo/public assets**).

---

## Step 4 — Individual Tool SEO Audit (All 42 Live Tools)

### 4.1 Complete 42-Tool Audit Matrix

*Legend:* **Words** = SSR `<main>` word count; **Steps/FAQs** = count of structured steps & FAQs rendered; **In `<main>`** = inbound contextual links from indexable pages; **Schema** = `App` (`WebApplication`+`HowTo`+`FAQPage`+`BreadcrumbList`) vs `BC Only` (`BreadcrumbList` only, missing `WebApplication` & `FAQPage`); **JS Gz** = initial gzipped client JS payload.

| # | Route (`/tools/...`) | Category | `<title>` Len | Desc Len | `<h1>` | Words | Steps / FAQs | In `<main>` | Schema | JS Gz (KB) | SEO Content & Technical Verdict |
| :---: | --- | --- | :---: | :---: | --- | :---: | :---: | :---: | :---: | :---: | --- |
| 1 | `merge-pdf` | PDF Tools | 59 | 160 | `PDF Merger` | 547 | 4 / 4 | 7 | **BC Only** | 203.9 | Good copy; **missing `WebApplication` schema**, H1 (`PDF Merger`) splits keyword from title (`Merge PDF`), generic H2s. |
| 2 | `split-pdf` | PDF Tools | 55 | 157 | `PDF Splitter` | 560 | 4 / 4 | **3** | **BC Only** | 205.5 | Good copy; **missing `WebApplication` schema**, **starved of related links (`inMain=3`)**, H1/title split (`Split PDF` vs `PDF Splitter`). |
| 3 | `compress-pdf` | PDF Tools | 49 | 148 | `PDF Compressor` | 807 | 4 / 4 | **3** | **BC Only** | 208.2 | Strong copy; **missing `WebApplication` schema**, **starved of related links (`inMain=3`)**, H1/title split. |
| 4 | `pdf-to-word` | PDF Tools | 56 | 153 | `PDF to Word` | 928 | 4 / 6 | **3** | **BC Only** | 296.6 | Strong copy; **missing `WebApplication` schema**, **starved of related links (`inMain=3`)** (even `word-to-pdf` doesn't link to it!). |
| 5 | `word-to-pdf` | PDF Tools | 55 | 153 | `Word to PDF Converter` | 634 | Studio / 0 | **3** | **BC Only** | **504.3** | **No `ToolShell`**: **0 FAQs**, **0 outbound related-tool links**, breadcrumb root points to `/tools` instead of `/`, **504 KB gzip JS**. |
| 6 | `pdf-to-image` | PDF Tools | 58 | 152 | `PDF to Image Converter` | 1,012 | 6 / 8 | 10 | App (`HowTo`†) | **496.4** | Rich copy; emits deprecated `HowTo` + `"Images are processed locally"` boilerplate; **496 KB gzip eager JS** (`pdfjs`+`pdf-lib`). |
| 7 | `images-to-pdf` | PDF Tools | 57 | 153 | `Images to PDF Converter` | 1,042 | 6 / 8 | 10 | App (`HowTo`†) | **496.2** | Rich copy; misses `"JPG to PDF"` / `"PNG to PDF"` high-volume phrasing in title/H1; **496 KB gzip eager JS**. |
| 8 | `pdf-studio` | PDF Tools | 59 | 158 | `PDF Studio` | 1,018 | 6 / 8 | 10 | App (`HowTo`†) | **498.7** | Rich copy; brand-coined name `"PDF Studio"` has lower direct search demand than `"Rotate / Reorder / Delete PDF Pages"`; **499 KB gzip JS**. |
| 9 | `pdf-lock-unlock` | PDF Tools | 58 | 157 | `PDF Lock & Unlock` | **351** | 3 / 6 | 4 | **BC Only** | 206.1 | Lighter prose (`351w`); **missing `WebApplication` schema**; combines `"Protect/Encrypt PDF"` and `"Unlock PDF"` intents into one URL without subheadings for each. |
| 10 | `image-compressor` | Image Tools | 58 | 157 | `Image Compressor` | 693 | 5 / 7 | 7 | App (`HowTo`†) | 202.5 | Strong copy & metadata; remove deprecated `HowTo`, upgrade generic H2s, add example KB compression table. |
| 11 | `image-resizer` | Image Tools | 59 | 158 | `Image Resizer` | 832 | 5 / 7 | 6 | App (`HowTo`†) | 211.1 | Strong copy; remove deprecated `HowTo`, upgrade generic H2s. |
| 12 | `image-cropper` | Image Tools | 58 | 159 | `Image Cropper` | 744 | 5 / 7 | 6 | App (`HowTo`†) | 208.7 | Strong copy (social pixel dimensions in FAQ); remove deprecated `HowTo`, upgrade generic H2s. |
| 13 | `image-to-image` | Image Tools | 58 | 155 | `Image to Image Converter` | 1,271 | 6 / 8 | 6 | App (`HowTo`†) | **502.8** | Rich copy; slug `/tools/image-to-image` & H1 `Image to Image Converter` are weaker than `Image Converter`; **503 KB gzip eager JS**. |
| 14 | `image-to-text` | Image Tools | 53 | 160 | `Image to Text (OCR)` | 884 | 6 / 9 | 7 | App (`HowTo`†) | 221.1 | Best-in-class tool copy & benchmarks; remove deprecated `HowTo`, upgrade generic H2s. |
| 15 | `qr-generator` | QR & Barcode | 59 | 158 | `QR Code Generator` | 1,485 | 3 / 6 | 5 | **BC Only** | **587.0** | **CRITICAL DRIFT:** Missing `WebApplication` schema; **587 KB gzip JS (heaviest on site!)**; steps/FAQs outdated (say `"cannot expire"`, `"12 types"` — omit **28 types, Payment/UPI QR, Data Templates, ECDSA signing, AES-256-GCM encryption, and QR expiry**!). |
| 16 | `qr-code-scanner` | QR & Barcode | 59 | 158 | `QR Code Scanner` | 747 | 3 / 6 | 4 | **BC Only** | **331.3** | **Missing `WebApplication` schema**; omits new **ECDSA signature verification, AES-256-GCM decryption, SHA-256 integrity digest, Paste Link/Token verifier, and UPI/APK threat checks**; **331 KB gzip JS**. |
| 17 | `word-counter` | Text & Writing | 60 | 153 | `Word Counter` | **258** | 3 / 3 | 9 | **BC Only** | 189.6 | **Light content (`258w`)**; **missing `WebApplication` schema**; lacks platform character-limit reference table (X, LinkedIn, Meta, SMS, essays). |
| 18 | `case-converter` | Text & Writing | 59 | 154 | `Case Converter` | **256** | 3 / 3 | 8 | **BC Only** | 189.1 | **Light content (`256w`)**; **missing `WebApplication` schema**; lacks visual before/after table of all 10 supported case styles. |
| 19 | `json-formatter` | Developer Tools | 56 | 151 | `JSON Formatter` | **265** | 3 / 3 | 16 | **BC Only** | 193.0 | **Light content (`265w`)**; **missing `WebApplication` schema**; keyword overlap/cannibalization risk with `json-validator` (`JSON Formatter & Validator` in title). |
| 20 | `json-validator` | Developer Tools | 56 | 140 | `JSON Validator` | **257** | 3 / 3 | 13 | **BC Only** | **456.3** | **Light content (`257w`)**; **missing `WebApplication` schema**; **456 KB gzip JS bug** (statically bundles `terser` + `csso` despite only running `JSON.parse`!). |
| 21 | `html-formatter` | Developer Tools | 58 | 152 | `HTML Formatter` | **246** | 3 / 3 | 13 | **BC Only** | **455.8** | **Light content (`246w`)**; **missing `WebApplication` schema**; **456 KB gzip JS** (`terser` + `csso` bundled unnecessarily); no example snippet. |
| 22 | `css-minifier` | Developer Tools | 56 | 141 | `CSS Minifier` | **217** | 3 / 3 | 6 | **BC Only** | **455.6** | **Light content (`217w`)**; **missing `WebApplication` schema**; **456 KB gzip JS** (`terser` bundled unnecessarily); no before/after CSS example. |
| 23 | `javascript-minifier` | Developer Tools | 57 | 159 | `JavaScript Minifier` | **254** | 3 / 3 | **3** | **BC Only** | **455.6** | **Light content (`254w`)**; **missing `WebApplication` schema**; **starved of related links (`inMain=3`)**; `terser` loaded eagerly before user interaction. |
| 24 | `base64-encoder-decoder` | Developer Tools | 52 | 137 | `Base64 Encoder / Decoder` | **270** | 3 / 3 | **3** | **BC Only** | 209.7 | **Light content (`270w`)**; **missing `WebApplication` schema**; **starved of related links (`inMain=3`)**; lacks UTF-8/MIME Base64 example table. |
| 25 | `url-encoder-decoder` | Developer Tools | 58 | 144 | `URL Encoder / Decoder` | **267** | 3 / 3 | **3** | **BC Only** | 209.1 | **Light content (`267w`)**; **missing `WebApplication` schema**; **starved of related links (`inMain=3`)**; lacks `encodeURI` vs `encodeURIComponent` character table. |
| 26 | `uuid-generator` | Developer Tools | 54 | 147 | `UUID Generator` | **238** | 3 / 3 | **3** | **BC Only** | 208.9 | **Light content (`238w`)**; **missing `WebApplication` schema**; **starved of related links (`inMain=3`)**; lacks UUID v4 bit-layout diagram/example. |
| 27 | `regex-tester` | Developer Tools | 60 | 153 | `Regex Tester` | **286** | 3 / 3 | **3** | **BC Only** | 192.7 | **Light content (`286w`)** + raw HTML entity bug (`$&lt;name&gt;` rendered literally in FAQ #3 of `components/tools/devtools/page.tsx:188`!); **missing schema**; **`inMain=3`**. |
| 28 | `xml-formatter` | Developer Tools | 56 | 157 | `XML Formatter` | **225** | 3 / 3 | **3** | **BC Only** | **455.8** | **Light content (`225w`)**; **missing `WebApplication` schema**; **`inMain=3`**; **456 KB gzip JS** (`terser` + `csso` bundled unnecessarily). |
| 29 | `password-generator` | Security & Privacy | 55 | 158 | `Password Generator` | **246** | 3 / 3 | **3** | **BC Only** | 189.3 | **Light content (`246w`)**; **missing `WebApplication` schema**; **`inMain=3` and 0 outbound related tools** (sole tool in `Security & Privacy`!); lacks entropy table. |
| 30 | `hash-generator` | Developer Tools | 59 | 139 | `Hash Generator` | **258** | 3 / 3 | **3** | **BC Only** | 209.6 | **Light content (`258w`)**; **missing `WebApplication` schema**; **`inMain=3`**; should cross-link with `Security & Privacy` (`password-generator`); lacks digest length table. |
| 31 | `age-calculator` | Calculators | **25** | **104** | `Age Calculator` | **138** | **2 / 1** | **3** | **BC Only** | 213.6 | **THIN (`138w`, 2 steps, 1 FAQ)**; **25-char title**, **104-char desc**, **missing schema**, **`inMain=3`**, zero worked chronological age examples. |
| 32 | `percentage-calculator` | Calculators | **32** | **75** | `Percentage Calculator` | **187** | **2 / 1** | 14 | **BC Only** | 213.6 | **THIN (`187w`, 2 steps, 1 FAQ)**; **75-char desc**, **missing schema**, zero written formulas (`X% of Y`, `% change`, `% difference`) in SSR prose. |
| 33 | `emi-calculator` | Calculators | **25** | 122 | `EMI Calculator` | **202** | 3 / 2 | **3** | **BC Only** | 213.6 | **25-char title** (`EMI Calculator \| QUICKKIT`), **light prose (`202w`)**, **missing schema**, **`inMain=3`**, no written reducing-balance EMI formula or Home/Car/Personal loan examples. |
| 34 | `gst-calculator` | Calculators | **25** | **70** | `GST Calculator` | **209** | 3 / 2 | 6 | **BC Only** | 213.6 | **25-char title**, **70-char desc**, **light prose (`209w`)**, **missing schema**, lacks GST slab table (`5%, 12%, 18%, 28%`) & inclusive/exclusive formulas + CGST/SGST/IGST explanation. |
| 35 | `bmi-calculator` | Calculators | **25** | **70** | `BMI Calculator` | **269** | 3 / 2 | 14 | **BC Only** | 213.6 | **25-char title**, **70-char desc**, **missing schema**, lacks WHO BMI category reference table (`<18.5`, `18.5–24.9`, `25–29.9`, `≥30`) & metric/imperial formula in prose. |
| 36 | `loan-calculator` | Calculators | **26** | 119 | `Loan Calculator` | **238** | 3 / 2 | **3** | **BC Only** | 213.6 | **26-char title**, **light prose (`238w`)**, **missing schema**, **`inMain=3`**, overlaps `emi-calculator` without clear positioning (e.g., extra prepayments / amortization comparison). |
| 37 | `discount-calculator` | Calculators | **30** | **76** | `Discount Calculator` | **246** | **2 / 1** | 14 | **BC Only** | 213.6 | **30-char title**, **76-char desc**, **2 steps / 1 FAQ**, **missing schema**, lacks stacked discount formula (`20% + 10% = 28%`, not `30%`) worked example in prose. |
| 38 | `date-difference-calculator` | Calculators | 37 | 115 | `Date Difference Calculator` | **137** | **2 / 1** | **3** | **BC Only** | 213.6 | **THIN (`137w`, 2 steps, 1 FAQ)**; **missing schema**, **`inMain=3`**, lacks inclusive vs exclusive end-date & business-day examples. |
| 39 | `time-converter` | Calculators | **25** | **70** | `Time Converter` | **254** | **2 / 1** | **3** | **BC Only** | 213.6 | **25-char title**, **70-char desc**, **2 steps / 1 FAQ**, **missing schema**, **`inMain=3`**, lacks conversion table (seconds/minutes/hours/days/weeks). |
| 40 | `unit-converter` | Calculators | **25** | 119 | `Unit Converter` | **131** | **2 / 1** | **3** | **BC Only** | 213.6 | **THIN (`131w`, 2 steps, 1 FAQ)**; **25-char title**, **missing schema**, **`inMain=3`**, lacks supported unit reference summary (metric ↔ imperial). |
| 41 | `temperature-converter` | Calculators | **32** | **101** | `Temperature Converter` | **125** | **2 / 1** | **3** | **BC Only** | 213.6 | **THIN (`125w`, 2 steps, 1 FAQ)**; **101-char desc**, **missing schema**, **`inMain=3`**, lacks °C ↔ °F ↔ K conversion formulas & key reference points (`0°C=32°F`, `100°C=212°F`, `-273.15°C=0K`). |
| 42 | `scientific-calculator` | Calculators | **32** | **80** | `Scientific Calculator` | **119** | **2 / 1** | **3** | **BC Only** | 213.6 | **THINNEST TOOL ON SITE (`119w`, 2 steps, 1 FAQ)**; **80-char desc**, **missing schema**, **`inMain=3`**, lacks supported functions/operators/DEG-RAD guide. |

> **Escaped Entity Bug Caught During Tool Inspection (`components/tools/devtools/page.tsx:188`):**
> On `/tools/regex-tester`, FAQ #3 contains `"including $1 and $&lt;name&gt;."` inside a TypeScript string literal (not JSX), so React escapes `&lt;` a second time and visibly prints the literal characters **`$&lt;name&gt;`** on the rendered page instead of **`$<name>`**!

---

## Step 5 — Structured Data (JSON-LD) Audit

### 5.1 Current Schema Coverage Across All 68 Pages

| Schema `@type` | Current Pages Emitting | Valid JSON? | Technical & Rich-Result Assessment |
| --- | :---: | :---: | --- |
| `Organization` | **68 / 68** (via `app/layout.tsx`) | Yes | **Incomplete:** Only emits `name` (`"QUICKKIT"`) and `url`. Missing `@id`, `logo` (`ImageObject` pointing to PNG/SVG brand mark), `description`, and `contactPoint` / `email` (`Quickkit96@gmail.com`). |
| `WebSite` | **68 / 68** (via `app/layout.tsx`) | Yes | **Minimal:** Only emits `name`, `url`, `description`. Missing `@id` and `publisher` reference to `Organization`. |
| `BreadcrumbList` | **62 / 68** | Yes | **Gaps:** Missing on `/tools` and `/help` (indexable hubs!). On `/tools/word-to-pdf`, Level 1 is `{ name: "QUICKKIT", item: ".../tools" }` instead of `{ name: "Home", item: ".../" }`. |
| `WebApplication` / `SoftwareApplication` | **8 / 42 tools (19.0%)** | Syntactically valid, **semantically flawed** | **CRITICAL GAP:** Missing on **34 of 42 tools (81.0%)**! On the 8 tools where it exists (`lib/seo.ts:89-99`), it hardcodes `applicationCategory: "MultimediaApplication"` and `browserRequirements: "Requires JavaScript. Images are processed locally."` (inaccurate for PDF tools, Dev tools, Calculators, Text, Security, and server-side `Word to PDF`), and omits `url`, `@id`, `featureList`, and `isAccessibleForFree: true`. |
| `HowTo` | **8 / 42 tools** (`lib/seo.ts:100-108`) | Valid JSON | **DEPRECATED BY GOOGLE:** Google completely removed `HowTo` rich results (mobile & desktop) in September 2023. Emitting `HowTo` adds dead JSON-LD payload with zero Google Search benefit. |
| `FAQPage` | **8 / 42 tools** (`lib/seo.ts:110-120`) | Valid JSON | **Restricted Rich Results / Inconsistent Coverage:** Google restricts `FAQPage` SERP dropdowns to authoritative health/government domains (Aug 2023), though clean `FAQPage` remains valid schema.org entity markup for AI/answer engines. Currently missing on `/faq` (25+ FAQs), `/help` (8 FAQs), and 34 tool pages. |
| `CollectionPage` / `ItemList` | **0 / 68** | Missing | Not implemented on `/tools` or the 7 active `/category/[slug]` hub pages. |
| `WebPage` / `AboutPage` / `ContactPage` | **0 / 68** | Missing | Not implemented on `/about`, `/contact`, or policy documents (`dateModified` from `LEGAL_LAST_UPDATED_ISO` is in `<time>`, not in `WebPage` schema). |
| `Article` | **0 / 68** | N/A | Appropriate — zero blog/editorial articles currently exist. |
| `AggregateRating` / `Review` | **0 / 68** | N/A | **Strictly Compliant:** Zero fake ratings exist, and **none should ever be added** unless genuine, verifiable user reviews are collected. |

---

## Step 6 — Performance & Core Web Vitals Audit

### 6.1 Measured Payload & Server Response Benchmarks (Production Build)

| Metric / Asset | Measured Value (Production Build) | CWV Target / Budget | Impacted Metric & Severity |
| --- | --- | --- | :---: |
| **Static Route TTFB (`next start` local)** | **`2.43 – 7.01 ms`** (`s-maxage=31536000`) | `< 200 ms` (Good `< 800 ms`) | **TTFB / LCP — PASS** on static routes |
| **Dynamic `/tools` Route TTFB (`next start` local)** | **`23.59 – 45.84 ms`** local (`private, no-store`; serverless Lambda in prod) | Static CDN edge (`< 20 ms` global) | **TTFB / LCP — MEDIUM RISK** (cold starts on Vercel Hobby `iad1`, especially for India users ~200–350 ms away from `iad1`!) |
| **Global Render-Blocking CSS (`app/globals.css`)** | **`422.3 KB` source → `315.4 KB` minified (`55.1 KB` gzip)** (`chunks/1lrjgkg6i2i19.css`) | `< 15 KB` critical / `< 25 KB` gzip per route | **FCP & LCP — HIGH RISK** (loaded synchronously on **all 68 routes**, forcing download + CSSOM parse of 315 KB of studio rules even on `/` and `/about`) |
| **Primary Font (`geist-latin-variable.woff2`)** | **`29.0 KB`** (`next/font/local`, `display: "swap"`) | `< 50 KB`, self-hosted | **LCP & CLS — PASS** (zero Google Fonts external DNS lookup; metric-matched fallback) |
| **Homepage LCP Image (`/hero-laptop-reference.webp`)** | **`75.0 KB`** (`1438×920`, `fetchPriority="high"`, raw `<img>`) | Responsive `srcset` (`~25–35 KB` on mobile 390px) | **Mobile LCP — MEDIUM RISK** (no `next/image` or `<picture>` responsive `srcset`/`sizes`; mobile 375px viewport downloads full `1438px` desktop image; also `173 KB` of unused hero WebPs sit in `public/`) |
| **Base Initial JS Floor (every static page)** | **`593.7 KB` raw / `184.6 KB` gzip** (`9–10` scripts) | `< 120 KB` gzip for text/hub pages | **INP / TBT — MEDIUM RISK** (`Header` client bundle imports full `catalog.ts` + icons + global client components) |
| **Heaviest Tool Initial JS (`/tools/qr-generator`)** | **`1,637.4 KB` raw / `587.0 KB` gzip** (`16` scripts) | `< 200–250 KB` gzip initial; lazy-load heavy encoders/templates | **Mobile INP / TBT — CRITICAL RISK** (`1.64 MB` of JS parsed/compiled on main thread at startup on mid-tier Android devices) |
| **PDF & Image Studio Initial JS (`word-to-pdf`, `image-to-image`, `pdf-studio`, `pdf-to-image`, `images-to-pdf`)** | **`1,365 – 1,389 KB` raw / `496.2 – 504.3 KB` gzip** | Lazy-load `pdfjs-dist` (`237.5 KB` gz) & `@cantoo/pdf-lib` (`126.0 KB` gz) after file drop | **Mobile INP / TBT — HIGH RISK** (`~1.38 MB` raw JS downloaded & parsed before the user even picks a file) |
| **DevTools Initial JS Bug (`json-validator`, `html-formatter`, `xml-formatter`, `css-minifier`, `javascript-minifier`)** | **`1,521.9 – 1,523.0 KB` raw / `455.6 – 456.3 KB` gzip** | `< 195 KB` gzip initial; dynamic `import("terser")` & `import("csso")` on click | **Mobile INP / TBT — HIGH BUG** (`lib/tools/developer-code.ts` statically imports `terser` + `csso` into a shared chunk `3v4v_0n_rqq14.js` (`805.3 KB` raw / `228.0 KB` gzip), penalizing `json-validator` and `html-formatter`!) |
| **Global AdSense Script (`app/layout.tsx:86-91`)** | Loaded on **68 / 68 routes** (`adsbygoogle.js`) | Load only when `ADS_ENABLED` or only on ad-eligible routes (52 routes), never on 16 `AD_EXCLUDED_PATHS` | **LCP / INP / Privacy — HIGH RISK** (triggers external TLS + script evaluation on `/`, `/privacy`, `/qr`, `/saved`, and all tools even while `ADS_ENABLED === false`!) |

### 6.2 Core Web Vitals Engineering Assessment (Lab Code/Payload Analysis vs Unavailable Field Data)

- **Field Data Status (`CrUX` / Vercel Speed Insights):** **Unavailable** — verified via Vercel API (`speedInsights: { hasData: false }`).
- **Headless Browser Paint Timings:** **Unavailable in offline sandbox** (no Chromium binary pre-installed; outbound network restricted to GitHub/npm/PyPI).
- **Metric-by-Metric Risk Diagnosis from Measured Build Artifacts:**
  1. **LCP (Largest Contentful Paint — Target `≤ 2.5s`):**
     - *Desktop:* Low risk on static pages (`2–7 ms` TTFB + SSR `<h1>`/hero).
     - *Mobile (Slow 4G + India → `iad1` US-East latency):* **Moderate-to-High Risk** due to (a) `55.1 KB` gzipped (`315.4 KB` raw) render-blocking `globals.css`, (b) unscaled `1438×920` (`75 KB`) hero `<img>` on `/`, (c) dynamic serverless SSR on `/tools` routed to `iad1` (Washington, D.C.), and (d) competing `adsbygoogle.js` network connection in `<head>`.
  2. **INP (Interaction to Next Paint — Target `≤ 200 ms`):**
     - *Desktop:* Low risk (Web Workers already offload PDF/OCR/Regex heavy execution — great architecture!).
     - *Mobile:* **High Risk during initial load/hydration & complex studio state updates** on the 11 routes shipping **`455–587 KB` gzipped (`1.36–1.64 MB` raw) initial JavaScript** (`qr-generator`, `word-to-pdf`, `image-to-image`, `pdf-studio`, `pdf-to-image`, `images-to-pdf`, and the 5 `developer-code.ts` tools).
  3. **CLS (Cumulative Layout Shift — Target `≤ 0.1`):**
     - *Baseline:* **Strong (`Low Risk`)** — hero `<img>` has explicit `width={1438} height={920}` + `aspect-ratio`, Geist variable font is local with `swap`, `ADS_ENABLED` is currently `false` (`AdUnit` returns `null`), and tool workspaces render deterministic SSR shells.
     - *Future Risk When Enabling Ads:* When `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is turned on, `components/ad-unit.tsx` must reserve explicit `min-height` containers so async ad injection above/between content does not push `"How to use it"` downward and spike CLS > `0.25`.

---

## Step 7 — Keyword & Content Opportunity Audit

> **Metric Integrity Notice:** Search Volume, Keyword Difficulty (KD), and Current SERP Position are marked **`Not Verified`** because no Google Search Console, Google Keyword Planner, Ahrefs, or Semrush dataset is connected in this environment. Priority (`P0` / `P1` / `P2`) is scored strictly from **commercial/utility search intent alignment, feature differentiation in the codebase, and current on-page/technical deficit**.

### 7.1 Existing Page Optimization Opportunities (Top Priority Targets)

| Target Page | Primary Target Keyword | Related / Secondary Keywords | Search Intent | Current Gap on Page | Priority |
| --- | --- | --- | --- | --- | :---: |
| `/` | `free online browser tools` | `private pdf tools no upload`, `online image & qr tools`, `quickkit tools` | Navigational / Broad Utility Hub | `<title>` omits `QUICKKIT` & core categories; links to `noindex` `/category/ai-tools`; hero `<img>` lacks responsive `srcset`. | **P0** |
| `/tools/emi-calculator` | `emi calculator` | `home loan emi calculator`, `car loan emi calculator`, `monthly emi formula` | Transactional Utility + Informational Formula | **25-char `<title>`**, `202` words, **`inMain = 3`**, missing `WebApplication` schema, no written EMI formula or loan breakdown examples. | **P0** |
| `/tools/gst-calculator` | `gst calculator` | `gst calculator india`, `add or remove gst online`, `cgst sgst calculator`, `18% gst calculator` | Transactional Utility (Strong India geo-fit!) | **25-char `<title>`**, **70-char description**, `209` words, missing schema, lacks `5%/12%/18%/28%` GST slab table & inclusive/exclusive formulas. | **P0** |
| `/tools/age-calculator` | `age calculator` | `calculate exact age in years months days`, `date of birth calculator` | Transactional Utility | **25-char `<title>`**, **thin `138` words** (2 steps, 1 FAQ), **`inMain = 3`**, missing schema & worked example. | **P0** |
| `/tools/qr-generator` | `qr code generator` | `upi qr code generator`, `free qr code generator with logo`, `signed verifiable qr code`, `encrypted qr code`, `bulk csv qr generator` | Transactional Utility | **Missing `WebApplication` schema**, **587 KB gzip JS**, copy completely omits **UPI/Payment QR, 28 content types, Data Templates, ECDSA anti-tamper signing, AES-256-GCM encryption, and QR expiry** (FAQ #1 falsely says QR codes cannot expire!). | **P0** |
| `/tools/qr-code-scanner` | `qr code scanner online` | `scan qr code from image`, `scan qr code from screenshot`, `verify signed qr code`, `qr link safety checker` | Transactional Utility | **Missing schema**, omits ECDSA verification, AES-256-GCM decryption, SHA-256 digest, and Paste Token verifier. | **P1** |
| `/tools/merge-pdf` | `merge pdf` | `combine pdf files online`, `merge pdf without uploading`, `merge specific pdf pages` | Transactional Utility | **Missing `WebApplication` schema**, H1 (`PDF Merger`) splits exact-match `Merge PDF`, generic H2s. | **P0** |
| `/tools/split-pdf` | `split pdf` | `extract pages from pdf`, `separate pdf pages online free`, `split pdf by page range` | Transactional Utility | **Missing schema**, **starved of related links (`inMain = 3`)**, H1 (`PDF Splitter`) splits `Split PDF`, generic H2s. | **P0** |
| `/tools/compress-pdf` | `compress pdf` | `reduce pdf file size`, `compress pdf to 100kb / 200kb`, `shrink pdf locally` | Transactional Utility | **Missing schema**, **starved of related links (`inMain = 3`)**, H1 (`PDF Compressor`) splits `Compress PDF`, generic H2s. | **P0** |
| `/tools/pdf-to-word` | `pdf to word converter` | `convert pdf to editable docx`, `scanned pdf to word ocr`, `private pdf to word` | Transactional Utility | **Missing schema**, **starved of related links (`inMain = 3`)**, generic H2s. | **P0** |
| `/tools/word-to-pdf` | `word to pdf converter` | `convert docx to pdf online`, `batch word to pdf` | Transactional Utility | **No `ToolShell`**, **0 FAQs**, **0 related-tool links**, **`inMain = 3`**, **504 KB gzip JS**, inconsistent breadcrumb root. | **P0** |
| `/tools/bmi-calculator` | `bmi calculator` | `body mass index calculator`, `healthy weight range for height`, `bmi chart men women` | Transactional Utility | **25-char `<title>`**, **70-char description**, missing schema, lacks WHO BMI classification table & metric/imperial formula. | **P1** |
| `/tools/percentage-calculator` | `percentage calculator` | `percentage increase calculator`, `what percent of x is y`, `percentage change formula` | Transactional Utility | **32-char `<title>`**, **75-char description**, **thin `187` words** (2 steps, 1 FAQ), missing schema & written formulas. | **P1** |
| `/tools/scientific-calculator` + `unit-converter` + `temperature-converter` + `date-difference-calculator` | `scientific calculator online` / `unit converter` / `temperature converter` / `date difference calculator` | `celsius to fahrenheit`, `days between two dates`, `business days calculator`, `metric to imperial converter` | Transactional Utility | **4 thinnest pages on site (`119–137` words, 2 steps, 1 FAQ)**, short titles (`25–37` chars), **`inMain = 3`**, missing schema. | **P1** |
| `/tools/json-validator` + 9 Dev Tools | `json validator` / `json formatter` / `base64 decode` / `regex tester` / `uuid v4 generator` | `minify css online`, `javascript minifier terser`, `url encode decode`, `sha256 file hash online` | Developer Transactional Utility | `217–286` words, **missing `WebApplication` schema (`DeveloperApplication`)**, 6 of 10 have **`inMain = 3`**, `456 KB` gzip JS bug on 5 tools, escaped `$&lt;name&gt;` bug on `regex-tester`. | **P1** |
| `/category/*` (7 active hubs) | `free online pdf tools`, `online image tools`, `developer tools online`, `online calculators` | `browser based pdf utilities`, `local image optimizer`, `privacy first web tools` | Category / Hub Discovery | 6 of 7 have **short meta descriptions (`88–108` chars)**; hidden from `<Header>` SSR HTML; 3 omitted from `<Footer>`; missing `CollectionPage` + `ItemList` schema. | **P1** |

### 7.2 High-Value Content & New Landing Page Gaps (Future Phases — Do Not Build Yet)

1. **High-Demand Missing Calculators (referenced by user mental models & `/disclaimer`):**
   - **Simple & Compound Interest Calculator** (`/disclaimer` already mentions `"interest calculators"`!)
   - **SIP / Mutual Fund Return Calculator** & **FD / PPF Calculator** (high synergy with `EMI Calculator` & `GST Calculator` for Indian & global users)
2. **Format-Specific & Single-Intent Entry Pages / Guides (Zero Blog/Guides Exist Today):**
   - Format-pair intents currently buried inside generic multi-format tools: `JPG to PDF` / `PNG to PDF` (inside `images-to-pdf`), `PDF to JPG` / `PDF to PNG` (inside `pdf-to-image`), `PNG to WebP` / `WebP to JPG` / `TIFF to PNG` (inside `image-to-image`), `Unlock PDF` vs `Password Protect PDF` (combined inside `pdf-lock-unlock`), `Rotate PDF` / `Delete PDF Pages` (inside `pdf-studio`), and `UPI Payment QR Code Generator` (inside `qr-generator`).
   - Concise, non-bloated workflow guides (e.g., *"How Client-Side PDF & Image Processing Protects Document Privacy"*, *"How Verifiable ECDSA-Signed & Encrypted QR Codes Work"*, *"Compress Image to Exact KB (20KB, 50KB, 100KB) for Portals & Forms"*).

---

## Prioritized Issue Ledger (Critical → Low)

### Critical Priority (`P0` — Fix First in Phase 2)
1. **Missing `WebApplication` Structured Data on 34/42 Tools (`81%`) + Deprecated `HowTo` & Hardcoded `"MultimediaApplication"` / `"Images are processed locally"` on the Remaining 8 Tools** (`lib/seo.ts`, tool `page.tsx` files, `app/tools/[calculator]/page.tsx`).
2. **`ToolShell` `.slice(0, 3)` Related-Tools Slicing Bug + Standalone `word-to-pdf` Isolation**, starving **20 of 42 tools (`47.6%`)** to `inMain = 3` contextual links (`components/tool-shell.tsx`, `app/tools/word-to-pdf/page.tsx`).
3. **Global `<Header>` SSR Category Link Omission (`{catOpen ? ... : null}`) + `<Footer>` Omission of 3 Active Categories** (`components/header.tsx`, `lib/legal.ts`).
4. **Factual Contradictions & Stale Copy on Live Pages:** `/help` claiming `"Calculators"` is `"Coming soon"` & unqualified `"No server upload"` claim; `/contact` meta description claiming `"verified channels pending"`; `/tools/qr-generator` & `/tools/qr-code-scanner` omitting 28 QR types, UPI, Data Templates, ECDSA signing, AES-256-GCM encryption, and QR expiry (`FAQ #1` falsely stating QR codes cannot expire); `regex-tester` rendering literal `$&lt;name&gt;`.
5. **Thin Content (`119–187` words, 2 steps, 1 FAQ) & Ultra-Short `<title>`/`description` Tags (`25` chars / `70` chars) Across Calculator Pages** (`lib/calculator-info.ts`, `app/tools/[calculator]/page.tsx`).

### High Priority (`P1`)
6. **`robots.txt` `Disallow: /saved` & `Disallow: /qr` Blocking `noindex` Discovery** while 68 pages link to `/saved` without `rel="nofollow"` (`app/robots.ts`, `components/header.tsx`, `app/sitemap/page.tsx`).
7. **Dynamic SSR De-optimization (`ƒ`) & Open Query-Parameter Surface on `/tools`** (`app/tools/page.tsx`).
8. **Massive Eager JS & CSS Payloads Hurting Mobile CWV (LCP / INP):**
   - Static `terser` + `csso` imports in `lib/tools/developer-code.ts` adding `228 KB` gzip (`805 KB` raw) to `json-validator`, `html-formatter`, and `xml-formatter`.
   - Eager `496–587 KB` gzip bundles on `qr-generator`, `word-to-pdf`, `image-to-image`, `pdf-studio`, `pdf-to-image`, and `images-to-pdf`.
   - Global `315.4 KB` (`55.1 KB` gzip) render-blocking `app/globals.css`.
   - Global `adsbygoogle.js` script executing in `<head>` across all 68 routes even while `ADS_ENABLED === false` and on all 16 `AD_EXCLUDED_PATHS`.
9. **Homepage `<title>` Missing `QUICKKIT` Brand Name + Boilerplate Generic `<h2>` Headings (`How to use it`, `A few useful answers`, `Keep the good work going`) Across 41 Tools** (`app/page.tsx`, `components/tool-shell.tsx`).
10. **Custom Domain Migration Readiness:** Production currently runs on `quickkit-rosy.vercel.app` (`*.vercel.app` PSL subdomain) with unredirected secondary `.vercel.app` aliases.

### Medium Priority (`P2`)
11. **Short Category Meta Descriptions (`88–108` chars on 6 of 7 active categories)** using `meta.description` instead of `categoryContent[slug].lead` (`app/category/[slug]/page.tsx`).
12. **Light Content (`217–286` words) on Developer, Text & Security Tools** (missing quick reference tables, syntax examples, and cross-category links between `hash-generator` and `password-generator`).
13. **Schema Graph Enhancements:** Add `@id` entity linking, `Organization.logo` + `contactPoint`, `CollectionPage`/`ItemList` on `/tools` and `/category/[slug]`, `BreadcrumbList` on `/tools` and `/help`, fix `/tools/word-to-pdf` breadcrumb root, and add `<lastmod>` to `app/sitemap.ts`.
14. **Dynamic Per-Tool / Per-Category Open Graph Images** (replacing single static generic `/opengraph-image` across all 68 routes).
15. **Internal Links to `noindex` `/category/ai-tools`** from `/`, `/about`, `/sitemap`, and category hubs (`10` pages).

### Low Priority (`P3`)
16. **404 Page (`app/not-found.tsx`) UX & Metadata:** Add explicit `Page Not Found | QUICKKIT` title and links to `/tools` + top categories.
17. **Homepage Hero Responsive Image (`srcset`/`sizes`) & Cleanup of 3 Unused Hero `.webp` Assets (`173 KB`) in `public/`**.
18. **Minor Policy & React Hydration Polish:** Fix `datetime` → `dateTime` in `lib/legal.ts`, remove `"interest calculators"` mention in `/disclaimer` (until built), and update `/file-handling` TOC entries (`word-to-pdf`, `image-to-text`, `qr-code-scanner`).
