"use client";

import { useState } from "react";
import {
  generateUuidBatch,
  UUID_BATCH_LIMIT,
} from "@/lib/tools/developer-data";
import { DevTextOutput, DevToolFrame, type ToolMessage } from "./shared";

export default function UuidGenerator() {
  const [quantity, setQuantity] = useState("10");
  const [output, setOutput] = useState("");
  const [message, setMessage] = useState<ToolMessage | null>(null);

  const clear = () => {
    setOutput("");
    setMessage(null);
  };
  const reset = () => {
    clear();
    setQuantity("10");
  };

  function generate(count = Number(quantity)) {
    try {
      const values = generateUuidBatch(count);
      setOutput(values.join("\n"));
      setMessage({
        kind: "success",
        text: `${values.length.toLocaleString()} unique UUID v4 values generated with the browser's secure random source.`,
      });
    } catch (error) {
      setOutput("");
      setMessage({
        kind: "error",
        text:
          error instanceof Error ? error.message : "Could not generate UUIDs.",
      });
    }
  }

  return (
    <DevToolFrame
      title="Identifiers with real entropy"
      description="Generate RFC 4122 variant UUID v4 identifiers with the browser's cryptographically secure random generator. Each batch is checked for duplicates."
      message={message}
      output={output}
      filename="quickkit-uuids.txt"
      mimeType="text/plain;charset=utf-8"
      downloadLabel="Download UUIDs"
      hasContent={Boolean(output)}
      onClear={clear}
      onReset={reset}
      help={`UUID v4 values use crypto.getRandomValues and set the version and variant bits correctly. Quantity is limited to 1–${UUID_BATCH_LIMIT.toLocaleString()} per batch; generated batches are unique.`}
    >
      <div className="devtool-options">
        <label>
          Quantity
          <input
            type="number"
            aria-label="UUID quantity"
            min={1}
            max={UUID_BATCH_LIMIT}
            step={1}
            inputMode="numeric"
            value={quantity}
            onChange={(event) => setQuantity(event.currentTarget.value)}
          />
        </label>
        <button
          type="button"
          className="toolbar-button"
          onClick={() => generate(3)}
        >
          Sample 3 UUIDs
        </button>
      </div>
      <div className="devtool-editors">
        <div className="devtool-editor">
          <div className="devtool-editor-toolbar">
            <span className="field-label">Batch settings</span>
          </div>
          <p className="help">
            Choose any whole number from 1 to{" "}
            {UUID_BATCH_LIMIT.toLocaleString()}. Every result is checked before
            it is added.
          </p>
          <div className="devtool-stat" aria-live="polite">
            <strong>
              {output
                ? `${output.split("\n").length.toLocaleString()} unique IDs`
                : "Ready to generate"}
            </strong>
            <span>UUID version 4 · secure local randomness</span>
          </div>
        </div>
        <DevTextOutput
          id="uuid-output"
          label="Generated UUIDs"
          value={output}
          placeholder="Your generated UUID v4 values will appear here…"
        />
      </div>
      <div className="devtool-action-row">
        <button type="button" className="primary" onClick={() => generate()}>
          Generate UUIDs
        </button>
      </div>
    </DevToolFrame>
  );
}
