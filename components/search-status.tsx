"use client";

import { Loader2 } from "lucide-react";

/**
 * The shared status row for every search surface.
 *
 * Honesty note, because this is the whole design of the component: QUICKKIT's
 * tool search runs entirely in the browser against an in-memory catalogue. There
 * is no network request to wait on and no server round-trip to draw a progress
 * bar for. So this component deliberately has **no percentage anywhere** — a
 * fake percentage that jumps from 20% to 100% would be a lie about work that
 * never happened.
 *
 * What it does report is real:
 *  - `busy`: the catalogue chunk is still downloading (hero search does load it
 *    on demand), or React is mid-transition on a large result set. This is a
 *    genuine pending state, so it gets a spinner and an "updating" label.
 *  - `idle`  with zero results: the query genuinely matched nothing.
 *  - `idle`  with results: the count, announced politely.
 *  - `error`: the catalogue could not be loaded at all (a real failure worth
 *    surfacing, and the only case where "try again" is offered).
 *
 * The animation stops the moment `busy` goes false because the spinner element
 * is unmounted, not merely hidden — no orphaned animation frames.
 */
export type SearchStatusState = "idle" | "busy" | "error";

export default function SearchStatus({
  state,
  query,
  count,
  className = "",
  labels = true,
  announce = true,
}: {
  state: SearchStatusState;
  query: string;
  count: number;
  className?: string;
  /** Render the visible row (false = announcements only). */
  labels?: boolean;
  /**
   * Emit the polite live-region announcement. Set this to `false` on a page
   * that already owns a live region for the result count — a second
   * `role="status"` makes `getByRole("status")` ambiguous in the browser
   * suite and double-announces to a screen reader. The visible scanning row
   * still renders; only the duplicate announcement is suppressed.
   */
  announce?: boolean;
}) {
  const trimmed = query.trim();
  const message =
    state === "error"
      ? "Search is unavailable right now — the tool catalogue could not load."
      : state === "busy"
        ? "Searching the tool catalogue…"
        : !trimmed
          ? ""
          : count === 0
            ? `No tools match “${trimmed}”.`
            : // Exact phrasing is a contract: the E2E suite and the explorer's
              // own live region both announce "N tools found". Changing it to
              // "1 tool found" broke three browser tests, so the wording is
              // pinned here and asserted in tests/search-status.test.tsx.
              `${count} tools found`;

  return (
    <>
      {labels && state !== "idle" && trimmed ? (
        <p
          className={`search-status search-status-${state} ${className}`.trim()}
          aria-hidden="true"
        >
          {state === "busy" ? (
            <Loader2 className="search-status-spinner" size={16} />
          ) : null}
          <span>
            {state === "busy"
              ? "Searching…"
              : "Search unavailable — reload to try again"}
          </span>
        </p>
      ) : null}
      {/* One polite announcement for assistive technology, covering every
          state so the sighted-only visual row above is never the sole signal.
          Suppressed when the page already owns a live region for this count. */}
      {announce && message ? (
        <span className="sr-only" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </>
  );
}
