"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity as ActivityIcon,
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Calendar,
  ChevronRight,
  Eye,
  EyeOff,
  HeartPulse,
  Home,
  Inbox,
  Layers3,
  LayoutGrid,
  Mail,
  MessageSquare,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  Users,
  Wrench,
  X,
  Zap,
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
import type {
  AdminActivityItem,
  OverviewConnectedSnapshot,
  OverviewSnapshot,
} from "@/lib/supabase/admin-data";
import {
  CategoryDonutChart,
  EntityBarList,
  OperationalTrendChart,
} from "./admin-charts";
import { REFRESH_INTERVAL_OPTIONS, useAdminLive } from "./admin-live-context";
import { AdminIdentityContext } from "./admin-shell";
import styles from "./admin.module.css";

type Snapshot = OverviewConnectedSnapshot;
type InitialSnapshot = OverviewSnapshot;
type WidgetId = "metrics" | "operations" | "shortcuts" | "analytics";

const defaultOrder: WidgetId[] = [
  "metrics",
  "operations",
  "shortcuts",
  "analytics",
];

const widgetLabels: Record<WidgetId, string> = {
  metrics: "Executive KPI cards",
  operations: "Category chart, Activity feed & System health",
  shortcuts: "Quick actions",
  analytics: "Operational trends & recent changes",
};

const quickActions: {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: "violet" | "cyan" | "rose" | "coral" | "teal" | "plum";
}[] = [
  {
    href: "/admin/tools",
    label: "Manage tools",
    description: "Catalog, visibility & metadata",
    icon: Wrench,
    tone: "violet",
  },
  {
    href: "/admin/categories",
    label: "Manage categories",
    description: "Create, reorder & organize",
    icon: Layers3,
    tone: "cyan",
  },
  {
    href: "/admin/submissions",
    label: "Review contact submissions",
    description: "Private inbox & contact records",
    icon: Mail,
    tone: "rose",
  },
  {
    href: "/admin/feedback",
    label: "Review feedback",
    description: "Classify, annotate & resolve",
    icon: MessageSquare,
    tone: "coral",
  },
  {
    href: "/admin/site-settings#homepage-content",
    label: "Edit homepage content",
    description: "Homepage notice & public copy",
    icon: Home,
    tone: "teal",
  },
  {
    href: "/admin/seo",
    label: "SEO management",
    description: "Titles, canonicals & crawl config",
    icon: Search,
    tone: "violet",
  },
  {
    href: "/admin/site-settings",
    label: "Site settings",
    description: "Brand identity, notices & links",
    icon: Settings2,
    tone: "plum",
  },
  {
    href: "/admin/security",
    label: "Security center",
    description: "Auth, allowlist & boundaries",
    icon: ShieldCheck,
    tone: "rose",
  },
  {
    href: "/admin/activity",
    label: "Activity logs",
    description: "Persisted administrator audit trail",
    icon: ActivityIcon,
    tone: "cyan",
  },
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

function formatRelativeTime(iso: string, referenceMs: number | null): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  if (referenceMs === null) {
    return new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }
  const diffSec = Math.max(0, Math.floor((referenceMs - ms) / 1000));
  if (diffSec < 60) return "Just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)} hr ago`;
  if (diffSec < 604_800) return `${Math.floor(diffSec / 86_400)}d ago`;
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatActionLabel(action: string): string {
  return action
    .split(".")
    .map((part) =>
      part
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
    )
    .join(".");
}

function activityVisual(entityType: string): {
  icon: LucideIcon;
  tone: "violet" | "cyan" | "rose" | "teal" | "plum";
} {
  const normalized = entityType.toLowerCase();
  if (normalized.includes("tool")) return { icon: Wrench, tone: "cyan" };
  if (normalized.includes("category")) return { icon: Layers3, tone: "violet" };
  if (normalized.includes("feedback"))
    return { icon: MessageSquare, tone: "rose" };
  if (normalized.includes("submission")) return { icon: Inbox, tone: "rose" };
  if (normalized.includes("setting")) return { icon: Settings2, tone: "teal" };
  return { icon: ShieldCheck, tone: "plum" };
}

function formatPeriodDelta(
  current7d: number,
  prev7d: number,
  hasHistory: boolean,
): { text: string; tone: "up" | "down" | "flat" } | null {
  if (!hasHistory) return null;
  if (current7d === 0 && prev7d === 0)
    return { text: "No change (7d)", tone: "flat" };
  const diff = current7d - prev7d;
  if (prev7d === 0 && current7d > 0)
    return { text: `+${current7d} in 7d`, tone: "up" };
  if (diff > 0) return { text: `+${diff} vs prior 7d`, tone: "up" };
  if (diff < 0) return { text: `${diff} vs prior 7d`, tone: "down" };
  return { text: `${current7d} in 7d (steady)`, tone: "flat" };
}

function KpiCard({
  label,
  value,
  note,
  delta,
  icon: Icon,
  href,
  tone,
}: {
  label: string;
  value: number;
  note: string;
  delta?: { text: string; tone: "up" | "down" | "flat" } | null;
  icon: LucideIcon;
  href: string;
  tone: "violet" | "rose" | "cyan" | "lavender" | "coral";
}) {
  return (
    <Link
      className={`${styles["admin-stat-card"]} ${styles[`admin-stat-card--${tone}`]}`}
      href={href}
    >
      <div className={styles["admin-stat-head"]}>
        <span className={styles["admin-stat-icon"]} aria-hidden="true">
          <Icon size={17} strokeWidth={2} />
        </span>
        <h3>{label}</h3>
      </div>
      <div className={styles["admin-stat-body"]}>
        <div className={styles["admin-stat"]}>{value.toLocaleString()}</div>
        {delta ? (
          <span
            className={`${styles["admin-stat-delta"]} ${styles[`admin-stat-delta--${delta.tone}`]}`}
          >
            {delta.text}
          </span>
        ) : null}
      </div>
      <div className={styles["admin-stat-foot"]}>
        <span className={styles["admin-stat-note"]}>{note}</span>
        <span className={styles["admin-stat-arrow"]} aria-hidden="true">
          <ArrowUpRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function UnavailableKpiCard({
  label,
  reason,
  href,
  icon: Icon,
}: {
  label: string;
  reason: string;
  href: string;
  icon: LucideIcon;
}) {
  return (
    <article
      className={`${styles["admin-stat-card"]} ${styles["admin-stat-card--unavailable"]}`}
    >
      <div className={styles["admin-stat-head"]}>
        <span className={styles["admin-stat-icon"]} aria-hidden="true">
          <Icon size={17} strokeWidth={2} />
        </span>
        <h3>{label}</h3>
      </div>
      <div className={styles["admin-stat-body"]}>
        <strong className={styles["admin-stat-unavail-value"]}>
          Not available
        </strong>
      </div>
      <p className={styles["admin-stat-unavail-reason"]}>{reason}</p>
      <Link className={styles["admin-stat-setup-link"]} href={href}>
        Review setup <ArrowUpRight size={13} aria-hidden="true" />
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
  const {
    refreshIntervalMs,
    setRefreshIntervalMs,
    setSyncSnapshot,
    registerRefreshHandler,
    pushToast,
  } = useAdminLive();

  const [snapshot, setSnapshot] = useState<Snapshot | null>(
    isSnapshot(initialSnapshot) ? initialSnapshot : null,
  );
  const [syncState, setSyncState] = useState<
    "connected" | "reconnecting" | "stale" | "offline"
  >(isSnapshot(initialSnapshot) ? "connected" : "offline");
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [healthCheckedAt, setHealthCheckedAt] = useState<string | null>(
    isSnapshot(initialSnapshot)
      ? (initialSnapshot.health?.checked_at ?? null)
      : null,
  );
  const [lastError, setLastError] = useState("");
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [order, setOrder] = useState<WidgetId[]>(defaultOrder);
  const [hidden, setHidden] = useState<WidgetId[]>([]);

  // Activity feed filters
  const [activitySearch, setActivitySearch] = useState("");
  const [activityType, setActivityType] = useState("all");
  const [activityWindow, setActivityWindow] = useState("all");

  // Bottom analytics card tabs
  const [trendTab, setTrendTab] = useState<
    "submissions" | "activity" | "visitors"
  >("submissions");
  const [rankingTab, setRankingTab] = useState<"changes" | "usage">("changes");

  const inFlight = useRef(false);
  const abortRequest = useRef<AbortController | null>(null);
  const preferencesDialog = useRef<HTMLElement>(null);
  const timer = useRef<number | null>(null);
  const storageKey = `quickkit-admin-dashboard-v2:${encodeURIComponent(email.toLowerCase())}`;

  useEffect(() => () => abortRequest.current?.abort(), []);

  // Client clock (updates every 60s, avoids hydration mismatch)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const current = Date.now();
      setNowMs(current);
      if (isSnapshot(initialSnapshot)) setLastSynced(current);
    });
    const clock = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(clock);
    };
  }, [initialSnapshot]);

  // Sync top-bar shell indicators & sidebar inbox badges
  useEffect(() => {
    setSyncSnapshot({
      syncState,
      lastSynced,
      refreshing,
      badges: snapshot
        ? {
            submissions:
              snapshot.new_contact_count ?? snapshot.contact_count ?? 0,
            feedback:
              snapshot.new_feedback_count ?? snapshot.feedback_count ?? 0,
            recentActivity: snapshot.activity.slice(0, 6),
          }
        : undefined,
    });
  }, [syncState, lastSynced, refreshing, snapshot, setSyncSnapshot]);

  // Focus trap for personalization modal
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
        const focusItems = [...(focusable() ?? [])];
        if (!focusItems.length) return;
        const first = focusItems[0];
        const last = focusItems[focusItems.length - 1];
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

  // Restore saved widget layout preferences
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
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
            if (Array.isArray(candidate.hidden)) {
              setHidden(
                candidate.hidden.filter((id): id is WidgetId =>
                  defaultOrder.includes(id as WidgetId),
                ),
              );
            }
          }
        }
      } catch {
        // Malformed or blocked storage must not break the dashboard.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);

  const persistPreferences = useCallback(
    (nextOrder: WidgetId[], nextHidden: WidgetId[]) => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({ order: nextOrder, hidden: nextHidden }),
        );
      } catch {
        // Convenience preference only.
      }
    },
    [storageKey],
  );

  const refresh = useCallback(
    async (manual = false) => {
      if (
        inFlight.current ||
        (!manual && document.visibilityState === "hidden")
      )
        return;
      inFlight.current = true;
      setRefreshing(true);
      if (snapshot) {
        setSyncState((state) =>
          state === "stale" || state === "offline"
            ? "reconnecting"
            : "connected",
        );
      }
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
        if (!isSnapshot(data)) {
          throw new Error(
            "The Admin API did not return a complete verified snapshot.",
          );
        }
        const syncedAt = Date.now();
        setSnapshot(data);
        setSyncState("connected");
        setLastSynced(syncedAt);
        setNowMs(syncedAt);
        setHealthCheckedAt(
          data.health?.checked_at ?? new Date(syncedAt).toISOString(),
        );
        setLastError("");
        if (manual) {
          pushToast({
            tone: "success",
            title: "Workspace synchronized",
            description: "Verified database totals updated.",
          });
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not refresh dashboard data.";
        setSyncState(snapshot ? "stale" : "offline");
        setLastError(message);
        if (manual) {
          pushToast({
            tone: "error",
            title: "Refresh failed",
            description: message,
          });
        }
      } finally {
        window.clearTimeout(timeout);
        if (abortRequest.current === controller) abortRequest.current = null;
        inFlight.current = false;
        setRefreshing(false);
        if (manual) {
          window.dispatchEvent(new CustomEvent("quickkit:dashboard-refreshed"));
        }
      }
    },
    [router, snapshot, pushToast],
  );

  // Register top-bar refresh button handler
  useEffect(
    () => registerRefreshHandler(() => refresh(true)),
    [registerRefreshHandler, refresh],
  );

  // Periodic polling that pauses on hidden tab, refreshes on visibility restore & online recovery
  useEffect(() => {
    const schedule = () => {
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
      if (refreshIntervalMs > 0 && document.visibilityState === "visible") {
        timer.current = window.setTimeout(() => {
          void refresh(false);
          schedule();
        }, refreshIntervalMs);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh(false);
      schedule();
    };
    const onMutation = () => void refresh(false);
    const onOnline = () => void refresh(false);
    const onOffline = () => {
      setSyncState("offline");
      setLastError("Browser is offline. Waiting for connectivity to restore.");
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("quickkit:admin-mutated", onMutation);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    schedule();
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("quickkit:admin-mutated", onMutation);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [refresh, refreshIntervalMs]);

  async function runFullHealthCheck() {
    setCheckingHealth(true);
    try {
      await refresh(false);
      const secResponse = await fetch("/api/admin/security", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (secResponse.status === 401 || secResponse.status === 403) {
        router.replace(
          `/admin/login?reason=${secResponse.status === 403 ? "forbidden" : "expired"}`,
        );
        return;
      }
      setHealthCheckedAt(new Date().toISOString());
      pushToast({
        tone: secResponse.ok ? "success" : "warning",
        title: secResponse.ok
          ? "Health check completed"
          : "Health check finished with warnings",
        description: secResponse.ok
          ? "Admin API and Supabase probes responded."
          : "Security endpoint returned an unexpected status.",
      });
    } catch {
      pushToast({
        tone: "error",
        title: "Health check failed",
        description: "Unable to reach the Admin security probe.",
      });
    } finally {
      setCheckingHealth(false);
    }
  }

  const syncLabel = useMemo(() => {
    if (syncState === "offline") return "Offline";
    if (syncState === "stale") return "Stale data";
    if (syncState === "reconnecting") return "Reconnecting";
    return "Connected · periodic sync";
  }, [syncState]);

  const filteredActivity = useMemo(() => {
    const items = snapshot?.activity ?? [];
    const q = activitySearch.trim().toLowerCase();
    const checkedMs = snapshot?.health?.checked_at
      ? Date.parse(snapshot.health.checked_at)
      : Number.NaN;
    const referenceMs =
      nowMs ?? lastSynced ?? (Number.isNaN(checkedMs) ? 0 : checkedMs);
    const cutoffMs =
      referenceMs > 0
        ? activityWindow === "24h"
          ? referenceMs - 86_400_000
          : activityWindow === "7d"
            ? referenceMs - 7 * 86_400_000
            : activityWindow === "30d"
              ? referenceMs - 30 * 86_400_000
              : 0
        : 0;

    return items.filter((item) => {
      if (activityType !== "all") {
        const type = item.entity_type.toLowerCase();
        if (!type.includes(activityType)) return false;
      }
      if (cutoffMs > 0) {
        const ms = Date.parse(item.created_at);
        if (!Number.isNaN(ms) && ms < cutoffMs) return false;
      }
      if (q) {
        const haystack =
          `${item.action} ${item.entity_type} ${item.entity_id ?? ""} ${item.actor_email}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [
    snapshot,
    activitySearch,
    activityType,
    activityWindow,
    nowMs,
    lastSynced,
  ]);

  const recentEntities = useMemo(() => {
    if (snapshot?.trends?.recent_entities?.length) {
      return snapshot.trends.recent_entities.map((entry) => ({
        label: entry.label,
        subtitle: entry.entity_type,
        count: entry.count,
      }));
    }
    const counts = new Map<
      string,
      { label: string; subtitle: string; count: number }
    >();
    for (const item of snapshot?.activity ?? []) {
      const label = item.entity_id || item.entity_type;
      const key = `${item.entity_type}:${label}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { label, subtitle: item.entity_type, count: 1 });
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  }, [snapshot]);

  const dailyTrends = useMemo(
    () => snapshot?.trends?.daily ?? [],
    [snapshot?.trends?.daily],
  );
  const hasSubmissionTrendData = dailyTrends.some(
    (day) => day.contacts > 0 || day.feedback > 0,
  );
  const hasActivityTrendData = dailyTrends.some((day) => day.activity > 0);

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

  const healthMeta = snapshot?.health;
  const analyticsConfigured = Boolean(
    healthMeta?.analytics_url_present && healthMeta?.analytics_token_present,
  );
  const healthItems: {
    label: string;
    value: string;
    tone: "good" | "warn" | "neutral" | "error";
    detail: string;
    href: string;
    actionLabel: string;
  }[] = [
    {
      label: "Admin API connectivity",
      value:
        syncState === "connected" && snapshot
          ? "Connected"
          : syncState === "reconnecting"
            ? "Reconnecting"
            : syncState === "stale"
              ? "Stale"
              : "Offline",
      tone:
        syncState === "connected" && snapshot
          ? "good"
          : syncState === "offline"
            ? "error"
            : "warn",
      detail:
        "Verified by authenticated same-origin /api/admin/overview reads.",
      href: "/admin/security",
      actionLabel: "Inspect",
    },
    {
      label: "Supabase connectivity",
      value: snapshot ? "Connected" : "Offline",
      tone: snapshot ? "good" : "error",
      detail: "Server-only database client read catalog & audit tables.",
      href: "/admin/security",
      actionLabel: "Review",
    },
    {
      label: "Authentication status",
      value: "Allowlisted owner",
      tone: "good",
      detail: "Session verified server-side against QUICKKIT_ADMIN_EMAILS.",
      href: "/admin/profile",
      actionLabel: "Profile",
    },
    {
      label: "RLS verification",
      value: "Owner action required",
      tone: "warn",
      detail:
        "Every public table has RLS enabled with deny-browser policies. This app cannot introspect pg_policies from the service-role client, so re-verify in the Supabase SQL editor after any schema change.",
      href: "/admin/security",
      actionLabel: "Verify",
    },
    {
      label: "SMTP configuration",
      value: "NOT CONFIGURED",
      tone: "neutral",
      detail:
        "Supabase Auth mail is configured outside this project; this app has no delivery probe and does not claim delivery works.",
      href: "/admin/security",
      actionLabel: "Review",
    },
    {
      label: "Sitemap and robots.txt",
      value: healthMeta?.indexing_enabled
        ? healthMeta.sitemap_origin_configured
          ? "Indexing enabled"
          : "WARNING · origin missing"
        : "Indexing off (intentional)",
      tone: healthMeta?.indexing_enabled
        ? healthMeta.sitemap_origin_configured
          ? "good"
          : "warn"
        : "neutral",
      detail: healthMeta?.sitemap_origin_configured
        ? "Origin configured. robots.txt and sitemap.xml are served by this deployment; crawl reachability requires an owner check."
        : "SITE_URL origin not configured in this environment, so robots.txt disallows crawling and the sitemap is empty by design.",
      href: "/admin/seo",
      actionLabel: "SEO",
    },
    {
      label: "Analytics integration",
      value: analyticsConfigured
        ? "Read-only query required"
        : "Not configured",
      tone: analyticsConfigured ? "warn" : "neutral",
      detail: analyticsConfigured
        ? "Env credentials detected; safe read-only reporting query pending."
        : "No verified first-party analytics database configured.",
      href: "/admin/analytics",
      actionLabel: "Setup",
    },
    {
      label: "Error monitoring",
      value: healthMeta?.error_monitoring_configured
        ? "Configured (opt-in)"
        : "Not configured",
      tone: healthMeta?.error_monitoring_configured ? "good" : "neutral",
      detail: healthMeta?.error_monitoring_configured
        ? "Sanitized error boundary hook is enabled."
        : "Opt-in error boundary hook ready; no external provider connected.",
      href: "/admin/analytics",
      actionLabel: "Details",
    },
    {
      label: "Last successful refresh",
      value: lastSynced
        ? new Date(lastSynced).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        : "Pending sync",
      tone: lastSynced && syncState === "connected" ? "good" : "neutral",
      detail:
        refreshIntervalMs === 0
          ? "Automatic polling paused (manual refresh mode)."
          : `Periodic polling every ${refreshIntervalMs / 1000}s while tab is visible.`,
      href: "/admin/activity",
      actionLabel: "Audit",
    },
  ];

  const contactDelta = snapshot?.period_comparison
    ? formatPeriodDelta(
        snapshot.period_comparison.contacts_7d,
        snapshot.period_comparison.contacts_prev_7d,
        snapshot.period_comparison.has_contact_history,
      )
    : null;

  const feedbackDelta = snapshot?.period_comparison
    ? formatPeriodDelta(
        snapshot.period_comparison.feedback_7d,
        snapshot.period_comparison.feedback_prev_7d,
        snapshot.period_comparison.has_feedback_history,
      )
    : null;

  const formattedClock = nowMs
    ? new Date(nowMs).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const widgets: Record<WidgetId, React.ReactNode> = {
    metrics: snapshot ? (
      <section
        className={styles["admin-kpi-grid"]}
        aria-label="Executive metrics"
      >
        <KpiCard
          label="Published tools"
          value={snapshot.published_tools}
          note={`${snapshot.total_tools} in catalog`}
          icon={Layers3}
          href="/admin/tools"
          tone="violet"
        />
        <KpiCard
          label="Unpublished tools"
          value={snapshot.unpublished_tools}
          note="Hidden from public catalog"
          icon={EyeOff}
          href="/admin/tools"
          tone="rose"
        />
        <KpiCard
          label="Categories"
          value={snapshot.total_categories}
          note={`${snapshot.published_categories} published`}
          icon={LayoutGrid}
          href="/admin/categories"
          tone="cyan"
        />
        <KpiCard
          label="Contact submissions"
          value={snapshot.contact_count}
          note={
            typeof snapshot.new_contact_count === "number"
              ? `${snapshot.new_contact_count} new in inbox`
              : "All private inbox records"
          }
          delta={contactDelta}
          icon={Mail}
          href="/admin/submissions"
          tone="lavender"
        />
        <KpiCard
          label="Feedback"
          value={snapshot.feedback_count}
          note={
            typeof snapshot.new_feedback_count === "number"
              ? `${snapshot.new_feedback_count} new items`
              : "All private visitor feedback"
          }
          delta={feedbackDelta}
          icon={MessageSquare}
          href="/admin/feedback"
          tone="coral"
        />
        <UnavailableKpiCard
          label="Active visitors"
          reason="No verified first-party visitor analytics are configured."
          href="/admin/analytics"
          icon={Users}
        />
      </section>
    ) : (
      <div className={styles["admin-state"]} role="status">
        Verified metrics are unavailable while the Admin data service is
        offline. Verify <code>SUPABASE_SERVICE_ROLE_KEY</code> and migration{" "}
        <code>202611100002_quickkit_master_admin.sql</code>, then click{" "}
        <strong>Try again</strong>.
      </div>
    ),

    operations: (
      <div className={styles["admin-ops-grid"]}>
        {/* Column 1: Tool distribution donut chart */}
        <section
          className={styles["admin-panel"]}
          aria-labelledby="overview-distribution-heading"
        >
          <div className={styles["admin-panel-heading"]}>
            <div className={styles["admin-panel-title-group"]}>
              <span
                className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
                aria-hidden="true"
              >
                <Layers3 size={15} />
              </span>
              <div>
                <h3 id="overview-distribution-heading">Tools by category</h3>
                <p className={styles["admin-panel-subtitle"]}>
                  Verified catalog distribution
                </p>
              </div>
            </div>
            <Link className={styles["admin-link"]} href="/admin/categories">
              Manage <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
          {snapshot?.category_distribution.length ? (
            <CategoryDonutChart
              data={snapshot.category_distribution}
              total={snapshot.total_tools}
            />
          ) : (
            <div className={styles["admin-empty"]}>
              <strong>Category distribution unavailable</strong>
              Counts will appear after a verified catalog response.
            </div>
          )}
        </section>

        {/* Column 2: Synced Activity Center */}
        <section
          className={styles["admin-panel"]}
          aria-labelledby="overview-activity-heading"
        >
          <div className={styles["admin-panel-heading"]}>
            <div className={styles["admin-panel-title-group"]}>
              <span
                className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--rose"]}`}
                aria-hidden="true"
              >
                <Zap size={15} />
              </span>
              <div>
                <h3 id="overview-activity-heading">Activity center</h3>
                <p className={styles["admin-panel-subtitle"]}>
                  Persisted audit trail
                </p>
              </div>
            </div>
            <Link className={styles["admin-link"]} href="/admin/activity">
              Full log <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <div className={styles["admin-activity-filters"]}>
            <label className={styles["admin-compact-search"]}>
              <Search size={13} aria-hidden="true" />
              <input
                type="search"
                value={activitySearch}
                onChange={(event) => setActivitySearch(event.target.value)}
                placeholder="Filter activity…"
                aria-label="Search recent activity"
              />
            </label>
            <select
              className={styles["admin-compact-select"]}
              value={activityType}
              onChange={(event) => setActivityType(event.target.value)}
              aria-label="Filter activity by event type"
            >
              <option value="all">All events</option>
              <option value="tool">Tools</option>
              <option value="category">Categories</option>
              <option value="submission">Submissions</option>
              <option value="feedback">Feedback</option>
              <option value="setting">Site settings</option>
            </select>
            <select
              className={styles["admin-compact-select"]}
              value={activityWindow}
              onChange={(event) => setActivityWindow(event.target.value)}
              aria-label="Filter activity by time range"
            >
              <option value="all">All time</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
            </select>
          </div>

          {filteredActivity.length ? (
            <ol className={styles["admin-activity-feed"]}>
              {filteredActivity.slice(0, 6).map((item: AdminActivityItem) => {
                const { icon: ItemIcon, tone } = activityVisual(
                  item.entity_type,
                );
                return (
                  <li className={styles["admin-activity-row"]} key={item.id}>
                    <span
                      className={`${styles["admin-activity-icon"]} ${styles[`admin-activity-icon--${tone}`]}`}
                      aria-hidden="true"
                    >
                      <ItemIcon size={14} />
                    </span>
                    <div className={styles["admin-activity-copy"]}>
                      <div className={styles["admin-activity-line"]}>
                        <strong>{formatActionLabel(item.action)}</strong>
                        {item.entity_id ? (
                          <span className={styles["admin-activity-target"]}>
                            — {item.entity_id}
                          </span>
                        ) : null}
                      </div>
                      <small>{item.actor_email}</small>
                    </div>
                    <time
                      className={styles["admin-activity-time"]}
                      dateTime={item.created_at}
                      title={new Date(item.created_at).toLocaleString()}
                    >
                      {formatRelativeTime(item.created_at, nowMs)}
                    </time>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className={styles["admin-empty"]}>
              <strong>
                {snapshot?.activity.length
                  ? "No matching events"
                  : "No activity recorded"}
              </strong>
              {snapshot?.activity.length
                ? "Adjust search or filters to view persisted audit entries."
                : "Administrator changes will appear here once recorded by the Admin API."}
            </div>
          )}
        </section>

        {/* Column 3: System Health Command Center */}
        <section
          className={styles["admin-panel"]}
          aria-labelledby="overview-health-heading"
        >
          <div className={styles["admin-panel-heading"]}>
            <div className={styles["admin-panel-title-group"]}>
              <span
                className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--teal"]}`}
                aria-hidden="true"
              >
                <HeartPulse size={15} />
              </span>
              <div>
                <h3 id="overview-health-heading">System health</h3>
                <p className={styles["admin-panel-subtitle"]}>
                  {healthCheckedAt
                    ? `Checked ${new Date(healthCheckedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Verified boundaries"}
                </p>
              </div>
            </div>
            <Link className={styles["admin-link"]} href="/admin/security">
              Security <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>

          <ul className={styles["admin-health-list"]}>
            {healthItems.map((item) => (
              <li
                className={styles["admin-health-row"]}
                key={item.label}
                title={item.detail}
              >
                <div className={styles["admin-health-label"]}>
                  <i
                    className={`${styles["admin-health-dot"]} ${styles[`admin-health-dot--${item.tone}`]}`}
                    aria-hidden="true"
                  />
                  <div>
                    <span>{item.label}</span>
                    <small>{item.detail}</small>
                  </div>
                </div>
                <div className={styles["admin-health-meta"]}>
                  <strong className={styles[`admin-health-val--${item.tone}`]}>
                    {item.value}
                  </strong>
                  <Link
                    href={item.href}
                    className={styles["admin-health-action"]}
                  >
                    {item.actionLabel}
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-health-check-btn"]}`}
            onClick={() => void runFullHealthCheck()}
            disabled={checkingHealth || refreshing}
          >
            <RefreshCw
              size={14}
              className={checkingHealth ? styles["admin-spin"] : ""}
              aria-hidden="true"
            />
            {checkingHealth ? "Checking services…" : "Run full check"}
          </button>
        </section>
      </div>
    ),

    shortcuts: (
      <section
        className={styles["admin-panel"]}
        aria-labelledby="overview-actions-heading"
      >
        <div className={styles["admin-panel-heading"]}>
          <div className={styles["admin-panel-title-group"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
              aria-hidden="true"
            >
              <Rocket size={15} />
            </span>
            <div>
              <h3 id="overview-actions-heading">Quick actions</h3>
              <p className={styles["admin-panel-subtitle"]}>
                Direct operational shortcuts across all Admin modules
              </p>
            </div>
          </div>
        </div>
        <div className={styles["admin-quick-grid"]}>
          {quickActions.map(
            ({ href, label, description, icon: Icon, tone }) => (
              <Link
                className={styles["admin-quick-card"]}
                href={href}
                key={href}
              >
                <span
                  className={`${styles["admin-quick-icon"]} ${styles[`admin-quick-icon--${tone}`]}`}
                  aria-hidden="true"
                >
                  <Icon size={17} strokeWidth={1.9} />
                </span>
                <span className={styles["admin-quick-copy"]}>
                  <strong>{label}</strong>
                  <small>{description}</small>
                </span>
                <ChevronRight
                  size={15}
                  className={styles["admin-quick-arrow"]}
                  aria-hidden="true"
                />
              </Link>
            ),
          )}
        </div>
      </section>
    ),

    analytics: (
      <div className={styles["admin-analytics-grid"]}>
        {/* Left: Trends chart */}
        <section
          className={styles["admin-panel"]}
          aria-labelledby="overview-trends-heading"
        >
          <div className={styles["admin-panel-heading"]}>
            <div className={styles["admin-panel-title-group"]}>
              <span
                className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
                aria-hidden="true"
              >
                <TrendingUp size={15} />
              </span>
              <div>
                <h3 id="overview-trends-heading">Operational trends</h3>
                <p className={styles["admin-panel-subtitle"]}>
                  14-day persisted database records
                </p>
              </div>
            </div>
            <div
              className={styles["admin-segmented-tabs"]}
              role="tablist"
              aria-label="Trend datasets"
            >
              <button
                type="button"
                role="tab"
                aria-selected={trendTab === "submissions"}
                className={
                  trendTab === "submissions"
                    ? styles["admin-tab--active"]
                    : undefined
                }
                onClick={() => setTrendTab("submissions")}
              >
                Submissions
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={trendTab === "activity"}
                className={
                  trendTab === "activity"
                    ? styles["admin-tab--active"]
                    : undefined
                }
                onClick={() => setTrendTab("activity")}
              >
                Admin changes
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={trendTab === "visitors"}
                className={
                  trendTab === "visitors"
                    ? styles["admin-tab--active"]
                    : undefined
                }
                onClick={() => setTrendTab("visitors")}
              >
                Visitors
              </button>
            </div>
          </div>

          {trendTab === "visitors" ? (
            <div className={styles["admin-analytics-empty"]}>
              <span
                className={styles["admin-analytics-empty-icon"]}
                aria-hidden="true"
              >
                <BarChart3 size={22} />
              </span>
              <h4>Visitor usage analytics not connected</h4>
              <p>
                QUICKKIT does not fabricate traffic or tool-view curves. Connect
                a reviewed read-only analytics source to display visitor trends.
              </p>
              <Link
                href="/admin/analytics"
                className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
              >
                Review analytics setup <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : trendTab === "submissions" ? (
            hasSubmissionTrendData ? (
              <OperationalTrendChart
                points={dailyTrends.map((day) => ({
                  date: day.date,
                  value: day.contacts,
                  secondaryValue: day.feedback,
                }))}
                primaryLabel="Contacts"
                secondaryLabel="Feedback"
                ariaLabel="14-day contact and feedback submission trend"
              />
            ) : (
              <div className={styles["admin-analytics-empty"]}>
                <span
                  className={styles["admin-analytics-empty-icon"]}
                  aria-hidden="true"
                >
                  <Inbox size={20} />
                </span>
                <h4>No submissions in the last 14 days</h4>
                <p>
                  Persisted contact and feedback submissions will plot here
                  automatically as records arrive.
                </p>
              </div>
            )
          ) : hasActivityTrendData ? (
            <OperationalTrendChart
              points={dailyTrends.map((day) => ({
                date: day.date,
                value: day.activity,
              }))}
              primaryLabel="Admin changes"
              ariaLabel="14-day administrative audit activity trend"
            />
          ) : (
            <div className={styles["admin-analytics-empty"]}>
              <span
                className={styles["admin-analytics-empty-icon"]}
                aria-hidden="true"
              >
                <ActivityIcon size={20} />
              </span>
              <h4>No administrative changes in the last 14 days</h4>
              <p>
                Recorded tool, category, inbox, and settings edits will appear
                here.
              </p>
            </div>
          )}
        </section>

        {/* Right: Recent admin changes vs honest Top Tools usage empty state */}
        <section
          className={styles["admin-panel"]}
          aria-labelledby="overview-ranking-heading"
        >
          <div className={styles["admin-panel-heading"]}>
            <div className={styles["admin-panel-title-group"]}>
              <span
                className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--rose"]}`}
                aria-hidden="true"
              >
                <BarChart3 size={15} />
              </span>
              <div>
                <h3 id="overview-ranking-heading">
                  {rankingTab === "changes"
                    ? "Most updated records"
                    : "Top tools (by usage)"}
                </h3>
                <p className={styles["admin-panel-subtitle"]}>
                  {rankingTab === "changes"
                    ? "From persisted admin audit events"
                    : "Per-tool usage telemetry"}
                </p>
              </div>
            </div>
            <div
              className={styles["admin-segmented-tabs"]}
              role="tablist"
              aria-label="Breakdown views"
            >
              <button
                type="button"
                role="tab"
                aria-selected={rankingTab === "changes"}
                className={
                  rankingTab === "changes"
                    ? styles["admin-tab--active"]
                    : undefined
                }
                onClick={() => setRankingTab("changes")}
              >
                Recent edits
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={rankingTab === "usage"}
                className={
                  rankingTab === "usage"
                    ? styles["admin-tab--active"]
                    : undefined
                }
                onClick={() => setRankingTab("usage")}
              >
                Tool usage
              </button>
            </div>
          </div>

          {rankingTab === "usage" ? (
            <div className={styles["admin-analytics-empty"]}>
              <span
                className={styles["admin-analytics-empty-icon"]}
                aria-hidden="true"
              >
                <Wrench size={20} />
              </span>
              <h4>Tool usage telemetry not available</h4>
              <p>
                QUICKKIT’s privacy-first architecture does not track per-tool
                executions or fabricate popularity counts.
              </p>
              <Link
                href="/admin/analytics"
                className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
              >
                Inspect analytics policy <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : recentEntities.length ? (
            <EntityBarList items={recentEntities} />
          ) : (
            <div className={styles["admin-analytics-empty"]}>
              <span
                className={styles["admin-analytics-empty-icon"]}
                aria-hidden="true"
              >
                <ActivityIcon size={20} />
              </span>
              <h4>No recorded administrative edits yet</h4>
              <p>
                Edit a tool, category, submission, or setting to see verified
                change frequencies here.
              </p>
            </div>
          )}
        </section>
      </div>
    ),
  };

  return (
    <>
      <section
        className={styles["admin-overview-hero"]}
        aria-label="Workspace status"
      >
        <div className={styles["admin-hero-copy"]}>
          <h2>Good to see you, Admin</h2>
          <p>
            {snapshot
              ? `${snapshot.published_tools} published tools across ${snapshot.published_categories} public categories · verified database totals with periodic sync.`
              : "Here’s what’s happening in your QUICKKIT workspace. Metrics update via authenticated periodic sync."}
          </p>
          <p className={styles["admin-sync-meta"]}>
            {lastSynced ? (
              <>
                Last successful sync{" "}
                <time dateTime={new Date(lastSynced).toISOString()}>
                  {new Date(lastSynced).toLocaleTimeString()}
                </time>{" "}
                ·{" "}
                {refreshIntervalMs === 0
                  ? "manual refresh mode"
                  : `auto-refreshes every ${refreshIntervalMs / 1000}s while tab is active`}
              </>
            ) : (
              "Waiting for the first browser sync…"
            )}
          </p>
        </div>

        <div className={styles["admin-overview-controls"]}>
          {formattedClock ? (
            <span className={styles["admin-date-pill"]}>
              <Calendar size={14} aria-hidden="true" />
              <span>{formattedClock}</span>
            </span>
          ) : null}
          <span
            className={`${styles["admin-sync-state"]} ${styles[`admin-sync-state--${syncState}`]}`}
            role="status"
          >
            <i aria-hidden="true" />
            {syncLabel}
          </span>
          <label className={styles["admin-hero-interval"]}>
            <span className={styles["admin-visually-hidden"]}>
              Overview refresh interval
            </span>
            <select
              value={refreshIntervalMs}
              onChange={(event) =>
                setRefreshIntervalMs(Number(event.target.value))
              }
              aria-label="Overview refresh interval"
            >
              {REFRESH_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.ms} value={opt.ms}>
                  {opt.shortLabel}
                </option>
              ))}
            </select>
          </label>
          <button
            className={styles["admin-button"]}
            type="button"
            onClick={() => void refresh(true)}
            disabled={refreshing}
            aria-label="Refresh dashboard data"
          >
            <RefreshCw
              size={14}
              className={refreshing ? styles["admin-spin"] : ""}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            type="button"
            onClick={() => setPreferencesOpen(true)}
            aria-haspopup="dialog"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Customize
          </button>
        </div>
      </section>

      {syncState === "stale" || syncState === "offline" ? (
        <div
          className={`${styles["admin-state"]} ${styles["admin-state--warn"]} ${styles["admin-stale-banner"]}`}
          role="alert"
        >
          <div>
            <strong>
              {syncState === "stale"
                ? "Showing stale data"
                : "Dashboard data unavailable"}
            </strong>
            <p>
              {lastError ||
                "The latest Admin API request failed. Retry to verify the connection."}
            </p>
          </div>
          <button
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            onClick={() => void refresh(true)}
            disabled={refreshing}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : null}

      <div className={styles["admin-dashboard-stack"]}>
        {order
          .filter((id) => !hidden.includes(id))
          .map((id) => (
            <div className={styles["admin-dashboard-band"]} key={id}>
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
                <h3 id="dashboard-preferences-heading">Dashboard layout</h3>
              </div>
              <button
                type="button"
                className={styles["admin-icon-button"]}
                onClick={() => setPreferencesOpen(false)}
                aria-label="Close dashboard preferences"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <p className={styles["admin-panel-footnote"]}>
              Layout preferences are saved in this browser for {email}; no
              server-side preference table is configured.
            </p>
            <div className={styles["admin-widget-preferences"]}>
              {order.map((id, index) => (
                <div className={styles["admin-widget-preference"]} key={id}>
                  <strong>{widgetLabels[id]}</strong>
                  <div>
                    <button
                      type="button"
                      className={styles["admin-icon-button"]}
                      onClick={() => moveWidget(id, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${widgetLabels[id]} up`}
                    >
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles["admin-icon-button"]}
                      onClick={() => moveWidget(id, 1)}
                      disabled={index === order.length - 1}
                      aria-label={`Move ${widgetLabels[id]} down`}
                    >
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={styles["admin-icon-button"]}
                      onClick={() => toggleWidget(id)}
                      aria-label={`${hidden.includes(id) ? "Show" : "Hide"} ${widgetLabels[id]}`}
                    >
                      {hidden.includes(id) ? (
                        <Eye size={15} aria-hidden="true" />
                      ) : (
                        <EyeOff size={15} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles["admin-modal-actions"]}>
              <button
                type="button"
                className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
                onClick={restoreDefaults}
              >
                <RotateCcw size={14} aria-hidden="true" />
                Restore defaults
              </button>
              <button
                type="button"
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
