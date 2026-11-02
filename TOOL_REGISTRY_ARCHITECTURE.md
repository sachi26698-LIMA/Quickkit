# QUICKKIT Tool Registry Architecture

**Status:** Proposal for owner approval  
**Date:** 1 November 2026  
**Scope:** Architecture only. No Phase 5 tool has been implemented under this proposal.

## 1. Purpose

QUICKKIT should grow from six manually wired tools into a modular tools platform without:

- creating placeholder or non-functional tool cards;
- duplicating the same job under multiple names;
- weakening the approved premium light UI;
- sending user inputs to servers unnecessarily;
- making the homepage bundle load every tool's workspace code;
- letting planned tools leak into search, sitemap or public listings before they work.

The central design is a typed, validated, build-time **Tool Registry**. Live route generation, category pages, search, related tools, recently added tools, featured tools and sitemap entries should derive from that registry.

## 2. Current-state inspection

The current implementation is suitable for six tools but will not scale cleanly to 90+.

| Area | Current state | Scaling issue |
|---|---|---|
| Catalog | `lib/catalog.ts` contains six inline records with slug, name, display category, description, keyword string, icon key, color and numeric phase. | No stable ID distinct from slug, no status, taxonomy, added date, privacy mode, related tools, content or SEO model. |
| Routing | Each tool has a manual `app/tools/[tool-slug]/page.tsx` folder. | Every new tool repeats route, metadata, content and shell wiring. Planned tools are easy to expose accidentally. |
| Icons | Icon maps are duplicated in `components/catalog.tsx` and `components/tool-icon.tsx`. | New icons require edits in multiple places and can drift. |
| Search | Homepage-only local state and case-insensitive substring matching over name, description and a keyword string. | No global search, ranking, aliases, tokenisation, diacritic handling or category-page scoping. |
| Filters | Category buttons; `All tools` is modelled as a category. | No canonical category IDs/slugs or crawlable category routes. Counts are partly hardcoded. |
| Related tools | `ToolShell` shows the first three other catalog entries. | Not based on task, category, input/output or curated relationships. |
| Privacy copy | `ToolShell` always says processing is on-device. | Unsafe as a blanket statement for future server, third-party or AI tools. Privacy must be per tool. |
| SEO | Each current page manually calls `pageMetadata`; sitemap derives tool slugs but hardcodes core routes. | New routes can be missed; category SEO is absent. |
| Favorites/popularity | Not implemented; no persistence or analytics. | Needs account-free local favorites and an honest real-data source before anything is called “Popular”. |
| Tests | Strong current coverage, but many route/tool counts are hardcoded for six. | Tests should iterate over the live registry with tiered browser coverage. |

## 3. Architectural principles

1. **Registry is metadata, not workspace code.** Homepage and category pages must not import heavy tool implementations merely to render cards.
2. **Only `live` is public.** `planned` and `in-development` tools never produce public cards, routes, sitemap entries, search results or “coming soon” pages.
3. **Stable identity.** A tool ID never changes or is reused. A slug is also treated as permanent after launch; a rare change requires a redirect and migration note.
4. **One canonical tool per user job.** A proposed tool must explain why it is not a mode or preset of an existing tool.
5. **Logic separate from UI.** Pure transformations live outside workspaces and receive unit tests. Browser/file APIs sit behind small adapters.
6. **Client-side by default.** Server or third-party processing needs a phase-level justification, explicit UI disclosure and privacy/security review.
7. **SEO derives from truth.** Metadata, structured data and content describe implemented behavior and visible page content only.
8. **No silent popularity claims.** “Featured” can be editorial. “Popular” requires an approved, real aggregate data source.
9. **Preserve existing URLs.** The six current `/tools/...` URLs remain unchanged.
10. **Launch gate remains global.** Expansion does not enable indexing. Existing `SITE_URL` + `LAUNCH_APPROVED` controls stay in force until Phase 4 legal/domain gates are complete.

## 4. Proposed URL structure

### Public, indexable after launch approval

| Route | Purpose |
|---|---|
| `/` | Homepage: hero, global search entry, category discovery, featured/recent/favorite sections. |
| `/tools` | Complete live-tool directory with search and functional category filters. |
| `/tools/category/{categorySlug}` | Generated category landing page, only when it has at least one live tool. |
| `/tools/{toolSlug}` | Canonical individual tool page. Existing six keep their current slugs. |
| `/about` | Product and trust information. |
| `/privacy` | Privacy policy. |
| `/terms` | Terms of use. |

Examples:

```text
/tools
/tools/category/pdf
/tools/merge-pdf
/tools/category/image
/tools/image-compressor
/tools/category/qr-barcode
/tools/qr-generator
```

### Utility routes that should not be indexed

| Route | Notes |
|---|---|
| `/favorites` | Account-free locally stored favorites. `noindex`; excluded from sitemap. |
| `/tools?q=...` | Optional shareable/filter state. Canonical remains `/tools`; search states are not SEO landing pages. |

### Not created

- No `/tools/{planned-slug}` preview or placeholder routes.
- No category URL for a category with zero live tools.
- No duplicate category-prefixed tool URL such as `/tools/pdf/merge-pdf`.
- No keyword-stuffed alternate URLs for the same workspace.

### Slug rules

- Lowercase ASCII letters, numbers and hyphens.
- Descriptive job or output: `merge-pdf`, `remove-duplicate-lines`, `loan-calculator`.
- No `free`, `online`, `best`, brand name or phase number in slugs.
- `category` is a reserved tool slug because `/tools/category/...` is a namespace.
- Slugs and IDs are globally unique, including deprecated/retired records.

## 5. Category taxonomy

Category is canonical data, not a display-only string. `All tools` becomes a filter value, not a category.

| Category ID | URL slug | Display name | Existing tools mapped here |
|---|---|---|---|
| `pdf` | `pdf` | PDF Tools | — |
| `image` | `image` | Image Tools | Image Compressor |
| `text-writing` | `text-writing` | Text & Writing Tools | Word Counter, Case Converter |
| `developer` | `developer` | Developer Tools | JSON Formatter |
| `calculators-converters` | `calculators-converters` | Calculators & Converters | — |
| `qr-barcode` | `qr-barcode` | QR & Barcode Tools | QR Code Generator |
| `security-privacy` | `security-privacy` | Security & Privacy Tools | Password Generator |
| `ai` | `ai` | AI Tools | — |

Optional tags/capabilities can refine search and related-tool scoring without creating more public categories. Examples: `merge`, `convert`, `analyze`, `generate`, `compress`, `file`, `text`, `privacy`.

## 6. Registry data model

Illustrative TypeScript model:

```ts
export const toolStatuses = [
  "live",
  "in-development",
  "planned",
  "deprecated",
  "retired",
] as const;

export type ToolStatus = (typeof toolStatuses)[number];
export type ProcessingLocation = "browser" | "server" | "hybrid" | "third-party";
export type NetworkUse = "none" | "first-party" | "third-party";

export interface CategoryDefinition {
  id: string;              // stable, e.g. "qr-barcode"
  slug: string;            // URL segment
  name: string;            // "QR & Barcode Tools"
  description: string;     // original category-page copy
  icon: IconId;
  accent: AccentToken;
  sortOrder: number;
  seo: {
    title: string;
    description: string;
  };
}

export interface ToolDefinition {
  // Required identity/discovery fields
  id: string;              // immutable, never reused; e.g. "word-counter"
  slug: string;            // canonical URL segment
  name: string;
  description: string;     // short card description
  categoryId: string;
  icon: IconId;
  keywords: readonly string[];
  status: ToolStatus;

  // Product/platform fields
  phase: number;
  accent: AccentToken;
  aliases?: readonly string[];
  tags?: readonly string[];
  inputTypes?: readonly string[];
  outputTypes?: readonly string[];
  relatedToolIds?: readonly string[];
  featuredRank?: number;   // editorial only; never presented as usage popularity
  addedAt?: string;        // ISO date, required for live tools
  updatedAt?: string;

  seo: {
    title: string;
    description: string;
    imageAlt?: string;
  };

  privacy: {
    processing: ProcessingLocation;
    networkUse: NetworkUse;
    storesInput: boolean;
    summary: string;       // accurate user-facing disclosure
    thirdParties?: readonly string[];
  };
}

export interface ToolContent {
  toolId: string;
  intro: string;
  steps: readonly string[];
  faqs: readonly { q: string; a: string }[];
  limitations: readonly string[];
}
```

### Why content is separate

Cards, sitemap and search need only the compact definition. FAQs, long instructions and limitation copy should load only on the individual tool route. This keeps the public search index small and makes editorial content independently reviewable.

### Status semantics

| Status | Public route | Listed/searchable | Sitemap | Meaning |
|---|---:|---:|---:|---|
| `live` | Yes | Yes | After launch gate | Fully implemented, tested and releasable. |
| `in-development` | No | No | No | Active branch work; may exist in internal registry tests. |
| `planned` | No | No | No | Approved candidate only. Prefer keeping it in roadmap docs until its phase starts. |
| `deprecated` | Controlled | Usually no | No, unless canonical strategy says otherwise | Replaced or scheduled for retirement; needs explicit redirect/removal plan. |
| `retired` | No | No | No | Historical identity retained so IDs/slugs are never reused. |

## 7. Proposed file structure

This is a migration target, not an instruction to create all files immediately.

```text
lib/
  tool-registry/
    types.ts
    categories.ts
    definitions/
      index.ts
      pdf.ts
      image.ts
      text-writing.ts
      developer.ts
      calculators-converters.ts
      qr-barcode.ts
      security-privacy.ts
      ai.ts
    content/
      index.ts
      pdf.ts
      image.ts
      ...
    index.ts          # aggregation + public selectors
    validate.ts       # build/test-time invariant checks
    search.ts         # normalization and ranking
    related.ts        # curated + deterministic fallback
  tools/
    shared/
    pdf/
    image/
    text/
    developer/
    ...

components/
  tool-icon.tsx       # one central IconId -> Lucide map
  tool-card.tsx
  tool-search.tsx
  tool-shell.tsx
  favorites/
    favorite-button.tsx
    use-favorites.ts
  tools/
    workspace-loaders.ts  # live tool ID -> lazy workspace loader
    pdf/
    image/
    ...

app/
  tools/
    page.tsx                         # /tools
    category/[categorySlug]/page.tsx # generated category pages
    [slug]/page.tsx                  # generated live tool pages
  favorites/page.tsx
  sitemap.ts
```

### Workspace loader separation

`workspace-loaders.ts` is imported only by the individual tool route. It maps a live tool ID to a lazy workspace import. The metadata registry never imports React workspaces or heavy libraries. A registry test must prove the loader map covers exactly the live tool IDs—no missing workspaces and no orphan loaders presented as tools.

### Route generation

- `generateStaticParams()` returns live tools only.
- `dynamicParams = false` makes planned/unknown slugs return 404.
- `generateMetadata()` derives title, description, canonical path and social metadata from the definition through the existing launch-aware SEO helper.
- Category params include only categories with at least one live tool.
- The current six URLs must pass parity tests before manual route folders are removed.

## 8. Tool page contract

Every live tool page uses the same shell hierarchy:

1. Breadcrumb: Home → Tools → Category → Tool.
2. One H1 with tool name.
3. Short original introduction.
4. Favorite action and processing/privacy badge.
5. Workspace.
6. Inputs, outputs and limitations relevant to that tool.
7. “How to use it” instructions.
8. Tool-specific FAQs visible on the page.
9. Related tools.
10. Link back to the category and full directory.

The shell must render privacy copy from the definition:

- Browser: “Processed on your device…”
- Server: what is sent, why, retention and deletion behavior after those facts are implemented and reviewed.
- Third-party: named provider/category, what leaves the device, and an explicit action before transfer.
- Hybrid: the local and remote steps separately.

No AI/server tool may inherit a generic “not uploaded” message.

## 9. Search and filtering

### Index

Build a minimal client search record per live tool:

```ts
{
  id, slug, name, description, categoryId, categoryName,
  keywords, aliases, tags, inputTypes, outputTypes
}
```

Do not include FAQs, workspaces or large content blocks in the global search bundle.

### Matching and ranking

- Normalize case, surrounding whitespace and Unicode diacritics.
- Tokenize multi-word queries; all meaningful terms should match somewhere.
- Rank exact name, name prefix, alias/keyword, category, tags, then description.
- Include format synonyms deliberately, e.g. `jpg`/`jpeg`, `picture`/`image`, `combine`/`merge`.
- Keep one tool as the canonical result for a primary intent; aliases must not hijack another tool's job.
- Announce result counts to assistive technology and support Escape/clear.

### Surfaces

- Homepage search retained and upgraded to the shared ranking engine.
- Header search becomes global on desktop/mobile. The search index/workspaces should lazy-load on first interaction where practical.
- `/tools` is the full directory with category filters and the same search behavior.
- Category pages are server-rendered lists with optional scoped client search.

## 10. Featured, popular and recently added

These labels must mean different things:

- **Featured:** editorial `featuredRank`; label it “Featured tools,” not “Popular.”
- **Recently added:** live tools sorted by required `addedAt`, newest first.
- **Popular:** only from a real, approved aggregate source. The registry must not contain invented usage counts.

Proposed popularity interface:

```ts
interface PopularitySnapshot {
  source: string;
  measuredAt: string;
  windowDays: number;
  rankings: readonly { toolId: string; rank: number }[];
}
```

The snapshot would be generated outside request handling from an owner-approved privacy-respecting analytics source. Until that source, retention and disclosure are approved, the UI should either omit “Popular” or use the honest label “Featured.” Search Console impressions alone should not be described as tool usage.

## 11. Favorites without an account

- Store tool IDs only—never tool inputs—in versioned local storage, e.g. `quickkit:favorites:v1`.
- Use a hydration-safe external-store hook; render a stable unfavorited server state, then update after mount.
- Validate stored IDs against live tools; silently prune retired/unknown IDs.
- Handle blocked/full storage without breaking the page.
- Provide accessible pressed state, e.g. `aria-pressed` and “Save {tool} to favorites.”
- Do not nest the favorite button inside a card-wide link. Refactor cards into an article with a primary link and a sibling favorite button.
- `/favorites` and a homepage “Your favorites” section read the same store. Add “Clear favorites.”
- Update privacy copy to state that favorite tool IDs are stored locally in the browser. This is persistent preference storage, not tool-input storage.

## 12. Related tools

Selection order:

1. Curated `relatedToolIds` reviewed for a real next task.
2. Same-category live tools scored by shared tags/input/output types.
3. Cross-category complements, e.g. PDF to Images → Image Compressor.
4. Featured live tool only as a final deterministic filler.

Rules: no self-links, duplicates, planned tools, deprecated tools or arbitrary first-three results. Show three by default to preserve the current layout.

## 13. SEO and launch behavior

- Canonical tool path is derived from slug; category path from category slug.
- Sitemap includes only live categories/tools and approved public pages, and only when the existing launch gate enables indexing.
- `/favorites` and parameterized search states are excluded from sitemap and carry `noindex` when rendered.
- Breadcrumb structured data can be generated from the actual route hierarchy.
- WebApplication/SoftwareApplication structured data may be considered per tool only with factual fields and no ratings/reviews/prices that are not real.
- FAQ structured data only mirrors visible FAQs and should be reviewed against current Google policy at implementation time.
- Per-tool Open Graph images can be generated from a shared premium template after the generic Phase 4 image work is complete. They must not contain fake ratings or claims.
- The existing `X-Robots-Tag`, robots and empty-sitemap launch protections remain until domain/legal approval.

## 14. Performance architecture

- Static generation for home, directory, categories and tool shells.
- Lazy-load each workspace and heavy libraries (PDF, OCR, barcode, ZIP, syntax tools) only on its route or first relevant interaction.
- Keep registry metadata serializable and compact; load long content only in tool routes.
- Central icon map uses named Lucide imports. Monitor first-load JS as icon count grows; consider category icon maps if bundle budgets are missed.
- Set file/page/memory limits based on load testing, especially PDF/image tools. Release object URLs, canvases, workers and blobs on reset/unmount.
- Avoid rendering all tool cards repeatedly across homepage sections. Homepage should use curated sections; `/tools` owns the complete directory.
- Record a bundle budget in CI before Phase 5 and fail on heavy libraries leaking into home/category bundles.

## 15. Security and privacy boundaries

- Validate MIME type and file signature separately; never trust extensions.
- Bound bytes, pages, pixels, archive entries, nesting, decompression and processing time to reduce denial-of-service against the user's browser.
- Treat PDFs, images, archives and decoded barcodes as hostile input. Never insert extracted content as HTML.
- Camera, microphone, clipboard and file access occur only after a clear user action. Current global `Permissions-Policy` blocks camera/microphone; any scanner/TTS change needs route-scoped review.
- Server processing, if ever approved, requires HTTPS, request limits, no input logging, ephemeral handling, deletion verification, subprocessors/retention disclosure, abuse controls and CSP review.
- AI tools require model/provider provenance, license, data-flow, cost, abuse, retention and quality review. A deterministic template must not be branded as AI.
- Secrets never enter the client registry or browser bundle.

## 16. Testing model

### Registry tests

- IDs and slugs are unique, nonempty and match allowed patterns.
- Every tool references an existing category and icon.
- Live tools have content, SEO, privacy fields, `addedAt` and exactly one workspace loader.
- Related IDs exist, are live at render time and never self-reference.
- Planned/in-development tools are absent from routes, search, cards and sitemap selectors.
- Category pages are generated only for categories with live tools.
- Title/description uniqueness and reasonable length checks.

### Per-tool tests

- Unit tests for normal, empty, invalid, boundary and hostile inputs.
- Browser journey for the primary task and reset/clear behavior.
- Copy/download assertions against actual output bytes where relevant.
- Privacy/network assertion appropriate to the declared processing mode.
- Accessibility scan at initial and result/error states.
- Responsive checks, with full-width matrix applied by layout archetype and complete route smoke coverage. Running every tool at every width in three engines will need CI sharding as the catalog grows.

### Phase exit gate

A tool can move to `live` only when implementation, content, unit tests, browser tests, accessibility, responsive checks, privacy review, dependency review, status documentation and screenshots are complete. A phase is complete only when every tool claimed in that phase passes individually; a category page full of unfinished cards is a failure.

## 17. Migration sequence after approval

1. **Freeze decisions:** taxonomy, URL pattern, count interpretation, popularity labeling and Phase 5 candidate list.
2. **Registry without visual change:** introduce types/categories/definitions for the six live tools; adapt existing catalog/sitemap selectors; add registry tests.
3. **Generated tool routes:** migrate the six pages to `[slug]`, preserve URLs/content/workspaces, compare metadata and run parity tests.
4. **Discovery:** add `/tools`, generated category pages, global search, relevance-based related tools and recently added/featured sections.
5. **Favorites:** refactor cards, add versioned local storage and `/favorites`; update privacy copy.
6. **Phase 5 engine spike:** evaluate PDF libraries and limits outside a public route.
7. **Build PDF tools one at a time.** Each moves from `in-development` to `live` only after its individual gate.

## 18. Decisions required before Phase 5 coding

1. Approve flat tool URLs plus `/tools/category/{slug}`.
2. Confirm the count model in the roadmap: Phases 5–12 propose 84 net-new tools; with six live tools that is 90 total. Reaching 100+ requires a later evidence-led Phase 13 with at least 11 additional non-duplicate tools.
3. Approve the eight category IDs and existing-tool remapping.
4. Decide whether “Popular” remains hidden until a real analytics source is approved; use “Featured” in the interim.
5. Approve account-free favorites using local storage for tool IDs only.
6. Approve the Phase 5 first-ten list and whether Compress/Protect PDF should replace a lower-risk item after an engine spike.
7. Confirm that Phase 4 launch gates remain closed: expansion may be developed, but indexing/deployment stays disabled until domain, legal identity/contact, hosting details and security acceptance are complete.
