"use client";

import { Power, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./admin.module.css";
import type { AdminTool } from "@/lib/supabase/admin-data";
import {
  TOOL_MAINTENANCE_DEFAULT_REASON,
  TOOL_MAINTENANCE_REASON_MAX,
} from "@/lib/tool-maintenance";
import { AdminModalLayer } from "./admin-modal-layer";

/**
 * Switches one tool off (or back on) and edits the note visitors see while it
 * is off. The tool stays in the catalogue; its page shows a notice instead.
 */
export function AdminToolMaintenanceDialog({
  tool,
  saving,
  close,
  save,
}: {
  tool: AdminTool;
  saving: boolean;
  close: () => void;
  save: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [reason, setReason] = useState(tool.maintenance_reason);
  const isOff = tool.maintenance_enabled;
  const trimmed = reason.trim();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !saving) close();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, saving]);

  return (
    <AdminModalLayer>
      <div
        className={styles["admin-modal-backdrop"]}
        role="presentation"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) close();
        }}
      >
        <section
          className={`${styles["admin-modal"]} ${styles["admin-modal--narrow"]}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-maintenance-title"
        >
          <div className={styles["admin-modal-head"]}>
            <div>
              <span className={styles["admin-kicker"]}>TOOL STATUS</span>
              <h3 id="admin-maintenance-title">
                {isOff
                  ? `${tool.name} is switched off`
                  : `Turn off ${tool.name}`}
              </h3>
            </div>
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
              onClick={close}
              disabled={saving}
            >
              <X size={14} aria-hidden="true" />
              Close
            </button>
          </div>
          <form
            className={`${styles["admin-form"]} ${styles["admin-modal-form"]}`}
            onSubmit={(event) => {
              event.preventDefault();
              void save({
                slug: tool.slug,
                maintenance_enabled: true,
                maintenance_reason: trimmed,
              });
            }}
          >
            <div className={styles["admin-modal-body"]}>
              <p className={styles["admin-field-hint"]}>
                {isOff
                  ? "Visitors who open this tool currently see a popup saying work is in progress, with the note below. The tool stays listed and keeps its address."
                  : "Use this while you are updating the tool. Visitors who open it will see a popup saying work is in progress, with your note, and cannot use it until you turn it back on. The tool stays listed and keeps its address."}
              </p>
              <label>
                Reason shown to visitors
                <textarea
                  maxLength={TOOL_MAINTENANCE_REASON_MAX}
                  rows={3}
                  value={reason}
                  placeholder="For example: We are adding new features. Back by 6 PM today."
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <p className={styles["admin-character-guidance"]}>
                {reason.length}/{TOOL_MAINTENANCE_REASON_MAX} characters ·
                optional
              </p>
              <div className={styles["admin-maintenance-preview"]}>
                <span>
                  <Wrench size={13} aria-hidden="true" /> Visitors will read
                </span>
                <p>{trimmed || TOOL_MAINTENANCE_DEFAULT_REASON}</p>
              </div>
              {isOff && tool.maintenance_since ? (
                <p className={styles["admin-field-hint"]}>
                  Switched off since{" "}
                  {new Date(tool.maintenance_since).toLocaleString()}.
                </p>
              ) : null}
            </div>
            <div className={styles["admin-modal-actions"]}>
              <button
                className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
                type="button"
                onClick={close}
                disabled={saving}
              >
                Cancel
              </button>
              {isOff ? (
                <>
                  <button
                    className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
                    type="submit"
                    disabled={saving || trimmed === tool.maintenance_reason}
                  >
                    Update note
                  </button>
                  <button
                    className={styles["admin-button"]}
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      void save({
                        slug: tool.slug,
                        maintenance_enabled: false,
                      })
                    }
                  >
                    <Power size={14} aria-hidden="true" />
                    {saving ? "Saving…" : "Turn tool back on"}
                  </button>
                </>
              ) : (
                <button
                  className={`${styles["admin-button"]} ${styles["admin-button--warn"]}`}
                  type="submit"
                  disabled={saving}
                >
                  <Power size={14} aria-hidden="true" />
                  {saving ? "Saving…" : "Turn tool off"}
                </button>
              )}
            </div>
          </form>
        </section>
      </div>
    </AdminModalLayer>
  );
}
