import { parseDate } from "./phase9-dates";
/** Conventional western tropical date ranges, for entertainment only. */
export function zodiac(date: string) {
  const d = parseDate(date),
    m = d.getUTCMonth() + 1,
    day = d.getUTCDate();
  const changes = [20, 19, 21, 20, 21, 21, 23, 23, 23, 23, 22, 22];
  const names = [
    "Capricorn",
    "Aquarius",
    "Pisces",
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
  ];
  return names[m - (day < changes[m - 1] ? 1 : 0)];
}
