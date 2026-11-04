"use client";
import { useState } from "react";
import {
  resolveZonedTime,
  formatZonedTime,
} from "@/lib/tools/phase9-timezones";
import { downloadText } from "@/lib/tools/download";
import { csvCell } from "@/lib/tools/phase9-v2-advanced";
export default function TimeZones() {
  const [local, setLocal] = useState("");
  const [source, setSource] = useState("Asia/Kolkata");
  const [dest, setDest] = useState("Europe/London, America/New_York");
  const [fold, setFold] = useState<"reject" | "earlier" | "later">("reject");
  const [hour12, setHour12] = useState(false);
  const [notice, setNotice] = useState("");
  let rows: { zone: string; display: string }[] = [],
    error = "",
    utc = "",
    ambiguous = false;
  try {
    if (local) {
      const zones = dest.split(",").map((x) => x.trim());
      if (zones.length < 1 || zones.length > 10 || zones.some((x) => !x))
        throw new Error("Enter 1–10 comma-separated IANA time zones.");
      const r = resolveZonedTime(local, source, fold);
      utc = r.instant.toISOString();
      ambiguous = r.ambiguous;
      rows = zones.map((zone) => ({
        zone,
        display: formatZonedTime(r.instant, zone, hour12),
      }));
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid time zone.";
  }
  const summary = rows.map((r) => `${r.zone}: ${r.display}`).join("\n");
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="timezone-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">MEETING PLANNER</span>
          <h2 id="timezone-heading">Compare time zones</h2>
          <p>
            Convert one local meeting time to multiple IANA time zones (years
            1900–2099).
          </p>
        </div>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Meeting local date and time
            <input
              type="datetime-local"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
            />
          </label>
          <label>
            Source IANA time zone
            <input value={source} onChange={(e) => setSource(e.target.value)} />
          </label>
          <label>
            Destination IANA time zones (comma separated)
            <input value={dest} onChange={(e) => setDest(e.target.value)} />
          </label>
          <label>
            Repeated time occurrence
            <select
              value={fold}
              onChange={(e) => setFold(e.target.value as typeof fold)}
            >
              <option value="reject">Ask when ambiguous</option>
              <option value="earlier">Earlier occurrence</option>
              <option value="later">Later occurrence</option>
            </select>
          </label>
          <label className="calculator-check">
            <input
              type="checkbox"
              checked={hour12}
              onChange={(e) => setHour12(e.target.checked)}
            />
            Use 12-hour clock
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setLocal("");
              setSource("Asia/Kolkata");
              setDest("Europe/London, America/New_York");
              setFold("reject");
              setHour12(false);
              setNotice("");
            }}
          >
            Reset meeting planner
          </button>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>Meeting times</h3>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : rows.length ? (
            <>
              <p>
                UTC instant: {utc}.{" "}
                {ambiguous
                  ? `The ${fold} occurrence of a repeated local time was selected.`
                  : ""}
              </p>
              <ul>
                {rows.map((r, i) => (
                  <li key={i}>
                    <strong>{r.zone}</strong>: {r.display}
                  </li>
                ))}
              </ul>
              <p>
                Uses the browser’s IANA time-zone database, including
                date-specific daylight-saving rules. Historical/future rules
                depend on the browser’s data.
              </p>
              <div className="calculator-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(summary);
                      setNotice("Meeting times copied.");
                    } catch {
                      setNotice("Copy failed; select the results manually.");
                    }
                  }}
                >
                  Copy meeting times
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    downloadText(
                      [
                        ["Time zone", "Local time", "UTC instant"],
                        ...rows.map((r) => [r.zone, r.display, utc]),
                      ]
                        .map((row) => row.map(csvCell).join(","))
                        .join("\r\n"),
                      "meeting-times.csv",
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download meeting CSV
                </button>
              </div>
            </>
          ) : (
            <p>Enter a local meeting time to compare zones.</p>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
    </section>
  );
}
