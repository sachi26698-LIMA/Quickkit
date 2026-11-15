import { categoryMeta, toolCategoriesOf, tools } from "@/lib/catalog";
import { nonLocalToolSlugs } from "@/lib/tool-processing";

export { nonLocalToolSlugs };

/**
 * One authoritative set of catalogue numbers.
 *
 * Every public page, SEO inventory and the Admin Control Center derive their
 * counts from this module, never from a literal typed into copy. Before this
 * existed the same site advertised three different totals (a `/tools` title
 * said 43, the homepage said 49, and the shipped catalogue actually held 56),
 * which is exactly the kind of drift a hand-written number always produces.
 *
 * Rules, so the numbers can never contradict the tool pages:
 *
 * - `totalTools` is the number of uniquely routed tools in `lib/catalog.ts`.
 *   The public listing, `/sitemap.xml`, the search index and the Admin table
 *   all read the same array, so a card can never appear without a route.
 * - A category count counts a tool once per category it belongs to. A tool in
 *   two categories (the hash generator is Developer Tools *and* Security &
 *   Privacy) therefore raises both totals, and the per-category numbers sum to
 *   more than `totalTools`. That is intentional — the alternative was a
 *   Security & Privacy page that showed one card while Admin showed nine.
 * - Privacy numbers are counted from explicit per-tool metadata
 *   (`lib/tool-processing.ts`), not from prose, so a claim like "N of M tools
 *   are local" is computed rather than remembered.
 */

export const totalTools = tools.length;

export const toolCountByCategory: Readonly<Record<string, number>> =
  Object.fromEntries(
    categoryMeta.map((meta) => [
      meta.name,
      tools.filter((tool) => toolCategoriesOf(tool).includes(meta.name)).length,
    ]),
  );

/** Categories that genuinely ship tools. AI Tools is a labelled roadmap entry. */
export const publishedCategoryCount = categoryMeta.filter(
  (meta) => (toolCountByCategory[meta.name] ?? 0) > 0,
).length;

/** Tools documented as fully browser-local (no network request at all). */
export const localToolCount = totalTools - nonLocalToolSlugs.length;

/** Tools whose documented processing involves this server or a third party. */
export const nonLocalToolCount = nonLocalToolSlugs.length;

/** Stable, human-readable total for metadata, copy and Admin labels. */
export const totalToolsLabel = String(totalTools);
