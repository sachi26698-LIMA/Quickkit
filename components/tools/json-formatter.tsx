"use client";
import { useHydrated } from "@/lib/use-hydrated";
import { useRef, useState } from "react";
import {
  Braces,
  CircleCheck,
  FileUp,
  Minimize2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  inspectJson,
  locateJsonError,
  MAX_JSON_LENGTH,
  processJson,
  SAMPLE_JSON,
  type JsonIndent,
} from "@/lib/tools/json";
import { formatBytes } from "@/lib/tools/download";
import CopyButton from "./copy-button";
import { CharMeter, DownloadTextButton, WorkspaceHeading } from "./tool-ui";

type Inspect = ReturnType<typeof inspectJson> | null;
type ErrorSpot = ReturnType<typeof locateJsonError>;

export default function JsonFormatter() {
  const ready = useHydrated();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  const [spot, setSpot] = useState<ErrorSpot>(null);
  const [info, setInfo] = useState<Inspect>(null);
  const [indent, setIndent] = useState<JsonIndent>(2);
  const [sortKeys, setSortKeys] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const indentLabel = indent === "\t" ? "tab" : `${indent}-space`;

  function clearResults() {
    setOutput("");
    setStatus("");
    setSpot(null);
    setInfo(null);
    setError(false);
  }

  function process(mode: "format" | "minify" | "validate") {
    try {
      const result = processJson(input, mode, { indent, sortKeys });
      setOutput(result);
      setSpot(null);
      try {
        setInfo(inspectJson(input));
      } catch {
        setInfo(null);
      }
      setStatus(
        mode === "validate"
          ? "Valid JSON. Your data is ready to use."
          : mode === "format"
            ? `JSON formatted with ${indentLabel} indentation${sortKeys ? ", keys sorted A–Z" : ""}.`
            : `JSON minified${sortKeys ? ", keys sorted A–Z" : ""}.`,
      );
      setError(false);
    } catch (e) {
      setOutput("");
      setInfo(null);
      setSpot(input.trim() ? locateJsonError(input) : null);
      setStatus(
        e instanceof Error ? e.message : "Could not process this JSON.",
      );
      setError(true);
    }
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_JSON_LENGTH) {
      clearResults();
      setError(true);
      setStatus("JSON is too large. Keep input below 1,000,000 characters.");
      return;
    }
    const text = await file.text();
    setInput(text);
    clearResults();
    setStatus(
      `Loaded ${file.name} (${formatBytes(file.size)}). Choose an action below.`,
    );
  }

  const sizeDelta =
    info && output
      ? new TextEncoder().encode(output).length - info.inputBytes
      : 0;

  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <WorkspaceHeading
        title="A little structure goes a long way"
        description="Format, validate or minify JSON — with exact error locations when something is off."
      />
      <div className="editor-columns">
        <div>
          <div className="tool-toolbar">
            <label htmlFor="json-input">JSON input</label>
            <div className="toolbar-actions">
              <button
                type="button"
                className="toolbar-button"
                onClick={() => {
                  setInput(SAMPLE_JSON);
                  clearResults();
                }}
              >
                <Sparkles size={14} /> Sample
              </button>
              <button
                type="button"
                className="toolbar-button"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp size={14} /> Open file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json,text/plain"
                className="sr-only"
                aria-label="Open a JSON file"
                onChange={(e) => {
                  void loadFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
          <textarea
            id="json-input"
            className="code-input"
            spellCheck={false}
            maxLength={MAX_JSON_LENGTH}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              clearResults();
            }}
            placeholder={'{\n  "hello": "world"\n}'}
          />
          <div className="input-footer">
            <CharMeter value={input.length} max={MAX_JSON_LENGTH} />
            <span>Parsed locally — code is never executed.</span>
          </div>
        </div>
        <div>
          <div className="tool-toolbar">
            <label htmlFor="json-output">JSON result</label>
            <CharMeter value={output.length} max={MAX_JSON_LENGTH} />
          </div>
          <textarea
            id="json-output"
            className="code-input"
            spellCheck={false}
            readOnly
            value={output}
            placeholder="Your formatted JSON will appear here…"
          />
          <div className="input-footer">
            <span>
              {info && output
                ? `${formatBytes(info.inputBytes)} in → ${formatBytes(new TextEncoder().encode(output).length)} out${sizeDelta !== 0 ? ` (${sizeDelta < 0 ? "−" : "+"}${formatBytes(Math.abs(sizeDelta))})` : ""}`
                : "Result size will appear here."}
            </span>
          </div>
        </div>
      </div>

      <div className="option-bar">
        <div className="option-group">
          <label htmlFor="json-indent">Indent</label>
          <select
            id="json-indent"
            value={indent === "\t" ? "tab" : String(indent)}
            onChange={(e) => {
              setIndent(
                e.target.value === "tab"
                  ? "\t"
                  : (Number(e.target.value) as JsonIndent),
              );
              clearResults();
            }}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </div>
        <label className="check-label option-check">
          <input
            type="checkbox"
            checked={sortKeys}
            onChange={(e) => {
              setSortKeys(e.target.checked);
              clearResults();
            }}
          />
          Sort keys A–Z
        </label>
      </div>

      <div className="action-row">
        <button className="primary" onClick={() => process("format")}>
          <Braces size={16} /> Format JSON
        </button>
        <button className="secondary" onClick={() => process("minify")}>
          <Minimize2 size={16} /> Minify
        </button>
        <button className="secondary" onClick={() => process("validate")}>
          <CircleCheck size={16} /> Validate
        </button>
      </div>
      {status && (
        <div className={`status ${error ? "error" : "success"}`} role="status">
          <p>
            {error ? "Error: " : ""}
            {status}
            {error && spot ? ` (line ${spot.line}, column ${spot.column})` : ""}
          </p>
          {error && spot && (
            <pre className="error-excerpt" aria-label="Error location">
              {spot.excerpt}
            </pre>
          )}
        </div>
      )}
      {info && !error && output && (
        <div className="meta-chips" aria-label="JSON summary">
          <span>Root: {info.rootType}</span>
          <span>{info.keyCount.toLocaleString()} keys</span>
          <span>{info.maxDepth} levels deep</span>
          <span>{formatBytes(info.inputBytes)}</span>
        </div>
      )}
      <div className="workspace-foot">
        <button
          className="secondary"
          onClick={() => {
            setInput("");
            clearResults();
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
        <div className="foot-actions">
          <DownloadTextButton
            text={output}
            filename="quickkit.json"
            label="Download .json"
            mimeType="application/json;charset=utf-8"
          />
          <CopyButton key={output} text={output} />
        </div>
      </div>
      <p className="help">
        Limit: 1,000,000 characters and 128 nesting levels. Uses JSON.parse,
        never executes code. JavaScript numbers can lose precision beyond 15–17
        digits; encode large identifiers as strings. Non-finite overflow is
        rejected. Duplicate object keys retain only the last value.
      </p>
    </fieldset>
  );
}
