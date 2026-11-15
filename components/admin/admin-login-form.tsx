"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import styles from "./admin.module.css";

export type AdminLoginSetupItem = {
  name: string;
  role: string;
  present: boolean;
};

export default function AdminLoginForm({
  message = "",
  disabled = false,
  setupItems = null,
}: {
  message?: string;
  disabled?: boolean;
  setupItems?: AdminLoginSetupItem[] | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error ?? "Administrator sign-in failed.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("The sign-in service is unavailable. Try again later.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {message ? (
        <div className={styles["admin-notice"]} role="status">
          {message}
        </div>
      ) : null}
      {setupItems && setupItems.length > 0 ? (
        <section
          className={styles["admin-setup-checklist"]}
          aria-label="Administrator setup checklist"
        >
          <h2>Administrator setup required</h2>
          <p>
            Protected <code>/api/admin/*</code> routes intentionally fail closed
            with HTTP 503 until required environment variables are configured
            and the server restarts. Authentication is never bypassed.
          </p>
          <ul>
            {setupItems.map((item) => (
              <li key={item.name}>
                <div>
                  <code>{item.name}</code>
                  <span>{item.role}</span>
                </div>
                <strong
                  className={
                    item.present
                      ? styles["admin-setup-present"]
                      : styles["admin-setup-missing"]
                  }
                >
                  {item.present ? "Configured" : "Missing"}
                </strong>
              </li>
            ))}
          </ul>
          <p className={styles["admin-setup-note"]}>
            See <code>.env.example</code> for exact variable names. Secret
            values are never rendered in the browser.
          </p>
        </section>
      ) : null}
      {error ? (
        <div className={styles["admin-error"]} role="alert">
          {error}
        </div>
      ) : null}
      <form className={styles["admin-form"]} onSubmit={submit}>
        <label className={styles["admin-field"]}>
          <span>Email address</span>
          <div className={styles["admin-input-icon-wrap"]}>
            <Mail size={15} aria-hidden="true" />
            <input
              type="email"
              autoComplete="username"
              required
              disabled={disabled || pending}
              maxLength={254}
              placeholder="owner@domain.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>
        <label className={styles["admin-field"]}>
          <span>Password</span>
          <div className={styles["admin-input-icon-wrap"]}>
            <Lock size={15} aria-hidden="true" />
            <input
              type="password"
              autoComplete="current-password"
              required
              disabled={disabled || pending}
              maxLength={1024}
              placeholder="Enter administrator password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </label>
        <button
          className={`${styles["admin-button"]} ${styles["admin-login-submit"]}`}
          type="submit"
          disabled={disabled || pending}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          {disabled
            ? "Sign-in unavailable until configured"
            : pending
              ? "Verifying…"
              : "Sign in to Control Center"}
        </button>
      </form>
      <p className={styles["admin-login-footnote"]}>
        Access is limited to explicitly allowlisted administrators. Public
        registration is disabled.
      </p>
    </>
  );
}
