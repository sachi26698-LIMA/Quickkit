"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/tools/download";
import {
  compareSizes,
  minifyCss,
  minifyJavaScript,
  MAX_DEVELOPER_TEXT_LENGTH,
  SAMPLE_CSS,
  SAMPLE_JAVASCRIPT,
} from "@/lib/tools/developer-code";
import {
  DevCodeInput,
  DevCodeOutput,
  DevToolFrame,
  type ToolMessage,
} from "./shared";

type MinifierKind = "css" | "javascript";

export default function MinifierTool({ kind }: { kind: MinifierKind }) {
  const isCss = kind === "css";
  const name = isCss ? "CSS" : "JavaScript";
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState<ToolMessage | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof compareSizes> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const clear = () => {
    setInput("");
    setOutput("");
    setCompleted(false);
    setStats(null);
    setMessage(null);
  };
  const reset = () => clear();

  async function minify() {
    setBusy(true);
    setCompleted(false);
    setOutput("");
    setStats(null);
    try {
      const result = isCss ? minifyCss(input) : await minifyJavaScript(input);
      setOutput(result);
      setCompleted(true);
      setStats(compareSizes(input, result));
      setMessage({
        kind: "success",
        text: `${name} minified locally. The parser transforms syntax only; user code is never executed.`,
      });
    } catch (error) {
      setOutput("");
      setStats(null);
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : `Could not minify this ${name}.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadFile(file: File) {
    setCompleted(false);
    setOutput("");
    setStats(null);
    try {
      if (file.size > MAX_DEVELOPER_TEXT_LENGTH) {
        throw new Error(
          `${name} file is too large. Keep it below 1,000,000 bytes.`,
        );
      }
      const text = await file.text();
      setInput(text);
      setOutput("");
      setStats(null);
      setMessage({
        kind: "success",
        text: `Loaded ${file.name} locally. Minify when ready.`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : `Could not read this ${name} file.`,
      });
    }
  }

  const filename = isCss ? "quickkit.min.css" : "quickkit.min.js";
  return (
    <DevToolFrame
      title={
        isCss
          ? "Less weight, same styling"
          : "Trim JavaScript without running it"
      }
      description={
        isCss
          ? "Parse and compress CSS with comments, whitespace and safe syntax-aware optimizations handled locally."
          : "Use a standards-aware JavaScript parser to minify source, compare sizes and report syntax errors. The input is never executed."
      }
      message={message}
      output={output}
      filename={filename}
      mimeType={
        isCss ? "text/css;charset=utf-8" : "text/javascript;charset=utf-8"
      }
      downloadLabel={`Download .${isCss ? "css" : "js"}`}
      canDownload={completed}
      hasContent={Boolean(input || output)}
      onClear={clear}
      onReset={reset}
      help={
        isCss
          ? "The minifier keeps license-style /*! comments, parses CSS rather than deleting characters with regular expressions, and rejects invalid syntax."
          : "JavaScript is parsed and transformed by Terser in this page. No eval, Function constructor, script element or user-code execution is used. Keep the source below 1,000,000 characters."
      }
    >
      <div className="devtool-editors">
        <DevCodeInput
          id={`${kind}-input`}
          label={`${name} input`}
          value={input}
          onChange={(value) => {
            setInput(value);
            setOutput("");
            setCompleted(false);
            setStats(null);
            setMessage(null);
          }}
          placeholder={
            isCss
              ? ".card { color: #fff; }"
              : "function greet(name) { return `Hello, ${name}!`; }"
          }
          maxLength={MAX_DEVELOPER_TEXT_LENGTH}
          sample={`Load a ${name} example`}
          onSample={() => {
            setInput(isCss ? SAMPLE_CSS : SAMPLE_JAVASCRIPT);
            setOutput("");
            setCompleted(false);
            setStats(null);
            setMessage(null);
          }}
          onFileSelect={(file) => void loadFile(file)}
          fileAccept={
            isCss
              ? ".css,text/css,text/plain"
              : ".js,.mjs,.cjs,text/javascript,application/javascript,text/plain"
          }
          fileLabel={`Open ${name} file`}
        />
        <DevCodeOutput
          label={`${name} minified output`}
          value={output}
          language={isCss ? "css" : "javascript"}
          placeholder={
            completed && !output
              ? "Minification produced an empty file (for example, comments only)."
              : `Minified ${name} output appears here…`
          }
        />
      </div>
      <div className="devtool-action-row">
        <button
          type="button"
          className="primary"
          onClick={() => void minify()}
          disabled={busy}
        >
          {busy ? "Minifying…" : `Minify ${name}`}
        </button>
      </div>
      {stats ? (
        <div className="devtool-stats" aria-label={`${name} size comparison`}>
          <div className="devtool-stat">
            <strong>{formatBytes(stats.beforeBytes)}</strong>
            <span>Original UTF-8 size</span>
          </div>
          <div className="devtool-stat">
            <strong>{formatBytes(stats.afterBytes)}</strong>
            <span>Compressed UTF-8 size</span>
          </div>
          <div className="devtool-stat">
            <strong>
              {stats.savedPercent >= 0
                ? `${stats.savedPercent.toFixed(1)}%`
                : `${Math.abs(stats.savedPercent).toFixed(1)}% larger`}
            </strong>
            <span>
              {stats.savedPercent >= 0
                ? `${formatBytes(stats.savedBytes)} saved`
                : "Output is larger than source"}
            </span>
          </div>
        </div>
      ) : null}
    </DevToolFrame>
  );
}
