"use client";
import { useState } from "react";
import { scientific } from "@/lib/tools/phase9-scientific";
import { Workspace } from "./phase9-shared";
export default function Scientific() {
  const [expr, setExpr] = useState("");
  const [degrees, setDegrees] = useState(true);
  const [memory, setMemory] = useState<number | null>(null);
  let result = "",
    error = "",
    value: number | undefined;
  try {
    if (expr.trim()) {
      value = scientific(expr, degrees);
      result = String(Number(value.toPrecision(12)));
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid expression.";
  }
  return (
    <Workspace
      result={result}
      error={error}
      reset={() => {
        setExpr("");
        setDegrees(true);
      }}
      detail={
        <p>
          Use explicit multiplication, parentheses and ^ for powers. Functions:
          sin, cos, tan, asin, acos, atan, sqrt, log (base 10), ln and abs.
          Example: sin(30) + 2^3. Factorial uses !. Mode:{" "}
          {degrees ? "degrees" : "radians"}. Memory:{" "}
          {memory === null ? "empty" : memory}.
        </p>
      }
    >
      <label>
        Expression
        <input
          type="text"
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          placeholder="e.g. sin(30) + 2^3"
        />
      </label>
      <label>
        Angle mode
        <select
          value={degrees ? "degrees" : "radians"}
          onChange={(e) => setDegrees(e.target.value === "degrees")}
        >
          <option value="degrees">Degrees</option>
          <option value="radians">Radians</option>
        </select>
      </label>
      <div className="scientific-buttons">
        {[
          "7",
          "8",
          "9",
          "/",
          "sin(",
          "4",
          "5",
          "6",
          "*",
          "cos(",
          "1",
          "2",
          "3",
          "-",
          "tan(",
          "0",
          ".",
          "(",
          ")",
          "+",
          "pi",
          "e",
          "^",
          "!",
          "sqrt(",
          "log(",
          "ln(",
          "asin(",
          "acos(",
          "atan(",
        ].map((key) => (
          <button
            className="secondary"
            type="button"
            key={key}
            onClick={() => setExpr((x) => x + key)}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="calculator-actions">
        <button
          className="secondary"
          disabled={value === undefined}
          onClick={() => setMemory(value!)}
        >
          MS
        </button>
        <button
          className="secondary"
          disabled={value === undefined}
          onClick={() => setMemory((memory ?? 0) + value!)}
        >
          M+
        </button>
        <button
          className="secondary"
          disabled={memory === null}
          onClick={() => setExpr((x) => x + `(${memory})`)}
        >
          MR
        </button>
        <button
          className="secondary"
          disabled={memory === null}
          onClick={() => setMemory(null)}
        >
          MC
        </button>
      </div>
      <p>
        Memory: store, add, recall or clear. Type directly for keyboard input.
      </p>
    </Workspace>
  );
}
