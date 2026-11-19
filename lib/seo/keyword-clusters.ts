/**
 * Keyword clusters — the long-tail layer beneath `lib/seo/tools.ts`.
 *
 * `tools.ts` owns what a page *says*: title, description, H1, the five
 * secondary keywords that are actually rendered. This module owns the wider set
 * of ways people search for the same task, so one page can legitimately serve a
 * cluster of queries without the visible copy ever repeating itself.
 *
 * Design rules, in order of importance:
 *
 * 1. **Nothing here is rendered as a keyword list.** These are search phrasings
 *    the page is written to answer, not strings to paste into a paragraph. The
 *    rendered metadata stays exactly as `tools.ts` defines it.
 * 2. **Every keyword must be true of the tool.** `word-to-pdf` reaches a server
 *    after consent, so it carries no "without uploading" phrasing. Tools that
 *    make a consented network call (`dns-email-security`, `product-lookup`,
 *    `url-network-privacy`) carry no "offline"/"no network" phrasing. A keyword
 *    that would be a false claim is a defect, not a reach.
 * 3. **No keyword belongs to two tools.** That is what keeps pages from
 *    competing with each other for the same query. Ownership is assigned
 *    deliberately and checked mechanically by `auditKeywordClusters`.
 * 4. **No volumes, difficulty, CPC or rankings are recorded.** None of that was
 *    measured. This file is a mapping of intent, not a forecast of traffic.
 */
import { pdfKeywordClusters } from "./keywords/pdf";
import { imageKeywordClusters } from "./keywords/image";
import { qrKeywordClusters } from "./keywords/qr";
import { textKeywordClusters } from "./keywords/text";
import { developerKeywordClusters } from "./keywords/developer";
import { calculatorsKeywordClusters } from "./keywords/calculators";
import { securityKeywordClusters } from "./keywords/security";
import { hrKeywordClusters } from "./keywords/hr";
import { seoKeywordClusters } from "./keywords/seo";
import { careerKeywordClusters } from "./keywords/career";

/** The keyword taxonomies the brief asks for, minus primary and secondary. */
export type KeywordGroup =
  | "alternativeName"
  | "synonym"
  | "action"
  | "longTail"
  | "problem"
  | "question"
  | "qualifier"
  | "india";

export type ToolKeywordCluster = {
  /** Must equal the registry record's slug — checked in the audit. */
  slug: string;
  /** Must equal the registry record's primaryKeyword — checked in the audit. */
  primary: string;
  /** Must equal the registry record's secondaryKeywords — checked in the audit. */
  secondary: string[];
  groups: Partial<Record<KeywordGroup, string[]>>;
  /**
   * Present only where an India-specific or Hinglish phrasing is a genuine way
   * users search. Absent by design on developer and security tools, where
   * Hinglish is not how that audience searches — inventing it would be noise.
   */
  audience?: string;
};

export const KEYWORD_GROUP_LABELS: Record<KeywordGroup, string> = {
  alternativeName: "Alternative names",
  synonym: "Synonyms and equivalent phrases",
  action: "Action-based queries",
  longTail: "Long-tail queries",
  problem: "Problem-solving searches",
  question: "Question-based queries",
  qualifier: "Free / online / browser-based",
  india: "Indian English and Hinglish",
};

/** Every cluster, in catalogue order. */
export const keywordClusters: ToolKeywordCluster[] = [
  ...pdfKeywordClusters,
  ...imageKeywordClusters,
  ...qrKeywordClusters,
  ...textKeywordClusters,
  ...developerKeywordClusters,
  ...calculatorsKeywordClusters,
  ...securityKeywordClusters,
  ...hrKeywordClusters,
  ...seoKeywordClusters,
  ...careerKeywordClusters,
];

const CLUSTER_BY_SLUG = new Map(keywordClusters.map((c) => [c.slug, c]));

export function keywordClusterFor(
  slug: string,
): ToolKeywordCluster | undefined {
  return CLUSTER_BY_SLUG.get(slug);
}

/**
 * The flat, de-duplicated keyword list for one tool, primary first.
 * Order is stable so reports diff cleanly between runs.
 */
export function keywordsFor(cluster: ToolKeywordCluster): string[] {
  const ordered: string[] = [cluster.primary, ...cluster.secondary];
  for (const group of Object.keys(KEYWORD_GROUP_LABELS) as KeywordGroup[]) {
    ordered.push(...(cluster.groups[group] ?? []));
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ordered) {
    const key = normaliseKeyword(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(raw.trim());
  }
  return out;
}

/**
 * Normalisation used only for de-duplication, never for display.
 *
 * Word order is deliberately preserved. Sorting tokens would make
 * "pdf to word" and "word to pdf" collide, but those are opposite directions
 * served by two different tools — collapsing them would invent a conflict that
 * does not exist.
 */
export function normaliseKeyword(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type KeywordAuditFinding = {
  severity: "error" | "warning";
  code: string;
  subject: string;
  message: string;
};

export type KeywordAuditOptions = {
  /** Tool slugs the registry actually publishes, in order. */
  registrySlugs: string[];
  /** slug → the registry record's primary keyword. */
  registryPrimary: Record<string, string>;
  /** slug → the registry record's secondary keywords. */
  registrySecondary: Record<string, string[]>;
};

export const MIN_KEYWORDS_PER_TOOL = 20;
export const MAX_KEYWORDS_PER_TOOL = 32;

/**
 * Structural checks over the cluster set. Never invents a judgement about
 * quality — it only proves the mapping is complete, true to the registry and
 * free of collisions.
 */
export function auditKeywordClusters(
  options: KeywordAuditOptions,
  clusters: ToolKeywordCluster[] = keywordClusters,
): KeywordAuditFinding[] {
  const findings: KeywordAuditFinding[] = [];
  const known = new Set(options.registrySlugs);
  const seenSlugs = new Set<string>();

  for (const cluster of clusters) {
    // ── Coverage ────────────────────────────────────────────────────────────
    if (!known.has(cluster.slug)) {
      findings.push({
        severity: "error",
        code: "cluster-without-tool",
        subject: cluster.slug,
        message:
          "Keyword cluster describes a tool the registry does not publish.",
      });
    }
    if (seenSlugs.has(cluster.slug)) {
      findings.push({
        severity: "error",
        code: "duplicate-cluster",
        subject: cluster.slug,
        message: "Two keyword clusters describe the same tool.",
      });
    }
    seenSlugs.add(cluster.slug);

    // ── Agreement with the registry, so the two files cannot drift ──────────
    const primary = options.registryPrimary[cluster.slug];
    if (
      primary &&
      normaliseKeyword(primary) !== normaliseKeyword(cluster.primary)
    ) {
      findings.push({
        severity: "error",
        code: "primary-mismatch",
        subject: cluster.slug,
        message: `Cluster primary "${cluster.primary}" does not match the registry's "${primary}".`,
      });
    }
    const secondary = options.registrySecondary[cluster.slug] ?? [];
    const clusterSecondary = new Set(cluster.secondary.map(normaliseKeyword));
    for (const keyword of secondary) {
      if (!clusterSecondary.has(normaliseKeyword(keyword))) {
        findings.push({
          severity: "error",
          code: "secondary-missing",
          subject: cluster.slug,
          message: `Registry secondary keyword "${keyword}" is absent from the cluster.`,
        });
      }
    }
    for (const keyword of cluster.secondary) {
      const key = normaliseKeyword(keyword);
      if (!secondary.some((s) => normaliseKeyword(s) === key)) {
        findings.push({
          severity: "warning",
          code: "secondary-extra",
          subject: cluster.slug,
          message: `Cluster secondary "${keyword}" is not in the registry, so it is documented but not rendered.`,
        });
      }
    }

    // ── Volume and shape ───────────────────────────────────────────────────
    const keywords = keywordsFor(cluster);
    if (keywords.length < MIN_KEYWORDS_PER_TOOL) {
      findings.push({
        severity: "error",
        code: "cluster-too-small",
        subject: cluster.slug,
        message: `Only ${keywords.length} keywords; the floor is ${MIN_KEYWORDS_PER_TOOL}.`,
      });
    }
    if (keywords.length > MAX_KEYWORDS_PER_TOOL) {
      findings.push({
        severity: "warning",
        code: "cluster-large",
        subject: cluster.slug,
        message: `${keywords.length} keywords exceeds the ${MAX_KEYWORDS_PER_TOOL} ceiling; thin variations dilute a page rather than broaden it.`,
      });
    }
    if (keywords.some((k) => normaliseKeyword(k).split(" ").length < 2)) {
      findings.push({
        severity: "warning",
        code: "single-word-keyword",
        subject: cluster.slug,
        message:
          "A one-word keyword is too broad to belong to any single tool page.",
      });
    }
    if (cluster.groups.question?.length === 0) {
      findings.push({
        severity: "warning",
        code: "empty-group",
        subject: cluster.slug,
        message:
          "An empty keyword group should be omitted rather than left blank.",
      });
    }
  }

  // ── Tools the registry publishes but the clusters forget ─────────────────
  for (const slug of options.registrySlugs) {
    if (!seenSlugs.has(slug)) {
      findings.push({
        severity: "error",
        code: "tool-without-cluster",
        subject: slug,
        message: "Published tool has no keyword cluster.",
      });
    }
  }

  // ── Ownership: one keyword, one page ─────────────────────────────────────
  const owners = new Map<string, string[]>();
  for (const cluster of clusters) {
    for (const keyword of keywordsFor(cluster)) {
      const key = normaliseKeyword(keyword);
      const list = owners.get(key) ?? [];
      list.push(cluster.slug);
      owners.set(key, list);
    }
  }
  for (const [keyword, slugs] of owners) {
    if (slugs.length > 1) {
      findings.push({
        severity: "error",
        code: "shared-keyword",
        subject: slugs.join(", "),
        message: `"${keyword}" is assigned to more than one tool. One query must map to one page, or the pages compete.`,
      });
    }
  }

  return findings;
}
