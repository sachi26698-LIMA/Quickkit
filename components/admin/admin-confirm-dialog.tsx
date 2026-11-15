"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import styles from "./admin.module.css";

export type AdminConfirmConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  targetLabel?: string;
  tone?: "danger" | "warning";
  onConfirm: () => Promise<void> | void;
};

export function AdminConfirmDialog({
  config,
  pending = false,
  onClose,
}: {
  config: AdminConfirmConfig | null;
  pending?: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!config) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    cancelBtnRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );
        const items = [...(focusables ?? [])];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [config, pending, onClose]);

  if (!config) return null;
  const isDanger = config.tone !== "warning";

  return (
    <div
      className={styles["admin-modal-backdrop"]}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className={`${styles["admin-modal"]} ${styles["admin-confirm-dialog"]}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        aria-describedby="admin-confirm-description"
      >
        <div className={styles["admin-confirm-header"]}>
          <span
            className={`${styles["admin-confirm-icon"]} ${isDanger ? styles["admin-confirm-icon--danger"] : styles["admin-confirm-icon--warning"]}`}
            aria-hidden="true"
          >
            {isDanger ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
          </span>
          <div className={styles["admin-confirm-copy"]}>
            <span className={styles["admin-kicker"]}>
              {isDanger ? "DESTRUCTIVE ACTION" : "CONFIRM ACTION"}
            </span>
            <h3 id="admin-confirm-title">{config.title}</h3>
          </div>
          <button
            type="button"
            className={styles["admin-icon-button"]}
            onClick={onClose}
            disabled={pending}
            aria-label="Close confirmation dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <p
          id="admin-confirm-description"
          className={styles["admin-confirm-description"]}
        >
          {config.description}
        </p>
        {config.targetLabel ? (
          <div className={styles["admin-confirm-target"]}>
            <span>Target record</span>
            <code className={styles["admin-code"]}>{config.targetLabel}</code>
          </div>
        ) : null}
        <div className={styles["admin-modal-actions"]}>
          <button
            ref={cancelBtnRef}
            type="button"
            className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
            onClick={onClose}
            disabled={pending}
          >
            {config.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            className={`${styles["admin-button"]} ${isDanger ? styles["admin-button--danger"] : styles["admin-button--warn"]}`}
            onClick={() => void config.onConfirm()}
            disabled={pending}
          >
            {pending ? "Processing…" : config.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
