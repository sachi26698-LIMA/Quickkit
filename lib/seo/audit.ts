import { tools, categoryMeta, toolCategoriesOf } from "@/lib/catalog";
import { legalPages } from "@/lib/legal";
import {
  allCategorySeoRecords,
  allToolSeoRecords,
  mentionsPrimaryKeyword,
} from "./resolve";
import type { CategorySeoRecord, ToolSeoRecord } from "./registry";
import { calculatorInfo } from "@/lib/calculator-info";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";
import { SECURITY_SUITE_SEO_CONTENT } from "@/lib/tools/security/seo-content";
import { BARCODE_SUITE_SEO_CONTENT } from "./barcode-suite-content";
import { allPageSeoRecords, fillToolCount } from "./pages";
import { launchToolBySlug } from "@/lib/tools/launch/registry";

/**
 * Metadata quality audit.
 *
 * This module is pure: no filesystem, no network, no rendering. It compares the
 * registry to the catalogue and to itself, and returns findings. Two callers
 * use it:
 *
 *   1. `npm run seo:report` — prints the report a human reviews;
 *   2. `tests/seo-registry.test.ts` — fails CI when a new tool ships without a
 *      record, when two records collide, or when a description drifts out of
 *      the snippet budget.
 *
 * Nothing here measures traffic, impressions or ranking. Those are Google's
 * data and are never invented: the report says so explicitly.
 */

export const TITLE_BUDGET = 60; // rendered, including " | QUICKKIT"
export const TITLE_MAX_RAW = TITLE_BUDGET - " | QUICKKIT".length; // 49
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 160;

export type Severity = "error" | "warning" | "info";

export type Finding = {
  severity: Severity;
  code: string;
  subject: string;
  message: string;
};

export type RouteQuality = {
  path: string;
  title: string;
  titleRenderedLength: number;
  description: string;
  descriptionLength: number;
  canonicalPath: string;
  indexable: boolean;
  hasReferenceContent: boolean;
  primaryKeywordInTitle: boolean;
  primaryKeywordInDescription: boolean;
  internalLinkCount: number;
};

export type SeoReport = {
  generatedFor: string;
  totals: {
    publishedTools: number;
    toolRecords: number;
    categoryRecords: number;
    indexableToolPaths: number;
    indexableCategoryPaths: number;
    legalPages: number;
    pageRecords: number;
  };
  findings: Finding[];
  routes: RouteQuality[];
  categories: CategorySeoRecord[];
  titleLengths: { min: number; max: number; average: number };
  descriptionLengths: { min: number; max: number; average: number };
  intentCounts: Record<string, number>;
};

/** Slugs whose page renders a specifications/examples block. */
function hasReferenceContent(slug: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(TOOL_SEO_CONTENT, slug) ||
    Object.prototype.hasOwnProperty.call(SECURITY_SUITE_SEO_CONTENT, slug) ||
    Object.prototype.hasOwnProperty.call(BARCODE_SUITE_SEO_CONTENT, slug) ||
    // The twelve calculators render a formulas + worked-examples section from
    // `lib/calculator-info.ts` instead of the shared reference registry.
    Object.prototype.hasOwnProperty.call(calculatorInfo, slug) ||
    // Launched HR / SEO / Career tools carry their reference material in their
    // own declaration (`reference` + optional `caveat` / `jurisdiction`), which
    // `launch-tool-page.tsx` renders as the page's specifications section.
    (launchToolBySlug(slug)?.reference.length ?? 0) > 0 ||
    // These routes carry their own hand-written reference sections inside the
    // page component rather than the shared registry.
    [
      "barcode-scanner",
      "batch-code-checker",
      "qr-generator",
      "word-to-pdf",
    ].includes(slug)
  );
}

function normalise(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

/**
 * Cheap stem-ish comparison for near-duplicate titles: lower-cases, drops
 * punctuation and the brand, and collapses the unique word set. Two titles that
 * share the same word set are the same title with the words shuffled, which is
 * exactly the "template with a swapped noun" failure this check exists for.
 */
function titleSignature(value: string): string {
  return [
    ...new Set(
      normalise(value)
        .replace(/quickkit/g, " ")
        .replace(/[^a-z0-9%°&+ ]+/g, " ")
        .split(" ")
        .filter(Boolean),
    ),
  ]
    .sort()
    .join(" ");
}

export function buildSeoReport(): SeoReport {
  const findings: Finding[] = [];
  const toolRecords = allToolSeoRecords();
  const categoryRecords = allCategorySeoRecords();
  const publishedSlugs = new Set<string>(tools.map((tool) => tool.slug));
  const recordBySlug = new Map<string, ToolSeoRecord>();

  // ── 1. Coverage: every published tool has exactly one record ──────────────
  for (const tool of tools) {
    const matches = toolRecords.filter((record) => record.slug === tool.slug);
    if (matches.length === 0) {
      findings.push({
        severity: "error",
        code: "missing-tool-record",
        subject: `/tools/${tool.slug}`,
        message:
          "Published tool has no SEO registry record, so its snippet falls back to catalogue copy.",
      });
      continue;
    }
    if (matches.length > 1) {
      findings.push({
        severity: "error",
        code: "duplicate-tool-record",
        subject: `/tools/${tool.slug}`,
        message: `${matches.length} registry records claim this slug.`,
      });
    }
    recordBySlug.set(tool.slug, matches[0]);
  }

  // ── 2. Orphans: a record for a tool that no longer exists ────────────────
  for (const record of toolRecords) {
    if (!record.slug) {
      findings.push({
        severity: "error",
        code: "record-without-slug",
        subject: record.path,
        message: "Tool records must carry the catalogue slug they describe.",
      });
      continue;
    }
    if (!publishedSlugs.has(record.slug)) {
      findings.push({
        severity: "error",
        code: "orphaned-record",
        subject: record.path,
        message:
          "Registry record points at a slug that is not in the catalogue (renamed or removed tool).",
      });
    }
    if (record.path !== `/tools/${record.slug}`) {
      findings.push({
        severity: "error",
        code: "path-slug-mismatch",
        subject: record.path,
        message: `Path does not match slug: expected /tools/${record.slug}.`,
      });
    }
  }

  // ── 3. Category coverage ─────────────────────────────────────────────────
  for (const category of categoryMeta) {
    const publishedCount = tools.filter((tool) =>
      toolCategoriesOf(tool).includes(category.name),
    ).length;
    const record = categoryRecords.find(
      (candidate) => candidate.slug === category.slug,
    );
    if (!record) {
      findings.push({
        severity: "error",
        code: "missing-category-record",
        subject: `/category/${category.slug}`,
        message: "Category has no SEO registry record.",
      });
    }
    if (record && publishedCount === 0 && record.indexable) {
      findings.push({
        severity: "error",
        code: "empty-category-indexable",
        subject: `/category/${category.slug}`,
        message:
          "Category record is marked indexable but the category has no published tools (doorway risk).",
      });
    }
    if (record && publishedCount > 0 && !record.indexable) {
      findings.push({
        severity: "warning",
        code: "populated-category-noindex",
        subject: `/category/${category.slug}`,
        message:
          "Category has published tools but its record says not indexable — confirm this is deliberate.",
      });
    }
  }
  for (const record of categoryRecords) {
    if (!categoryMeta.some((category) => category.slug === record.slug)) {
      findings.push({
        severity: "error",
        code: "orphaned-category-record",
        subject: record.path,
        message:
          "Category record points at a slug that is not in the catalogue.",
      });
    }
  }

  // ── 4. Duplicates and near-duplicates ────────────────────────────────────
  const byTitle = new Map<string, string[]>();
  const byDescription = new Map<string, string[]>();
  const bySignature = new Map<string, string[]>();
  const byPrimary = new Map<string, string[]>();
  for (const record of toolRecords) {
    byTitle.set(normalise(record.title), [
      ...(byTitle.get(normalise(record.title)) ?? []),
      record.path,
    ]);
    byDescription.set(normalise(record.description), [
      ...(byDescription.get(normalise(record.description)) ?? []),
      record.path,
    ]);
    bySignature.set(titleSignature(record.title), [
      ...(bySignature.get(titleSignature(record.title)) ?? []),
      record.path,
    ]);
    byPrimary.set(normalise(record.primaryKeyword), [
      ...(byPrimary.get(normalise(record.primaryKeyword)) ?? []),
      record.path,
    ]);
  }
  for (const [title, paths] of byTitle) {
    if (paths.length > 1) {
      findings.push({
        severity: "error",
        code: "duplicate-title",
        subject: paths.join(", "),
        message: `Identical title: "${title}".`,
      });
    }
  }
  for (const [, paths] of byDescription) {
    if (paths.length > 1) {
      findings.push({
        severity: "error",
        code: "duplicate-description",
        subject: paths.join(", "),
        message: "Identical meta description on more than one route.",
      });
    }
  }
  for (const [, paths] of bySignature) {
    if (paths.length > 1) {
      findings.push({
        severity: "warning",
        code: "near-duplicate-title",
        subject: paths.join(", "),
        message:
          "These titles are the same words in a different order — a template, not distinct metadata.",
      });
    }
  }
  for (const [keyword, paths] of byPrimary) {
    if (paths.length > 1) {
      findings.push({
        severity: "error",
        code: "keyword-cannibalisation",
        subject: paths.join(", "),
        message: `Two routes claim the same primary keyword: "${keyword}".`,
      });
    }
  }

  // ── 5. Budgets, brand rules and keyword placement ────────────────────────
  const routes: RouteQuality[] = [];
  for (const record of toolRecords) {
    const rendered = record.title.length + " | QUICKKIT".length;
    if (record.title.length > TITLE_MAX_RAW) {
      findings.push({
        severity: "error",
        code: "title-over-budget",
        subject: record.path,
        message: `Title is ${record.title.length} chars; renders ${rendered} with the brand (limit ${TITLE_BUDGET}).`,
      });
    }
    if (/quickkit/i.test(record.title)) {
      findings.push({
        severity: "error",
        code: "title-repeats-brand",
        subject: record.path,
        message:
          "Title repeats the brand; the root layout template already appends it.",
      });
    }
    if (record.description.length < DESCRIPTION_MIN) {
      findings.push({
        severity: "warning",
        code: "description-short",
        subject: record.path,
        message: `Description is ${record.description.length} chars (target ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}).`,
      });
    }
    if (record.description.length > DESCRIPTION_MAX) {
      findings.push({
        severity: "error",
        code: "description-long",
        subject: record.path,
        message: `Description is ${record.description.length} chars; Google truncates past ${DESCRIPTION_MAX}.`,
      });
    }
    if (/quickkit/i.test(record.description)) {
      findings.push({
        severity: "info",
        code: "description-mentions-brand",
        subject: record.path,
        message:
          "Description names the brand inline; fine, but it spends snippet characters.",
      });
    }
    for (const variant of [record.title, ...record.alternativeTitles]) {
      if (variant.length > TITLE_MAX_RAW) {
        findings.push({
          severity: "warning",
          code: "alternative-title-over-budget",
          subject: record.path,
          message: `Alternative title is ${variant.length} chars (limit ${TITLE_MAX_RAW}): "${variant}".`,
        });
      }
    }
    if (record.alternativeDescription.length > DESCRIPTION_MAX) {
      findings.push({
        severity: "warning",
        code: "alternative-description-long",
        subject: record.path,
        message: `Alternative description is ${record.alternativeDescription.length} chars.`,
      });
    }
    const mentions = mentionsPrimaryKeyword(record);
    if (!mentions.title) {
      findings.push({
        severity: "warning",
        code: "primary-keyword-absent-from-title",
        subject: record.path,
        message: `Title does not contain the primary keyword "${record.primaryKeyword}".`,
      });
    }
    if (!mentions.description) {
      findings.push({
        severity: "info",
        code: "primary-keyword-absent-from-description",
        subject: record.path,
        message: `Description paraphrases rather than repeats "${record.primaryKeyword}" — acceptable when the title carries it.`,
      });
    }
    if (record.secondaryKeywords.length < 3) {
      findings.push({
        severity: "warning",
        code: "thin-keyword-cluster",
        subject: record.path,
        message: `${record.secondaryKeywords.length} secondary keywords; add the long-tail variants the page actually answers.`,
      });
    }
    if (record.internalLinks.length < 3) {
      findings.push({
        severity: "warning",
        code: "thin-internal-links",
        subject: record.path,
        message: `${record.internalLinks.length} curated internal targets; the page needs a crawlable path onward.`,
      });
    }
    if (!record.researchId) {
      findings.push({
        severity: "error",
        code: "missing-research-reference",
        subject: record.path,
        message: "Record has no researchId, so its reasoning is unverifiable.",
      });
    }
    if (!hasReferenceContent(record.slug!)) {
      findings.push({
        severity: "warning",
        code: "no-reference-content",
        subject: record.path,
        message:
          "No verified specifications/examples block is registered for this tool page.",
      });
    }
    routes.push({
      path: record.path,
      title: record.title,
      titleRenderedLength: rendered,
      description: record.description,
      descriptionLength: record.description.length,
      canonicalPath: record.path,
      indexable: record.indexable,
      hasReferenceContent: hasReferenceContent(record.slug!),
      primaryKeywordInTitle: mentions.title,
      primaryKeywordInDescription: mentions.description,
      internalLinkCount: record.internalLinks.length,
    });
  }

  // ── 6. Internal-link targets must be real routes ─────────────────────────
  const knownRoutes = new Set<string>([
    ...toolRecords.map((record) => record.path),
    ...categoryRecords.map((record) => record.path),
    ...legalPages.map((page) => page.href),
    "/",
    "/tools",
    "/help",
    "/sitemap",
    "/guides/barcode",
    "/security",
  ]);
  for (const record of [...toolRecords, ...categoryRecords]) {
    for (const target of record.internalLinks) {
      if (!knownRoutes.has(target)) {
        findings.push({
          severity: "error",
          code: "broken-internal-link-target",
          subject: record.path,
          message: `Curated internal link "${target}" is not a known route.`,
        });
      }
      if (target === record.path) {
        findings.push({
          severity: "error",
          code: "self-referential-link",
          subject: record.path,
          message: "Record lists itself as an internal target.",
        });
      }
    }
  }

  // ── 7. Category record quality ───────────────────────────────────────────
  for (const record of categoryRecords) {
    if (record.title.length > TITLE_MAX_RAW) {
      findings.push({
        severity: "error",
        code: "category-title-over-budget",
        subject: record.path,
        message: `Category title renders ${
          record.title.length + " | QUICKKIT".length
        } chars.`,
      });
    }
    if (/quickkit/i.test(record.title)) {
      findings.push({
        severity: "error",
        code: "category-title-repeats-brand",
        subject: record.path,
        message: "Category title repeats the brand.",
      });
    }
    if (
      record.description.length < DESCRIPTION_MIN ||
      record.description.length > DESCRIPTION_MAX
    ) {
      findings.push({
        severity: "warning",
        code: "category-description-budget",
        subject: record.path,
        message: `Category description is ${record.description.length} chars (target ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}).`,
      });
    }
  }
  for (const [title, paths] of Object.entries(
    categoryRecords.reduce<Record<string, string[]>>((acc, record) => {
      const key = normalise(record.title);
      acc[key] = [...(acc[key] ?? []), record.path];
      return acc;
    }, {}),
  )) {
    if (paths.length > 1) {
      findings.push({
        severity: "error",
        code: "duplicate-category-title",
        subject: paths.join(", "),
        message: `Two categories share the title "${title}".`,
      });
    }
  }

  // ── 8. Non-tool routes: hubs, guide, help and policy pages ───────────────
  // These 17 routes were the last metadata that lived inline in page
  // components. They are held to the same budget and uniqueness rules as the
  // tool records, but their descriptions are shorter by design (an index page
  // describes, it does not pitch), so the floor here is 100 rather than 140.
  const PAGE_DESCRIPTION_MIN = 100;
  const pageRecords = allPageSeoRecords();
  const knownPageRouteSet = new Set(pageRecords.map((record) => record.path));
  for (const route of ["/", "/tools", "/help", "/guides/barcode", "/sitemap"]) {
    if (!knownPageRouteSet.has(route)) {
      findings.push({
        severity: "error",
        code: "missing-page-record",
        subject: route,
        message: "Indexable route has no page-level SEO record.",
      });
    }
  }
  const pageTitles = new Map<string, string[]>();
  const pageDescriptions = new Map<string, string[]>();
  for (const record of pageRecords) {
    // `{count}` is substituted with the live published-tool count; the audit
    // uses the catalogue count because that is what the page will render.
    const title = fillToolCount(record.title, tools.length);
    const description = fillToolCount(record.description, tools.length);
    if (title.length > TITLE_MAX_RAW) {
      findings.push({
        severity: "error",
        code: "page-title-over-budget",
        subject: record.path,
        message: `Title is ${title.length} chars raw (limit ${TITLE_MAX_RAW} before " | QUICKKIT").`,
      });
    }
    if (/quickkit/i.test(record.title)) {
      findings.push({
        severity: "error",
        code: "page-title-repeats-brand",
        subject: record.path,
        message:
          "Title repeats the brand; the root template already appends it.",
      });
    }
    if (description.length > DESCRIPTION_MAX) {
      findings.push({
        severity: "error",
        code: "page-description-long",
        subject: record.path,
        message: `Description is ${description.length} chars; the snippet budget is ${DESCRIPTION_MAX}.`,
      });
    }
    if (description.length < PAGE_DESCRIPTION_MIN) {
      findings.push({
        severity: "warning",
        code: "page-description-short",
        subject: record.path,
        message: `Description is ${description.length} chars — thin for a page that has to state what it is.`,
      });
    }
    if (!record.researchId) {
      findings.push({
        severity: "error",
        code: "missing-research-reference",
        subject: record.path,
        message: "Page record has no researchId.",
      });
    }
    if (record.secondaryKeywords.length < 3) {
      findings.push({
        severity: "warning",
        code: "thin-keyword-cluster",
        subject: record.path,
        message: `${record.secondaryKeywords.length} secondary keywords on a page record.`,
      });
    }
    if (record.internalLinks.length < 3) {
      findings.push({
        severity: "warning",
        code: "thin-internal-links",
        subject: record.path,
        message: `${record.internalLinks.length} curated internal targets on a page record.`,
      });
    }
    pageTitles.set(normalise(title), [
      ...(pageTitles.get(normalise(title)) ?? []),
      record.path,
    ]);
    pageDescriptions.set(normalise(description), [
      ...(pageDescriptions.get(normalise(description)) ?? []),
      record.path,
    ]);
  }
  for (const [title, paths] of pageTitles) {
    if (paths.length > 1) {
      findings.push({
        severity: "error",
        code: "duplicate-title",
        subject: paths.join(", "),
        message: `Two page records share the title "${title}".`,
      });
    }
  }
  for (const [, paths] of pageDescriptions) {
    if (paths.length > 1) {
      findings.push({
        severity: "error",
        code: "duplicate-description",
        subject: paths.join(", "),
        message: "Two page records share a meta description.",
      });
    }
  }

  // A page record must not also be claimed by the tool or category registries:
  // two records for one route is how a canonical gets silently overwritten.
  for (const record of pageRecords) {
    if (
      toolRecords.some((tool) => tool.path === record.path) ||
      categoryRecords.some((category) => category.path === record.path)
    ) {
      findings.push({
        severity: "error",
        code: "route-claimed-twice",
        subject: record.path,
        message:
          "Route has both a page record and a tool/category record; only one may own the metadata.",
      });
    }
    for (const target of record.internalLinks) {
      const known =
        knownPageRouteSet.has(target) ||
        toolRecords.some((tool) => tool.path === target) ||
        categoryRecords.some((category) => category.path === target) ||
        legalPages.some((page) => page.href === target);
      if (!known) {
        findings.push({
          severity: "error",
          code: "broken-internal-link-target",
          subject: record.path,
          message: `Curated internal link "${target}" is not a known route.`,
        });
      }
      if (target === record.path) {
        findings.push({
          severity: "error",
          code: "self-referential-link",
          subject: record.path,
          message: "Page record lists itself as an internal target.",
        });
      }
    }
  }

  // ── 9. Summary statistics ────────────────────────────────────────────────
  const titleLengths = routes.map((route) => route.titleRenderedLength);
  const descriptionLengths = routes.map((route) => route.descriptionLength);
  const average = (values: number[]) =>
    values.length
      ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) /
        10
      : 0;
  const intentCounts = toolRecords.reduce<Record<string, number>>(
    (acc, record) => {
      acc[record.intent] = (acc[record.intent] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return {
    generatedFor: "QUICKKIT SEO registry",
    totals: {
      publishedTools: tools.length,
      toolRecords: toolRecords.length,
      categoryRecords: categoryRecords.length,
      indexableToolPaths: toolRecords.filter((record) => record.indexable)
        .length,
      indexableCategoryPaths: categoryRecords.filter(
        (record) => record.indexable,
      ).length,
      legalPages: legalPages.length,
      pageRecords: pageRecords.length,
    },
    findings,
    routes,
    categories: [...categoryRecords],
    titleLengths: {
      min: Math.min(...titleLengths),
      max: Math.max(...titleLengths),
      average: average(titleLengths),
    },
    descriptionLengths: {
      min: Math.min(...descriptionLengths),
      max: Math.max(...descriptionLengths),
      average: average(descriptionLengths),
    },
    intentCounts,
  };
}

export function errorsOf(report: SeoReport): Finding[] {
  return report.findings.filter((finding) => finding.severity === "error");
}

/** Markdown rendering used by `npm run seo:report` and the admin panel. */
export function renderSeoReportMarkdown(report: SeoReport): string {
  const errors = report.findings.filter((f) => f.severity === "error");
  const warnings = report.findings.filter((f) => f.severity === "warning");
  const info = report.findings.filter((f) => f.severity === "info");
  const lines: string[] = [
    "# QUICKKIT — metadata quality report",
    "",
    `Published tools: **${report.totals.publishedTools}** · tool records: **${report.totals.toolRecords}** · category records: **${report.totals.categoryRecords}**`,
    `Indexable tool paths: **${report.totals.indexableToolPaths}** · indexable categories: **${report.totals.indexableCategoryPaths}** · page records: **${report.totals.pageRecords}**`,
    "",
    `Tool title length (rendered): min ${report.titleLengths.min}, max ${report.titleLengths.max}, average ${report.titleLengths.average} (budget ${TITLE_BUDGET})`,
    `Tool description length: min ${report.descriptionLengths.min}, max ${report.descriptionLengths.max}, average ${report.descriptionLengths.average} (target ${DESCRIPTION_MIN}–${DESCRIPTION_MAX}). Page descriptions are reported per route below.`,
    "",
    `Search intent mix: ${Object.entries(report.intentCounts)
      .map(([intent, count]) => `${intent} ${count}`)
      .join(" · ")}`,
    "",
    `Findings: **${errors.length} errors**, ${warnings.length} warnings, ${info.length} notes.`,
    "",
  ];
  const section = (label: string, items: Finding[]) => {
    if (items.length === 0) return;
    lines.push(`## ${label}`, "");
    for (const finding of items) {
      lines.push(
        `- \`${finding.code}\` — **${finding.subject}**: ${finding.message}`,
      );
    }
    lines.push("");
  };
  section("Errors", errors);
  section("Warnings", warnings);
  section("Notes", info);
  lines.push(
    "> This report describes metadata and architecture only. It contains no impressions, clicks, ranking positions or traffic: those are Search Console measurements and are never estimated here.",
    "",
  );
  return lines.join("\n");
}
