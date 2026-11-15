import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clock,
  Fingerprint,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { verifyAdminSession } from "@/lib/supabase/admin-auth";
import { PageHeading } from "@/components/admin/admin-page";
import styles from "@/components/admin/admin.module.css";

export default async function AdminProfilePage() {
  const auth = await verifyAdminSession();
  if (auth.status !== "authorized") return null;

  return (
    <>
      <PageHeading
        title="Administrator profile"
        description="Session identity is verified server-side with Supabase Auth and the server-only allowlist."
      />
      <section className={styles["admin-profile-hero"]}>
        <span className={styles["admin-profile-avatar"]} aria-hidden="true">
          {auth.admin.email.slice(0, 1).toUpperCase()}
        </span>
        <div className={styles["admin-profile-copy"]}>
          <span className={styles["admin-kicker"]}>ALLOWLISTED OWNER</span>
          <h3 className={styles["admin-profile-email-lg"]}>
            {auth.admin.email}
          </h3>
          <p>
            Administrator authorization is derived exclusively from the
            server-side email allowlist — never from client-supplied claims or
            profile metadata.
          </p>
        </div>
        <div className={styles["admin-row-actions"]}>
          <Link
            href="/admin/security"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
          >
            <ShieldCheck size={15} aria-hidden="true" />
            Security center
          </Link>
          <Link href="/admin/activity" className={styles["admin-button"]}>
            <Activity size={15} aria-hidden="true" />
            Activity log
          </Link>
        </div>
      </section>

      <div className={styles["admin-profile-grid"]}>
        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
              aria-hidden="true"
            >
              <Mail size={15} />
            </span>
            <h3>Verified email</h3>
          </div>
          <p className={styles["admin-card-value"]}>{auth.admin.email}</p>
          <small className={styles["admin-card-note"]}>
            Matched against QUICKKIT_ADMIN_EMAILS on the server.
          </small>
        </article>

        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--teal"]}`}
              aria-hidden="true"
            >
              <Fingerprint size={15} />
            </span>
            <h3>Supabase user ID</h3>
          </div>
          <p className={styles["admin-card-value"]}>
            <code className={styles["admin-code"]}>{auth.admin.id}</code>
          </p>
          <small className={styles["admin-card-note"]}>
            Recorded as actor_id on persisted administrative changes.
          </small>
        </article>

        <article className={styles["admin-card"]}>
          <div className={styles["admin-security-card-head"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--rose"]}`}
              aria-hidden="true"
            >
              <Clock size={15} />
            </span>
            <h3>Last sign-in</h3>
          </div>
          <p className={styles["admin-card-value"]}>
            {auth.admin.lastSignInAt
              ? new Date(auth.admin.lastSignInAt).toLocaleString()
              : "Not reported by Supabase"}
          </p>
          <small className={styles["admin-card-note"]}>
            <Link href="/admin/security" className={styles["admin-link"]}>
              Inspect session boundaries{" "}
              <ArrowUpRight size={12} aria-hidden="true" />
            </Link>
          </small>
        </article>
      </div>
    </>
  );
}
