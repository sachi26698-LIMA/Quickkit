import "server-only";
import { cache } from "react";
import type { CategoryMeta } from "@/lib/catalog";
import type { ClientTool } from "@/lib/client-tool";
import { getPublicCatalog } from "@/lib/supabase/public-catalog";
import { toClientTools } from "@/lib/client-tool";

/**
 * The search index the command palette actually reads.
 *
 * ## Why this is not `ClientTool`
 *
 * The palette is mounted in the public layout, so whatever it is handed is
 * serialised into the RSC payload of **every** page. `ClientTool` carries
 * `description` and `keywords` — the two biggest fields, and the two the palette
 * never renders. Shipping the full projection put 54.6 kB of catalogue into the
 * HTML of pages with no search box at all, measured on `/privacy` (164 kB
 * document, 131 tool objects).
 *
 * `rankTools` reads `name`, `description`, `keywords` and `category` to decide
 * matches, but a match is rendered as a label, a category hint and an icon. So
 * the haystack is built here, on the server, into one lowercase string per
 * tool: matching stays exactly as strict as it was, and the payload carries
 * `haystack` instead of `description` + `keywords`.
 *
 * ## Why `text` too
 *
 * Collapsing the haystack means no single field survives for the "starts with
 * the query" tie-break. `text` is the tool's own name and category, kept so the
 * palette can rank a name hit above a keyword hit without re-splitting.
 */
export type PaletteTool = {
  slug: string;
  name: string;
  category: string;
  icon: ClientTool["icon"];
  color: ClientTool["color"];
  /** Lowercase `name + description + keywords + category`, built server-side. */
  haystack: string;
};

export function toPaletteTool(tool: ClientTool): PaletteTool {
  return {
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    icon: tool.icon,
    color: tool.color,
    haystack:
      `${tool.name} ${tool.description} ${tool.keywords} ${tool.category}`
        .toLocaleLowerCase()
        .replace(/\s+/g, " "),
  };
}

/** One palette projection per request, shared by the index route. */
export const getPaletteIndex = cache(async function getPaletteIndex(): Promise<{
  tools: PaletteTool[];
  categories: CategoryMeta[];
}> {
  const { categories, tools } = await getPublicCatalog();
  return {
    tools: toClientTools(tools).map(toPaletteTool),
    categories,
  };
});
