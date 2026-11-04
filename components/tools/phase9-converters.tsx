"use client";
import { useState } from "react";
import { units, convert, temperature } from "@/lib/tools/phase9-conversion";
import { Workspace } from "./phase9-shared";
import { downloadText } from "@/lib/tools/download";
import { csvCell } from "@/lib/tools/phase9-v2-advanced";
export default function Converters({ kind }: { kind: string }) {
  const isTemp = kind === "temperature-converter",
    isTime = kind === "time-converter";
  const initial = isTemp
    ? ["Celsius", "Fahrenheit"]
    : isTime
      ? ["Hour", "Minute"]
      : ["Metre", "Kilometre"];
  const [category, setCategory] = useState(isTime ? "Time" : "Length");
  const [from, setFrom] = useState(initial[0]);
  const [to, setTo] = useState(initial[1]);
  const [value, setValue] = useState("");
  const [search, setSearch] = useState("");
  const [date, setDate] = useState("");
  const [direction, setDirection] = useState("add");
  const [precision, setPrecision] = useState(10);
  const [categorySearch, setCategorySearch] = useState("");
  const [showComparison, setShowComparison] = useState(false);
  const [otherTemp, setOtherTemp] = useState("");
  const [otherUnit, setOtherUnit] = useState("Celsius");
  const [saved, setSaved] = useState<
    {
      category: string;
      from: string;
      to: string;
      value: string;
      precision: number;
      otherTemp: string;
      otherUnit: string;
      date: string;
      direction: string;
      showComparison: boolean;
      favorite: boolean;
    }[]
  >([]);
  const [message, setMessage] = useState("");
  const tempCategory = isTemp || (!isTime && category === "Temperature");
  const choices = tempCategory
    ? ["Celsius", "Fahrenheit", "Kelvin", "Rankine"]
    : Object.keys(units[category]);
  let result = "",
    error = "",
    shifted = "";
  try {
    if (value !== "") {
      const n = tempCategory
        ? temperature(Number(value), from, to)
        : convert(Number(value), category, from, to);
      result = `${new Intl.NumberFormat("en-US", { maximumSignificantDigits: precision }).format(n)} ${to}`;
      if (isTime && date) {
        const ms =
          convert(Number(value), "Time", from, "Second") *
          1000 *
          (direction === "add" ? 1 : -1);
        const dt = new Date(date);
        if (
          !Number.isFinite(dt.getTime()) ||
          !Number.isFinite(ms) ||
          !Number.isFinite(new Date(dt.getTime() + ms).getTime())
        )
          throw new Error("Date or duration is outside the supported range.");
        shifted = new Date(dt.getTime() + ms).toLocaleString();
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid input.";
  }
  let tempComparison = "",
    tempError = "";
  if (isTemp && value !== "" && otherTemp !== "" && !error) {
    try {
      const current = temperature(Number(value), from, "Celsius");
      const other = temperature(Number(otherTemp), otherUnit, "Celsius");
      tempComparison = `Difference (current − comparison): ${new Intl.NumberFormat("en-US", { maximumSignificantDigits: precision }).format(current - other)} °C (same magnitude in K).`;
    } catch (e) {
      tempError =
        e instanceof Error ? e.message : "Invalid comparison temperature.";
    }
  }
  const options = (selected: string) =>
    choices
      .filter(
        (c) => c.toLowerCase().includes(search.toLowerCase()) || c === selected,
      )
      .map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ));
  return (
    <Workspace
      result={result}
      error={error}
      reset={() => {
        setValue("");
        setCategory(isTime ? "Time" : "Length");
        setFrom(initial[0]);
        setTo(initial[1]);
        setSearch("");
        setDate("");
        setDirection("add");
        setPrecision(10);
        setCategorySearch("");
        setShowComparison(false);
        setOtherTemp("");
        setOtherUnit("Celsius");
      }}
      detail={
        <p>
          {tempCategory
            ? "Convert via Kelvin: K = °C + 273.15; °F = °C × 9/5 + 32; °R = K × 9/5. Values below absolute zero are invalid."
            : isTime
              ? "A month is exactly 30 days and a year is exactly 365 days; these are duration approximations, not calendar months or years."
              : category === "Fuel consumption"
                ? "Fuel economy and consumption are reciprocals; US and imperial gallons differ."
                : "Conversion uses the ratio of the units’ base-unit factors."}
          {shifted && ` Resulting local date and time: ${shifted}.`}
        </p>
      }
    >
      {!isTemp && !isTime && (
        <label>
          Search categories
          <input
            type="search"
            value={categorySearch}
            onChange={(e) => setCategorySearch(e.target.value)}
            placeholder="Filter categories"
          />
        </label>
      )}
      {!isTemp && !isTime && (
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              const c = e.target.value;
              const u =
                c === "Temperature"
                  ? ["Celsius", "Fahrenheit", "Kelvin", "Rankine"]
                  : Object.keys(units[c]);
              setCategory(c);
              setFrom(u[0]);
              setTo(u[1]);
              setSearch("");
            }}
          >
            {[...Object.keys(units), "Temperature"]
              .filter(
                (c) =>
                  c === category ||
                  c.toLowerCase().includes(categorySearch.toLowerCase()),
              )
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
        </label>
      )}
      {!isTemp && (
        <label>
          Search units
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter units"
          />
        </label>
      )}
      <label>
        Value
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </label>
      <label>
        From
        <select value={from} onChange={(e) => setFrom(e.target.value)}>
          {options(from)}
        </select>
      </label>
      <button
        className="secondary"
        onClick={() => {
          setFrom(to);
          setTo(from);
        }}
      >
        Swap units
      </button>
      <label>
        To
        <select value={to} onChange={(e) => setTo(e.target.value)}>
          {options(to)}
        </select>
      </label>
      <details>
        <summary>Advanced conversion settings</summary>
        <label>
          Precision (significant digits)
          <select
            value={precision}
            onChange={(e) => setPrecision(Number(e.target.value))}
          >
            {[4, 6, 8, 10, 12, 15].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="calculator-check">
          <input
            type="checkbox"
            checked={showComparison}
            onChange={(e) => setShowComparison(e.target.checked)}
          />{" "}
          Show all target units
        </label>
        {!isTemp && !isTime && (
          <p>
            Decimal data units use powers of 1,000 (kB, MB); binary units use
            powers of 1,024 (KiB, MiB).
          </p>
        )}
      </details>
      {isTemp && (
        <details>
          <summary>Compare another temperature</summary>
          <label>
            Comparison temperature
            <input
              type="number"
              value={otherTemp}
              onChange={(e) => setOtherTemp(e.target.value)}
            />
          </label>
          <label>
            Comparison unit
            <select
              value={otherUnit}
              onChange={(e) => setOtherUnit(e.target.value)}
            >
              <option>Celsius</option>
              <option>Fahrenheit</option>
              <option>Kelvin</option>
              <option>Rankine</option>
            </select>
          </label>
          {tempError && <p className="calculator-error">{tempError}</p>}
          {tempComparison && <p>{tempComparison}</p>}
        </details>
      )}
      <button
        className="secondary"
        type="button"
        disabled={!result || !!error}
        onClick={() => {
          setSaved((items) =>
            [
              {
                category,
                from,
                to,
                value,
                precision,
                otherTemp,
                otherUnit,
                date,
                direction,
                showComparison,
                favorite: false,
              },
              ...items,
            ].slice(0, 20),
          );
          setMessage("Conversion saved for this page session.");
        }}
      >
        Save conversion
      </button>
      {saved.length > 0 && (
        <div>
          <h3>Saved conversions</h3>
          <ul>
            {saved.map((item, i) => (
              <li key={i}>
                {item.value} {item.from} → {item.to}{" "}
                <button
                  type="button"
                  className="secondary"
                  aria-pressed={item.favorite}
                  onClick={() =>
                    setSaved((items) =>
                      items.map((v, j) =>
                        j === i ? { ...v, favorite: !v.favorite } : v,
                      ),
                    )
                  }
                >
                  {item.favorite ? "Unfavorite" : "Favorite"} conversion {i + 1}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setSaved((items) => items.filter((_, j) => j !== i))
                  }
                >
                  Delete conversion {i + 1}
                </button>
                <button
                  className="secondary"
                  type="button"
                  onClick={() => {
                    setCategory(item.category);
                    setFrom(item.from);
                    setTo(item.to);
                    setValue(item.value);
                    setPrecision(item.precision);
                    setOtherTemp(item.otherTemp);
                    setOtherUnit(item.otherUnit);
                    setDate(item.date);
                    setDirection(item.direction);
                    setShowComparison(item.showComparison);
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
          <button
            className="secondary"
            type="button"
            onClick={() => setSaved([])}
          >
            Clear saved conversions
          </button>
        </div>
      )}
      <p role="status">{message}</p>
      {showComparison && value !== "" && !error && (
        <div>
          <h3>Compare units</h3>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const rows: (string | number)[][] = [
                ["Input value", "From", "To", "Result"],
              ];
              for (const unit of choices) {
                try {
                  const n = tempCategory
                    ? temperature(Number(value), from, unit)
                    : convert(Number(value), category, from, unit);
                  rows.push([value, from, unit, n]);
                } catch {
                  rows.push([value, from, unit, "Unavailable"]);
                }
              }
              downloadText(
                rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
                "conversion-comparison.csv",
                "text/csv;charset=utf-8",
              );
            }}
          >
            Download comparison CSV
          </button>
          <ul>
            {choices.map((unit) => {
              try {
                const converted = tempCategory
                  ? temperature(Number(value), from, unit)
                  : convert(Number(value), category, from, unit);
                const display = new Intl.NumberFormat("en-US", {
                  maximumSignificantDigits: precision,
                }).format(converted);
                return (
                  <li key={unit}>
                    {display} {unit}{" "}
                    <button
                      className="secondary"
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(
                            `${display} ${unit}`,
                          );
                          setMessage(`Copied ${unit}.`);
                        } catch {
                          setMessage(
                            "Copy failed. Select the result manually.",
                          );
                        }
                      }}
                    >
                      Copy
                    </button>
                  </li>
                );
              } catch {
                return <li key={unit}>Unavailable: {unit}</li>;
              }
            })}
          </ul>
        </div>
      )}
      {isTemp && (
        <p>
          Reference points: water freezes at 0 °C and boils at 100 °C at
          standard pressure; absolute zero is −273.15 °C.
        </p>
      )}
      {isTime && (
        <>
          <label>
            Optional local date and time
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Duration operation
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
            >
              <option value="add">Add</option>
              <option value="subtract">Subtract</option>
            </select>
          </label>
          <p>
            Uses elapsed seconds; daylight-saving transitions may change the
            displayed clock time.
          </p>
        </>
      )}
    </Workspace>
  );
}
