"use client";
import { useHydrated } from "@/lib/use-hydrated";
import { useState } from "react";
import { ArrowLeftRight, RotateCcw } from "lucide-react";
import { convertCase, MAX_TEXT_LENGTH, type CaseMode } from "@/lib/tools/text";
import CopyButton from "./copy-button";
import { CharMeter, DownloadTextButton, WorkspaceHeading } from "./tool-ui";

const GROUPS: { title: string; modes: CaseMode[] }[] = [
  {
    title: "Reading styles",
    modes: ["UPPERCASE", "lowercase", "Title Case", "Sentence case"],
  },
  {
    title: "Developer styles",
    modes: ["camelCase", "PascalCase", "snake_case", "kebab-case"],
  },
  { title: "Playful", modes: ["aLtErNaTiNg", "InVeRtEd"] },
];

export default function CaseConverter() {
  const ready = useHydrated();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [mode, setMode] = useState<CaseMode | null>(null);
  const [status, setStatus] = useState("");

  function convert(nextMode: CaseMode, source = input) {
    setMode(nextMode);
    if (!source.trim()) {
      setStatus("Enter some text before converting.");
      setOutput("");
      return;
    }
    setOutput(convertCase(source, nextMode));
    setStatus(`Converted to ${nextMode}.`);
  }

  function onInput(value: string) {
    setInput(value);
    if (mode && value.trim()) {
      setOutput(convertCase(value, mode));
      setStatus(`Converted to ${mode}.`);
    } else {
      setOutput("");
      setStatus("");
    }
  }

  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <WorkspaceHeading
        title="A fresh case for your text"
        description="Ten styles for readers, writers and developers. Pick one — it updates live as you type."
      />
      <div className="editor-columns">
        <div>
          <div className="tool-toolbar">
            <label htmlFor="case-input">Original text</label>
            <CharMeter value={input.length} max={MAX_TEXT_LENGTH} />
          </div>
          <textarea
            id="case-input"
            maxLength={MAX_TEXT_LENGTH}
            value={input}
            onChange={(e) => onInput(e.target.value)}
            placeholder="Paste the text you want to convert…"
          />
        </div>
        <div>
          <div className="tool-toolbar">
            <label htmlFor="case-output">Converted text</label>
            <CharMeter value={output.length} max={MAX_TEXT_LENGTH} />
          </div>
          <textarea
            id="case-output"
            readOnly
            value={output}
            placeholder="Your converted text will appear here…"
          />
        </div>
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} className="mode-group">
          <span className="mode-group-title" id={`mode-${group.title}`}>
            {group.title}
          </span>
          <div
            className="action-row mode-row"
            role="group"
            aria-labelledby={`mode-${group.title}`}
          >
            {group.modes.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                className={mode === m ? "primary" : "secondary"}
                onClick={() => convert(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="workspace-foot">
        <div className="foot-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setInput("");
              setOutput("");
              setMode(null);
              setStatus("Cleared.");
            }}
          >
            <RotateCcw size={15} /> Reset
          </button>
          <button
            type="button"
            className="secondary"
            disabled={!output}
            onClick={() => {
              setInput(output);
              if (mode) setOutput(convertCase(output, mode));
              setStatus("Output moved to the input editor.");
            }}
          >
            <ArrowLeftRight size={15} /> Use output as input
          </button>
        </div>
        <div className="foot-actions">
          <DownloadTextButton
            text={output}
            filename="quickkit-converted-text.txt"
          />
          <CopyButton key={output} text={output} />
        </div>
      </div>
      {status && (
        <p className="status" role="status">
          {status}
        </p>
      )}
      <p className="help">
        Up to 1,000,000 UTF-16 code units. Line breaks are preserved; developer
        styles convert each line into a single identifier. Title and sentence
        casing use simple rules — language conventions can vary.
      </p>
    </fieldset>
  );
}
