import { parseDate, dateString } from "@/lib/tools/phase9-dates";
/** A non-interactive month view of the selected interval; dates are UTC calendar dates. */
export default function CalendarView({
  start,
  end,
}: {
  start: string;
  end: string;
}) {
  const first = parseDate(`${start.slice(0, 7)}-01`),
    last = parseDate(end);
  const offset = first.getUTCDay(),
    cells: (string | null)[] = Array(offset).fill(null);
  for (let i = 0; i < 31; i++) {
    const date = new Date(first.getTime() + i * 86400000);
    if (date.getUTCMonth() !== first.getUTCMonth()) break;
    cells.push(dateString(date));
  }
  while (cells.length % 7) cells.push(null);
  const month = first.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <details>
      <summary>View start-month calendar</summary>
      <p>
        Highlighted dates fall within the selected interval, including both
        endpoints. The view shows the start month only.
      </p>
      <table>
        <caption>{month}</caption>
        <thead>
          <tr>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <th scope="col" key={d}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: cells.length / 7 }, (_, i) => (
            <tr key={i}>
              {cells.slice(i * 7, i * 7 + 7).map((d, j) => (
                <td
                  key={j}
                  style={{
                    padding: "0.3rem",
                    textAlign: "center",
                    background:
                      d && d >= start && parseDate(d) <= last
                        ? "#ede9fe"
                        : undefined,
                  }}
                >
                  {d ? (
                    <span
                      aria-label={`${d}${d >= start && parseDate(d) <= last ? ", within selected interval" : ""}`}
                    >
                      {Number(d.slice(-2))}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
