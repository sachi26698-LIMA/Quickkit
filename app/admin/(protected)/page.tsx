import Link from "next/link";
import { PageHeading } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin.module.css";
import { getOverviewSnapshot } from "@/lib/supabase/admin-data";

export default async function AdminOverviewPage() {
  const snapshot = await getOverviewSnapshot();
  return (
    <>
      <PageHeading
        title="Overview"
        description="Live catalog, inbox and administrative status. Only verified database values are shown."
      />
      {!snapshot.connected ? (
        <div
          className={`${styles["admin-state"]} ${styles["admin-state--warn"]}`}
          role="status"
        >
          Admin data is unavailable. The dashboard will show verified counts
          after server-side Supabase configuration and database connectivity are
          restored; no placeholder totals are displayed.
        </div>
      ) : (
        <>
          <section
            className={styles["admin-grid"]}
            aria-label="Live QUICKKIT totals"
          >
            <Stat
              label="Active tools"
              value={snapshot.active_tools}
              note={`${snapshot.total_tools} catalog records`}
            />
            <Stat
              label="Categories"
              value={snapshot.total_categories}
              note={`${snapshot.published_categories} published`}
            />
            <Stat
              label="Published / unpublished"
              value={`${snapshot.published_tools} / ${snapshot.unpublished_tools}`}
              note="From tool catalog and admin overrides"
            />
            <Stat
              label="Contact submissions"
              value={snapshot.contact_count}
              note="Private database records"
            />
            <Stat
              label="Feedback submissions"
              value={snapshot.feedback_count}
              note="Private database records"
            />
          </section>
          <section className={styles["admin-section"]}>
            <h3>Recent admin activity</h3>
            {snapshot.activity.length === 0 ? (
              <div className={styles["admin-empty"]}>
                <strong>No activity logged yet</strong>Actions appear here after
                the first successful administrator change.
              </div>
            ) : (
              <div className={styles["admin-table-wrap"]}>
                <table className={styles["admin-table"]}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Administrator</th>
                      <th>Action</th>
                      <th>Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.activity.map((item) => (
                      <tr key={item.id}>
                        <td>{new Date(item.created_at).toLocaleString()}</td>
                        <td>{item.actor_email}</td>
                        <td>{item.action}</td>
                        <td>
                          {item.entity_type}
                          {item.entity_id ? ` · ${item.entity_id}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <section className={styles["admin-section"]}>
            <h3>System status</h3>
            <div className={styles["admin-detail-grid"]}>
              <div className={styles["admin-card"]}>
                <strong>Database</strong>
                <p>
                  <span
                    className={
                      styles["admin-badge"] + " " + styles["admin-badge--green"]
                    }
                  >
                    Connected
                  </span>
                </p>
              </div>
              <div className={styles["admin-card"]}>
                <strong>Analytics</strong>
                <p>Not configured</p>
              </div>
              <div className={styles["admin-card"]}>
                <strong>Latest website changes</strong>
                <p>
                  Tracked through admin activity; no release feed is configured.
                </p>
              </div>
              <div className={styles["admin-card"]}>
                <strong>Supabase RLS</strong>
                <p>
                  Inspect migration status in Security. The app does not claim
                  an independent RLS catalog check.
                </p>
              </div>
            </div>
          </section>
          <section className={styles["admin-section"]}>
            <h3>Quick access</h3>
            <p>
              <Link className={styles["admin-link"]} href="/admin/tools">
                Manage tool metadata
              </Link>{" "}
              ·{" "}
              <Link className={styles["admin-link"]} href="/admin/submissions">
                Open submissions
              </Link>{" "}
              ·{" "}
              <Link className={styles["admin-link"]} href="/admin/feedback">
                Review feedback
              </Link>
            </p>
          </section>
        </>
      )}
    </>
  );
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number | string;
  note: string;
}) {
  return (
    <article className={styles["admin-card"]}>
      <h3>{label}</h3>
      <div className={styles["admin-stat"]}>{value}</div>
      <div className={styles["admin-stat-note"]}>{note}</div>
    </article>
  );
}
