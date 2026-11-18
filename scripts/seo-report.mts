/**
 * `npm run seo:report`
 *
 * Prints the metadata quality report for the whole registry and exits non-zero
 * when the audit finds an error, so the same rules gate CI and local work.
 *
 * Run through tsx (`npm run seo:report`) because the registry uses the `@/`
 * path alias that Node's own resolver does not know about.
 *
 * The report is architecture and copy only. It contains no impressions, clicks,
 * ranking positions or traffic: those are Search Console measurements and are
 * never estimated here.
 */
import {
  buildSeoReport,
  renderSeoReportMarkdown,
  errorsOf,
} from "../lib/seo/audit";
import { allToolSeoRecords } from "../lib/seo/resolve";
import {
  auditKeywordClusters,
  keywordClusters,
  keywordsFor,
} from "../lib/seo/keyword-clusters";

const report = buildSeoReport();
process.stdout.write(renderSeoReportMarkdown(report) + "\n");

const errors = errorsOf(report);

// ── Keyword clusters ───────────────────────────────────────────────────────
// The cluster layer is what lets one page answer twenty-odd phrasings without
// repeating itself in the visible copy. It is gated here so a tool added
// without a cluster, or a keyword claimed by two tools, fails CI.
const records = allToolSeoRecords();
const keywordFindings = auditKeywordClusters({
  registrySlugs: records.map((record) => record.slug),
  registryPrimary: Object.fromEntries(
    records.map((record) => [record.slug, record.primaryKeyword]),
  ),
  registrySecondary: Object.fromEntries(
    records.map((record) => [record.slug, record.secondaryKeywords]),
  ),
});
const keywordErrors = keywordFindings.filter(
  (finding) => finding.severity === "error",
);
const counts = keywordClusters.map((cluster) => keywordsFor(cluster).length);
const total = counts.reduce((sum, count) => sum + count, 0);

process.stdout.write(
  [
    "",
    "## Keyword clusters",
    "",
    `- Tools with a cluster: **${keywordClusters.length}**`,
    `- Total keyword targets mapped: **${total}**`,
    `- Per tool: min **${Math.min(...counts)}**, max **${Math.max(...counts)}**, mean **${(total / counts.length).toFixed(1)}**`,
    `- Findings: **${keywordErrors.length} error(s)**, ${keywordFindings.length - keywordErrors.length} note(s)`,
    "",
    ...keywordFindings.map(
      (finding) =>
        `- \`${finding.code}\` — **${finding.subject}**: ${finding.message}`,
    ),
  ].join("\n") + "\n",
);

if (errors.length > 0 || keywordErrors.length > 0) {
  process.stderr.write(
    `SEO audit failed: ${errors.length} metadata error(s), ${keywordErrors.length} keyword error(s). See the report above.\n`,
  );
  process.exitCode = 1;
}
