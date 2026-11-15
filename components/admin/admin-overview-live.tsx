"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Eye,
  EyeOff,
  Inbox,
  Layers3,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminIdentityContext } from "./admin-shell";
import styles from "./admin.module.css";

type Activity = {
  id: string | number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

type Snapshot = {
  connected: true;
  total_tools: number;
  active_tools: number;
  published_tools: number;
  unpublished_tools: number;
  total_categories: number;
  published_categories: number;
  contact_count: number;
  feedback_count: number;
  category_distribution: { slug: string; name: string; count: number }[];
  activity: Activity[];
};

type InitialSnapshot = Snapshot | { connected: false };
type WidgetId = "metrics" | "catalog" | "health" | "activity" | "shortcuts";

const defaultOrder: WidgetId[] = [
  "metrics",
  "catalog",
  "health",
  "shortcuts",
  "activity",
];
const widgetLabels: Record<WidgetId, string> = {
  metrics: "Executive metrics",
  catalog: "Category distribution",
  health: "Operational health",
  activity: "Recent activity",
  shortcuts: "Quick actions",
};
const actions = [
  { href: "/admin/tools", label: "Manage tool metadata", icon: Wrench },
  { href: "/admin/categories", label: "Manage categories", icon: Layers3 },
  { href: "/admin/submissions", label: "Review submissions", icon: Inbox },
  { href: "/admin/feedback", label: "Review feedback", icon: MessageSquare },
  {
    href: "/admin/site-settings",
    label: "Edit supported site content",
    icon: Settings2,
  },
  { href: "/admin/seo", label: "Manage SEO", icon: ArrowUpRight },
  { href: "/admin/security", label: "Open security center", icon: ShieldCheck },
];

function isSnapshot(value: unknown): value is Snapshot {
  return (
    !!value &&
    typeof value === "object" &&
    "connected" in value &&
    value.connected === true &&
    typeof (value as Snapshot).total_tools === "number" &&
    Array.isArray((value as Snapshot).category_distribution) &&
    Array.isArray((value as Snapshot).activity)
  );
}

function Stat({
  label,
  value,
  note,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  note: string;
  icon: LucideIcon;
  href: string;
}) {
  return (
    <Link className={styles["admin-stat-card"]} href={href}>
      <span className={styles["admin-stat-icon"]} aria-hidden="true">
        <Icon size={17} />
      </span>
      <h3>{label}</h3>
      <div className={styles["admin-stat"]}>{value.toLocaleString()}</div>
      <div className={styles["admin-stat-note"]}>{note}</div>
      <span className={styles["admin-stat-link"]} aria-hidden="true">
        View module <ArrowUpRight size={13} />
      </span>
    </Link>
  );
}

function EmptyMetric({
  label,
  reason,
  href,
}: {
  label: string;
  reason: string;
  href: string;
}) {
  return (
    <article
      className={`${styles["admin-stat-card"]} ${styles["admin-stat-card--unavailable"]}`}
    >
      <h3>{label}</h3>
      <strong>Not available</strong>
      <p>{reason}</p>
      <Link className={styles["admin-link"]} href={href}>
        Review setup <ArrowUpRight size={13} />
      </Link>
    </article>
  );
}

export function AdminOverviewLive({
  initialSnapshot,
}: {
  initialSnapshot: InitialSnapshot;
}) {
  const router = useRouter();
  const email = useContext(AdminIdentityContext);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(
    isSnapshot(initialSnapshot) ? initialSnapshot : null,
  );
  const [syncState, setSyncState] = useState<
    "connected" | "reconnecting" | "stale" | "offline"
  >(isSnapshot(initialSnapshot) ? "connected" : "offline");
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastError, setLastError] = useState("");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [order, setOrder] = useState<WidgetId[]>(defaultOrder);
  const [hidden, setHidden] = useState<WidgetId[]>([]);
  const inFlight = useRef(false);
  const abortRequest = useRef<AbortController | null>(null);
  const preferencesDialog = useRef<HTMLElement>(null);
  const timer = useRef<number | null>(null);
  const storageKey = `quickkit-admin-dashboard:${encodeURIComponent(email.toLowerCase())}`;

  useEffect(() => () => abortRequest.current?.abort(), []);

  useEffect(() => {
    if (!preferencesOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const focusable = () =>
      preferencesDialog.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
    focusable()?.[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreferencesOpen(false);
      } else if (event.key === "Tab") {
        const items = [...(focusable() ?? [])];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [preferencesOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (isSnapshot(initialSnapshot)) setLastSynced(Date.now());
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const saved: unknown = JSON.parse(raw);
          if (saved && typeof saved === "object") {
            const candidate = saved as { order?: unknown; hidden?: unknown };
            if (Array.isArray(candidate.order)) {
              const valid = candidate.order.filter((id): id is WidgetId =>
                defaultOrder.includes(id as WidgetId),
              );
              setOrder([
                ...valid,
                ...defaultOrder.filter((id) => !valid.includes(id)),
              ]);
            }
            if (Array.isArray(candidate.hidden))
              setHidden(
                candidate.hidden.filter((id): id is WidgetId =>
                  defaultOrder.includes(id as WidgetId),
                ),
              );
          }
        }
      } catch {
        // A blocked or malformed browser preference must not block the dashboard.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialSnapshot, storageKey]);

  const persistPreferences = useCallback(
    (nextOrder: WidgetId[], nextHidden: WidgetId[]) => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ order: nextOrder, hidden: nextHidden }),
        );
      } catch {
        // Preferences are a convenience; data access remains available without storage.
      }
    },
    [storageKey],
  );

  const refresh = useCallback(
    async (manual = false) => {
      if (inFlight.current || document.visibilityState === "hidden") return;
      inFlight.current = true;
      setRefreshing(true);
      if (snapshot)
        setSyncState((state) =>
          state === "stale" || state === "offline"
            ? "reconnecting"
            : "connected",
        );
      const controller = new AbortController();
      abortRequest.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch("/api/admin/overview", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (response.status === 401 || response.status === 403) {
          router.replace(
            `/admin/login?reason=${response.status === 403 ? "forbidden" : "expired"}`,
          );
          return;
        }
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            body &&
            typeof body === "object" &&
            "error" in body &&
            typeof body.error === "string"
              ? body.error
              : `Dashboard refresh failed (${response.status}).`;
          throw new Error(message);
        }
        const data =
          body && typeof body === "object" && "data" in body ? body.data : null;
        if (!isSnapshot(data))
          throw new Error(
            "The Admin API did not return a complete verified snapshot.",
          );
        setSnapshot(data);
        setSyncState("connected");
        setLastSynced(Date.now());
        setLastError("");
      } catch (error) {
        setSyncState(snapshot ? "stale" : "offline");
        setLastError(
          error instanceof Error
            ? error.message
            : "Could not refresh dashboard data.",
        );
      } finally {
        window.clearTimeout(timeout);
        if (abortRequest.current === controller) abortRequest.current = null;
        inFlight.current = false;
        setRefreshing(false);
        if (manual)
          window.dispatchEvent(new CustomEvent("quickkit:dashboard-refreshed"));
      }
    },
    [router, snapshot],
  );

  useEffect(() => {
    const schedule = () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (document.visibilityState === "visible") {
        timer.current = window.setTimeout(() => {
          void refresh();
          schedule();
        }, 60_000);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
      schedule();
    };
    const onMutation = () => void refresh();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("quickkit:admin-mutated", onMutation);
    schedule();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("quickkit:admin-mutated", onMutation);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [refresh]);

  const syncLabel = useMemo(() => {
    if (syncState === "offline") return "Offline";
    if (syncState === "stale") return "Stale data";
    if (syncState === "reconnecting") return "Reconnecting";
    return "Connected · periodic sync";
  }, [syncState]);

  function moveWidget(id: WidgetId, direction: -1 | 1) {
    const index = order.indexOf(id);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
    persistPreferences(next, hidden);
  }

  function toggleWidget(id: WidgetId) {
    const next = hidden.includes(id)
      ? hidden.filter((item) => item !== id)
      : [...hidden, id];
    setHidden(next);
    persistPreferences(order, next);
  }

  function restoreDefaults() {
    setOrder(defaultOrder);
    setHidden([]);
    persistPreferences(defaultOrder, []);
  }

  const widgets: Record<WidgetId, React.ReactNode> = {
    metrics: snapshot ? (
      <section className={styles["admin-grid"]} aria-label="Executive metrics">
        <Stat
          label="Published tools"
          value={snapshot.published_tools}
          note={`${snapshot.total_tools} tools in catalog`}
          icon={Wrench}
          href="/admin/tools"
        />
        <Stat
          label="Unpublished tools"
          value={snapshot.unpublished_tools}
          note="Hidden from the public catalog"
          icon={Wrench}
          href="/admin/tools"
        />
        <Stat
          label="Categories"
          value={snapshot.total_categories}
          note={`${snapshot.published_categories} published`}
          icon={Layers3}
          href="/admin/categories"
        />
        <Stat
          label="Contact submissions"
          value={snapshot.contact_count}
          note="All private inbox records"
          icon={Inbox}
          href="/admin/submissions"
        />
        <Stat
          label="Feedback submissions"
          value={snapshot.feedback_count}
          note="All private visitor feedback"
          icon={MessageSquare}
          href="/admin/feedback"
        />
        <EmptyMetric
          label="Active visitors"
          reason="No verified first-party visitor analytics are configured."
          href="/admin/analytics"
        />
        <EmptyMetric
          label="Tool usage & errors"
          reason="No recorded usage or application error events are available."
          href="/admin/analytics"
        />
      </section>
    ) : (
      <div className={styles["admin-state"]} role="status">
        Verified metrics are unavailable while the Admin data service is
        offline.
      </div>
    ),
    catalog: (
      <section
        className={styles["admin-panel"]}
        aria-labelledby="overview-distribution-heading"
      >
        <div className={styles["admin-panel-heading"]}>
          <div>
            <span className={styles["admin-kicker"]}>CATALOG</span>
            <h3 id="overview-distribution-heading">Tools by category</h3>
          </div>
          <Link className={styles["admin-link"]} href="/admin/categories">
            Manage categories <ArrowUpRight size={13} />
          </Link>
        </div>
        {snapshot?.category_distribution.length ? (
          <div className={styles["admin-distribution"]}>
            {snapshot.category_distribution.map((category) => {
              const width = snapshot.total_tools
                ? Math.round((category.count / snapshot.total_tools) * 100)
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
            <strong>Category distribution unavailable</strong>Counts will appear
            after a verified catalog response.
          </div>
        )}
        <p className={styles["admin-panel-footnote"]}>
          Current catalog counts only; no historical comparisons or usage
          estimates are available.
        </p>
      </section>
    ),
    health: (
      <section
        className={styles["admin-panel"]}
        aria-labelledby="overview-health-heading"
      >
        <div className={styles["admin-panel-heading"]}>
          <div>
            <span className={styles["admin-kicker"]}>HEALTH</span>
            <h3 id="overview-health-heading">Operational status</h3>
          </div>
          <Link className={styles["admin-link"]} href="/admin/security">
            Security center <ArrowUpRight size={13} />
          </Link>
        </div>
        <StatusRow
          label="Admin data service"
          value={
            snapshot
              ? "Connected"
              : syncState === "offline"
                ? "Offline"
                : "Unknown"
          }
          good={!!snapshot}
        />
        <StatusRow
          label="Dashboard refresh"
          value={syncLabel}
          good={syncState === "connected"}
          warn={syncState === "stale" || syncState === "reconnecting"}
        />
        <StatusRow label="Analytics integration" value="Not configured" />
        <StatusRow
          label="RLS verification"
          value="Verification required"
          warn
        />
        <StatusRow label="Sitemap" value="Owner verification required" warn />
        <StatusRow
          label="Email delivery"
          value="Unknown · not independently verified"
        />
        <StatusRow
          label="Application error monitoring"
          value="Not configured"
        />
        <p className={styles["admin-panel-footnote"]}>
          The connection state reflects successful authenticated Admin API
          reads. It is periodic polling, not a Supabase Realtime connection;
          RLS, sitemap availability and email delivery require independent
          verification.
        </p>
      </section>
    ),
    activity: (
      <section
        className={styles["admin-panel"]}
        aria-labelledby="overview-activity-heading"
      >
        <div className={styles["admin-panel-heading"]}>
          <div>
            <span className={styles["admin-kicker"]}>AUDIT TRAIL</span>
            <h3 id="overview-activity-heading">
              Recent administrator activity
            </h3>
          </div>
          <Link className={styles["admin-link"]} href="/admin/activity">
            Full activity log <ArrowUpRight size={13} />
          </Link>
        </div>
        {snapshot?.activity.length ? (
          <ol className={styles["admin-timeline"]}>
            {snapshot.activity.slice(0, 6).map((item) => (
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
                    <time dateTime={item.created_at}>
                      {new Date(item.created_at).toLocaleString()}
                    </time>
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles["admin-empty"]}>
            <strong>No activity recorded</strong>Administrator changes will
            appear here after they are recorded by the Admin API.
          </div>
        )}
      </section>
    ),
    shortcuts: (
      <section
        className={styles["admin-panel"]}
        aria-labelledby="overview-actions-heading"
      >
        <div className={styles["admin-panel-heading"]}>
          <div>
            <span className={styles["admin-kicker"]}>SHORTCUTS</span>
            <h3 id="overview-actions-heading">Quick actions</h3>
          </div>
        </div>
        <div className={styles["admin-quick-grid"]}>
          {actions.map(({ href, label, icon: Icon }) => (
            <Link className={styles["admin-quick-card"]} href={href} key={href}>
              <span className={styles["admin-quick-icon"]} aria-hidden="true">
                <Icon size={17} />
              </span>
              <span>
                <strong>{label}</strong>
              </span>
              <span className={styles["admin-quick-arrow"]} aria-hidden="true">
                <ArrowUpRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    ),
  };

  return (
    <>
      <section
        className={styles["admin-overview-hero"]}
        aria-label="Workspace status"
      >
        <div>
          <span className={styles["admin-kicker"]}>EXECUTIVE OVERVIEW</span>
          <h3>QUICKKIT Command Center</h3>
          <p>
            Verified operational totals with privacy-conscious, authenticated
            periodic refresh.
          </p>
        </div>
        <div className={styles["admin-overview-controls"]}>
          <span
            className={`${styles["admin-sync-state"]} ${styles[`admin-sync-state--${syncState}`]}`}
            role="status"
          >
            <i aria-hidden="true" />
            {syncLabel}
          </span>
          <button
            className={styles["admin-button"]}
            type="button"
            onClick={() => void refresh(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              size={15}
              className={refreshing ? styles["admin-spin"] : ""}
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            type="button"
            onClick={() => setPreferencesOpen(true)}
            aria-haspopup="dialog"
          >
            <Settings2 size={15} />
            Personalize
          </button>
        </div>
        <p className={styles["admin-sync-meta"]}>
          {lastSynced ? (
            <>
              Last successful sync{" "}
              <time dateTime={new Date(lastSynced).toISOString()}>
                {new Date(lastSynced).toLocaleTimeString()}
              </time>{" "}
              · refreshes every minute while this tab is active
            </>
          ) : (
            "Waiting for the first browser sync…"
          )}
        </p>
      </section>
      {syncState === "stale" || syncState === "offline" ? (
        <div
          className={`${styles["admin-state"]} ${styles["admin-state--warn"]}`}
          role="alert"
        >
          <strong>
            {syncState === "stale"
              ? "Showing stale data"
              : "Dashboard data unavailable"}
          </strong>
          <p>
            {lastError ||
              "The latest Admin API request failed. Retry to verify the connection."}
          </p>
          <button
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            onClick={() => void refresh(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      ) : null}
      <div className={styles["admin-dashboard-widgets"]}>
        {order
          .filter((id) => !hidden.includes(id))
          .map((id) => (
            <div
              className={`${styles["admin-dashboard-widget"]} ${styles[`admin-dashboard-widget--${id}`]}`}
              key={id}
            >
              {widgets[id]}
            </div>
          ))}
      </div>
      {preferencesOpen ? (
        <div
          className={styles["admin-modal-backdrop"]}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreferencesOpen(false);
          }}
        >
          <section
            ref={preferencesDialog}
            className={styles["admin-modal"]}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-preferences-heading"
          >
            <div className={styles["admin-modal-head"]}>
              <div>
                <span className={styles["admin-kicker"]}>PERSONALIZATION</span>
                <h3 id="dashboard-preferences-heading">Dashboard widgets</h3>
              </div>
              <button
                className={styles["admin-icon-button"]}
                onClick={() => setPreferencesOpen(false)}
                aria-label="Close dashboard preferences"
              >
                <X size={17} />
              </button>
            </div>
            <p className={styles["admin-panel-footnote"]}>
              Preferences are saved in this browser for {email}; no server-side
              preference table is configured.
            </p>
            <div className={styles["admin-widget-preferences"]}>
              {order.map((id, index) => (
                <div className={styles["admin-widget-preference"]} key={id}>
                  <strong>{widgetLabels[id]}</strong>
                  <div>
                    <button
                      className={styles["admin-icon-button"]}
                      onClick={() => moveWidget(id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${widgetLabels[id]} up`}
                    >
                      <ArrowUp size={15} />
                    </button>
                    <button
                      className={styles["admin-icon-button"]}
                      onClick={() => moveWidget(id, 1)}
                      disabled={index === order.length - 1}
                      aria-label={`Move ${widgetLabels[id]} down`}
                    >
                      <ArrowDown size={15} />
                    </button>
                    <button
                      className={`${styles["admin-icon-button"]} ${styles["admin-widget-visibility"]}`}
                      onClick={() => toggleWidget(id)}
                      aria-label={`${hidden.includes(id) ? "Show" : "Hide"} ${widgetLabels[id]}`}
                    >
                      {hidden.includes(id) ? (
                        <Eye size={15} />
                      ) : (
                        <EyeOff size={15} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles["admin-modal-actions"]}>
              <button
                className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
                onClick={restoreDefaults}
              >
                <RotateCcw size={15} />
                Restore defaults
              </button>
              <button
                className={styles["admin-button"]}
                onClick={() => setPreferencesOpen(false)}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function StatusRow({
  label,
  value,
  good = false,
  warn = false,
}: {
  label: string;
  value: string;
  good?: boolean;
  warn?: boolean;
}) {
  return (
    <div className={styles["admin-status-row"]}>
      <span>
        <i
          className={`${styles["admin-health-dot"]} ${good ? styles["admin-health-dot--good"] : warn ? styles["admin-health-dot--warn"] : styles["admin-health-dot--neutral"]}`}
          aria-hidden="true"
        />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
