import { PageHeading } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin.module.css";

export default function AdminAnalyticsPage() {
  const configured = Boolean(process.env.ANALYTICS_DATABASE_URL?.trim());
  const tokenConfigured = Boolean(process.env.ANALYTICS_DATABASE_TOKEN?.trim());
  const sourceReady = configured && tokenConfigured;

  return (
    <>
      <PageHeading
        title="Analytics"
        description="Privacy-conscious first-party visitor totals. Metrics are shown only when a supported source can be read safely."
      />
      <section
        className={styles["admin-analytics-state"]}
        aria-labelledby="analytics-state-title"
      >
        <span className={styles["admin-analytics-mark"]} aria-hidden="true">
          ⌁
        </span>
        <span className={styles["admin-kicker"]}>INTEGRATION STATUS</span>
        <h3 id="analytics-state-title">
          {sourceReady
            ? "Analytics source configured"
            : "Analytics not configured"}
        </h3>
        {!sourceReady ? (
          <p>
            No visitor counts, usage charts, or trends are available. Provision
            the existing optional first-party analytics source and its
            server-only credentials through the owner-controlled deployment
            process to enable reporting. Secret values are never displayed here.
          </p>
        ) : (
          <p>
            Server-side analytics configuration is present. Live metrics are not
            queried from this panel: the current visitor-stats reader may
            initialize its libSQL tables on first access. Avoiding that call
            preserves the no-write boundary. A separately reviewed read-only
            reporting query is required before metrics can be shown.
          </p>
        )}
        <div className={styles["admin-analytics-flags"]}>
          <span>
            <i
              className={
                sourceReady
                  ? styles["admin-status-dot--good"]
                  : styles["admin-status-dot--neutral"]
              }
            />
            Database URL{" "}
            {configured ? "present (value hidden)" : "not configured"}
          </span>
          <span>
            <i
              className={
                sourceReady
                  ? styles["admin-status-dot--good"]
                  : styles["admin-status-dot--neutral"]
              }
            />
            Access token{" "}
            {tokenConfigured ? "present (value hidden)" : "not configured"}
          </span>
        </div>
        <p className={styles["admin-panel-footnote"]}>
          This integration currently supports aggregate unique visitors and
          average active time only. It does not record tool-level usage,
          browser/device breakdowns, revenue, or failures.
        </p>
      </section>
    </>
  );
}
