// ─────────────────────────────────────────────────────────────────────────────
// QUICKKIT — the single authoritative search-metadata registry.
//
// WHY THIS FILE EXISTS
// ---------------------------------------------------------------------------
// Before this registry, a tool's search title lived in one of three places:
// the page component (a string literal inside `publicToolMetadata`), a shared
// `TOOL_SEO_METADATA` map, or a per-route `DEFAULT_TITLE` constant. Category
// titles lived in `lib/catalog.ts`. Nothing could answer "does every published
// tool have a unique, accurate title?" without rendering every route and
// diffing the output by hand.
//
// This file answers that question in code:
//
//   • ONE record per indexable route, keyed by route path.
//   • Each record states the primary keyword, the secondary cluster, the
//     search intent, the H1, the canonical, and the Open Graph copy — so the
//     reasoning behind a title is reviewable next to the title.
//   • `lib/seo/audit.ts` validates the whole registry against itself and the
//     catalogue (duplicates, missing records, orphaned records, budget
//     overruns, brand repetition, keyword cannibalisation).
//   • `lib/seo/resolve.ts` is what pages actually call. An admin override, when
//     one exists in Supabase, still wins; the registry is the shipped default.
//
// WHAT THIS FILE MUST NOT DO
// ---------------------------------------------------------------------------
// Invent claims. Every description below is limited to behaviour verified in
// the tool's own implementation (limits, formats, processing location). Where a
// competitor promises "unlimited / instant / 100% accurate", these records say
// what the engine actually does, including where it refuses.
//
// The research behind each record (target query, SERP intent notes, sources)
// lives in `docs/seo/RESEARCH_LOG.md` and is referenced by `researchId`.
// ─────────────────────────────────────────────────────────────────────────────

/** The search job a page is optimised for. */
export type SearchIntent =
  | "transactional" // "do this task now" — tool as destination
  | "informational" // "what is / how does" — reference and explanation
  | "commercial" // comparison and alternative evaluation
  | "navigational" // looking for this specific site or page
  | "trust"; // legal, privacy and policy checks before use

/** A tool record in the registry. */
export type ToolSeoRecord = {
  /** Route path, always leading slash. This is the registry key. */
  path: string;
  /** Catalogue slug (`/tools/<slug>`), when this record is a tool route. */
  slug?: string;
  /** `<title>` text WITHOUT the ` | QUICKKIT` suffix (added once, centrally). */
  title: string;
  /** Meta description. Editorial target 140–160 characters. */
  description: string;
  /** The page's H1. Must match what the page actually renders. */
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: SearchIntent;
  /** Key into `docs/seo/RESEARCH_LOG.md` — the research this record rests on. */
  researchId: string;
  /** Two reviewed alternative titles kept for future A/B or seasonal swaps. */
  alternativeTitles: [string, string];
  /** One reviewed alternative description. */
  alternativeDescription: string;
  /** Cross-category internal-link targets this page should point at. */
  internalLinks: string[];
  /** True when the route may appear in sitemap.xml while indexing is on. */
  indexable: boolean;
  /**
   * Local / multilingual phrasing this tool genuinely serves. Recorded here so
   * it is visible to reviewers and to the audit — never rendered as a fake
   * location page.
   */
  localPhrasing?: string[];
};

/** A category hub record. */
export type CategorySeoRecord = {
  path: string;
  slug: string;
  title: string;
  description: string;
  h1: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: SearchIntent;
  researchId: string;
  alternativeTitles: [string, string];
  alternativeDescription: string;
  internalLinks: string[];
  indexable: boolean;
};

const ORIGIN_NOTE =
  "Canonicals are resolved centrally from SITE_URL (production origin); no record stores an absolute URL.";

/** Exported only so the audit can assert the invariant above stays true. */
export const REGISTRY_ORIGIN_POLICY = ORIGIN_NOTE;
