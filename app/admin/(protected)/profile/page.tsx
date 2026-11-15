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
      <section className={styles["admin-card"]}>
        <span className={styles["admin-kicker"]}>ALLOWLISTED ADMIN</span>
        <p className={styles["admin-profile-email"]}>{auth.admin.email}</p>
        <p>
          Supabase user ID:{" "}
          <code className={styles["admin-code"]}>{auth.admin.id}</code>
        </p>
        <p>
          Last sign-in:{" "}
          {auth.admin.lastSignInAt
            ? new Date(auth.admin.lastSignInAt).toLocaleString()
            : "Not reported by Supabase"}
        </p>
        <p>
          Role is derived from the server-side email allowlist, not
          client-provided metadata.
        </p>
      </section>
    </>
  );
}
