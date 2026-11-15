"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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
        <label>
          Email address
          <input
            type="email"
            autoComplete="username"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            maxLength={1024}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button
          className={styles["admin-button"]}
          type="submit"
          disabled={pending}
        >
          {pending ? "Verifying…" : "Sign in to Master Admin"}
        </button>
      </form>
      <p>
        Access is limited to explicitly allowlisted administrators. Public
        registration is disabled.
      </p>
    </>
  );
}
