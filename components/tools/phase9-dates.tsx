"use client";
import { useState } from "react";
import {
  age,
  dateDifference,
  parseDate,
  shiftDays,
} from "@/lib/tools/phase9-dates";
import { Workspace } from "./phase9-shared";
export default function Dates({ kind }: { kind: string }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [inclusive, setInclusive] = useState(false);
  const [shift, setShift] = useState("");
  const isAge = kind === "age-calculator";
  let result = "",
    error = "",
    detail = "";
  try {
    if (start && end) {
      const s = parseDate(start),
        e = parseDate(end);
      if (isAge) {
        const r = age(s, e);
        result = `${r.years} years, ${r.months} months, ${r.remainder} days`;
        detail = `Total: ${r.days} days, ${(r.days / 7).toFixed(2)} weeks, ${r.totalMonths} completed months. Born on ${r.weekday}. Next birthday: ${r.nextBirthday} (${r.untilBirthday} days away). February 29 birthdays are observed on February 28 in non-leap years.`;
      } else {
        const r = dateDifference(s, e, inclusive);
        result = `${r.years} years, ${r.months} months, ${r.remainder} days`;
        detail = `${r.days} total days · ${r.weeks.toFixed(2)} total weeks · ${r.business} weekdays (excluding public holidays). Whole months are clamped to the last day of shorter months.`;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid dates.";
  }
  let shifted = "";
  try {
    if (start && shift !== "")
      shifted = shiftDays(parseDate(start), Number(shift));
  } catch (e) {
    shifted = e instanceof Error ? e.message : "Invalid days.";
  }
  return (
    <Workspace
      result={result}
      detail={<p>{detail}</p>}
      error={error}
      reset={() => {
        setStart("");
        setEnd("");
        setShift("");
        setInclusive(false);
      }}
    >
      <label>
        {isAge ? "Date of birth" : "Start date"}
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label>
        {isAge ? "Age on date" : "End date"}
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      {!isAge && (
        <>
          <label className="calculator-check">
            <input
              type="checkbox"
              checked={inclusive}
              onChange={(e) => setInclusive(e.target.checked)}
            />{" "}
            Include end date
          </label>
          <label>
            Add or subtract days from start (negative to subtract)
            <input
              type="number"
              step="1"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            />
          </label>
          {shifted && <p>Shifted date: {shifted}</p>}
        </>
      )}
    </Workspace>
  );
}
