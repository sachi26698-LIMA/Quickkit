"use client";

/**
 * Output preview surfaces for the tool workspaces.
 *
 * ## The problem this solves
 *
 * `OutputActions` used to offer exactly two things: copy the text, or
 * download it as `.txt`. For a tool whose output *is* a document — a salary
 * slip, an offer letter, a schema, a keyword table — that is the difference
 * between a result and a wall of monospaced text. The brief for this product
 * is explicit: show the output, then let the user take it away.
 *
 * So there are now three preview surfaces and a wider action bar:
 *
 * - {@link CodePreview} — JSON, XML and HTML shown formatted and
 *   syntax-highlighted rather than as one unbroken line.
 * - {@link TablePreview} — CSV and spreadsheet output shown as a real table
 *   with a sticky header.
 * - {@link DocumentPreview} — a letter or a payslip shown as the document it
 *   is, with the heading, the meta line and the body.
 *
 * The highlighter is deliberately small and dependency-free. A JSON/XML/HTML
 * highlighter is a tokenizer, not a parser: it has to be fast, it has to
 * never throw on malformed input (a tool that emits broken JSON on purpose
 * must still show it), and it must not pull a syntax-highlighting library
 * into every tool page.
 */

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileDown,
  Printer,
  RotateCcw,
} from "lucide-react";
import { downloadText } from "@/lib/tools/download";
import { csvDocument } from "@/lib/tools/csv";
import {
  exportDocument,
  type ExportDocument,
  type ExportKind,
} from "@/lib/tools/launch/export-document";

// ─────────────────────────────────────────────────────────────────────────────
// Code preview
// ─────────────────────────────────────────────────────────────────────────────

type Token = { text: string; kind?: string };

/**
 * Tokenise a JSON document for display.
 *
 * Handles strings (with escapes), numbers, the three literals, and the
 * punctuation. Anything it does not recognise is emitted as plain text, so an
 * invalid document still renders — which matters, because several tools exist
 * to show the user that a document is invalid.
 */
function tokenizeJson(source: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    if (char === '"') {
      let end = index + 1;
      while (end < source.length) {
        if (source[end] === "\\") {
          end += 2;
          continue;
        }
        if (source[end] === '"') break;
        end += 1;
      }
      const text = source.slice(index, Math.min(end + 1, source.length));
      // A key is a string that is immediately followed by a colon.
      let lookahead = end + 1;
      while (lookahead < source.length && /\s/.test(source[lookahead])) {
        lookahead += 1;
      }
      tokens.push({
        text,
        kind: source[lookahead] === ":" ? "key" : "str",
      });
      index = end + 1;
      continue;
    }
    const number = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(source.slice(index));
    if (number && /[\s,[\]{}]/.test(source[index - 1] ?? " ")) {
      tokens.push({ text: number[0], kind: "num" });
      index += number[0].length;
      continue;
    }
    const literal = /^(true|false|null)\b/.exec(source.slice(index));
    if (literal) {
      tokens.push({ text: literal[0], kind: "bool" });
      index += literal[0].length;
      continue;
    }
    if (/\s/.test(char)) {
      tokens.push({ text: char });
      index += 1;
      continue;
    }
    tokens.push({ text: char });
    index += 1;
  }
  return tokens;
}

/** Tokenise XML or HTML: tags, attribute names and comments. */
function tokenizeMarkup(source: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /(<!--[\s\S]*?-->)|(<\/?)([a-zA-Z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?>)/g;
  let last = 0;
  let match = pattern.exec(source);
  while (match) {
    if (match.index > last) {
      tokens.push({ text: source.slice(last, match.index) });
    }
    if (match[1]) {
      tokens.push({ text: match[1], kind: "comment" });
    } else {
      tokens.push({ text: match[2] + match[3], kind: "tag" });
      const attributes = match[4];
      if (attributes) {
        const attr = /([\w:.-]+)(\s*=\s*)("[^"]*")/g;
        let a = attr.exec(attributes);
        while (a) {
          tokens.push({ text: a[1], kind: "attr" });
          tokens.push({ text: a[2] });
          tokens.push({ text: a[3], kind: "str" });
          a = attr.exec(attributes);
        }
      }
      tokens.push({ text: match[5], kind: "tag" });
    }
    last = match.index + match[0].length;
    match = pattern.exec(source);
  }
  if (last < source.length) tokens.push({ text: source.slice(last) });
  return tokens;
}

function tokenize(source: string, language: "json" | "xml" | "html"): Token[] {
  if (language === "json") return tokenizeJson(source);
  return tokenizeMarkup(source);
}

/** Pretty-print JSON if it parses; otherwise return the source unchanged. */
export function formatJson(source: string): string {
  try {
    return JSON.stringify(JSON.parse(source), null, 2);
  } catch {
    return source;
  }
}

/**
 * A formatted, syntax-highlighted view of structured output.
 *
 * The value is copied verbatim into the DOM as text — never as markup — so a
 * hostile string cannot become HTML.
 */
export function CodePreview({
  value,
  language = "json",
  label,
}: {
  value: string;
  language?: "json" | "xml" | "html";
  label?: string;
}) {
  const [pretty, setPretty] = useState(true);
  const source = useMemo(
    () => (language === "json" && pretty ? formatJson(value) : value),
    [value, language, pretty],
  );
  const tokens = useMemo(() => tokenize(source, language), [source, language]);
  const canPretty = language === "json";

  return (
    <div className="qw-code-wrap">
      {canPretty ? (
        <div className="qw-code-toolbar">
          <button
            type="button"
            className="secondary"
            onClick={() => setPretty((current) => !current)}
          >
            {pretty ? "Show as written" : "Format"}
          </button>
        </div>
      ) : null}
      <pre className="qw-code" aria-label={label ?? "Generated output"}>
        <code>
          {tokens.map((token, index) =>
            token.kind ? (
              <span key={index} className={`tok-${token.kind}`}>
                {token.text}
              </span>
            ) : (
              <span key={index}>{token.text}</span>
            ),
          )}
        </code>
      </pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Table preview
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse CSV text into rows.
 *
 * A small, correct-enough parser: quoted fields, doubled quotes as an escape,
 * and newlines inside a quoted field. It returns an empty array for empty
 * input rather than throwing, because a tool that has not run yet must still
 * render its table shell.
 */
export function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        quoted = false;
        index += 1;
        continue;
      }
      field += char;
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = true;
      index += 1;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      index += 1;
      continue;
    }
    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      index += 1;
      continue;
    }
    if (char === "\r") {
      index += 1;
      continue;
    }
    field += char;
    index += 1;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entry) => entry.length > 1 || entry[0] !== "");
}

/**
 * A table of the output, with the first row treated as the header.
 *
 * Cells that hold only a number are right-aligned, because a column of
 * figures reads far better that way.
 */
export function TablePreview({
  rows,
  caption,
}: {
  rows: (string | number | boolean)[][];
  caption?: string;
}) {
  if (!rows.length) return null;
  const [head, ...body] = rows;
  const numeric = head.map(
    (_, column) =>
      body.length > 0 &&
      body.every((row) => {
        const value = row[column];
        return (
          value === "" ||
          value === undefined ||
          (typeof value === "number" && Number.isFinite(value))
        );
      }),
  );

  return (
    <div className="qw-table-preview">
      <table>
        {caption ? (
          <caption className="qw-table-caption">{caption}</caption>
        ) : null}
        <thead>
          <tr>
            {head.map((cell, index) => (
              <th key={index} scope="col">
                {String(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, columnIndex) => (
                <td
                  key={columnIndex}
                  className={numeric[columnIndex] ? "qw-num" : undefined}
                >
                  {String(cell ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document preview
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A document shown as a document.
 *
 * Used for the tools whose output is a letter, a certificate or a payslip: the
 * heading, the reference line and the body are laid out the way the exported
 * file is, so what the user reads here is what the file contains.
 */
export function DocumentPreview({
  title,
  subtitle,
  body,
  footer,
}: ExportDocument) {
  const sections =
    typeof body === "string"
      ? [{ heading: "", lines: body.split("\n") }]
      : body;

  return (
    <article className="qw-document" aria-label={title}>
      <header className="qw-document-head">
        <h4 className="qw-document-title">{title}</h4>
        {subtitle ? <p className="qw-document-subtitle">{subtitle}</p> : null}
      </header>
      <div className="qw-document-body">
        {sections.map((section, index) => (
          <section key={index} className="qw-document-section">
            {section.heading ? (
              <h5 className="qw-document-heading">{section.heading}</h5>
            ) : null}
            {section.lines.map((line, lineIndex) => (
              <p key={lineIndex} className="qw-document-line">
                {line === "" ? "\u00a0" : line}
              </p>
            ))}
          </section>
        ))}
      </div>
      {footer ? <footer className="qw-document-footer">{footer}</footer> : null}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export type OutputActionProps = {
  /** The plain-text result, used by Copy and by the text download. */
  text: string;
  /** Base name for downloads. */
  filename: string;
  /**
   * The extension for the text download. A JSON-LD block saved as `.txt` is
   * awkward to use, so a tool that produces JSON says so.
   */
  textExtension?: "txt" | "json" | "xml" | "html" | "csv" | "md";
  /** The MIME type for the text download. */
  textType?: string;
  /** Rows for the CSV download, when the output is tabular. */
  csvRows?: (string | number | boolean)[][];
  /** A document to export as DOCX or PDF. */
  document?: ExportDocument;
  /** Called to reset the tool. */
  onReset?: () => void;
  resetLabel?: string;
  /** Called when the user asks to regenerate the result. */
  onRegenerate?: () => void;
};

/**
 * The action bar under a result.
 *
 * Each action is only rendered when it has something to act on: there is no
 * Download button until there is a valid download, and no CSV button until
 * there are rows. A disabled download button is a promise the tool cannot
 * keep, and the brief is right that it should not be shown at all.
 */
export function OutputActions({
  text,
  filename,
  textExtension = "txt",
  textType,
  csvRows,
  document,
  onReset,
  resetLabel = "Reset",
  onRegenerate,
}: OutputActionProps) {
  const [copied, setCopied] = useState<"" | "ok" | "fail">("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  };

  const downloadTextFile = () => {
    const types: Record<string, string> = {
      txt: "text/plain;charset=utf-8",
      json: "application/json;charset=utf-8",
      xml: "application/xml;charset=utf-8",
      html: "text/html;charset=utf-8",
      csv: "text/csv;charset=utf-8",
      md: "text/markdown;charset=utf-8",
    };
    downloadText(
      text,
      `${filename}.${textExtension}`,
      textType ?? types[textExtension],
    );
    setDone("Downloaded.");
  };

  const downloadCsv = () => {
    if (!csvRows) return;
    downloadText(
      csvDocument(csvRows),
      `${filename}.csv`,
      "text/csv;charset=utf-8",
    );
    setDone("Downloaded.");
  };

  const downloadDocument = async (kind: ExportKind) => {
    if (!document) return;
    setBusy(true);
    try {
      await exportDocument(document, kind, filename);
      setDone(`Downloaded ${kind.toUpperCase()}.`);
    } catch (cause) {
      setDone(
        cause instanceof Error
          ? cause.message
          : "The document could not be created. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const print = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <div className="qw-actions">
      {text ? (
        <button type="button" className="secondary" onClick={copy}>
          {copied === "ok" ? (
            <Check size={15} aria-hidden />
          ) : (
            <Copy size={15} aria-hidden />
          )}{" "}
          Copy
        </button>
      ) : null}
      {text ? (
        <button type="button" className="secondary" onClick={downloadTextFile}>
          <Download size={15} aria-hidden /> Download .{textExtension}
        </button>
      ) : null}
      {csvRows && csvRows.length ? (
        <button type="button" className="secondary" onClick={downloadCsv}>
          <Download size={15} aria-hidden /> Download .csv
        </button>
      ) : null}
      {document ? (
        <>
          <button
            type="button"
            className="secondary"
            onClick={() => void downloadDocument("docx")}
            disabled={busy}
          >
            <FileDown size={15} aria-hidden /> Download .docx
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => void downloadDocument("pdf")}
            disabled={busy}
          >
            <FileDown size={15} aria-hidden /> Download .pdf
          </button>
        </>
      ) : null}
      {document ? (
        <button type="button" className="secondary" onClick={print}>
          <Printer size={15} aria-hidden /> Print
        </button>
      ) : null}
      {onRegenerate ? (
        <button type="button" className="secondary" onClick={onRegenerate}>
          <RotateCcw size={15} aria-hidden /> Regenerate
        </button>
      ) : null}
      {onReset ? (
        <button type="button" className="secondary" onClick={onReset}>
          <RotateCcw size={15} aria-hidden /> {resetLabel}
        </button>
      ) : null}
      <span className="qw-action-status" role="status" aria-live="polite">
        {copied === "ok"
          ? "Copied to clipboard."
          : copied === "fail"
            ? "Copy unavailable — select the text and copy manually."
            : busy
              ? "Preparing the document…"
              : done}
      </span>
    </div>
  );
}
