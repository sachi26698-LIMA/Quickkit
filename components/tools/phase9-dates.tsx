"use client";
import { useState } from "react";
import {
  age,
  dateDifference,
  parseDate,
  shiftCalendar,
} from "@/lib/tools/phase9-dates";
import { Workspace } from "./phase9-shared";
import CalendarView from "./phase9-calendar-view";
export default function Dates({ kind }: { kind: string }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [inclusive, setInclusive] = useState(false);
  const [shift, setShift] = useState("");
  const [shiftUnit, setShiftUnit] = useState<
    "days" | "weeks" | "months" | "years"
  >("days");
  const [holidays, setHolidays] = useState("");
  const [secondBirth, setSecondBirth] = useState("");
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
        detail = `Total: ${r.days} days, ${(r.days / 7).toFixed(2)} weeks, ${r.totalMonths} completed months, ${r.days * 24} calendar-day hours. Born on ${r.weekday}. Most recent birthday: ${r.previousBirthday ?? "not yet available"}. Next birthday: ${r.nextBirthday ?? "outside supported range"} (${r.untilBirthday} days away). February 29 birthdays are observed on February 28 in non-leap years.`;
        const milestoneYears = (Math.floor(r.years / 10) + 1) * 10;
        try {
          const milestone = shiftCalendar(s, milestoneYears, "years");
          const daysAway = dateDifference(e, parseDate(milestone)).days;
          detail += ` Next decade milestone: ${milestoneYears} years on ${milestone} (${daysAway} days away).`;
        } catch {
          detail += " Next decade milestone is outside the supported calendar.";
        }
        if (secondBirth) {
          const other = parseDate(secondBirth);
          age(other, e);
          const earlier = s < other ? s : other;
          const later = s < other ? other : s;
          const difference = dateDifference(earlier, later);
          detail += ` Age gap: ${difference.years} years, ${difference.months} months, ${difference.remainder} days (${difference.days} days).`;
        }
      } else {
        const holidayDates = holidays.trim()
          ? holidays.split(/[\n,]+/).map((h) => parseDate(h.trim()))
          : [];
        const r = dateDifference(s, e, inclusive, holidayDates);
        result = `${r.years} years, ${r.months} months, ${r.remainder} days`;
        detail = `Countdown from the selected start to end: ${dateDifference(s, e).days} days (end excluded). ${r.days} total days · ${r.weeks.toFixed(2)} total weeks · ${r.business} business days (weekends and supplied holidays excluded). Whole months are clamped to the last day of shorter months.`;
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid dates.";
  }
  let shifted = "";
  try {
    if (start && shift !== "")
      shifted = shiftCalendar(parseDate(start), Number(shift), shiftUnit);
  } catch (e) {
    shifted = e instanceof Error ? e.message : "Invalid days.";
  }
  return (
    <Workspace
      result={result}
      snapshot={JSON.stringify({
        start,
        end,
        inclusive,
        shift,
        shiftUnit,
        holidays,
        secondBirth,
      })}
      restore={(value) => {
        const s = JSON.parse(value);
        setStart(s.start);
        setEnd(s.end);
        setInclusive(s.inclusive);
        setShift(s.shift);
        setShiftUnit(s.shiftUnit);
        setHolidays(s.holidays);
        setSecondBirth(s.secondBirth);
      }}
      detail={<p>{detail}</p>}
      error={error}
      reset={() => {
        setStart("");
        setEnd("");
        setShift("");
        setInclusive(false);
        setShiftUnit("days");
        setHolidays("");
        setSecondBirth("");
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
      {isAge && (
        <details>
          <summary>Compare another person</summary>
          <label>
            Second date of birth
            <input
              type="date"
              value={secondBirth}
              onChange={(e) => setSecondBirth(e.target.value)}
            />
          </label>
          <p>
            The age gap is calculated in calendar years, months and days from
            the earlier birth date.
          </p>
        </details>
      )}
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
            Add or subtract duration from start (negative to subtract)
            <input
              type="number"
              step="1"
              value={shift}
              onChange={(e) => setShift(e.target.value)}
            />
          </label>
          <label>
            Duration unit
            <select
              value={shiftUnit}
              onChange={(e) => setShiftUnit(e.target.value as typeof shiftUnit)}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Calendar months</option>
              <option value="years">Calendar years</option>
            </select>
          </label>
          {shifted && (
            <p>
              Shifted date: {shifted}. Calendar months and years clamp to the
              last valid day.
            </p>
          )}
          {start && end && !error && <CalendarView start={start} end={end} />}
          <details>
            <summary>Holiday exclusions</summary>
            <label>
              Holiday dates (YYYY-MM-DD, comma or line separated)
              <textarea
                value={holidays}
                onChange={(e) => setHolidays(e.target.value)}
                placeholder="2026-01-26, 2026-08-15"
              />
            </label>
            <p>
              Only unique weekdays within the selected interval are excluded.
            </p>
          </details>
        </>
      )}
    </Workspace>
  );
}
