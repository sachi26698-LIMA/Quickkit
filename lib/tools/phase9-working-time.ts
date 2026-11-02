/** Calculate elapsed and scheduled work time in the browser's local time zone. */
export function workingTime(
  start: Date,
  end: Date,
  days: number[],
  startMinute: number,
  endMinute: number,
) {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end < start
  )
    throw new Error(
      "Choose valid timestamps with the end on or after the start.",
    );
  if (end.getTime() - start.getTime() > 3660 * 86400000)
    throw new Error("Choose a period of ten years or less.");
  if (!days.length || days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))
    throw new Error("Choose at least one valid working day.");
  if (
    !Number.isInteger(startMinute) ||
    !Number.isInteger(endMinute) ||
    startMinute < 0 ||
    endMinute > 1440 ||
    startMinute >= endMinute
  )
    throw new Error(
      "Working hours must start before they end on the same day.",
    );
  let workMs = 0;
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (day <= last) {
    if (days.includes(day.getDay())) {
      const begin = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        0,
        startMinute,
      );
      const finish = new Date(
        day.getFullYear(),
        day.getMonth(),
        day.getDate(),
        0,
        endMinute,
      );
      workMs += Math.max(
        0,
        Math.min(end.getTime(), finish.getTime()) -
          Math.max(start.getTime(), begin.getTime()),
      );
    }
    day.setDate(day.getDate() + 1);
  }
  return { elapsedMs: end.getTime() - start.getTime(), workMs };
}
export function parseClock(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59)
    throw new Error("Enter a valid working time.");
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Reject nonexistent local times (e.g. a DST spring-forward gap) instead of silently shifting them. */
export function parseLocalTimestamp(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error("Choose a valid local date and time.");
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(hour, minute, 0, 0);
  if (
    year < 1 ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  )
    throw new Error(
      "This local date/time is invalid or does not exist due to a clock change.",
    );
  return date;
}
