import { parseDate } from "./phase9-dates";
type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};
function formatter(zone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      calendar: "gregory",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error("Enter a valid IANA time zone, such as Asia/Kolkata.");
  }
}
function parts(epoch: number, zone: string): Parts {
  const p = formatter(zone).formatToParts(new Date(epoch));
  const v = (name: string) => Number(p.find((x) => x.type === name)?.value);
  return {
    year: v("year"),
    month: v("month"),
    day: v("day"),
    hour: v("hour"),
    minute: v("minute"),
    second: v("second"),
  };
}
function epochUtc(p: Parts) {
  const d = new Date(0);
  d.setUTCFullYear(p.year, p.month - 1, p.day);
  d.setUTCHours(p.hour, p.minute, p.second, 0);
  return d.getTime();
}
/** Resolve a minute-precision civil time. Reject gaps; explicitly choose a fold occurrence. */
export function resolveZonedTime(
  local: string,
  zone: string,
  fold: "earlier" | "later" | "reject" = "reject",
) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!m) throw new Error("Enter a valid local date and time.");
  const d = parseDate(m[1]);
  if (d.getUTCFullYear() < 1900 || d.getUTCFullYear() > 2099)
    throw new Error("Meeting planner supports years 1900–2099.");
  if (!["earlier", "later", "reject"].includes(fold))
    throw new Error("Choose how to handle repeated times.");
  const hour = Number(m[2]),
    minute = Number(m[3]);
  if (hour > 23 || minute > 59)
    throw new Error("Enter a valid local date and time.");
  const target = {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour,
    minute,
    second: 0,
  };
  const wall = epochUtc(target);
  const offsets = new Set<number>();
  for (let delta = -48; delta <= 48; delta += 6) {
    const instant = wall + delta * 3600000;
    offsets.add(epochUtc(parts(instant, zone)) - instant);
  }
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => {
      const p = parts(instant, zone);
      return Object.keys(target).every(
        (k) => p[k as keyof Parts] === target[k as keyof Parts],
      );
    })
    .sort((a, b) => a - b);
  if (!matches.length)
    throw new Error(
      "This local time does not exist in the selected zone, usually due to a daylight-saving transition.",
    );
  if (matches.length > 1 && fold === "reject")
    throw new Error(
      "This local time occurs twice. Choose the earlier or later occurrence.",
    );
  return {
    instant: new Date(
      fold === "later" ? matches[matches.length - 1] : matches[0],
    ),
    ambiguous: matches.length > 1,
  };
}
export function formatZonedTime(instant: Date, zone: string, hour12: boolean) {
  if (!Number.isFinite(instant.getTime()))
    throw new Error("Choose a valid date and time.");
  formatter(zone);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12,
    timeZoneName: "short",
  }).format(instant);
}
