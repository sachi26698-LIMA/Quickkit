"use client";

/**
 * A document input for tools that read text: a file the user chooses, or text
 * the user pastes.
 *
 * ## Why both
 *
 * Pasting is the fastest path for someone who already has the text open, and
 * it is the only path for a document the browser cannot parse. Choosing a
 * file is the path for everyone else — and it is the one that matters, because
 * "copy this text out of my PDF" is exactly the step that stops people using
 * a résumé tool.
 *
 * So the two are peers, not a fallback: the extracted text lands in the same
 * textarea, the user can edit it before the tool reads it, and the tool never
 * sees a file it did not extract itself.
 *
 * ## What the user sees while it works
 *
 * The file is read in the browser, and the progress bar is driven by the
 * real read. When the read fails the message says why, and the textarea keeps
 * whatever the user had already typed.
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import FileDrop from "./file-drop";
import { Field } from "./ui";
import { ProgressBar } from "./progress";
import { FILE_POLICIES } from "@/lib/tools/launch/file-policy";
import { extractDocumentText } from "@/lib/tools/launch/extract-text";

export type DocumentInputProps = {
  /** The current text. */
  value: string;
  /** Called with the new text. */
  onChange: (value: string) => void;
  /** Label for the textarea. */
  label?: string;
  /** Placeholder for the textarea. */
  placeholder?: string;
  /** Rows in the textarea. */
  rows?: number;
  /** Shown under the textarea. */
  hint?: string;
};

export default function DocumentInput({
  value,
  onChange,
  label = "Text",
  placeholder,
  rows = 12,
  hint,
}: DocumentInputProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [step, setStep] = useState("");
  const [error, setError] = useState("");

  const read = async (chosen: File) => {
    setBusy(true);
    setError("");
    setPercent(0);
    setStep("Reading the file");
    try {
      const extension = chosen.name.toLowerCase().split(".").pop() ?? "txt";
      const format =
        extension === "pdf" ? "pdf" : extension === "docx" ? "docx" : "txt";
      const result = await extractDocumentText(chosen, format);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onChange(result.text);
      setStep(
        result.note ??
          (result.pages && result.pages > 1
            ? `Read ${result.pages} pages`
            : "Read the file"),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "That file could not be read. Try pasting the text instead.",
      );
    } finally {
      setBusy(false);
      setPercent(null);
    }
  };

  return (
    <div className="qw-document-input">
      <FileDrop
        policy={FILE_POLICIES.documentText}
        value={file}
        onChange={(next) => {
          setFile(next);
          setError("");
          setStep("");
        }}
        onExtractText={(chosen) => void read(chosen)}
        extracting={busy}
        label="Drop your document here, or paste the text below"
        hint="PDF, DOCX, TXT or Markdown · up to 8 MB · the file is read in this tab and never uploaded"
      />

      {busy ? (
        <ProgressBar
          label={step || "Reading the file"}
          percent={percent}
          detail="Reading…"
        />
      ) : null}

      {error ? (
        <p className="qw-error" role="alert">
          {error}
        </p>
      ) : null}

      {file && !busy && !error ? (
        <p className="qw-hint">
          <Sparkles size={13} aria-hidden /> Choose “Read text” to put the
          document’s text into the box, then edit it if you want to.
        </p>
      ) : null}

      <Field
        label={label}
        value={value}
        onChange={onChange}
        multiline
        rows={rows}
        placeholder={placeholder}
        hint={hint}
      />
    </div>
  );
}
