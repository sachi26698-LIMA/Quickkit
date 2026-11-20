import type { ClientTool } from "@/lib/client-tool";

/**
 * Shared ranking for every tool search surface (hero box, All Tools
 * explorer, command palette). Name matches rank above description/keyword
 * matches, so "pdf" puts PDF Merger above a tool that merely mentions PDFs.
 */
export function rankTools(tools: ClientTool[], rawQuery: string): ClientTool[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return [];
  const matches = tools.filter((tool) =>
    `${tool.name} ${tool.description} ${tool.keywords} ${tool.category}`
      .toLocaleLowerCase()
      .includes(query),
  );
  const named = matches.filter((tool) =>
    tool.name.toLocaleLowerCase().includes(query),
  );
  const rest = matches.filter((tool) => !named.includes(tool));
  return [...named, ...rest];
}

/**
 * Ranking over a precomputed haystack.
 *
 * The command palette cannot ship `description` and `keywords` to the browser
 * (see `lib/palette-index.ts`), so it matches against a lowercase string that
 * was collapsed on the server. The ranking rule is identical to `rankTools`:
 * a name hit outranks a hit that only matched description or keywords.
 */
export function rankByHaystack<T extends { name: string; haystack: string }>(
  tools: readonly T[],
  rawQuery: string,
): T[] {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return [];
  const matches = tools.filter((tool) => tool.haystack.includes(query));
  const named = matches.filter((tool) =>
    tool.name.toLocaleLowerCase().includes(query),
  );
  const rest = matches.filter((tool) => !named.includes(tool));
  return [...named, ...rest];
}

/**
 * Example queries shown while a search box is empty. They describe tasks the
 * catalogue actually answers — no invented popularity claims.
 */
export const EXAMPLE_SEARCHES: readonly string[] = [
  "merge pdf",
  "qr code",
  "json formatter",
  "compress image",
  "gst calculator",
];
