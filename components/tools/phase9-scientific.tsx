"use client";
import { useState } from "react";
import { scientific } from "@/lib/tools/phase9-scientific";
import { Workspace } from "./phase9-shared";

type Entry = {
  expression: string;
  answer: number;
  degrees: boolean;
  previousAnswer: number | undefined;
};
export default function Scientific() {
  const [expr, setExpr] = useState("");
  const [degrees, setDegrees] = useState(true);
  const [precision, setPrecision] = useState(12);
  const [memory, setMemory] = useState<number | null>(null);
  const [answer, setAnswer] = useState<number | undefined>();
  const [history, setHistory] = useState<Entry[]>([]);
  let result = "",
    error = "",
    value: number | undefined;
  try {
    if (expr.trim()) {
      value = scientific(expr, degrees, answer);
      result = String(Number(value.toPrecision(precision)));
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Invalid expression.";
  }
  function evaluate() {
    if (value === undefined || error) return;
    setHistory((h) =>
      [
        { expression: expr, answer: value!, degrees, previousAnswer: answer },
        ...h,
      ].slice(0, 20),
    );
    setAnswer(value);
    // Freeze the committed answer, so an expression containing ans does not change after evaluation.
    setExpr(String(value));
  }
  const keys = [
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
  ];
  return (
    <>
      <Workspace
        result={result}
        error={error}
        reset={() => {
          setExpr("");
          setDegrees(true);
          setPrecision(12);
        }}
        detail={
          <p>
            Live expression preview. Use explicit multiplication and
            parentheses. Powers are right-associative; factorial binds before
            powers. Trigonometric functions use{" "}
            {degrees ? "degrees" : "radians"}; hyperbolic functions are
            dimensionless. <code>nCr(n,r)</code> and <code>nPr(n,r)</code>{" "}
            require integers. Evaluate to set Ans. Display precision is
            significant digits, calculations use full floating-point precision.
          </p>
        }
      >
        <label>
          Expression
          <input
            type="text"
            value={expr}
            onChange={(e) => setExpr(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                evaluate();
              }
            }}
            placeholder="e.g. sin(30) + 2^3"
          />
        </label>
        <div className="calculator-actions">
          <button
            className="secondary"
            type="button"
            disabled={!result || !!error}
            onClick={evaluate}
          >
            Evaluate (=)
          </button>
          <button
            className="secondary"
            type="button"
            disabled={!expr}
            onClick={() => setExpr((x) => x.slice(0, -1))}
          >
            Backspace
          </button>
          <button
            className="secondary"
            type="button"
            disabled={!expr}
            onClick={() => setExpr("")}
          >
            Clear expression
          </button>
        </div>
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
        <div className="scientific-buttons">
          {keys.map((key) => (
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
        <details>
          <summary>More functions</summary>
          <p>
            Combinations and permutations use two arguments, for example
            nCr(5,2). Enter the comma between arguments.
          </p>
          <div className="scientific-buttons">
            {[
              "sinh(",
              "cosh(",
              "tanh(",
              "asinh(",
              "acosh(",
              "atanh(",
              "abs(",
              "nCr(",
              "nPr(",
              ",",
              "ans",
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
        </details>
        <div className="calculator-actions">
          <button
            className="secondary"
            disabled={value === undefined || !!error}
            onClick={() => setMemory(value!)}
          >
            MS
          </button>
          <button
            className="secondary"
            disabled={value === undefined || !!error}
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
          Memory: {memory === null ? "empty" : memory}. Ans:{" "}
          {answer === undefined ? "not set" : answer}.
        </p>
      </Workspace>
      {history.length > 0 && (
        <section className="workspace calculator-history">
          <div className="calculator-actions">
            <h2>Expression history</h2>
            <button className="secondary" onClick={() => setHistory([])}>
              Clear expression history
            </button>
          </div>
          <p>
            Restore also restores the angle mode and previous answer used by the
            expression. History is kept for this page session.
          </p>
          <ol>
            {history.map((entry, i) => (
              <li key={i}>
                <code>{entry.expression}</code> ={" "}
                {String(Number(entry.answer.toPrecision(precision)))} (
                {entry.degrees ? "degrees" : "radians"}){" "}
                <button
                  className="secondary"
                  onClick={() => {
                    setExpr(entry.expression);
                    setDegrees(entry.degrees);
                    setAnswer(entry.previousAnswer);
                  }}
                >
                  Restore
                </button>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
