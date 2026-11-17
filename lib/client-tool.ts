import type { Tool } from "@/lib/catalog";

/**
 * The slice of a catalogue tool that a browser-side workspace needs.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `getPublicCatalog()` returns `PublicTool`, which is a catalogue `Tool` plus
 * the administrator's override fields: `seoTitle`, `seoDescription`,
 * `canonicalPath`, `isIndexable`, `isFeatured`, `publicDescription`,
 * `maintenance` and `phase`. Those exist for server-side rendering: metadata,
 * the sitemap, the admin panel and the maintenance gate.
 *
 * They were also being handed straight to client components. `HeroSearch` and
 * `ToolExplorer` are both `"use client"`, so every one of those fields was
 * serialised into the React Server Component payload and shipped to the
 * browser on the two most-visited pages — for a search box that reads only
 * `name`, `description` and `keywords`, and a grid that reads only the display
 * fields. Measured on the real catalogue: 8,569 bytes of the 30,137-byte tool
 * array were fields the client never reads (28% of that array, roughly 7 kB
 * after gzip on the homepage, twice that on `/tools` because both the grid and
 * the search consume it).
 *
 * The projection is explicit and additive-safe: a field is listed here only
 * because a client component reads it. Anything SEO-, admin- or
 * maintenance-related stays on the server, where it is used.
 */
/** Every field a client component reads, spelled out rather than `Pick<>`ed.
 *
 * `Tool` is a discriminated union in which only two members carry `categories`,
 * so `Pick<Tool, "categories">` does not typecheck; stating the shape here keeps
 * the contract explicit and reviewable in one place.
 */
export type ClientTool = Pick<
  Tool,
  "slug" | "name" | "category" | "description" | "keywords" | "icon" | "color"
> & {
  /** Secondary categories. Only two tools have one. */
  categories?: readonly Tool["category"][];
  /**
   * `true` only while an administrator has the tool switched off.
   *
   * The full `maintenance` object carries the visitor-facing reason and an ISO
   * timestamp — useful on the server, never rendered by a card. The card only
   * needs to know *whether* the tool is off, so the projection carries the
   * answer as one boolean and emits the key at all only when it is `true`.
   */
  maintenance?: true;
};

/**
 * Structural input. Deliberately looser than `ClientTool` so the union-shaped
 * catalogue and the Supabase-merged `PublicTool` both satisfy it, while the
 * literal field types flow through to the output.
 */
type ProjectableTool = Pick<
  Tool,
  "slug" | "name" | "category" | "description" | "keywords" | "icon" | "color"
> &
  Partial<Pick<Tool, "slug">> & {
    /** Present on the two tools that have a secondary category. */
    categories?: readonly Tool["category"][];
    /** Present on `PublicTool`; absent on the locally-declared catalogue. */
    maintenance?: unknown;
  };

/**
 * Strips a tool down to the fields a client component actually renders.
 *
 * Written as an explicit object literal rather than a `delete` loop or a
 * generic `omit`, so adding a field to `Tool` can never leak it to the browser
 * by default — the new field stays server-side until someone deliberately adds
 * it here and a client component starts reading it.
 */
export function toClientTool(tool: ProjectableTool): ClientTool {
  return {
    slug: tool.slug,
    name: tool.name,
    category: tool.category,
    description: tool.description,
    keywords: tool.keywords,
    icon: tool.icon,
    color: tool.color,
    // Only two tools carry a secondary category list; omitting the key when it
    // is absent keeps the payload smaller than emitting `undefined` or `[]`.
    ...(tool.categories ? { categories: tool.categories } : {}),
    // Same principle for the maintenance flag: `{}` when the tool is live, so
    // the common case adds nothing to the payload.
    ...(tool.maintenance ? { maintenance: true as const } : {}),
  };
}

export function toClientTools<T extends ProjectableTool>(
  tools: readonly T[],
): ClientTool[] {
  return tools.map(toClientTool);
}
