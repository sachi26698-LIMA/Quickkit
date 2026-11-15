"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./admin.module.css";
type Data = {
  email: string;
  last_sign_in_at: string | null;
  allowlist_configured: boolean;
  service_role_configured: boolean;
  submission_hmac_configured: boolean;
  supabase_configured: boolean;
  database_status: string;
  rls_status: string;
  signup_disabled: boolean | null;
};
export default function SecurityOverview() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/security", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          router.replace(
            r.status === 403
              ? "/admin/login?reason=forbidden"
              : "/admin/login?reason=expired",
          );
          throw new Error(
            "Administrator access is no longer valid. Sign in again.",
          );
        }
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? "Could not inspect security");
        setData(b.data);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not inspect security"),
      );
  }, [router]);
  if (error)
    return (
      <p className={styles["admin-error"]} role="alert">
        {error}
      </p>
    );
  if (!data)
    return (
      <p className={styles["admin-state"]} role="status">
        Checking verified admin state…
      </p>
    );
  const items: [
    [string, string],
    [string, string],
    [string, string],
    [string, string],
    [string, string],
    [string, string],
    [string, string],
  ] = [
    [
      "Admin access",
      data.allowlist_configured ? "Allowlist configured" : "Not configured",
    ],
    ["Session", data.email],
    [
      "Supabase connection",
      data.supabase_configured ? data.database_status : "Not configured",
    ],
    [
      "Service role",
      data.service_role_configured
        ? "Present (value hidden)"
        : "Not configured",
    ],
    [
      "Submission rate limit",
      data.submission_hmac_configured
        ? "HMAC secret present (value hidden)"
        : "Not configured",
    ],
    ["RLS", data.rls_status],
    [
      "Public signup",
      data.signup_disabled === true
        ? "Disabled in Supabase Auth"
        : "Verify in Supabase dashboard",
    ],
  ];
  return (
    <div className={styles["admin-grid"]}>
      {items.map(([label, value]) => (
        <article className={styles["admin-card"]} key={label}>
          <h3>{label}</h3>
          <div className={styles["admin-health"]}>
            <span
              className={`${styles["admin-health-dot"]} ${value.includes("Not configured") || value.includes("Needs") ? styles["admin-health-dot--warn"] : ""}`}
            />
            <strong>{value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}
