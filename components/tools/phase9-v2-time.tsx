"use client";
import { useState } from "react";
import {
  workingTime,
  parseClock,
  parseLocalTimestamp,
} from "@/lib/tools/phase9-working-time";
import { downloadText } from "@/lib/tools/download";
const names = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
function duration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400),
    hours = Math.floor((totalSeconds % 86400) / 3600),
    minutes = Math.floor((totalSeconds % 3600) / 60),
    seconds = totalSeconds % 60;
  return `${days} days, ${hours} hours, ${minutes} minutes, ${seconds} seconds`;
}
export default function TimeAdvanced() {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [notice, setNotice] = useState("");
  let result: ReturnType<typeof workingTime> | undefined,
    error = "";
  try {
    if (start && end && startTime && endTime)
      result = workingTime(
        parseLocalTimestamp(start),
        parseLocalTimestamp(end),
        days,
        parseClock(startTime),
        parseClock(endTime),
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid date or working hours.";
  }
  const summary = result
    ? `Elapsed: ${duration(result.elapsedMs)} (${(result.elapsedMs / 86400000).toFixed(4)} elapsed days). Working time: ${duration(result.workMs)} (${(result.workMs / 3600000).toFixed(2)} hours).`
    : "";
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="working-time-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">ADVANCED WORKFLOW</span>
          <h2 id="working-time-heading">Timestamp &amp; working hours</h2>
          <p>Measure elapsed time and overlap with a custom weekly schedule.</p>
        </div>
      </div>
      <div className="calculator-grid">
        <div className="calculator-fields">
          <label>
            Start timestamp (local)
            <input
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label>
            End timestamp (local)
            <input
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <fieldset className="advanced-item">
            <legend>Working days</legend>
            <div className="workdays">
              {names.map((name, i) => (
                <label className="calculator-check" key={name}>
                  <input
                    type="checkbox"
                    checked={days.includes(i)}
                    onChange={(e) =>
                      setDays((d) =>
                        e.target.checked
                          ? [...d, i]
                          : d.filter((day) => day !== i),
                      )
                    }
                  />
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
          <label>
            Workday starts
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label>
            Workday ends
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setStart("");
              setEnd("");
              setDays([1, 2, 3, 4, 5]);
              setStartTime("09:00");
              setEndTime("17:00");
              setNotice("");
            }}
          >
            Reset working time
          </button>
        </div>
        <div className="calculator-result" aria-live="polite">
          <h3>Duration breakdown</h3>
          {error ? (
            <p className="calculator-error">{error}</p>
          ) : !result ? (
            <p>Choose both timestamps and a work schedule.</p>
          ) : (
            <>
              <p>{summary}</p>
              <p>
                Elapsed days are 24-hour periods. Working time is the overlap
                with selected local weekdays and hours; no public holidays or
                breaks are removed. Overnight shifts are not supported.
                Daylight-saving transitions use the browser’s local time zone
                and elapsed clock time.
              </p>
              <div className="calculator-actions">
                <button
                  className="secondary"
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(summary);
                      setNotice("Summary copied.");
                    } catch {
                      setNotice("Copy failed; select the summary manually.");
                    }
                  }}
                >
                  Copy working-time summary
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() =>
                    downloadText(
                      `Metric,Value\r\nElapsed milliseconds,${result!.elapsedMs}\r\nWorking milliseconds,${result!.workMs}\r\n`,
                      "working-time.csv",
                      "text/csv;charset=utf-8",
                    )
                  }
                >
                  Download working-time CSV
                </button>
              </div>
            </>
          )}
          <p role="status">{notice}</p>
        </div>
      </div>
    </section>
  );
}
