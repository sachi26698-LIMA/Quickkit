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

const report = buildSeoReport();
process.stdout.write(renderSeoReportMarkdown(report) + "\n");

const errors = errorsOf(report);
if (errors.length > 0) {
  process.stderr.write(
    `SEO audit failed: ${errors.length} error(s). See the report above.\n`,
  );
  process.exitCode = 1;
}
