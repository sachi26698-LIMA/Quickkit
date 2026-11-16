import type { Metadata } from "next";
import { getPublicCatalog, publicToolMetadata } from "./public-catalog";
import { pageMetadata } from "@/lib/seo";
import { resolveToolSeo } from "@/lib/seo/resolve";

/**
 * Metadata for a tool route, resolved in one place.
 *
 * Resolution order, highest priority first:
 *
 *   1. An administrator's override in Supabase (`seo_title` / `seo_description`
 *      / `canonical_path` / `is_indexable`) — the admin panel is the control
 *      surface, so it always wins.
 *   2. The shipped record in `lib/seo/tools.ts` — researched, unique, budgeted.
 *   3. The page's own literal fallback — kept so a brand-new route still ships
 *      sensible metadata before its record is written (the audit then fails CI
 *      until the record exists).
 *
 * A tool that is switched off for maintenance is set to `noindex, follow` for
 * as long as it stays off: the page still renders (so a visitor with a bookmark
 * sees the notice), but a temporarily unavailable tool should not be presented
 * to a search engine as a working destination. When the admin switches it back
 * on, the next revalidation restores indexability with no code change.
 */
export async function resolvedToolMetadata(
  slug: string,
  fallbackTitle: string,
  fallbackDescription: string,
): Promise<Metadata> {
  const base = await publicToolMetadata(
    slug,
    fallbackTitle,
    fallbackDescription,
  );
  const record = resolveToolSeo(slug);
  let metadata: Metadata = base;

  if (
    !base.robots ||
    typeof base.robots !== "object" ||
    "index" in base.robots
  ) {
    // No admin override decided anything, so the researched record supplies the
    // snippet. (`publicToolMetadata` only sets `robots` when a tool is hidden.)
    if (record) {
      metadata = {
        ...base,
        ...pageMetadata(record.title, record.description, record.path),
      };
    }
  }

  try {
    const { tools } = await getPublicCatalog();
    const tool = tools.find((item) => item.slug === slug);
    if (tool?.maintenance) {
      metadata = { ...metadata, robots: { index: false, follow: true } };
    }
  } catch {
    // A catalogue read failure must not remove a page's metadata.
  }

  return metadata;
}
