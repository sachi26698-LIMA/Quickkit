"use client";
import { useState } from "react";
import { bmi } from "@/lib/tools/calculators";
import { downloadText } from "@/lib/tools/download";
type Person = { height: string; weight: string; age: string };
const blank = (): Person => ({ height: "", weight: "", age: "unknown" });
export default function BMIComparison() {
  const [persons, setPersons] = useState<Person[]>([blank(), blank()]);
  const [imperial, setImperial] = useState(false);
  const [notice, setNotice] = useState("");
  const computed = persons.map((person) => {
    if (!person.height || !person.weight)
      return { result: undefined, error: "" };
    try {
      return {
        result: bmi(Number(person.height), Number(person.weight), imperial),
        error: "",
      };
    } catch (e) {
      return {
        result: undefined,
        error: e instanceof Error ? e.message : "Invalid inputs.",
      };
    }
  });
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);
  const summary = computed
    .map((v, i) =>
      v.result
        ? `Person ${i + 1}: BMI ${fmt(v.result.value)}${persons[i].age === "adult" ? ` (${v.result.category}, adult)` : " (no adult category)"}`
        : `Person ${i + 1}: incomplete`,
    )
    .join("\n");
  function update(i: number, key: keyof Person, value: string) {
    setPersons((p) =>
      p.map((v, idx) => (i === idx ? { ...v, [key]: value } : v)),
    );
  }
  return (
    <section
      className="workspace advanced-workspace"
      aria-labelledby="bmi-comparison-heading"
    >
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">COMPARISON</span>
          <h2 id="bmi-comparison-heading">Compare BMI calculations</h2>
          <p>Compare up to five people independently.</p>
        </div>
      </div>
      <label className="calculator-check">
        <input
          type="checkbox"
          checked={imperial}
          onChange={(e) => setImperial(e.target.checked)}
        />{" "}
        Use inches and pounds for all entries (values are not converted
        automatically)
      </label>
      <div className="advanced-options">
        {persons.map((p, i) => (
          <fieldset className="advanced-item" key={i}>
            <legend>Person {i + 1}</legend>
            <label>
              Person {i + 1} height in {imperial ? "inches" : "centimeters"}
              <input
                type="number"
                value={p.height}
                onChange={(e) => update(i, "height", e.target.value)}
              />
            </label>
            <label>
              Person {i + 1} weight in {imperial ? "pounds" : "kilograms"}
              <input
                type="number"
                value={p.weight}
                onChange={(e) => update(i, "weight", e.target.value)}
              />
            </label>
            <label>
              Person {i + 1} age interpretation
              <select
                value={p.age}
                onChange={(e) => update(i, "age", e.target.value)}
              >
                <option value="unknown">Not specified</option>
                <option value="minor">Under 20 years</option>
                <option value="adult">20 years or older</option>
              </select>
            </label>
            {computed[i].error && (
              <p className="calculator-error">{computed[i].error}</p>
            )}
            {computed[i].result && (
              <p>
                BMI: {fmt(computed[i].result!.value)}
                {p.age === "adult"
                  ? ` - ${computed[i].result!.category} (adult)`
                  : " - adult categories not applied"}
              </p>
            )}
            <button
              type="button"
              className="secondary"
              disabled={persons.length <= 2}
              onClick={() =>
                setPersons((items) => items.filter((_, j) => i !== j))
              }
            >
              Remove person {i + 1}
            </button>
          </fieldset>
        ))}
      </div>
      <div className="calculator-actions">
        <button
          type="button"
          className="secondary"
          disabled={persons.length >= 5}
          onClick={() => setPersons((p) => [...p, blank()])}
        >
          Add person
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => {
            setPersons([blank(), blank()]);
            setImperial(false);
            setNotice("");
          }}
        >
          Reset BMI comparison
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!computed.some((x) => x.result)}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(summary);
              setNotice("Comparison copied.");
            } catch {
              setNotice("Copy failed; select the results manually.");
            }
          }}
        >
          Copy BMI comparison
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!computed.some((x) => x.result)}
          onClick={() =>
            downloadText(
              [
                "Person,BMI,Interpretation",
                ...computed.map(
                  (v, i) =>
                    `${i + 1},${v.result ? v.result.value : ""},${v.result && persons[i].age === "adult" ? v.result.category : "No adult category"}`,
                ),
              ].join("\r\n"),
              "bmi-comparison.csv",
              "text/csv;charset=utf-8",
            )
          }
        >
          Download BMI comparison CSV
        </button>
      </div>
      <p>
        BMI is a screening measure, not a diagnosis. For children and teens, use
        age- and sex-specific growth charts with a clinician; comparisons are
        not diagnoses.
      </p>
      <p role="status">{notice}</p>
    </section>
  );
}
