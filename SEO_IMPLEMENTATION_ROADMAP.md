# QUICKKIT — SEO Implementation Roadmap (`SEO_IMPLEMENTATION_ROADMAP.md`)

- **Prepared From:** `SEO_MASTER_AUDIT.md` (Phase 1 Read-Only Audit, 2026-11-10)
- **Current Status:** **Awaiting User Approval to Begin Phase 2** (Zero source code modified in Phase 1)
- **Guiding Engineering Guardrails for All Future Phases:**
  1. Preserve existing homepage visual design, brand aesthetic, and interactive tool UIs.
  2. Never add fake ratings, fake reviews, or unverified claims to JSON-LD or copy.
  3. Keep `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` 100% green at the end of every phase.
  4. Never install unnecessary packages.

---

## Phase Overview

| Phase | Focus Area | Primary Outcome | Est. Scope | Risk Level |
| --- | --- | --- | :---: | :---: |
| **Phase 1** | **Complete Advanced SEO Audit** *(Current — Completed)* | Full 68-route technical, on-page, tool-by-tool, schema, CWV, and keyword baseline (`59 / 100`). | 3 `.md` files | None (Read-only) |
| **Phase 2** | **Technical SEO, Crawlability, Link Graph & Schema Foundation** | Fix `robots.txt` vs `noindex`, static `/tools` (`○`), SSR header categories, footer categories, smart related-tool rotation (`inMain ≥ 6` for all 42 tools), and accurate JSON-LD across all 68 pages. | ~14 core files | Low |
| **Phase 3** | **Metadata, Headings & Factual Copy Alignment** | Fix all short/weak `<title>` & meta descriptions, upgrade `ToolShell` `<h2>` semantics, and eliminate every stale/contradictory factual statement (`/help`, `/contact`, `qr-generator`, `qr-code-scanner`, `regex-tester`, `/category/qr-barcode`). | ~20 content/page files | Low |
| **Phase 4** | **Individual Tool SEO Content Depth Upgrade (Calculators, Dev, Text, Security & Word-to-PDF)** | Upgrade all 12 Calculators (`119–269w` → `450–700w` with real formulas, tables & worked examples), enrich 14 light Dev/Text/Security tools, and add FAQ + related-tool links to `/tools/word-to-pdf`. | ~18 tool/info files | Low |
| **Phase 5** | **Core Web Vitals, Bundle Splitting & Asset Optimization** | Split `terser`/`csso` dynamic imports (`-228 KB` gzip on DevTools!), lazy-load heavy PDF/QR/DOCX engines on interaction, gate `adsbygoogle.js` off excluded/disabled routes, add responsive hero `srcset`, and trim unused `public/` assets & global CSS bloat. | ~12 perf/bundle files | Medium (Test thoroughly) |
| **Phase 6** | **Dynamic OG Cards, Domain Cutover Readiness & High-Intent Expansion** | Route-specific Open Graph cards (`ImageResponse`), custom domain canonical/redirect checklist, and optional high-intent landing pages / calculators (only if approved). | Modular | Low |

---

## Detailed Execution Plan by Phase

### Phase 2 — Technical SEO, Internal Link Graph & Structured Data Foundation (`P0` / `P1`)

#### 2.1 Crawlability, Indexing & `robots.txt`
- **`app/robots.ts`:**
  - Remove `/saved` and `/qr` from `Disallow` so Googlebot can read their `<meta name="robots" content="noindex, ...">` directives cleanly instead of indexing link-discovered blocked URLs. Keep `Disallow: ["/api/"]`.
  - Consolidate redundant identical `User-agent` rules into a single clean `User-agent: *` block when `indexingEnabled === true`.
- **`components/header.tsx` & `app/sitemap/page.tsx`:**
  - Add `rel="nofollow"` on the utility `<Link href="/saved">` in `<Header>`, remove `/saved` and `noindex` `/category/ai-tools` from public indexable sitemap/hub cards (or render Coming Soon as non-anchor badge until tools launch).
- **`app/sitemap.ts`:**
  - Add deterministic `lastModified` (`<lastmod>`) dates (`LEGAL_LAST_UPDATED_ISO` for policy pages; curated release date map for core/category/tool routes).
- **`app/tools/page.tsx`:**
  - Refactor `/tools` so the route compiles as **100% Static (`○`)** instead of per-request Dynamic SSR (`ƒ`), reading `?q=` and `?category=` client-side via `useSearchParams()` inside a `<Suspense>` boundary while server-rendering all 42 tools in the static HTML payload (`s-maxage=31536000`, `2–5 ms` edge TTFB).
- **`app/not-found.tsx`:**
  - Export explicit `metadata` (`title: "Page Not Found (404)"`, `robots: { index: false, follow: true }`) and add quick recovery links to `/tools` and top categories.

#### 2.2 Navigation & Internal Link Equity Distribution
- **`components/header.tsx`:**
  - Keep the Categories `<ul>` mounted in SSR HTML (hidden via CSS/`hidden`/`aria-hidden` when closed rather than `{catOpen ? ... : null}`) so crawlers discover all 7 active `/category/[slug]` hubs from global navigation.
- **`lib/legal.ts` (`footerColumns.tools`):**
  - Include all 7 active categories (`pdf-tools`, `image-tools`, `qr-barcode`, `text-writing`, `developer-tools`, `calculators`, `security-privacy`) in the global footer.
- **`components/tool-shell.tsx` & `lib/catalog.ts`:**
  - Replace `.filter((item) => item.slug !== slug).slice(0, 3)` with a **deterministic curated + circular-window related-tools selector** (4 related tools per page, plus cross-category workflow bridges such as `password-generator` ↔ `hash-generator`, `word-to-pdf` ↔ `pdf-to-word`, `image-to-text` ↔ `pdf-to-word`), raising the minimum contextual `inMain` link count across all 42 tools from `3` to **`≥ 6–8`**.
- **`app/tools/word-to-pdf/page.tsx`:**
  - Fix `BreadcrumbList` Level 1 (`Home` → `/`, `Tools` → `/tools`, `PDF Tools` → `/category/pdf-tools`, `Word to PDF Converter` → `/tools/word-to-pdf`) and render a lightweight SSR FAQ + Related PDF Tools footer block below `<WordToPdf />`.

#### 2.3 Structured Data (`lib/seo.ts` & Route Templates)
- **`lib/seo.ts`:**
  - Upgrade `siteStructuredData()` with `@id` graph anchors (`#organization`, `#website`), `Organization.logo`, and `Organization.contactPoint` (`email: contactEmail` when verified).
  - Refactor `toolStructuredData()` to:
    1. Remove deprecated `HowTo` schema completely.
    2. Emit accurate per-category `applicationCategory` (`"BusinessApplication"` / `"UtilitiesApplication"` for PDF & QR, `"MultimediaApplication"` for Image, `"DeveloperApplication"` for DevTools, `"FinanceApplication"` / `"UtilitiesApplication"` for Calculators, `"SecurityApplication"` for Security) and honest `browserRequirements` (local processing vs server-consented `word-to-pdf`).
    3. Include `url`, `@id`, `isAccessibleForFree: true`, `offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }`, and link `isPartOf` to `#website` — **with zero fake ratings/reviews**.
  - Add `collectionPageStructuredData()` (`CollectionPage` + `ItemList`) for `/tools` and `/category/[slug]`, plus `BreadcrumbList` on `/tools` and `/help`, and `FAQPage` on `/faq` and `/help`.
- ** Wire `toolStructuredData()` into `ToolShell` (or all 42 tool pages + `app/tools/[calculator]/page.tsx`)** so **42 / 42 tools (100%)** automatically emit consistent, accurate `WebApplication` + `FAQPage` + `BreadcrumbList` JSON-LD without per-file omissions!

---

### Phase 3 — On-Page Metadata, Semantic Headings & Factual Copy Alignment (`P0` / `P1`)

1. **Title & Meta Description Optimization:**
   - **`app/page.tsx`:** Update homepage `<title>` to include `QUICKKIT` + core tool verticals (`~55–60` chars, e.g., `QUICKKIT — Free Online PDF, Image, QR & Calculator Tools`).
   - **`lib/calculator-info.ts` & `app/tools/[calculator]/page.tsx`:** Add dedicated `seoTitle` (`48–59` chars) and `seoDescription` (`135–158` chars) for all 12 calculators (fixing all 25-char titles and 70-char descriptions).
   - **`app/category/[slug]/page.tsx` & `lib/category-content.ts`:** Expand all 7 active category `<title>` tags and meta descriptions (`135–158` chars) using rich task keywords instead of short card blurbs.
   - **`app/security/page.tsx` & `lib/legal.ts`:** Expand `/security` `<title>` (`26` → `~52` chars) and remove `"with verified channels pending"` from `/contact`'s meta description.
2. **Semantic `<h2>` Headings & `<h1>` Alignment (`components/tool-shell.tsx`):**
   - Upgrade generic `ToolShell` `<h2>` headings (`How to use it` → `How to use ${tool.name}`, `A few useful answers` → `${tool.name} FAQs`, `Keep the good work going` → `Related ${tool.category}`) while preserving visual styling.
   - Align `<h1>` / display phrasing on `merge-pdf`, `split-pdf`, `compress-pdf`, and `image-to-image` with primary search intent where appropriate without breaking catalog card clarity.
3. **Eliminate Factual Drift Across 6 Pages:**
   - **`app/help/page.tsx`:** Fix FAQ #6 (Calculators are live; only AI Tools is Coming Soon) and FAQ #3 (explicitly note `Word to PDF`'s consented server-conversion exception).
   - **`app/tools/qr-generator/page.tsx` & `app/tools/qr-code-scanner/page.tsx`:** Update steps and FAQs to accurately document all **28 QR types (including Payment/UPI)**, **Data Templates (`/qr`)**, **ECDSA P-256 anti-tamper signing**, **AES-256-GCM password encryption**, and **cryptographic QR expiry locks**.
   - **`lib/category-content.ts` (`qr-barcode`):** Remove false `"barcodes"` claim and document UPI/Payment QR, Data Templates, batch CSV, and cryptographic QR verification.
   - **`components/tools/devtools/page.tsx` (`regex-tester`):** Fix `$&lt;name&gt;` → `$<name>`.
   - **`lib/legal.ts` & `app/disclaimer/page.tsx`:** Fix `isoDatetime` (`dateTime`), clean up `pdf-translator` / add `word-to-pdf`, `image-to-text`, `qr-code-scanner` in `/file-handling` TOC, and align `/disclaimer` calculator references.

---

### Phase 4 — Individual Tool SEO Content Depth Upgrade (`P0` / `P1`)

1. **All 12 Calculators (`lib/calculator-info.ts` + `app/tools/[calculator]/page.tsx`):**
   - Expand each calculator from `119–269` words (`2 steps / 1 FAQ`) to **`450–700` words** of high-utility, zero-fluff reference content:
     - Exact mathematical formula written clearly in HTML.
     - Worked real-world calculation example(s).
     - Reference table where genuinely helpful (e.g., Indian GST slabs `5%/12%/18%/28%` + CGST/SGST/IGST split on `gst-calculator`; WHO BMI categories on `bmi-calculator`; EMI tenure vs interest comparison on `emi-calculator`; common °C/°F/K benchmarks on `temperature-converter`).
     - `4–5` specific, intent-matched FAQs per calculator.
2. **10 Developer Tools, 2 Text Tools & 2 Security Tools:**
   - Expand `steps` (`4` clear steps), `faqs` (`5` specific technical FAQs), and add compact reference notes/examples (e.g., social character limits on `word-counter`, 10-case conversion preview table on `case-converter`, `encodeURI` vs `encodeURIComponent` reserved-char matrix on `url-encoder-decoder`, hash bit/hex length comparison on `hash-generator`, entropy table on `password-generator`).
3. **Standalone `/tools/word-to-pdf`:**
   - Add SSR `"How Word to PDF works"` steps, `5` honest FAQs (covering server conversion consent, DOCX formatting fidelity, fonts, batch limits, and temporary file deletion), and `4` related PDF tool links.

---

### Phase 5 — Performance & Core Web Vitals Optimization (`P1`)

1. **Eliminate the `805 KB` (`228 KB` gzip) DevTools Static Import Bug (`lib/tools/developer-code.ts`):**
   - Convert `import { minify as minifyCssWithCsso } from "csso"` and `import { minify as minifyJavaScriptWithTerser } from "terser"` (plus `@xmldom/xmldom` / `minify-html-wasm` where applicable) to **lazy `await import(...)` calls** split per tool so `json-validator` drops from `456 KB` gzip JS to `~190 KB` gzip JS immediately!
2. **Code-Split Heavy Studio Client Libraries (`qr-generator`, `word-to-pdf`, `pdf-studio`, `pdf-to-image`, `images-to-pdf`, `image-to-image`):**
   - Defer `pdfjs-dist`, `@cantoo/pdf-lib`, `docx-preview`, and secondary modal/template galleries with `next/dynamic` or on-demand `import()` when a file is queued or a studio tab opens, targeting a **40–60% reduction in initial blocking JS**.
3. **Gate Third-Party `adsbygoogle.js` Script (`app/layout.tsx` & `lib/ads.ts`):**
   - Do not load `adsbygoogle.js` on `AD_EXCLUDED_PATHS` (or gate behind route eligibility / operator config) so `/`, legal/trust pages, `/qr`, and `/saved` incur zero third-party ad-script overhead. Reserve `min-height` on `<AdUnit>` slots to guarantee `CLS < 0.05` when ads are enabled.
4. **CSS & Hero Asset Diet:**
   - Split tool-only studio styles out of `app/globals.css` (`422 KB` raw) into route-level CSS imports so non-studio pages stop downloading 315 KB of render-blocking CSS.
   - Add responsive `srcSet`/`sizes` (or `next/image`) for `/hero-laptop-reference.webp` on `/` and remove the 3 unused legacy hero `.webp` files (`173 KB`) from `public/` if confirmed unreferenced.

---

### Phase 6 — Dynamic Social Cards, Domain Cutover & Topical Expansion (`P2` / `P3`)

1. **Dynamic Open Graph Cards:** Add route-aware `opengraph-image.tsx` for `/tools/...` and `/category/[slug]` displaying the tool/category title, privacy badge, and category accent color.
2. **Custom Domain Cutover Checklist (Operator Action + Config):** Attach custom apex/www domain in Vercel, update `SITE_URL`, configure `308` redirect from `quickkit-rosy.vercel.app` to the custom domain, and verify Google Search Console + Bing Webmaster Tools via DNS.
3. **High-Intent Tool & Guide Expansion (Optional, Post-Approval):** Add `Simple & Compound Interest Calculator`, `SIP Calculator`, or concise workflow guides based on Search Console query data.
