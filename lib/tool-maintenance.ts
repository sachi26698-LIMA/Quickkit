/**
 * Per-tool maintenance mode ("temporarily off").
 *
 * An administrator can switch a single tool off while it is being worked on
 * and leave a short note for visitors. The state lives in the existing
 * `metadata_override` JSON column of `quickkit_admin_tool_overrides`, under
 * the `maintenance` key, so no schema change is needed:
 *
 *   { "maintenance": { "enabled": true, "reason": "…", "since": "<ISO date>" } }
 *
 * The tool stays in the catalogue and keeps its URL; visitors who open it see
 * a notice with the reason instead of being able to use the workspace.
 */
export const TOOL_MAINTENANCE_REASON_MAX = 300;

/** Shown to visitors when the administrator did not write a reason. */
export const TOOL_MAINTENANCE_DEFAULT_REASON =
  "We are improving this tool right now. Please check back in a little while.";

export type ToolMaintenance = {
  /** Administrator's note for visitors. Empty when none was written. */
  reason: string;
  /** ISO timestamp of when the tool was switched off, when known. */
  since: string | null;
};

export type StoredToolMaintenance = ToolMaintenance & { enabled: boolean };

function cleanReason(value: unknown): string {
  if (typeof value !== "string") return "";
  const text = value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  return text.length <= TOOL_MAINTENANCE_REASON_MAX ? text : "";
}

function cleanSince(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

/** Reads the stored state, whether or not the tool is currently off. */
export function readStoredToolMaintenance(
  metadata: unknown,
): StoredToolMaintenance {
  const off: StoredToolMaintenance = {
    enabled: false,
    reason: "",
    since: null,
  };
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return off;
  const raw = (metadata as Record<string, unknown>).maintenance;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return off;
  const value = raw as Record<string, unknown>;
  const enabled = value.enabled === true;
  return {
    enabled,
    reason: cleanReason(value.reason),
    since: enabled ? cleanSince(value.since) : null,
  };
}

/** The visitor-facing state: `null` unless the tool is switched off. */
export function readToolMaintenance(metadata: unknown): ToolMaintenance | null {
  const stored = readStoredToolMaintenance(metadata);
  return stored.enabled ? { reason: stored.reason, since: stored.since } : null;
}

/**
 * Returns a copy of `metadata` with the maintenance state replaced. Other
 * keys are preserved. The last reason is kept while the tool is on, so it can
 * be reused the next time the tool is switched off.
 */
export function withToolMaintenance(
  metadata: unknown,
  next: { enabled: boolean; reason: string; since: string | null },
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  base.maintenance = {
    enabled: next.enabled,
    reason: cleanReason(next.reason),
    ...(next.enabled && next.since ? { since: next.since } : {}),
  };
  return base;
}
