"use client";
import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { shiftCalendar } from "@/lib/tools/phase9-dates";
import { parseLocalTimestamp } from "@/lib/tools/phase9-working-time";
export default function CalendarTime() {
  const ready = useHydrated();
  const [start, setStart] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<"days" | "weeks" | "months" | "years">(
    "months",
  );
  const [notice, setNotice] = useState("");
  let result = "",
    error = "";
  try {
    if (start && amount !== "") {
      parseLocalTimestamp(start);
      const date = shiftCalendar(
        new Date(`${start.slice(0, 10)}T00:00:00Z`),
        Number(amount),
        unit,
      );
      const shifted = `${date}T${start.slice(11, 16)}`;
      parseLocalTimestamp(shifted);
      result = shifted.replace("T", " ");
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid calendar duration.";
  }
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="calendar-duration-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">CALENDAR ARITHMETIC</span>
          <h2 id="calendar-duration-heading">Add calendar durations</h2>
          <p>Shift local dates without assuming a fixed month length.</p>
        </div>
      </div>
      {!ready && (
        <p className="sr-only" role="status">
          Loading calculator controls…
        </p>
      )}
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Starting local date and time
            <input
              disabled={!ready}
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            Calendar duration (negative to subtract)
            <input
              disabled={!ready}
              type="number"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Calendar unit
            <select
              disabled={!ready}
              value={unit}
              onChange={(e) => setUnit(e.target.value as typeof unit)}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </label>
          <button
            className="secondary"
            type="button"
            disabled={!ready}
            onClick={() => {
              setStart("");
              setAmount("");
              setUnit("months");
              setNotice("");
            }}
          >
            Reset calendar duration
          </button>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>Resulting local date and time</h3>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : result ? (
            <>
              <strong>{result}</strong>
              <p>
                Calendar months and years clamp to the final day of a shorter
                month. Local clock time is preserved; nonexistent
                daylight-saving times are rejected. Ambiguous repeated times use
                the browser’s default occurrence.
              </p>
              <button
                className="secondary"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(result);
                    setNotice("Result copied.");
                  } catch {
                    setNotice("Copy failed; select the result manually.");
                  }
                }}
              >
                Copy calendar result
              </button>
            </>
          ) : (
            <p>Choose a start and a whole-number calendar duration.</p>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
    </section>
  );
}
