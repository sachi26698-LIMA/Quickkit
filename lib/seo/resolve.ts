import type {
  CategorySeoRecord,
  SearchIntent,
  ToolSeoRecord,
} from "./registry";
import { ALL_TOOL_SEO_RECORDS } from "./tools";
import { CATEGORY_SEO_RECORDS } from "./categories";

/**
 * Look-up helpers over the SEO registry.
 *
 * Pages must not import `TOOL_SEO_RECORDS` and index it by hand — a typo in a
 * slug would silently fall back to a catalogue description and ship a weaker
 * snippet. `resolveToolSeo` returns `undefined` for an unknown path and the
 * audit fails the build, so the fallback can never be silent in CI.
 */

const toolByPath = new Map<string, ToolSeoRecord>(
  ALL_TOOL_SEO_RECORDS.map((record) => [record.path, record]),
);
const toolBySlug = new Map<string, ToolSeoRecord>(
  ALL_TOOL_SEO_RECORDS.flatMap((record) =>
    record.slug ? [[record.slug, record] as const] : [],
  ),
);
const categoryBySlug = new Map<string, CategorySeoRecord>(
  CATEGORY_SEO_RECORDS.map((record) => [record.slug, record]),
);

export function resolveToolSeo(slug: string): ToolSeoRecord | undefined {
  return toolBySlug.get(slug);
}

export function resolveToolSeoByPath(path: string): ToolSeoRecord | undefined {
  return toolByPath.get(path);
}

export function resolveCategorySeo(
  slug: string,
): CategorySeoRecord | undefined {
  return categoryBySlug.get(slug);
}

export function allToolSeoRecords(): readonly ToolSeoRecord[] {
  return ALL_TOOL_SEO_RECORDS;
}

export function allCategorySeoRecords(): readonly CategorySeoRecord[] {
  return CATEGORY_SEO_RECORDS;
}

/** Paths the registry intends to be indexable — the sitemap's allow-list. */
export function registeredIndexablePaths(): string[] {
  return [
    ...ALL_TOOL_SEO_RECORDS.filter((record) => record.indexable).map(
      (record) => record.path,
    ),
    ...CATEGORY_SEO_RECORDS.filter((record) => record.indexable).map(
      (record) => record.path,
    ),
  ];
}

/**
 * The page components render their own H1 (often from the live catalogue, which
 * an administrator can rename). The registry stores the shipped H1 so the two
 * can be compared: `audit.ts` reports any tool whose rendered H1 has drifted
 * away from the H1 its metadata was written for.
 */
export function registryH1For(slug: string): string | undefined {
  return toolBySlug.get(slug)?.h1;
}

/**
 * Fold accents and case so a keyword and its copy compare equal.
 *
 * "Résumé ATS Checker" and the keyword `resume ats checker` are the same
 * phrase; without folding, the audit reports a missing keyword on every
 * accented title and the warning stops meaning anything.
 */
function foldForCompare(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

/** True when the record's own copy mentions its primary keyword naturally. */
export function mentionsPrimaryKeyword(record: {
  title: string;
  description: string;
  primaryKeyword: string;
}): { title: boolean; description: boolean } {
  const needle = foldForCompare(record.primaryKeyword);
  return {
    title: foldForCompare(record.title).includes(needle),
    description: foldForCompare(record.description).includes(needle),
  };
}

/** Ordered list of the distinct search intents present in the catalogue. */
export function intentBreakdown(): Record<SearchIntent, number> {
  const counts: Record<SearchIntent, number> = {
    transactional: 0,
    informational: 0,
    commercial: 0,
    navigational: 0,
    trust: 0,
  };
  for (const record of ALL_TOOL_SEO_RECORDS) counts[record.intent] += 1;
  return counts;
}
