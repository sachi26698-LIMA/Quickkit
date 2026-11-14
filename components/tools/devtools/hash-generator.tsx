"use client";

import { useState } from "react";
import { FileSearch } from "lucide-react";
import { formatBytes } from "@/lib/tools/download";
import {
  hashFile,
  hashFileBatch,
  hashText,
  MAX_HASH_FILE_BYTES,
  type HashAlgorithm,
} from "@/lib/tools/developer-data";
import {
  DevCodeInput,
  DevTextOutput,
  DevToolFrame,
  type ToolMessage,
  yieldForUi,
} from "./shared";

const ALGORITHMS: HashAlgorithm[] = [
  "MD5",
  "SHA-1",
  "SHA-256",
  "SHA-384",
  "SHA-512",
];

export default function HashGenerator() {
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [source, setSource] = useState<"text" | "file">("text");
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [manifest, setManifest] = useState("");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState<ToolMessage | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const clear = () => {
    setInput("");
    setFiles([]);
    setManifest("");
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
    setOutput("");
    setMessage(null);
    setProgress(0);
    try {
      await yieldForUi();
      const digest =
        source === "file" && files.length
          ? files.length === 1 && !manifest.trim()
            ? await hashFile(files[0], algorithm, setProgress)
            : await hashFileBatch(files, algorithm, setProgress, manifest)
          : source === "file"
            ? (() => {
                throw new Error("Choose a file to hash first.");
              })()
            : await hashText(input, algorithm, setProgress);
      setOutput(digest);
      setMessage({
        kind:
          algorithm === "MD5" ||
          algorithm === "SHA-1" ||
          digest.includes("[MISMATCH]") ||
          digest.includes("[NO REFERENCE]") ||
          /[1-9]\d* reference\(s\) without/.test(digest)
            ? "warning"
            : "success",
        text: `${algorithm} digest generated locally from ${source === "file" ? `${files.length} file(s), ${formatBytes(files.reduce((sum, file) => sum + file.size, 0))} total` : `${new TextEncoder().encode(input).byteLength.toLocaleString()} UTF-8 bytes`}.${algorithm === "MD5" || algorithm === "SHA-1" ? " This legacy digest is not recommended for security-sensitive integrity checks." : ""}`,
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

  function loadFiles(selected: File[]) {
    if (
      selected.length > 50 ||
      selected.some((file) => file.size > MAX_HASH_FILE_BYTES) ||
      selected.reduce((sum, file) => sum + file.size, 0) > 500 * 1024 * 1024
    ) {
      setFiles([]);
      setOutput("");
      setProgress(0);
      setMessage({
        kind: "error",
        text: "Choose up to 50 files, each at most 100 MiB and 500 MiB total.",
      });
      return;
    }
    setFiles(selected);
    setInput("");
    setOutput("");
    setProgress(0);
    setMessage({
      kind: "success",
      text: `Selected ${selected.length} file(s) locally. Choose Generate hash to calculate the digests.`,
    });
  }

  return (
    <DevToolFrame
      title="Local text and file checksums"
      description="Generate MD5, SHA-1, SHA-256, SHA-384 or SHA-512 from UTF-8 text or local file bytes. Hashing is chunked and stays in your browser."
      message={message}
      output={output}
      busy={busy}
      busyLabel=""
      filename={`quickkit-${algorithm.toLowerCase().replaceAll("-", "")}-hash.txt`}
      mimeType="text/plain;charset=utf-8"
      downloadLabel="Download hash"
      hasContent={Boolean(input || files.length || output)}
      onClear={clear}
      onReset={reset}
      help={`Supported digests: ${ALGORITHMS.join(", ")}. MD5 and SHA-1 are provided for compatibility only; do not use them for security-sensitive signatures or password storage. Text is UTF-8 encoded and files are read in 1 MiB chunks, up to ${Math.round(MAX_HASH_FILE_BYTES / 1024 / 1024)} MiB each; up to 50 files and 500 MiB combined.`}
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
              setFiles([]);
              setManifest("");
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
              <FileSearch size={15} aria-hidden="true" /> Choose files
            </label>
            <input
              id="hash-file-input"
              className="sr-only"
              type="file"
              multiple
              aria-label="Choose a file to hash"
              onChange={(event) => {
                const selected = Array.from(event.currentTarget.files ?? []);
                if (selected.length) loadFiles(selected);
                event.currentTarget.value = "";
              }}
            />
            {files.length ? (
              <p className="devtool-file-note">
                {files.length} file(s) selected · read locally in 1 MiB chunks
              </p>
            ) : (
              <p className="devtool-file-note">
                Choose up to 50 files, each up to{" "}
                {Math.round(MAX_HASH_FILE_BYTES / 1024 / 1024)} MiB, 500 MiB
                combined. Empty files are valid inputs.
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
      {source === "file" && (
        <label>
          Expected checksums (optional JSON array of name and digest objects)
          <textarea
            rows={4}
            maxLength={100000}
            value={manifest}
            placeholder={'[{"name":"file.txt","digest":"..."}]'}
            onChange={(event) => {
              setManifest(event.target.value);
              setOutput("");
              setMessage(null);
            }}
          />
          <span className="help">
            Supply trusted reference digests using the selected algorithm.
            Missing files or references are reported; filenames must be unique.
            Possible duplicates are based on matching sizes and digests, not
            byte-by-byte comparison.
          </span>
        </label>
      )}
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
