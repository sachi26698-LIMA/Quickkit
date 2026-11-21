"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import styles from "./admin.module.css";

export default function RecoveryForm() {
  const [state, setState] = useState<
    "checking" | "request" | "update" | "success"
  >("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/admin/auth/recovery", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (r) => (r.ok ? r.json() : { valid: false }))
      .then((data) => {
        if (active) setState(data.valid === true ? "update" : "request");
      })
      .catch(() => {
        if (active) setState("request");
      });
    return () => {
      active = false;
    };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (state === "update" && password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/auth/recovery", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          state === "update"
            ? { action: "update", password, confirm }
            : { action: "request", email },
        ),
      });
      const body = await response.json();
      if (!response.ok) {
        setMessage(body.error || "Recovery is temporarily unavailable.");
        if (response.status === 401) setState("request");
        return;
      }
      if (state === "update") {
        setPassword("");
        setConfirm("");
        setState("success");
      } else
        setMessage(
          "If this address is eligible, a recovery email will be sent. Open it in this browser.",
        );
    } catch {
      setMessage("Recovery is temporarily unavailable. Try again later.");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className={styles["admin-login-wrap"]}>
      <section className={styles["admin-login"]}>
        <span className={styles["admin-kicker"]}>OWNER-ONLY ACCESS</span>
        <h1>Administrator password recovery</h1>
        {state === "checking" && (
          <p role="status">Checking your recovery session…</p>
        )}
        {state === "request" && (
          <>
            <p>
              To recover an administrator password, request a new link. Missing,
              expired, reused or invalid links cannot be used. Open the new
              email in this same browser.
            </p>
            <form onSubmit={submit} className={styles["admin-form"]}>
              <label className={styles["admin-field"]}>
                <span>Administrator email</span>
                <input
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button
                className={styles["admin-button"]}
                disabled={pending}
                type="submit"
              >
                {pending ? "Sending…" : "Send recovery email"}
              </button>
            </form>
          </>
        )}
        {state === "update" && (
          <form onSubmit={submit} className={styles["admin-form"]}>
            <p>
              Use at least 12 characters, including uppercase, lowercase and a
              number.
            </p>
            <label className={styles["admin-field"]}>
              <span>New password</span>
              <input
                type={show ? "text" : "password"}
                required
                minLength={12}
                maxLength={1024}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label className={styles["admin-field"]}>
              <span>Confirm password</span>
              <input
                type={show ? "text" : "password"}
                required
                minLength={12}
                maxLength={1024}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={show}
                onChange={(e) => setShow(e.target.checked)}
              />{" "}
              Show passwords
            </label>
            <button
              className={styles["admin-button"]}
              disabled={pending}
              type="submit"
            >
              {pending ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
        {state === "success" && (
          <p role="status">
            Your password has been updated. Sign in with your new password.
          </p>
        )}
        {message && <p role="status">{message}</p>}
        <p>
          <Link className={styles["admin-link"]} href="/admin/login">
            Back to administrator sign in
          </Link>
        </p>
      </section>
    </div>
  );
}
