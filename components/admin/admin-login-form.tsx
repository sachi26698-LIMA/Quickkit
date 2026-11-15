"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import styles from "./admin.module.css";

export default function AdminLoginForm({ message = "" }: { message?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
          disabled={pending}
        >
          <ShieldCheck size={16} aria-hidden="true" />
          {pending ? "Verifying…" : "Sign in to Control Center"}
        </button>
      </form>
      <p className={styles["admin-login-footnote"]}>
        Access is limited to explicitly allowlisted administrators. Public
        registration is disabled.
      </p>
    </>
  );
}
