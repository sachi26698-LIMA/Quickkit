"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportClientError } from "@/lib/monitoring/client-report";
import { captureHandledError } from "@/lib/monitoring/error-reporter";
import styles from "@/components/admin/admin.module.css";

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureHandledError(error, "admin");
    reportClientError(error, "admin");
  }, [error]);

  return (
    <div className={styles["admin-login-wrap"]}>
      <section className={styles["admin-login"]} role="alert">
        <span className={styles["admin-kicker"]}>WORKSPACE RECOVERY</span>
        <h1>Admin view encountered an error</h1>
        <p>
          This workspace screen could not finish rendering. No credentials or
          sensitive data were exposed. Retry loading the view or return to the
          Control Center overview.
        </p>
        <div className={styles["admin-action-row"]}>
          <button
            type="button"
            className={styles["admin-button"]}
            onClick={reset}
          >
            Try again
          </button>
          <Link
            href="/admin"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
          >
            Back to overview
          </Link>
        </div>
      </section>
    </div>
  );
}
