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
import { getServerErrorMonitoringStatus } from "@/lib/monitoring/error-store";
import { getOverviewSnapshot } from "@/lib/supabase/admin-data";
import { describeSystemHealth } from "@/lib/system-health-labels";

export default async function AdminAnalyticsPage() {
  const snapshot = await getOverviewSnapshot();
  const system = snapshot.connected ? snapshot.health?.system : undefined;
  const analytics = system?.analytics;
  const labels = describeSystemHealth(system);
  const errorMonitoring = getServerErrorMonitoringStatus();
  const store =
    analytics?.backend === "libsql"
      ? "a libSQL database"
      : analytics?.backend === "supabase"
        ? "this site's Supabase project"
        : "no database";

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
                {analytics?.ready
                  ? "Visitor statistics connected"
                  : analytics?.backend
                    ? "Visitor statistics database not ready"
                    : "Visitor analytics not configured"}
              </h3>
            </div>
          </div>

          {analytics?.ready ? (
            <p>
              These are the same totals the homepage laptop graph shows, read
              from {store} just now. Only browsers that chose “Allow anonymous
              visitor statistics” are counted, so this is a floor, not a
              measurement of all traffic.
            </p>
          ) : analytics?.backend ? (
            <p>
              The visitor counter is set to use {store}, but a read did not
              succeed. {labels.analytics.detail}
            </p>
          ) : (
            <p>
              No visitor counts, usage charts, or traffic trends are available.
              Connect the Supabase server credentials (or an optional libSQL
              database) through the owner-controlled deployment process to
              enable aggregate reporting. Secret values are never displayed
              here.
            </p>
          )}

          <div className={styles["admin-analytics-flags"]}>
            <span>
              <i
                className={
                  analytics?.ready
                    ? styles["admin-health-dot--good"]
                    : styles["admin-health-dot--neutral"]
                }
                aria-hidden="true"
              />
              <Database size={13} aria-hidden="true" />
              Opted-in visitors{" "}
              <strong>
                {analytics?.ready
                  ? analytics.visitors.toLocaleString("en")
                  : "unavailable"}
              </strong>
            </span>
            <span>
              <i
                className={
                  analytics?.ready
                    ? styles["admin-health-dot--good"]
                    : styles["admin-health-dot--neutral"]
                }
                aria-hidden="true"
              />
              <Activity size={13} aria-hidden="true" />
              Online now{" "}
              <strong>
                {analytics?.ready
                  ? analytics.online.toLocaleString("en")
                  : "unavailable"}
              </strong>
            </span>
            <span>
              <i
                className={
                  analytics?.ready
                    ? styles["admin-health-dot--good"]
                    : styles["admin-health-dot--neutral"]
                }
                aria-hidden="true"
              />
              <ShieldCheck size={13} aria-hidden="true" />
              Counting since{" "}
              <strong>
                {analytics?.ready && analytics.since
                  ? analytics.since.slice(0, 10)
                  : "unavailable"}
              </strong>
            </span>
          </div>

          <p className={styles["admin-panel-footnote"]}>
            The optional visitor-stats schema supports aggregate unique visitors
            and average active time only. It does not track tool-level usage,
            browser/device breakdowns or revenue.
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
                  <h3>Telemetry boundaries</h3>
                  <p className={styles["admin-panel-subtitle"]}>
                    What is and is not collected
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
                    Application error monitoring ({labels.errorMonitoring.value}
                    )
                  </strong>
                  <p>
                    {errorMonitoring.enabled
                      ? `${labels.errorMonitoring.detail} Events carry the error type, a scrubbed message and the route; never tool input, files, cookies or IP addresses.`
                      : "Safe opt-in error reporting is prepared and remains off until ERROR_MONITORING_ENABLED=true is set. Nothing is collected while it is off."}
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
