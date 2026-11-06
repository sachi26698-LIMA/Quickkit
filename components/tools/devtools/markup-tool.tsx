"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/tools/download";
import {
  compareSizes,
  formatHtml,
  formatXml,
  MAX_MARKUP_FILE_BYTES,
  MAX_DEVELOPER_TEXT_LENGTH,
  minifyHtml,
  SAMPLE_HTML,
  SAMPLE_XML,
} from "@/lib/tools/developer-code";
import {
  DevCodeInput,
  DevCodeOutput,
  DevToolFrame,
  type ToolMessage,
  yieldForUi,
} from "./shared";

type MarkupKind = "html" | "xml";
type Indent = 2 | 4 | "\t";

export default function MarkupTool({ kind }: { kind: MarkupKind }) {
  const isHtml = kind === "html";
  const label = isHtml ? "HTML" : "XML";
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState<ToolMessage | null>(null);
  const [indent, setIndent] = useState<Indent>(2);
  const [stats, setStats] = useState<ReturnType<typeof compareSizes> | null>(
    null,
  );
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    setInput("");
    setOutput("");
    setCompleted(false);
    setStats(null);
    setMessage(null);
  };
  const reset = () => {
    clear();
    setIndent(2);
  };

  async function transform(mode: "format" | "minify") {
    setBusy(true);
    setCompleted(false);
    setOutput("");
    setStats(null);
    setMessage(null);
    try {
      await yieldForUi();
      const result = isHtml
        ? mode === "format"
          ? await formatHtml(input, { indent })
          : await minifyHtml(input)
        : formatXml(input, { compact: mode === "minify", indent });
      setOutput(result);
      setCompleted(true);
      setStats(compareSizes(input, result));
      setMessage({
        kind: "success",
        text: `${label} ${mode === "format" ? "formatted" : "minified"} locally. No markup or embedded code was executed.`,
      });
    } catch (error) {
      setOutput("");
      setStats(null);
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : `Could not process this ${label}.`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function loadFile(file: File) {
    setBusy(true);
    setCompleted(false);
    setOutput("");
    setStats(null);
    setMessage(null);
    try {
      await yieldForUi();
      if (file.size > MAX_MARKUP_FILE_BYTES) {
        throw new Error(
          `${label} file is too large. Keep it below ${formatBytes(MAX_MARKUP_FILE_BYTES)}.`,
        );
      }
      const text = await file.text();
      if (text.length > MAX_DEVELOPER_TEXT_LENGTH) {
        throw new Error(
          `${label} file is too large. Keep it below 1,000,000 characters.`,
        );
      }
      setInput(text);
      setOutput("");
      setStats(null);
      setMessage({
        kind: "success",
        text: `Loaded ${file.name} locally. Choose Format or Minify.`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : `Could not read this ${label} file.`,
      });
    } finally {
      setBusy(false);
    }
  }

  const sample = isHtml ? SAMPLE_HTML : SAMPLE_XML;
  const extension = isHtml ? "html" : "xml";
  const language = isHtml ? "html" : "xml";
  return (
    <DevToolFrame
      title={
        isHtml
          ? "Clean markup, keep its meaning"
          : "Structure XML with confidence"
      }
      description={
        isHtml
          ? "Format readable HTML or minify it with whitespace-aware parsing. Output stays inert text; scripts never run."
          : "Beautify or compact well-formed XML with controlled indentation. DTD declarations are rejected to avoid external-entity risks."
      }
      message={message}
      output={output}
      busy={busy}
      busyLabel="Processing markup locally…"
      filename={`quickkit.${extension}`}
      mimeType={`text/${extension};charset=utf-8`}
      downloadLabel={`Download .${extension}`}
      canDownload={completed}
      hasContent={Boolean(input || output)}
      onClear={clear}
      onReset={reset}
      help={
        isHtml
          ? "Formatting uses an HTML parser. Minification preserves meaningful inline spacing and leaves embedded JavaScript/CSS unchanged. Nothing is rendered or executed."
          : "XML is parsed locally. External DTDs and entity declarations are blocked; mixed text content and xml:space=" +
            '"preserve"' +
            " sections are kept intact."
      }
    >
      <div className="devtool-editors">
        <DevCodeInput
          id={`${kind}-input`}
          label={`${label} input`}
          value={input}
          onChange={(value) => {
            setInput(value);
            setOutput("");
            setCompleted(false);
            setStats(null);
            setMessage(null);
          }}
          placeholder={
            isHtml
              ? "<main>\n  <h1>Hello, world!</h1>\n</main>"
              : '<catalog><tool id="json"/></catalog>'
          }
          sample={`Load a ${label} example`}
          onSample={() => {
            setInput(sample);
            setOutput("");
            setCompleted(false);
            setStats(null);
            setMessage(null);
          }}
          onFileSelect={(file) => void loadFile(file)}
          fileAccept={
            isHtml
              ? ".html,.htm,text/html,text/plain"
              : ".xml,text/xml,application/xml,text/plain"
          }
          fileLabel={`Open ${label} file`}
        />
        <DevCodeOutput
          label={`${label} output`}
          value={output}
          language={language}
          placeholder={
            completed && !output
              ? "Minification produced an empty file (for example, comments only)."
              : `Your formatted ${label} appears here…`
          }
        />
      </div>
      <div className="devtool-options">
        <label>
          Indentation
          <select
            aria-label="Indentation"
            value={indent === "\t" ? "tab" : String(indent)}
            onChange={(event) =>
              setIndent(
                event.currentTarget.value === "tab"
                  ? "\t"
                  : (Number(event.currentTarget.value) as 2 | 4),
              )
            }
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tabs</option>
          </select>
        </label>
      </div>
      <div className="devtool-action-row">
        <button
          type="button"
          className="primary"
          onClick={() => void transform("format")}
        >
          Format {label}
        </button>
        <button
          type="button"
          className="secondary"
          onClick={() => void transform("minify")}
        >
          Minify {label}
        </button>
      </div>
      {stats ? (
        <div className="devtool-stats" aria-label={`${label} size comparison`}>
          <div className="devtool-stat">
            <strong>{formatBytes(stats.beforeBytes)}</strong>
            <span>Original UTF-8 size</span>
          </div>
          <div className="devtool-stat">
            <strong>{formatBytes(stats.afterBytes)}</strong>
            <span>Output UTF-8 size</span>
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
                : "Formatting adds whitespace"}
            </span>
          </div>
        </div>
      ) : null}
    </DevToolFrame>
  );
}
