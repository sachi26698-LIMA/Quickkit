"use client";
import { useState } from "react";
import { units, convert, temperature } from "@/lib/tools/phase9-conversion";
import { Workspace } from "./phase9-shared";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumSignificantDigits: 10 }).format(n);
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
  const choices = isTemp
    ? ["Celsius", "Fahrenheit", "Kelvin"]
    : Object.keys(units[category]);
  let result = "",
    error = "",
    shifted = "";
  try {
    if (value !== "") {
      const n = isTemp
        ? temperature(Number(value), from, to)
        : convert(Number(value), category, from, to);
      result = `${fmt(n)} ${to}`;
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
      }}
      detail={
        <p>
          {isTemp
            ? "Convert via Kelvin: K = °C + 273.15; °F = °C × 9/5 + 32. Values below absolute zero are invalid."
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
          Category
          <select
            value={category}
            onChange={(e) => {
              const c = e.target.value;
              const u = Object.keys(units[c]);
              setCategory(c);
              setFrom(u[0]);
              setTo(u[1]);
              setSearch("");
            }}
          >
            {Object.keys(units).map((c) => (
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
