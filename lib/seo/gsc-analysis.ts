/**
 * Search Console analysis — the deterministic half of Phase 3.
 *
 * Search Console was not reachable from the sandbox that produced this module
 * (Google APIs answer `000`, there is no Search Console connector, and no
 * export exists in Drive or the repo). So this file contains **no data**. It
 * contains the analysis that turns a real export into the finding categories
 * the brief asks for, so that when the owner supplies the export the result is
 * computed rather than guessed.
 *
 * Rules:
 *
 * 1. **Never invent a metric.** Every number comes from the caller's rows. A
 *    missing window is reported as missing, never back-filled.
 * 2. **Separate measurement from inference.** CTR and position are measured.
 *    "This query belongs to another page" is an inference from the keyword map,
 *    and is labelled `inferred` so the two are never read as one thing.
 * 3. **No ranking predictions.** This says where a measured number falls outside
 *    a stated threshold, and why that is worth a look. It never says a page
 *    will improve.
 */
import { keywordClusters, normaliseKeyword } from "./keyword-clusters";

/** One row of a Search Console "Queries" or "Pages" export. */
export type GscRow = {
  /** Query text, or a page URL exactly as Search Console reports it. */
  key: string;
  clicks: number;
  impressions: number;
  /** Fractional 0..1, as Search Console reports it. */
  ctr: number;
  /** Average position, 1-based. */
  position: number;
};

/** A query/page pair. Search Console does not export this by default. */
export type QueryPagePair = {
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  position: number;
};

export type Window = {
  /** ISO date, inclusive. */
  startDate: string;
  /** ISO date, inclusive. */
  endDate: string;
  rows: GscRow[];
};

export type GscInput = {
  siteUrl: string;
  current: Window;
  /** The immediately preceding window of equal length. Optional. */
  previous?: Window;
  /** Page-level rows for the same windows. */
  currentPages?: Window;
  previousPages?: Window;
  /** Optional query→page pairs, when the export supports them. */
  queryPagePairs?: QueryPagePair[];
};

export type FindingKind =
  | "high-impressions-low-ctr"
  | "striking-distance"
  | "impressions-without-clicks"
  | "cannibalisation"
  | "intent-mismatch"
  | "no-impressions"
  | "gained-visibility"
  | "lost-visibility";

export type Finding = {
  kind: FindingKind;
  /** Measured or inferred — never blurred. */
  basis: "measured" | "inferred";
  subject: string;
  /** The exact numbers behind the finding, so they can be checked. */
  evidence: string;
  /** Why it matters, in plain language. No forecast. */
  reading: string;
  /** Suggested action, phrased as an option rather than a promise. */
  action: string;
  /** Higher sorts first. Derived only from measured values. */
  priority: number;
};

/** Thresholds are exported so any finding can be argued with. */
export const THRESHOLDS = {
  /** Enough impressions that a CTR problem is worth acting on. */
  minImpressions: 50,
  /** Below this CTR, with the minimum impressions, flag it. */
  lowCtr: 0.02,
  /** "Just outside the top ten". */
  strikingMinPosition: 11,
  strikingMaxPosition: 20,
  /** Impressions with essentially no clicks. */
  noClickMaxClicks: 0,
  /** A query needs this many impressions before a split is worth naming. */
  cannibalisationMinImpressions: 10,
  /** A window-over-window move must be this large to be called a change. */
  changeRatio: 0.3,
  changeAbsolute: 50,
} as const;

export type Thresholds = typeof THRESHOLDS;

const num = (value: number): string =>
  Math.round(value).toLocaleString("en-GB");

function safePath(url: string): string | undefined {
  try {
    return new URL(url).pathname;
  } catch {
    return undefined;
  }
}

/** Map a URL to the tool slug it serves, if it is a tool page. */
export function slugFromUrl(url: string): string | undefined {
  const path = url.startsWith("http")
    ? safePath(url)
    : url.startsWith("/")
      ? url
      : undefined;
  if (!path) return undefined;
  const match = path.match(/^\/tools\/([a-z0-9-]+)/);
  if (!match) return undefined;
  const slug = match[1];
  return keywordClusters.some((cluster) => cluster.slug === slug)
    ? slug
    : undefined;
}

/** Every researched keyword phrase, mapped to its owning tool. */
const KEYWORD_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const cluster of keywordClusters) {
    const phrases = [
      cluster.primary,
      ...cluster.secondary,
      ...Object.values(cluster.groups).flat(),
    ];
    for (const phrase of phrases) {
      index.set(normaliseKeyword(phrase), cluster.slug);
    }
  }
  return index;
})();

/**
 * Which tool page a query most plausibly belongs to.
 *
 * An exact researched-phrase match wins. Otherwise the query is matched on the
 * longest researched phrase whose words all appear in it. That second step is a
 * heuristic, so callers must label anything derived from it as inferred.
 */
export function toolForQuery(query: string): string | undefined {
  const normalised = normaliseKeyword(query);
  const exact = KEYWORD_INDEX.get(normalised);
  if (exact) return exact;

  const words = new Set(normalised.split(" "));
  let best: { slug: string; length: number } | undefined;
  for (const [phrase, slug] of KEYWORD_INDEX) {
    const parts = phrase.split(" ");
    if (parts.length < 2) continue;
    if (!parts.every((part) => words.has(part))) continue;
    if (!best || parts.length > best.length) {
      best = { slug, length: parts.length };
    }
  }
  return best?.slug;
}

function isPageKey(key: string): boolean {
  return key.startsWith("http") || key.startsWith("/");
}

export function analyse(
  input: GscInput,
  thresholds: Thresholds = THRESHOLDS,
): Finding[] {
  const findings: Finding[] = [];

  // ── 1–3. Per-row thresholds ─────────────────────────────────────────────
  for (const row of input.current.rows) {
    const pageLike = isPageKey(row.key);

    if (
      row.impressions >= thresholds.minImpressions &&
      row.ctr < thresholds.lowCtr
    ) {
      findings.push({
        kind: "high-impressions-low-ctr",
        basis: "measured",
        subject: row.key,
        evidence: `${num(row.impressions)} impressions, ${num(row.clicks)} clicks, CTR ${(row.ctr * 100).toFixed(2)}%, average position ${row.position.toFixed(1)}`,
        reading:
          "The page is shown but rarely chosen. With a workable position that is usually a title or description problem, not a content problem — nobody who did not click can have read the content.",
        action: pageLike
          ? "Rewrite this page's title and meta description so they name the specific task and its limits."
          : "Find which page ranks for this query, then bring that page's title closer to the query's own wording.",
        priority: row.impressions * (thresholds.lowCtr - row.ctr),
      });
    }

    if (
      row.position >= thresholds.strikingMinPosition &&
      row.position <= thresholds.strikingMaxPosition &&
      row.impressions >= thresholds.minImpressions
    ) {
      findings.push({
        kind: "striking-distance",
        basis: "measured",
        subject: row.key,
        evidence: `average position ${row.position.toFixed(1)}, ${num(row.impressions)} impressions, ${num(row.clicks)} clicks`,
        reading:
          "Position 11–20 usually means the page already matches the query well enough to rank on page two, so it is the cheapest place to gain visibility.",
        action:
          "Add a section to the ranking page that answers this query directly, and move the title's wording towards the query's phrasing.",
        priority:
          row.impressions * (thresholds.strikingMaxPosition - row.position + 1),
      });
    }

    if (
      row.clicks <= thresholds.noClickMaxClicks &&
      row.impressions >= thresholds.minImpressions
    ) {
      findings.push({
        kind: "impressions-without-clicks",
        basis: "measured",
        subject: row.key,
        evidence: `${num(row.impressions)} impressions, 0 clicks, average position ${row.position.toFixed(1)}`,
        reading:
          "Visible and almost never chosen. Whether that is fixable depends on the position reported above.",
        action:
          row.position <= 10
            ? "The page ranks well enough to be clicked, so treat this as a title/description problem before touching content."
            : "The position explains the missing clicks. Do not rewrite copy yet; raise relevance for this query first.",
        priority: row.impressions,
      });
    }
  }

  // ── 4. One query, several landing pages ─────────────────────────────────
  const pairs = input.queryPagePairs ?? [];
  const byQuery = new Map<string, QueryPagePair[]>();
  for (const pair of pairs) {
    const list = byQuery.get(pair.query) ?? [];
    list.push(pair);
    byQuery.set(pair.query, list);
  }
  for (const [query, list] of byQuery) {
    if (list.length < 2) continue;
    const total = list.reduce((sum, pair) => sum + pair.impressions, 0);
    if (total < thresholds.cannibalisationMinImpressions) continue;
    const evidence = [...list]
      .sort((a, b) => b.impressions - a.impressions)
      .map(
        (pair) =>
          `${pair.page} (${num(pair.impressions)} impressions, position ${pair.position.toFixed(1)})`,
      )
      .join("; ");
    findings.push({
      kind: "cannibalisation",
      basis: "measured",
      subject: query,
      evidence: `${list.length} URLs receive impressions for this query: ${evidence}`,
      reading:
        "More than one URL appears for a single query, so they divide whatever relevance and click-through that query offers. One of them should own it.",
      action:
        "Decide which URL's task genuinely matches the query, strengthen that one, and have the other reference it with descriptive anchor text. Do not delete the other page — it serves a different task.",
      priority: total,
    });
  }

  // ── 5. Query landing on a page with a different researched intent ───────
  for (const pair of pairs) {
    const landingSlug = slugFromUrl(pair.page);
    const intendedSlug = toolForQuery(pair.query);
    if (!landingSlug || !intendedSlug) continue;
    if (landingSlug === intendedSlug) continue;
    if (pair.impressions < thresholds.minImpressions) continue;
    findings.push({
      kind: "intent-mismatch",
      basis: "inferred",
      subject: `${pair.query} → ${pair.page}`,
      evidence: `${num(pair.impressions)} impressions. The researched intent for "${pair.query}" belongs to /tools/${intendedSlug}, but the page capturing it is /tools/${landingSlug}.`,
      reading:
        "A query is landing on a page whose researched intent is a different task. This is inferred from the keyword map, not measured against Google's own judgement.",
      action: `Check whether /tools/${intendedSlug} should rank for this instead, and whether existing internal anchor text is pointing Google at the wrong page.`,
      priority: pair.impressions,
    });
  }

  // ── 6. Tools with no impressions at all ─────────────────────────────────
  const seen = new Set<string>();
  for (const row of [
    ...input.current.rows,
    ...(input.currentPages?.rows ?? []),
  ]) {
    const slug = slugFromUrl(row.key) ?? toolForQuery(row.key);
    if (slug) seen.add(slug);
  }
  for (const cluster of keywordClusters) {
    if (seen.has(cluster.slug)) continue;
    findings.push({
      kind: "no-impressions",
      basis: "measured",
      subject: `/tools/${cluster.slug}`,
      evidence: "No impressions recorded for this tool in the supplied window.",
      reading:
        "Zero impressions means Google is not showing the page for anything. That is different from ranking badly, and the usual cause is discovery or indexing rather than page copy.",
      action:
        "Check this URL's index status in Search Console before changing any content on it.",
      priority: 0,
    });
  }

  // ── 7. Window-over-window change ────────────────────────────────────────
  if (input.previous) {
    const before = new Map(
      input.previous.rows.map((row) => [row.key, row] as const),
    );
    for (const row of input.current.rows) {
      const old = before.get(row.key);
      if (!old) continue;
      const delta = row.impressions - old.impressions;
      const base = old.impressions || 1;
      if (
        Math.abs(delta) < thresholds.changeAbsolute ||
        Math.abs(delta) / base < thresholds.changeRatio
      ) {
        continue;
      }
      findings.push({
        kind: delta > 0 ? "gained-visibility" : "lost-visibility",
        basis: "measured",
        subject: row.key,
        evidence: `${num(old.impressions)} → ${num(row.impressions)} impressions (${delta > 0 ? "+" : ""}${num(delta)}); position ${old.position.toFixed(1)} → ${row.position.toFixed(1)}`,
        reading:
          delta > 0
            ? "Visibility rose against the previous window. Worth understanding before changing the page."
            : "Visibility fell against the previous window. Check the release timeline before assuming an on-page cause.",
        action:
          delta > 0
            ? "Leave this page alone for now; reinforcing a page that is already gaining risks disturbing it."
            : "Check whether a title, description or content change shipped in this window, and whether any redirect now covers this URL.",
        priority: Math.abs(delta),
      });
    }
  }

  return findings.sort((a, b) => b.priority - a.priority);
}

/** Group page rows by the tool they belong to, keeping unmatched keys visible. */
export function bucketByTool(rows: GscRow[]): {
  byTool: Map<string, GscRow[]>;
  unmapped: GscRow[];
} {
  const byTool = new Map<string, GscRow[]>();
  const unmapped: GscRow[] = [];
  for (const row of rows) {
    const slug = slugFromUrl(row.key) ?? toolForQuery(row.key);
    if (!slug) {
      unmapped.push(row);
      continue;
    }
    const list = byTool.get(slug) ?? [];
    list.push(row);
    byTool.set(slug, list);
  }
  return { byTool, unmapped };
}
