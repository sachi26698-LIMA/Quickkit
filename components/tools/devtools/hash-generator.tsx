"use client";

import { useState } from "react";
import { FileSearch } from "lucide-react";
import { formatBytes } from "@/lib/tools/download";
import {
  hashFile,
  hashText,
  MAX_HASH_FILE_BYTES,
  type HashAlgorithm,
} from "@/lib/tools/developer-data";
import {
  DevCodeInput,
  DevTextOutput,
  DevToolFrame,
  type ToolMessage,
} from "./shared";

const ALGORITHMS: HashAlgorithm[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

export default function HashGenerator() {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [source, setSource] = useState<"text" | "file">("text");
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState<ToolMessage | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    setInput("");
    setFile(null);
    setOutput("");
    setMessage(null);
    setProgress(0);
  };
  const reset = () => {
    clear();
    setAlgorithm("SHA-256");
    setSource("text");
  };

  async function generate() {
    setBusy(true);
    setProgress(0);
    try {
      const digest =
        source === "file" && file
          ? await hashFile(file, algorithm, setProgress)
          : source === "file"
            ? (() => {
                throw new Error("Choose a file to hash first.");
              })()
            : await hashText(input, algorithm, setProgress);
      setOutput(digest);
      setMessage({
        kind:
          algorithm === "MD5" || algorithm === "SHA-1" ? "warning" : "success",
        text: `${algorithm} digest generated locally from ${source === "file" ? `${formatBytes(file?.size ?? 0)} file data` : `${new TextEncoder().encode(input).byteLength.toLocaleString()} UTF-8 bytes`}.${algorithm === "MD5" || algorithm === "SHA-1" ? " This legacy digest is not recommended for security-sensitive integrity checks." : ""}`,
      });
    } catch (error) {
      setOutput("");
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not generate this hash.",
      });
    } finally {
      setBusy(false);
    }
  }

  function loadFile(selected: File) {
    if (selected.size > MAX_HASH_FILE_BYTES) {
      setFile(null);
      setMessage({
        kind: "error",
        text: `File is too large. Keep it below ${Math.round(MAX_HASH_FILE_BYTES / 1024 / 1024)} MB.`,
      });
      return;
    }
    setFile(selected);
    setInput("");
    setOutput("");
    setProgress(0);
    setMessage({
      kind: "success",
      text: `Selected ${selected.name} locally (${formatBytes(selected.size)}). Choose Generate hash to calculate its digest.`,
    });
  }

  return (
    <DevToolFrame
      title="One file in, one digest out"
      description="Generate MD5, SHA-1, SHA-256 or SHA-512 from UTF-8 text or local file bytes. Hashing is chunked and stays in your browser."
      message={message}
      output={output}
      filename={`quickkit-${algorithm.toLowerCase().replaceAll("-", "")}-hash.txt`}
      mimeType="text/plain;charset=utf-8"
      downloadLabel="Download hash"
      hasContent={Boolean(input || file || output)}
      onClear={clear}
      onReset={reset}
      help={`Supported digests: ${ALGORITHMS.join(", ")}. MD5 and SHA-1 are provided for compatibility only; do not use them for security-sensitive signatures or password storage. Text is UTF-8 encoded and files are read in 1 MiB chunks, up to ${Math.round(MAX_HASH_FILE_BYTES / 1024 / 1024)} MB.`}
    >
      <div className="devtool-options">
        <label>
          Hash algorithm
          <select
            aria-label="Hash algorithm"
            value={algorithm}
            onChange={(event) => {
              setAlgorithm(event.currentTarget.value as HashAlgorithm);
              setOutput("");
              setMessage(null);
            }}
          >
            {ALGORITHMS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Input source
          <select
            aria-label="Input source"
            value={source}
            onChange={(event) => {
              setSource(event.currentTarget.value as "text" | "file");
              setInput("");
              setFile(null);
              setOutput("");
              setProgress(0);
              setMessage(null);
            }}
          >
            <option value="text">Text</option>
            <option value="file">File</option>
          </select>
        </label>
      </div>
      <div className="devtool-editors">
        {source === "text" ? (
          <DevCodeInput
            id="hash-text-input"
            label="Text to hash"
            value={input}
            onChange={(value) => {
              setInput(value);
              setOutput("");
              setMessage(null);
              setProgress(0);
            }}
            placeholder="Text can be empty; an empty string has a valid digest."
            maxLength={5_000_000}
            sample="Load example text"
            onSample={() => {
              setInput("hello world");
              setOutput("");
              setMessage(null);
            }}
          />
        ) : (
          <div className="devtool-editor">
            <div className="devtool-editor-toolbar">
              <span className="field-label">File input</span>
            </div>
            <label className="secondary" htmlFor="hash-file-input">
              <FileSearch size={15} aria-hidden="true" /> Choose a file
            </label>
            <input
              id="hash-file-input"
              className="sr-only"
              type="file"
              aria-label="Choose a file to hash"
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0];
                if (selected) loadFile(selected);
                event.currentTarget.value = "";
              }}
            />
            {file ? (
              <p className="devtool-file-note">
                {file.name} · {formatBytes(file.size)} · read locally in 1 MiB
                chunks
              </p>
            ) : (
              <p className="devtool-file-note">
                Choose any file up to{" "}
                {Math.round(MAX_HASH_FILE_BYTES / 1024 / 1024)} MB. Empty files
                are valid inputs.
              </p>
            )}
          </div>
        )}
        <DevTextOutput
          id="hash-output"
          label={`${algorithm} hash`}
          value={output}
          placeholder="The hexadecimal digest appears here…"
        />
      </div>
      {busy ? (
        <div className="devtool-progress-wrap" role="status" aria-live="polite">
          <span>Hashing locally… {progress}%</span>
          <div className="devtool-progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      <div className="devtool-action-row">
        <button
          type="button"
          className="primary"
          onClick={() => void generate()}
          disabled={busy}
        >
          {busy ? "Hashing…" : "Generate hash"}
        </button>
      </div>
    </DevToolFrame>
  );
}
