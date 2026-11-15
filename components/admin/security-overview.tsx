"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Database,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAdminLive } from "./admin-live-context";
import styles from "./admin.module.css";

type SecurityData = {
  email: string;
  last_sign_in_at: string | null;
  allowlist_configured: boolean;
  service_role_configured: boolean;
  submission_hmac_configured: boolean;
  supabase_configured: boolean;
  database_status: string;
  rls_status: string;
  signup_disabled: boolean | null;
  checked_at?: string;
  analytics_url_present?: boolean;
  analytics_token_present?: boolean;
  sitemap_origin_configured?: boolean;
  indexing_enabled?: boolean;
  smtp_status?: string;
  error_monitoring_status?: string;
};

type SecurityCheckItem = {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "warn" | "neutral";
  icon: LucideIcon;
  href?: string;
  actionLabel?: string;
};

export default function SecurityOverview() {
  const router = useRouter();
  const { registerRefreshHandler, setSyncSnapshot, pushToast } = useAdminLive();
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (manual = false) => {
      setLoading(true);
      setError("");
      setSyncSnapshot({ refreshing: true });
      try {
        const response = await fetch("/api/admin/security", {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (response.status === 401 || response.status === 403) {
          router.replace(
            response.status === 403
              ? "/admin/login?reason=forbidden"
              : "/admin/login?reason=expired",
          );
          throw new Error(
            "Administrator access is no longer valid. Sign in again.",
          );
        }
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Could not inspect security");
        setData(body.data);
        setSyncSnapshot({ syncState: "connected", lastSynced: Date.now() });
        if (manual) {
          pushToast({
            tone: "success",
            title: "Security status refreshed",
            description: "Server-verified boundary checks updated.",
          });
        }
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Could not inspect security";
        setError(msg);
        setSyncSnapshot({ syncState: "stale" });
      } finally {
        setLoading(false);
        setSyncSnapshot({ refreshing: false });
      }
    },
    [router, setSyncSnapshot, pushToast],
  );

  useEffect(() => {
    const id = window.setTimeout(() => void load(false), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  useEffect(
    () => registerRefreshHandler(() => load(true)),
    [registerRefreshHandler, load],
  );

  if (error)
    return (
      <div className={styles["admin-error"]} role="alert">
        <span>{error}</span>
        <button
          type="button"
          className={styles["admin-link"]}
          onClick={() => void load(true)}
        >
          Retry
        </button>
      </div>
    );

  if (loading && !data)
    return (
      <div className={styles["admin-skeleton-panel"]} role="status">
        <span className={styles["admin-visually-hidden"]}>
          Checking verified admin state…
        </span>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className={styles["admin-skeleton-row"]} key={index}>
            <span className={styles["admin-skeleton-bar"]} />
            <span className={styles["admin-skeleton-bar"]} />
          </div>
        ))}
      </div>
    );

  if (!data) return null;

  const accessItems: SecurityCheckItem[] = [
    {
      label: "Admin email allowlist",
      value: data.allowlist_configured
        ? "Configured (server-only)"
        : "Not configured",
      detail:
        "Enforced server-side via QUICKKIT_ADMIN_EMAILS on every route and API call.",
      tone: data.allowlist_configured ? "good" : "warn",
      icon: ShieldCheck,
    },
    {
      label: "Active owner session",
      value: data.email,
      detail: data.last_sign_in_at
        ? `Last sign-in recorded ${new Date(data.last_sign_in_at).toLocaleString()}`
        : "Authenticated via server-verified Supabase Auth cookie.",
      tone: "good",
      icon: UserCheck,
      href: "/admin/profile",
      actionLabel: "View profile",
    },
    {
      label: "Public registration",
      value:
        data.signup_disabled === true
          ? "Disabled in Supabase Auth"
          : "Verify in Supabase dashboard",
      detail:
        "App exposes no admin signup flow; confirm Auth signups remain disabled in Supabase.",
      tone: data.signup_disabled === true ? "good" : "warn",
      icon: Lock,
    },
  ];

  const infrastructureItems: SecurityCheckItem[] = [
    {
      label: "Supabase connection",
      value: data.supabase_configured ? data.database_status : "Not configured",
      detail:
        "Checked directly via a read-only server query against quickkit_admin_activity.",
      tone:
        data.supabase_configured && data.database_status === "Connected"
          ? "good"
          : "warn",
      icon: Database,
    },
    {
      label: "Service role credential",
      value: data.service_role_configured
        ? "Present on server (value hidden)"
        : "Not configured",
      detail:
        "Restricted strictly to server-only route handlers; never sent to browser code.",
      tone: data.service_role_configured ? "good" : "warn",
      icon: KeyRound,
    },
    {
      label: "Submission rate-limit HMAC",
      value: data.submission_hmac_configured
        ? "HMAC secret present (value hidden)"
        : "Not configured",
      detail:
        "Protects public contact & feedback forms using hashed rate-limit buckets.",
      tone: data.submission_hmac_configured ? "good" : "warn",
      icon: ShieldCheck,
    },
  ];

  const boundaryItems: SecurityCheckItem[] = [
    {
      label: "Row Level Security (RLS)",
      value: data.rls_status,
      detail:
        "Migration 202611100002 enables RLS and denies anon/authenticated roles; verify live catalog in Supabase.",
      tone: "warn",
      icon: ShieldAlert,
    },
    {
      label: "Email delivery (SMTP)",
      value:
        data.smtp_status ??
        "Managed externally in Supabase Auth · not verified by app",
      detail:
        "No SMTP credentials are stored or inspected in this Next.js runtime.",
      tone: "neutral",
      icon: Mail,
    },
    {
      label: "Error monitoring & analytics",
      value: data.error_monitoring_status ?? "Not configured",
      detail:
        "Analytics and error telemetry remain explicitly off until separately configured.",
      tone: "neutral",
      icon: ShieldAlert,
      href: "/admin/analytics",
      actionLabel: "Analytics status",
    },
  ];

  return (
    <div className={styles["admin-settings-stack"]}>
      <div className={styles["admin-cms-toolbar"]}>
        <p>
          Server-verified operational security posture. Secret values are never
          returned by the API or rendered in the browser.
          {data.checked_at
            ? ` Last checked ${new Date(data.checked_at).toLocaleTimeString()}.`
            : ""}
        </p>
        <button
          type="button"
          className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
          onClick={() => void load(true)}
          disabled={loading}
        >
          <RefreshCw
            size={14}
            className={loading ? styles["admin-spin"] : ""}
            aria-hidden="true"
          />
          Re-run checks
        </button>
      </div>

      <SecurityGroup title="Access & identity" items={accessItems} />
      <SecurityGroup
        title="Infrastructure & server boundaries"
        items={infrastructureItems}
      />
      <SecurityGroup
        title="External verifications required"
        items={boundaryItems}
      />
    </div>
  );
}

function SecurityGroup({
  title,
  items,
}: {
  title: string;
  items: SecurityCheckItem[];
}) {
  return (
    <section className={styles["admin-panel"]}>
      <div className={styles["admin-panel-heading"]}>
        <h3>{title}</h3>
      </div>
      <div className={styles["admin-security-grid"]}>
        {items.map((item) => (
          <article className={styles["admin-security-card"]} key={item.label}>
            <div className={styles["admin-security-card-head"]}>
              <span
                className={`${styles["admin-panel-badge"]} ${
                  item.tone === "good"
                    ? styles["admin-panel-badge--teal"]
                    : item.tone === "warn"
                      ? styles["admin-panel-badge--rose"]
                      : styles["admin-panel-badge--violet"]
                }`}
                aria-hidden="true"
              >
                <item.icon size={15} />
              </span>
              <h4>{item.label}</h4>
            </div>
            <div className={styles["admin-health"]}>
              <span
                className={`${styles["admin-health-dot"]} ${styles[`admin-health-dot--${item.tone}`]}`}
                aria-hidden="true"
              />
              <strong>{item.value}</strong>
            </div>
            <p className={styles["admin-security-detail"]}>{item.detail}</p>
            {item.href && item.actionLabel ? (
              <Link className={styles["admin-link"]} href={item.href}>
                {item.actionLabel} <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
