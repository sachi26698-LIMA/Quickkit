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
