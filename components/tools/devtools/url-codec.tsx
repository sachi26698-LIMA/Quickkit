"use client";

import { useState } from "react";
import { decodeUrl, encodeUrl } from "@/lib/tools/developer-data";
import {
  DevTextOutput,
  DevToolFrame,
  DevToggle,
  type ToolMessage,
  yieldForUi,
} from "./shared";

const URL_SAMPLE = "https://example.com/search?q=hello world&lang=नमस्ते";

export default function UrlCodec() {
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [mode, setMode] = useState<"component" | "full-url">("component");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState<ToolMessage | null>(null);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    setInput("");
    setOutput("");
    setMessage(null);
  };
  const reset = () => {
    clear();
    setDirection("encode");
    setMode("component");
  };
  async function process() {
    setBusy(true);
    setOutput("");
    setMessage(null);
    try {
      await yieldForUi();
      const result =
        direction === "encode"
          ? encodeUrl(input, mode)
          : decodeUrl(input, mode);
      setOutput(result);
      setMessage({
        kind: "success",
        text: `${direction === "encode" ? "Encoded" : "Decoded"} as ${mode === "component" ? "a URI component" : "a complete URL"}. Query separators stay intact in full-URL mode.`,
      });
    } catch (error) {
      setOutput("");
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not process this URL.",
      });
    } finally {
      setBusy(false);
    }
  }

  const sample = () => {
    const sample =
      direction === "encode" ? URL_SAMPLE : encodeUrl(URL_SAMPLE, mode);
    setInput(sample);
    setOutput("");
    setMessage(null);
  };

  return (
    <DevToolFrame
      title="Encode the whole URL or one value"
      description="Switch between full-URL encoding (keeps URL separators) and component encoding (escapes reserved characters inside a query value)."
      message={message}
      output={output}
      busy={busy}
      busyLabel="Encoding or decoding URL locally…"
      filename="quickkit-url.txt"
      mimeType="text/plain;charset=utf-8"
      downloadLabel="Download result"
      hasContent={Boolean(input || output)}
      onClear={clear}
      onReset={reset}
      help="Component mode uses encodeURIComponent/decodeURIComponent. Full URL mode uses encodeURI/decodeURI, so characters such as ?, &, = and # remain URL structure. Malformed percent escapes are rejected."
    >
      <div className="devtool-options">
        <DevToggle
          label="Direction"
          value={direction}
          options={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
          onChange={(value) => {
            setDirection(value as "encode" | "decode");
            setOutput("");
            setMessage(null);
          }}
        />
        <DevToggle
          label="Encoding mode"
          value={mode}
          options={[
            { value: "component", label: "Component" },
            { value: "full-url", label: "Full URL" },
          ]}
          onChange={(value) => {
            setMode(value as "component" | "full-url");
            setOutput("");
            setMessage(null);
          }}
        />
      </div>
      <div className="devtool-editors">
        <div className="devtool-editor">
          <div className="devtool-editor-toolbar">
            <label htmlFor="url-input">
              {direction === "encode"
                ? "URL or query value"
                : "Encoded URL or component"}
            </label>
            <button type="button" className="toolbar-button" onClick={sample}>
              Sample
            </button>
          </div>
          <textarea
            id="url-input"
            className="code-input devtool-code-input"
            maxLength={1_000_000}
            spellCheck={false}
            value={input}
            onChange={(event) => {
              setInput(event.currentTarget.value);
              setOutput("");
              setMessage(null);
            }}
            placeholder={
              direction === "encode"
                ? "https://example.com/?q=hello world&lang=ગુજરાતી"
                : "Paste percent-encoded URL data…"
            }
          />
          <div className="input-footer devtool-input-footer">
            <span>{input.length.toLocaleString()} / 1,000,000 characters</span>
            <span>Unicode-safe · local only</span>
          </div>
        </div>
        <DevTextOutput
          id="url-output"
          label={
            direction === "encode" ? "Encoded URL output" : "Decoded URL output"
          }
          value={output}
          placeholder="The result will appear here…"
        />
      </div>
      <div className="devtool-action-row">
        <button
          type="button"
          className="primary"
          onClick={() => void process()}
        >
          {direction === "encode" ? "Encode URL" : "Decode URL"}
        </button>
      </div>
    </DevToolFrame>
  );
}
