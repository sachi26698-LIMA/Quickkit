"use client";

import { useState } from "react";
import { FileArchive } from "lucide-react";
import { downloadBlob } from "@/lib/tools/download";
import {
  base64ToBytes,
  bytesToBase64,
  MAX_BASE64_FILE_BYTES,
} from "@/lib/tools/developer-data";
import {
  DevCodeInput,
  DevTextOutput,
  DevToolFrame,
  DevToggle,
  type ToolMessage,
  yieldForUi,
} from "./shared";

const EXAMPLE_TEXT = "Hello, नमस्ते 👋";

export default function Base64Tool() {
  const [direction, setDirection] = useState<"encode" | "decode">("encode");
  const [decodeAs, setDecodeAs] = useState<"text" | "file">("text");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [binaryOutput, setBinaryOutput] = useState<Uint8Array | null>(null);
  const [completed, setCompleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<ToolMessage | null>(null);

  const clear = () => {
    setInput("");
    setOutput("");
    setFile(null);
    setBinaryOutput(null);
    setCompleted(false);
    setMessage(null);
  };
  const reset = () => {
    clear();
    setDirection("encode");
    setDecodeAs("text");
  };

  async function transform() {
    setBusy(true);
    setOutput("");
    setBinaryOutput(null);
    setCompleted(false);
    setMessage(null);
    try {
      await yieldForUi();
      if (direction === "encode") {
        const bytes = file
          ? new Uint8Array(await file.arrayBuffer())
          : new TextEncoder().encode(input);
        if (!file && !input.length)
          throw new Error("Enter text or choose a file to encode.");
        if (bytes.byteLength > MAX_BASE64_FILE_BYTES) {
          throw new Error(
            `Input is too large. Keep it below ${MAX_BASE64_FILE_BYTES.toLocaleString()} bytes.`,
          );
        }
        const encoded = bytesToBase64(bytes);
        setOutput(encoded);
        setCompleted(true);
        setMessage({
          kind: "success",
          text: `${file ? `Encoded ${file.name}` : "Text encoded"} to Base64 (${bytes.byteLength.toLocaleString()} UTF-8/binary bytes).`,
        });
        return;
      }

      const bytes = base64ToBytes(input);
      if (decodeAs === "file") {
        setBinaryOutput(bytes);
        setCompleted(true);
        setOutput(
          `Binary output ready · ${bytes.byteLength.toLocaleString()} bytes. Download the decoded file to save it locally.`,
        );
        setMessage({
          kind: "success",
          text: `Decoded ${bytes.byteLength.toLocaleString()} bytes. The binary remains in this browser until you download or clear it.`,
        });
      } else {
        const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        setOutput(decoded);
        setCompleted(true);
        setMessage({
          kind: "success",
          text: `Decoded ${bytes.byteLength.toLocaleString()} bytes as UTF-8 text.`,
        });
      }
    } catch (error) {
      setOutput("");
      setBinaryOutput(null);
      setCompleted(false);
      setMessage({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not process this Base64 input.",
      });
    } finally {
      setBusy(false);
    }
  }

  const sample = () => {
    setFile(null);
    setBinaryOutput(null);
    setCompleted(false);
    setOutput("");
    setInput(
      direction === "encode"
        ? EXAMPLE_TEXT
        : bytesToBase64(new TextEncoder().encode(EXAMPLE_TEXT)),
    );
    setMessage(null);
  };
  const downloadBinary = () => {
    if (!binaryOutput) return;
    const buffer = new ArrayBuffer(binaryOutput.byteLength);
    new Uint8Array(buffer).set(binaryOutput);
    downloadBlob(
      new Blob([buffer], { type: "application/octet-stream" }),
      "quickkit-decoded.bin",
    );
  };

  return (
    <DevToolFrame
      title="Text to bytes, bytes to text"
      description="Encode UTF-8 text or a local file to Base64, then decode it as readable UTF-8 or download the original bytes."
      message={message}
      output={output}
      busy={busy}
      busyLabel="Encoding or decoding locally…"
      copyText={binaryOutput ? "" : output}
      filename={
        direction === "encode" ? "quickkit.base64.txt" : "quickkit-decoded.txt"
      }
      mimeType="text/plain;charset=utf-8"
      downloadLabel={
        binaryOutput
          ? "Download decoded file"
          : direction === "encode"
            ? "Download Base64"
            : "Download text"
      }
      download={binaryOutput ? downloadBinary : undefined}
      canDownload={binaryOutput ? true : completed}
      hasContent={Boolean(input || output || file)}
      onClear={clear}
      onReset={reset}
      help="Text uses UTF-8. File encoding preserves bytes; binary decoding saves a .bin file. Strict character and padding checks run before decoding. All work stays on your device."
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
            setBinaryOutput(null);
            setCompleted(false);
            setMessage(null);
            setFile(null);
          }}
        />
        {direction === "decode" ? (
          <DevToggle
            label="Decoded output"
            value={decodeAs}
            options={[
              { value: "text", label: "UTF-8 text" },
              { value: "file", label: "Binary file" },
            ]}
            onChange={(value) => {
              setDecodeAs(value as "text" | "file");
              setOutput("");
              setBinaryOutput(null);
              setCompleted(false);
              setMessage(null);
            }}
          />
        ) : null}
      </div>
      <div className="devtool-editors">
        <DevCodeInput
          id="base64-input"
          label={
            direction === "encode" ? "Text or Base64 input" : "Base64 input"
          }
          value={input}
          onChange={(value) => {
            setInput(value);
            setFile(null);
            setOutput("");
            setBinaryOutput(null);
            setCompleted(false);
            setMessage(null);
          }}
          placeholder={
            direction === "encode"
              ? "Type Unicode text to encode…"
              : "Paste Base64 data to decode…"
          }
          maxLength={direction === "encode" ? 1_000_000 : 14_000_000}
          sample={
            direction === "encode"
              ? "Sample Unicode text"
              : "Sample valid Base64"
          }
          onSample={sample}
          onFileSelect={
            direction === "encode"
              ? (selected) => {
                  if (selected.size > MAX_BASE64_FILE_BYTES) {
                    setFile(null);
                    setOutput("");
                    setBinaryOutput(null);
                    setCompleted(false);
                    setMessage({
                      kind: "error",
                      text: `File is too large. Keep it below ${MAX_BASE64_FILE_BYTES.toLocaleString()} bytes.`,
                    });
                    return;
                  }
                  setFile(selected);
                  setInput("");
                  setOutput("");
                  setBinaryOutput(null);
                  setCompleted(false);
                  setMessage({
                    kind: "success",
                    text: `Selected ${selected.name} locally. Choose Encode to create its Base64 text.`,
                  });
                }
              : undefined
          }
          fileAccept="*/*"
          fileLabel="Choose a file"
        />
        <div>
          <DevTextOutput
            id="base64-output"
            label={
              binaryOutput
                ? "Decoded binary file"
                : direction === "encode"
                  ? "Base64 output"
                  : "Decoded UTF-8 output"
            }
            value={output}
            placeholder={
              direction === "encode"
                ? "Base64 output will appear here…"
                : "Decoded content will appear here…"
            }
          />
          {file ? (
            <p className="devtool-file-note">
              <FileArchive size={15} aria-hidden="true" /> {file.name} ·{" "}
              {file.size.toLocaleString()} bytes selected. Text input clears
              this file selection.
            </p>
          ) : null}
        </div>
      </div>
      <div className="devtool-action-row">
        <button
          type="button"
          className="primary"
          onClick={() => void transform()}
        >
          {direction === "encode" ? "Encode Base64" : "Decode Base64"}
        </button>
      </div>
    </DevToolFrame>
  );
}
