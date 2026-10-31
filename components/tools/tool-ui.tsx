"use client";
import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { downloadText } from "@/lib/tools/download";

/** Shared workspace header used by every tool. */
export function WorkspaceHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="workspace-heading">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <span className="local-badge">Local processing</span>
    </div>
  );
}

/** Download the current text output as a file. Disabled when empty. */
export function DownloadTextButton({
  text,
  filename,
  label = "Download .txt",
  mimeType,
}: {
  text: string;
  filename: string;
  label?: string;
  mimeType?: string;
}) {
  return (
    <button
      type="button"
      className="secondary"
      disabled={!text}
      onClick={() => downloadText(text, filename, mimeType)}
    >
      <Download size={15} /> {label}
    </button>
  );
}

/** Live "n / max" counter for text inputs. */
export function CharMeter({
  value,
  max,
  label = "characters",
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const near = value > max * 0.9;
  return (
    <span className={near ? "char-meter near-limit" : "char-meter"}>
      {value.toLocaleString()} / {max.toLocaleString()} {label}
    </span>
  );
}

/** Consistent empty state for result panels. */
export function EmptyState({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      {icon}
      <p>{children}</p>
    </div>
  );
}
