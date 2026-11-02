const DAY = 86400000;
export function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Enter a valid date (YYYY-MM-DD).");
  const year = Number(match[1]),
    month = Number(match[2]),
    day = Number(match[3]);
  if (year < 1 || year > 9999)
    throw new Error("Use a year between 0001 and 9999.");
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw new Error("Enter a valid calendar date.");
  return date;
}
export function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}
function monthDay(year: number, month: number, day: number) {
  const end = new Date(0);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCFullYear(year, month + 1, 0);
  const d = new Date(0);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCFullYear(year, month, Math.min(day, end.getUTCDate()));
  return d;
}
export function addMonths(date: Date, months: number) {
  const index = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  return monthDay(
    Math.floor(index / 12),
    ((index % 12) + 12) % 12,
    date.getUTCDate(),
  );
}
export function dateDifference(start: Date, end: Date, inclusive = false) {
  if (end < start)
    throw new Error("End date must be on or after the start date.");
  const days =
    Math.round((end.getTime() - start.getTime()) / DAY) + (inclusive ? 1 : 0);
  const effectiveEnd = new Date(end.getTime() + (inclusive ? DAY : 0));
  let months =
    (effectiveEnd.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    effectiveEnd.getUTCMonth() -
    start.getUTCMonth();
  if (addMonths(start, months) > effectiveEnd) months--;
  const remainder = Math.round(
    (effectiveEnd.getTime() - addMonths(start, months).getTime()) / DAY,
  );
  // Weekdays in [start, end), with optional end; no public holidays.
  let business = Math.floor(days / 7) * 5;
  for (let i = 0; i < days % 7; i++) {
    const day = (start.getUTCDay() + i) % 7;
    if (day !== 0 && day !== 6) business++;
  }
  return {
    days,
    weeks: days / 7,
    years: Math.floor(months / 12),
    months: months % 12,
    totalMonths: months,
    remainder,
    business,
  };
}
export function age(birth: Date, on: Date) {
  const diff = dateDifference(birth, on);
  let birthday = monthDay(
    on.getUTCFullYear(),
    birth.getUTCMonth(),
    birth.getUTCDate(),
  );
  if (birthday < on)
    birthday = monthDay(
      on.getUTCFullYear() + 1,
      birth.getUTCMonth(),
      birth.getUTCDate(),
    );
  return {
    ...diff,
    nextBirthday: dateString(birthday),
    untilBirthday: Math.round((birthday.getTime() - on.getTime()) / DAY),
    weekday: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][birth.getUTCDay()],
  };
}
export function shiftDays(date: Date, days: number) {
  if (!Number.isSafeInteger(days) || Math.abs(days) > 3650000)
    throw new Error("Enter a whole number of days within ±3,650,000.");
  const result = new Date(date.getTime() + days * DAY);
  if (result.getUTCFullYear() < 1 || result.getUTCFullYear() > 9999)
    throw new Error("Result must be within years 0001–9999.");
  return dateString(result);
}
