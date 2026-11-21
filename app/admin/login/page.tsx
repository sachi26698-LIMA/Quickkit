import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandSymbol } from "@/components/brand-logo";
import AdminLoginForm from "@/components/admin/admin-login-form";
import styles from "@/components/admin/admin.module.css";
import {
  getAdminSetupReadiness,
  verifyAdminSession,
} from "@/lib/supabase/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ loggedOut?: string; reason?: string }>;
}) {
  const auth = await verifyAdminSession();
  if (auth.status === "authorized") redirect("/admin");
  const params = await searchParams;
  const unconfigured =
    auth.status === "allowlist_not_configured" ||
    auth.status === "supabase_not_configured";
  const setup = unconfigured ? getAdminSetupReadiness() : null;

  const message =
    params.loggedOut === "1"
      ? "You have been securely signed out."
      : params.reason === "forbidden"
        ? "This account is not authorized for administrator access."
        : params.reason === "expired"
          ? "Your administrator session expired. Sign in again to continue."
          : auth.status === "allowlist_not_configured"
            ? "Admin sign-in is unavailable until the owner configures the server-only QUICKKIT_ADMIN_EMAILS allowlist."
            : auth.status === "supabase_not_configured"
              ? "Admin sign-in is unavailable until the Supabase URL and publishable key are configured."
              : auth.status === "unavailable"
                ? "Supabase authentication is temporarily unavailable."
                : "Only explicitly approved QUICKKIT administrators can sign in here.";

  const setupItems = setup
    ? [
        {
          name: "QUICKKIT_ADMIN_EMAILS",
          role: "Server-only owner email allowlist",
          present: setup.allowlistConfigured,
        },
        {
          name: "NEXT_PUBLIC_SUPABASE_URL",
          role: "Supabase project URL",
          present: setup.supabaseUrlConfigured,
        },
        {
          name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
          role: "Supabase publishable key",
          present: setup.supabaseKeyConfigured,
        },
        {
          name: "SUPABASE_SERVICE_ROLE_KEY",
          role: "Server-only privileged database key",
          present: setup.serviceRoleConfigured,
        },
      ]
    : null;

  return (
    <div className={styles["admin-login-wrap"]}>
      <div className={styles["admin-login-glow"]} aria-hidden="true" />
      <section className={styles["admin-login"]}>
        <Link href="/" className={styles["admin-login-brand"]}>
          <span className={styles["admin-brand-mark"]} aria-hidden="true">
            <BrandSymbol width={38} height={38} />
          </span>
          <span>
            <strong>QUICKKIT</strong>
            <small>CONTROL CENTER</small>
          </span>
        </Link>
        <span className={styles["admin-kicker"]}>OWNER-ONLY ACCESS</span>
        <h1>Administrator sign in</h1>
        <p>
          This workspace is restricted to allowlisted owners. Public
          registration is disabled and no visitor account is required to use
          QUICKKIT tools.
        </p>
        <AdminLoginForm
          message={message}
          disabled={unconfigured}
          setupItems={setupItems}
        />
        <p className={styles["admin-login-back"]}>
          <Link href="/" className={styles["admin-link"]}>
            <ArrowLeft size={14} aria-hidden="true" />
            Return to public tools
          </Link>
        </p>
      </section>
    </div>
  );
}
