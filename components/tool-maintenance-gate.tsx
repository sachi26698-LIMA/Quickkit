"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Clock3, Eye, Home, Wrench } from "lucide-react";
import { tools } from "@/lib/catalog";
import { TOOL_MAINTENANCE_DEFAULT_REASON } from "@/lib/tool-maintenance";
import { toolTheme, toolThemeStyle } from "@/lib/tool-theme";
import styles from "./tool-maintenance-gate.module.css";

export type ToolMaintenanceNotice = {
  slug: string;
  name: string;
  /** Administrator's note. Empty means "use the default wording". */
  reason: string;
  since: string | null;
};

/**
 * Shows a blocking notice on a tool an administrator has switched off.
 *
 * The page underneath stays rendered (its guide and answers remain available
 * to search engines) but cannot be used: a modal dialog makes everything
 * behind it inert. Visitors can leave through the two links; a signed-in
 * administrator can dismiss the notice to check their work.
 */
export default function ToolMaintenanceGate({
  notices,
  adminPreview = false,
}: {
  notices: ToolMaintenanceNotice[];
  adminPreview?: boolean;
}) {
  const pathname = usePathname();
  const slug = pathname.startsWith("/tools/") ? pathname.slice(7) : "";
  const notice = notices.find((item) => item.slug === slug);
  return notice ? (
    <MaintenanceNotice
      key={notice.slug}
      notice={notice}
      adminPreview={adminPreview}
    />
  ) : null;
}

function MaintenanceNotice({
  notice,
  adminPreview,
}: {
  notice: ToolMaintenanceNotice;
  adminPreview: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [previewing, setPreviewing] = useState(false);
  // Formatted after mount: the server's locale and time zone differ from the
  // visitor's, and the text must match what hydration expects.
  const [since, setSince] = useState("");
  const category = tools.find((tool) => tool.slug === notice.slug)?.category;
  const theme = category ? toolTheme(notice.slug, category) : null;

  useEffect(() => {
    if (!notice.since) return;
    const date = new Date(notice.since);
    if (Number.isNaN(date.getTime())) return;
    const id = window.setTimeout(
      () =>
        setSince(
          date.toLocaleString(undefined, {
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
          }),
        ),
      0,
    );
    return () => window.clearTimeout(id);
  }, [notice.since]);

  useEffect(() => {
    const modal = dialog.current;
    if (!modal || previewing) return;
    if (!modal.open) modal.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      if (modal.open) modal.close();
    };
  }, [previewing]);

  if (previewing)
    return (
      <div className={styles.banner} role="status">
        <Wrench size={15} aria-hidden="true" />
        <span>
          <strong>{notice.name} is switched off.</strong> Visitors see the
          maintenance notice; you are previewing as an administrator.
        </span>
        <button type="button" onClick={() => setPreviewing(false)}>
          Show notice
        </button>
      </div>
    );

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      style={theme ? toolThemeStyle(theme) : undefined}
      data-tool-maintenance={notice.slug}
      aria-labelledby={`maintenance-title-${notice.slug}`}
      aria-describedby={`maintenance-description-${notice.slug}`}
      // The tool is off, so Escape must not reveal a usable workspace.
      onCancel={(event) => event.preventDefault()}
      onClose={() => {
        // Browsers may let a second Escape through; put the notice back.
        if (!previewing && dialog.current && !dialog.current.open)
          dialog.current.showModal();
      }}
    >
      <div className={styles.card}>
        <span className={styles.badge} aria-hidden="true">
          <Wrench size={30} strokeWidth={1.8} />
        </span>
        <span className={styles.eyebrow}>Work in progress</span>
        <h2 id={`maintenance-title-${notice.slug}`}>
          {notice.name} is temporarily off
        </h2>
        <p
          className={styles.lead}
          id={`maintenance-description-${notice.slug}`}
        >
          We are working on this tool right now, so it is switched off for a
          short while. Please check back soon — thank you for your patience.
        </p>
        <div className={styles.reason}>
          <span>Note from the QUICKKIT team</span>
          <p>{notice.reason || TOOL_MAINTENANCE_DEFAULT_REASON}</p>
        </div>
        {since ? (
          <p className={styles.since}>
            <Clock3 size={13} aria-hidden="true" /> Switched off on {since}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Link className={styles.primary} href="/tools">
            Browse other tools <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className={styles.secondary} href="/">
            <Home size={15} aria-hidden="true" /> Back to home
          </Link>
        </div>
        {adminPreview ? (
          <button
            className={styles.preview}
            type="button"
            onClick={() => setPreviewing(true)}
          >
            <Eye size={14} aria-hidden="true" /> Preview the tool as
            administrator
          </button>
        ) : null}
      </div>
    </dialog>
  );
}
