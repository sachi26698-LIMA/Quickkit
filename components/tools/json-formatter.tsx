"use client";
import { useHydrated } from "@/lib/use-hydrated";
import { useState } from "react";
import { MAX_JSON_LENGTH, processJson } from "@/lib/tools/json";
import CopyButton from "./copy-button";
export default function JsonFormatter() {
  const ready = useHydrated();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  function process(mode: "format" | "minify" | "validate") {
    try {
      setOutput(processJson(input, mode));
      setStatus(
        mode === "validate"
          ? "Valid JSON. Your data is ready to use."
          : mode === "format"
            ? "JSON formatted with 2-space indentation."
            : "JSON minified.",
      );
      setError(false);
    } catch (e) {
      setOutput("");
      setStatus(
        e instanceof Error ? e.message : "Could not process this JSON.",
      );
      setError(true);
    }
  }
  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <div className="workspace-heading">
        <div>
          <h2>A little structure goes a long way</h2>
          <p>Check your syntax, tidy your data, or keep it compact.</p>
        </div>
        <span className="local-badge">Local processing</span>
      </div>
      <div className="editor-columns">
        <div>
          <label htmlFor="json-input">JSON input</label>
          <textarea
            id="json-input"
            className="code-input"
            spellCheck={false}
            maxLength={MAX_JSON_LENGTH}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setOutput("");
              setStatus("");
            }}
            placeholder={'{\n  "hello": "world"\n}'}
          />
        </div>
        <div>
          <label htmlFor="json-output">JSON result</label>
          <textarea
            id="json-output"
            className="code-input"
            spellCheck={false}
            readOnly
            value={output}
            placeholder="Your formatted JSON will appear here…"
          />
        </div>
      </div>
      <div className="action-row">
        <button className="primary" onClick={() => process("format")}>
          Format JSON
        </button>
        <button className="secondary" onClick={() => process("minify")}>
          Minify
        </button>
        <button className="secondary" onClick={() => process("validate")}>
          Validate
        </button>
      </div>
      {status && (
        <p className={`status ${error ? "error" : "success"}`} role="status">
          {error ? "Error: " : ""}
          {status}
        </p>
      )}
      <div className="workspace-foot">
        <button
          className="secondary"
          onClick={() => {
            setInput("");
            setOutput("");
            setStatus("");
          }}
        >
          Reset
        </button>
        <CopyButton key={output} text={output} />
      </div>
      <p className="help">
        Limit: 1,000,000 characters and 128 nesting levels. Uses JSON.parse,
        never executes code. JavaScript numbers can lose precision beyond 15–17
        digits; encode large identifiers as strings. Duplicate object keys
        retain only the last value.
      </p>
    </fieldset>
  );
}
