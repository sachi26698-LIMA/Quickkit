"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./admin.module.css";

const items = [
  ["/admin", "Overview"],
  ["/admin/tools", "Tools"],
  ["/admin/categories", "Categories"],
  ["/admin/submissions", "Submissions"],
  ["/admin/feedback", "Feedback"],
  ["/admin/seo", "SEO"],
  ["/admin/site-settings", "Site settings"],
  ["/admin/security", "Security"],
  ["/admin/activity", "Activity"],
  ["/admin/profile", "Profile"],
] as const;

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/admin/login?loggedOut=1");
    }
  }
  const nav = (className: string) => (
    <nav className={className} aria-label="Master admin navigation">
      {items.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href ||
            (href !== "/admin" && pathname.startsWith(`${href}/`))
              ? "page"
              : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
  const title =
    items.find(([href]) => pathname === href)?.[1] ?? "Master Admin";
  return (
    <div className={styles["admin-layout"]}>
      <aside className={styles["admin-sidebar"]}>
        <div className={styles["admin-sidebar-brand"]}>
          <strong>QUICKKIT</strong>
          <span>Master Admin</span>
        </div>
        {nav(styles["admin-nav"])}
        <div className={styles["admin-side-bottom"]}>
          <small>{email}</small>
          <button
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            onClick={logout}
            disabled={pending}
          >
            {pending ? "Signing out…" : "Secure logout"}
          </button>
        </div>
      </aside>
      <div className={styles["admin-main"]}>
        <header className={styles["admin-topbar"]}>
          <h1>{title}</h1>
          <span className={styles["admin-badge"]}>
            Authorized administrator
          </span>
        </header>
        <main className={styles["admin-content"]}>{children}</main>
      </div>
      {nav(styles["admin-mobile-nav"])}
    </div>
  );
}
