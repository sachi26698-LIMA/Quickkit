import Link from "next/link";
import {
  ArrowUpRight,
  Inbox,
  Layers3,
  MessageSquare,
  Settings2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { PageHeading } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin.module.css";
import { getOverviewSnapshot } from "@/lib/supabase/admin-data";

const quickActions = [
  {
    href: "/admin/tools",
    label: "Manage tools",
    note: "Catalog visibility and metadata",
    icon: Wrench,
  },
  {
    href: "/admin/categories",
    label: "Organize categories",
    note: "Descriptions and public order",
    icon: Layers3,
  },
  {
    href: "/admin/submissions",
    label: "Review submissions",
    note: "Private contact inbox",
    icon: Inbox,
  },
  {
    href: "/admin/site-settings",
    label: "Edit site content",
    note: "Supported public settings",
    icon: Settings2,
  },
];

export default async function AdminOverviewPage() {
  const snapshot = await getOverviewSnapshot();
  return (
    <>
      <PageHeading
        title="Good to see you."
        description="Your QUICKKIT workspace at a glance. Counts are loaded from the connected catalog and private database; unavailable data is never replaced with estimates."
      />
      {!snapshot.connected ? (
        <div
          className={`${styles["admin-state"]} ${styles["admin-state--warn"]}`}
          role="status"
        >
          <strong>Workspace data unavailable</strong>
          <p>
            Verified dashboard totals require the server-side Supabase
            connection and existing Admin tables. No placeholder totals are
            displayed.
          </p>
          <Link className={styles["admin-link"]} href="/admin/security">
            Review configuration status →
          </Link>
        </div>
      ) : (
        <>
          <section
            className={styles["admin-overview-hero"]}
            aria-label="Workspace status"
          >
            <div>
              <span className={styles["admin-kicker"]}>WORKSPACE OVERVIEW</span>
              <h3>Everything in one place.</h3>
              <p>Live catalog and inbox totals, checked on this page load.</p>
            </div>
            <div className={styles["admin-live-mark"]}>
              <i aria-hidden="true" />
              Live data connected
            </div>
          </section>

          <section
            className={styles["admin-grid"]}
            aria-label="Live QUICKKIT totals"
          >
            <Stat
              label="Published tools"
              value={snapshot.published_tools}
              note={`${snapshot.total_tools} catalog tools`}
              icon={Wrench}
              accent="plum"
            />
            <Stat
              label="Unpublished tools"
              value={snapshot.unpublished_tools}
              note="Hidden from the public catalog"
              icon={Wrench}
              accent="rose"
            />
            <Stat
              label="Categories"
              value={snapshot.total_categories}
              note={`${snapshot.published_categories} published`}
              icon={Layers3}
              accent="coral"
            />
            <Stat
              label="Contact messages"
              value={snapshot.contact_count}
              note="Private inbox records"
              icon={Inbox}
              accent="blush"
            />
            <Stat
              label="Feedback"
              value={snapshot.feedback_count}
              note="Private visitor submissions"
              icon={MessageSquare}
              accent="rose"
            />
          </section>

          <div className={styles["admin-overview-columns"]}>
            <section
              className={styles["admin-panel"]}
              aria-labelledby="category-distribution-heading"
            >
              <div className={styles["admin-panel-heading"]}>
                <div>
                  <span className={styles["admin-kicker"]}>CATALOG</span>
                  <h3 id="category-distribution-heading">Tools by category</h3>
                </div>
                <Link className={styles["admin-link"]} href="/admin/categories">
                  View categories <span aria-hidden="true">→</span>
                </Link>
              </div>
              {snapshot.category_distribution.length ? (
                <div className={styles["admin-distribution"]}>
                  {snapshot.category_distribution.map((category) => {
                    const width = snapshot.total_tools
                      ? Math.round(
                          (category.count / snapshot.total_tools) * 100,
                        )
                      : 0;
                    return (
                      <div
                        className={styles["admin-distribution-row"]}
                        key={category.slug}
                      >
                        <div className={styles["admin-distribution-label"]}>
                          <span>{category.name}</span>
                          <strong>{category.count}</strong>
                        </div>
                        <div
                          className={styles["admin-meter"]}
                          role="img"
                          aria-label={`${category.name}: ${category.count} tools`}
                        >
                          <span style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles["admin-empty"]}>
                  <strong>No category data</strong>There are no catalog
                  categories to display.
                </div>
              )}
              <p className={styles["admin-panel-footnote"]}>
                Counts come from the current tool catalog and supported category
                overrides.
              </p>
            </section>

            <section
              className={styles["admin-panel"]}
              aria-labelledby="system-health-heading"
            >
              <div className={styles["admin-panel-heading"]}>
                <div>
                  <span className={styles["admin-kicker"]}>HEALTH</span>
                  <h3 id="system-health-heading">System status</h3>
                </div>
                <Link className={styles["admin-link"]} href="/admin/security">
                  Security center →
                </Link>
              </div>
              <StatusRow
                label="Admin data service"
                value="Connected"
                tone="good"
              />
              <StatusRow
                label="Analytics integration"
                value="Not configured"
                tone="neutral"
              />
              <StatusRow
                label="RLS verification"
                value="Review required"
                tone="warn"
              />
              <StatusRow
                label="Content timestamps"
                value="Not recorded"
                tone="neutral"
              />
              <p className={styles["admin-panel-footnote"]}>
                Connection indicates successful Admin reads, not an independent
                RLS policy audit. Last-edited timestamps are not stored for
                catalog overrides.
              </p>
            </section>
          </div>

          <section className={styles["admin-overview-columns"]}>
            <div className={styles["admin-panel"]}>
              <div className={styles["admin-panel-heading"]}>
                <div>
                  <span className={styles["admin-kicker"]}>SHORTCUTS</span>
                  <h3>Quick actions</h3>
                </div>
              </div>
              <div className={styles["admin-quick-grid"]}>
                {quickActions.map((item) => (
                  <Link
                    className={styles["admin-quick-card"]}
                    href={item.href}
                    key={item.href}
                  >
                    <span
                      className={styles["admin-quick-icon"]}
                      aria-hidden="true"
                    >
                      <item.icon size={17} strokeWidth={1.8} />
                    </span>
                    <span>
                      <strong>{item.label}</strong>
                      <small>{item.note}</small>
                    </span>
                    <span
                      className={styles["admin-quick-arrow"]}
                      aria-hidden="true"
                    >
                      <ArrowUpRight size={15} />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <div className={styles["admin-panel"]}>
              <div className={styles["admin-panel-heading"]}>
                <div>
                  <span className={styles["admin-kicker"]}>AUDIT TRAIL</span>
                  <h3>Recent activity</h3>
                </div>
                <Link className={styles["admin-link"]} href="/admin/activity">
                  Full log →
                </Link>
              </div>
              {snapshot.activity.length ? (
                <ol className={styles["admin-timeline"]}>
                  {snapshot.activity.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <span
                        className={styles["admin-timeline-dot"]}
                        aria-hidden="true"
                      />
                      <div>
                        <strong>{item.action.replaceAll("_", " ")}</strong>
                        <p>
                          {item.entity_type}
                          {item.entity_id ? ` · ${item.entity_id}` : ""}
                        </p>
                        <small>
                          {item.actor_email} ·{" "}
                          {new Date(item.created_at).toLocaleString()}
                        </small>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className={styles["admin-empty"]}>
                  <strong>No activity yet</strong>Successful Admin changes
                  appear here. No events have been recorded.
                </div>
              )}
            </div>
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
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  note: string;
  icon: LucideIcon;
  accent: string;
}) {
  const Icon = icon;
  return (
    <article
      className={`${styles["admin-stat-card"]} ${styles[`admin-stat-card--${accent}`]}`}
    >
      <span className={styles["admin-stat-icon"]} aria-hidden="true">
        <Icon size={17} strokeWidth={1.8} />
      </span>
      <h3>{label}</h3>
      <div className={styles["admin-stat"]}>{value.toLocaleString()}</div>
      <div className={styles["admin-stat-note"]}>{note}</div>
    </article>
  );
}

function StatusRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}) {
  return (
    <div className={styles["admin-status-row"]}>
      <span>
        <i className={styles[`admin-status-dot--${tone}`]} aria-hidden="true" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
