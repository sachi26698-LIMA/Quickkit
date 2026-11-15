import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Database,
  Layers3,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { CategoryDonutChart } from "@/components/admin/admin-charts";
import { PageHeading } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin.module.css";
import { getErrorMonitoringStatus } from "@/lib/monitoring/error-reporter";
import { getOverviewSnapshot } from "@/lib/supabase/admin-data";

export default async function AdminAnalyticsPage() {
  const configured = Boolean(process.env.ANALYTICS_DATABASE_URL?.trim());
  const tokenConfigured = Boolean(process.env.ANALYTICS_DATABASE_TOKEN?.trim());
  const sourceReady = configured && tokenConfigured;
  const errorMonitoring = getErrorMonitoringStatus();
  const snapshot = await getOverviewSnapshot();

  return (
    <>
      <PageHeading
        title="Analytics & telemetry"
        description="Honest operational reporting from verified sources. Missing integrations remain explicitly unavailable without synthetic estimates."
      />

      <div className={styles["admin-settings-stack"]}>
        <section
          className={styles["admin-analytics-state"]}
          aria-labelledby="analytics-state-title"
        >
          <div className={styles["admin-analytics-head"]}>
            <span className={styles["admin-analytics-mark"]} aria-hidden="true">
              <BarChart3 size={22} />
            </span>
            <div>
              <span className={styles["admin-kicker"]}>
                FIRST-PARTY VISITOR ANALYTICS
              </span>
              <h3 id="analytics-state-title">
                {sourceReady
                  ? "Analytics source detected · read-only query required"
                  : "Visitor analytics not configured"}
              </h3>
            </div>
          </div>

          {!sourceReady ? (
            <p>
              No visitor counts, usage charts, or traffic trends are available.
              Provision the optional first-party analytics database and its
              server-only credentials through the owner-controlled deployment
              process to enable aggregate reporting. Secret values are never
              displayed here.
            </p>
          ) : (
            <p>
              Server-side analytics credentials are present. Metrics are not
              queried directly from this screen because the existing
              visitor-stats helper initializes tables on first access. Avoiding
              that call preserves the read-only Admin boundary until a dedicated
              read-only query path is reviewed.
            </p>
          )}

          <div className={styles["admin-analytics-flags"]}>
            <span>
              <i
                className={
                  configured
                    ? styles["admin-health-dot--good"]
                    : styles["admin-health-dot--neutral"]
                }
                aria-hidden="true"
              />
              <Database size={13} aria-hidden="true" />
              Database URL{" "}
              <strong>
                {configured ? "present (value hidden)" : "not configured"}
              </strong>
            </span>
            <span>
              <i
                className={
                  tokenConfigured
                    ? styles["admin-health-dot--good"]
                    : styles["admin-health-dot--neutral"]
                }
                aria-hidden="true"
              />
              <ShieldCheck size={13} aria-hidden="true" />
              Access token{" "}
              <strong>
                {tokenConfigured ? "present (value hidden)" : "not configured"}
              </strong>
            </span>
          </div>

          <p className={styles["admin-panel-footnote"]}>
            The optional visitor-stats schema supports aggregate unique visitors
            and average active time only. It does not track tool-level usage,
            browser/device breakdowns, revenue, or client failures.
          </p>
        </section>

        <div className={styles["admin-analytics-grid"]}>
          <section className={styles["admin-panel"]}>
            <div className={styles["admin-panel-heading"]}>
              <div className={styles["admin-panel-title-group"]}>
                <span
                  className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
                  aria-hidden="true"
                >
                  <Layers3 size={15} />
                </span>
                <div>
                  <h3>Verified catalog distribution</h3>
                  <p className={styles["admin-panel-subtitle"]}>
                    Real tool counts by category from Supabase
                  </p>
                </div>
              </div>
              <Link className={styles["admin-link"]} href="/admin/categories">
                Categories <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            </div>
            {snapshot.connected && snapshot.category_distribution.length ? (
              <CategoryDonutChart
                data={snapshot.category_distribution}
                total={snapshot.total_tools}
              />
            ) : (
              <div className={styles["admin-empty"]}>
                <strong>Catalog totals unavailable</strong>
                Configure Supabase server access to inspect category counts.
              </div>
            )}
          </section>

          <section className={styles["admin-panel"]}>
            <div className={styles["admin-panel-heading"]}>
              <div className={styles["admin-panel-title-group"]}>
                <span
                  className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--rose"]}`}
                  aria-hidden="true"
                >
                  <AlertCircle size={15} />
                </span>
                <div>
                  <h3>Uninstrumented telemetry boundaries</h3>
                  <p className={styles["admin-panel-subtitle"]}>
                    Explicitly uncollected by design
                  </p>
                </div>
              </div>
            </div>
            <div className={styles["admin-boundary-list"]}>
              <div className={styles["admin-boundary-item"]}>
                <Wrench size={16} aria-hidden="true" />
                <div>
                  <strong>Per-tool execution metrics</strong>
                  <p>
                    All QUICKKIT browser utilities run locally without sending
                    tool usage events to a central tracker.
                  </p>
                </div>
              </div>
              <div className={styles["admin-boundary-item"]}>
                <Activity size={16} aria-hidden="true" />
                <div>
                  <strong>
                    Application error monitoring ({errorMonitoring.statusLabel})
                  </strong>
                  <p>
                    {errorMonitoring.configured
                      ? "Opt-in sanitized error boundary hook is configured without logging tokens or visitor inputs."
                      : "Safe opt-in error boundaries are prepared and remain disabled until ERROR_MONITORING_ENABLED=true and a valid HTTPS DSN are configured by the owner."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
