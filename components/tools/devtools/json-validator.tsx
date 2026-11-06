"use client";

import { useState } from "react";
import { MAX_DEVELOPER_TEXT_LENGTH } from "@/lib/tools/developer-code";
import { inspectJson, locateJsonError, processJson } from "@/lib/tools/json";
import {
  DevCodeInput,
  DevTextOutput,
  DevToolFrame,
  type ToolMessage,
} from "./shared";

const JSON_VALIDATOR_SAMPLE = `{"service":"QUICKKIT","ready":true,"tools":["format","validate"]}`;

export default function JsonValidator() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState<ToolMessage | null>(null);

  const clear = () => {
    setInput("");
    setOutput("");
    setMessage(null);
  };
  const reset = () => clear();

  function validate() {
    try {
      const normalized = processJson(input, "validate");
      const summary = inspectJson(input);
      setOutput(normalized);
      setMessage({
        kind: "success",
        text: `Valid JSON · ${summary.rootType} root · ${summary.keyCount.toLocaleString()} keys · parsed locally.`,
      });
    } catch (error) {
      const reason =
        error instanceof Error
          ? error.message
          : "The input could not be parsed.";
      if (input.trim()) {
        const spot = locateJsonError(input);
        const location = spot
          ? ` Error near line ${spot.line}, column ${spot.column}.`
          : "";
        const excerpt = spot ? ` ${spot.excerpt.replace("\n", " — ")}` : "";
        setOutput("");
        setMessage({
          kind: "error",
          text: `${reason}${location}${excerpt} JSON requires double-quoted keys and strings, commas between values, matching brackets, and no trailing commas.`,
        });
      } else {
        setOutput("");
        setMessage({ kind: "error", text: reason });
      }
    }
  }

  async function loadFile(file: File) {
    try {
      if (file.size > MAX_DEVELOPER_TEXT_LENGTH) {
        throw new Error(
          "JSON file is too large. Keep it below 1,000,000 bytes.",
        );
      }
      const text = await file.text();
      setInput(text);
      setOutput("");
      setMessage({
        kind: "success",
        text: `Loaded ${file.name} locally. Validate it when ready.`,
      });
    } catch (error) {
      setMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Could not read this file.",
      });
    }
  }

  return (
    <DevToolFrame
      title="Catch syntax issues before they travel"
      description="Validate JSON without transforming your source or executing anything. Errors include a line and column when available."
      message={message}
      output={output}
      filename="quickkit-validated.json"
      mimeType="application/json;charset=utf-8"
      downloadLabel="Download JSON"
      hasContent={Boolean(input || output)}
      onClear={clear}
      onReset={reset}
      help="JSON does not allow comments, single-quoted strings, undefined, NaN or trailing commas. Inputs are checked in the browser and are never uploaded."
    >
      <div className="devtool-editors">
        <DevCodeInput
          id="json-validation-input"
          label="JSON input"
          value={input}
          onChange={(value) => {
            setInput(value);
            setOutput("");
            setMessage(null);
          }}
          placeholder={'{\n  "name": "QUICKKIT",\n  "active": true\n}'}
          sample="Load a valid example"
          onSample={() => {
            setInput(JSON_VALIDATOR_SAMPLE);
            setOutput("");
            setMessage(null);
          }}
          onFileSelect={(file) => void loadFile(file)}
          fileAccept=".json,application/json,text/plain"
          fileLabel="Open JSON file"
        />
        <DevTextOutput
          id="json-validation-output"
          label="Validation result"
          value={output}
          placeholder="A normalized JSON preview appears after validation."
        />
      </div>
      <div className="devtool-action-row">
        <button type="button" className="primary" onClick={validate}>
          Validate JSON
        </button>
      </div>
    </DevToolFrame>
  );
}
