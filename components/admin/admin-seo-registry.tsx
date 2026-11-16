import { AlertTriangle, CheckCircle2, FileSearch, Info } from "lucide-react";
import styles from "@/components/admin/admin.module.css";
import { buildSeoReport } from "@/lib/seo/audit";

/**
 * Registry quality panel for Admin → SEO.
 *
 * This renders `buildSeoReport()` — the same audit the CI test and
 * `npm run seo:report` use — so the operator sees exactly what the build sees.
 * It is a server component: the registry is static data, so there is no request
 * to make and no client JavaScript to ship.
 *
 * Everything shown here is derived from the code and the catalogue. It contains
 * no impressions, clicks, ranking positions, CTR or traffic, because those are
 * Search Console measurements and this panel has no authorised Search Console
 * integration to read them from. The panel says so rather than approximating.
 */
export default function AdminSeoRegistry() {
  const report = buildSeoReport();
  const errors = report.findings.filter((f) => f.severity === "error");
  const warnings = report.findings.filter((f) => f.severity === "warning");
  const notes = report.findings.filter((f) => f.severity === "info");
  const indexableTools = report.routes.filter(
    (route) => route.indexable,
  ).length;
  const withReference = report.routes.filter(
    (route) => route.hasReferenceContent,
  ).length;

  const groups = [
    { key: "error", label: "Errors", tone: "rose", items: errors },
    { key: "warning", label: "Warnings", tone: "amber", items: warnings },
    { key: "info", label: "Notes", tone: "teal", items: notes },
  ] as const;

  return (
    <section
      className={styles["admin-section"]}
      aria-labelledby="seo-registry-title"
    >
      <div className={styles["admin-section-head"]}>
        <h3 id="seo-registry-title">Metadata registry audit</h3>
        <p>
          Computed from the shipped registry (<code>lib/seo/</code>) and the
          catalogue at render time — the same rules the test suite and{" "}
          <code>npm run seo:report</code> enforce. It reports metadata quality
          and architecture only.
        </p>
      </div>

      <div
        className={styles["admin-seo-summary"]}
        aria-label="Registry summary"
      >
        <div>
          <strong>{report.totals.toolRecords}</strong>
          <span>tool records</span>
        </div>
        <div>
          <strong>{report.totals.categoryRecords}</strong>
          <span>category records</span>
        </div>
        <div>
          <strong>{indexableTools}</strong>
          <span>indexable tool routes</span>
        </div>
        <div>
          <strong>{withReference}</strong>
          <span>with verified reference content</span>
        </div>
        <p>
          Rendered title length: {report.titleLengths.min}–
          {report.titleLengths.max} characters (average{" "}
          {report.titleLengths.average}, budget 60). Description length:{" "}
          {report.descriptionLengths.min}–{report.descriptionLengths.max}{" "}
          (average {report.descriptionLengths.average}).{" "}
          {errors.length === 0
            ? "No structural errors: every published tool has exactly one unique, budgeted record."
            : `${errors.length} structural error(s) need attention before this build is published.`}
        </p>
      </div>

      {groups.map((group) => (
        <div
          key={group.key}
          className={styles["admin-seo-findings"]}
          aria-label={`${group.label}: ${group.items.length}`}
        >
          <h4 className={styles["admin-seo-findings-head"]}>
            {group.key === "error" ? (
              <AlertTriangle size={15} aria-hidden="true" />
            ) : group.key === "warning" ? (
              <FileSearch size={15} aria-hidden="true" />
            ) : group.key === "info" ? (
              <Info size={15} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={15} aria-hidden="true" />
            )}
            {group.label} <span>({group.items.length})</span>
          </h4>
          {group.items.length === 0 ? (
            <p className={styles["admin-seo-findings-empty"]}>
              None.{" "}
              {group.key === "error"
                ? "The registry is structurally clean."
                : ""}
            </p>
          ) : (
            <ul className={styles["admin-seo-findings-list"]}>
              {group.items.slice(0, 12).map((finding) => (
                <li key={`${finding.code}-${finding.subject}`}>
                  <code>{finding.code}</code>
                  <span>
                    <strong>{finding.subject}</strong> — {finding.message}
                  </span>
                </li>
              ))}
              {group.items.length > 12 ? (
                <li>
                  <span>
                    …and {group.items.length - 12} more. Run{" "}
                    <code>npm run seo:report</code> for the complete list.
                  </span>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ))}

      <p className={styles["admin-card-note"]}>
        No impressions, clicks, ranking positions, CTR or traffic are shown
        here. Those figures come from Google Search Console, and no authorised
        Search Console integration is configured — so this panel does not
        estimate them.
      </p>
    </section>
  );
}
