"use client";

import { useRef, type ReactNode } from "react";
import {
  AlertTriangle,
  CircleAlert,
  CircleCheck,
  Download,
  Eraser,
  FileUp,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useHydrated } from "@/lib/use-hydrated";
import { downloadText } from "@/lib/tools/download";
import CopyButton from "@/components/tools/copy-button";
import { CharMeter, WorkspaceHeading } from "@/components/tools/tool-ui";

export type ToolMessage = {
  kind: "success" | "warning" | "error";
  text: string;
};

export type CodeLanguage = "json" | "html" | "xml" | "css" | "javascript";

export function yieldForUi(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve()),
      );
    } else {
      setTimeout(resolve, 0);
    }
  });
}

export function DevProcessingIndicator({ label }: { label: string }) {
  return (
    <div className="devtool-processing" role="status" aria-live="polite">
      <span className="devtool-processing-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ToolMessageBanner({
  message,
}: {
  message: ToolMessage | null;
}) {
  if (!message) return null;
  const Icon =
    message.kind === "error"
      ? CircleAlert
      : message.kind === "warning"
        ? AlertTriangle
        : CircleCheck;
  return (
    <div
      className={`devtool-message ${message.kind}`}
      role={message.kind === "error" ? "alert" : "status"}
    >
      <Icon size={17} aria-hidden="true" />
      <p>{message.text}</p>
    </div>
  );
}

export function DevToolFrame({
  title,
  description,
  children,
  message,
  output,
  copyText,
  filename,
  mimeType,
  downloadLabel = "Download",
  download,
  canDownload,
  hasContent,
  onClear,
  onReset,
  help,
  busy = false,
  busyLabel = "Processing locally…",
}: {
  title: string;
  description: string;
  children: ReactNode;
  message: ToolMessage | null;
  output: string;
  busy?: boolean;
  busyLabel?: string;
  copyText?: string;
  filename?: string;
  mimeType?: string;
  downloadLabel?: string;
  download?: () => void;
  canDownload?: boolean;
  hasContent: boolean;
  onClear: () => void;
  onReset: () => void;
  help?: ReactNode;
}) {
  const ready = useHydrated();
  const downloadable = canDownload ?? Boolean(output);
  const copyable = copyText ?? output;
  return (
    <fieldset
      className="workspace devtool-workspace"
      disabled={!ready || busy}
      aria-label="Developer tool workspace"
    >
      <WorkspaceHeading title={title} description={description} />
      {children}
      {busy && busyLabel ? <DevProcessingIndicator label={busyLabel} /> : null}
      <ToolMessageBanner message={message} />
      <div className="workspace-foot devtool-actions">
        <div className="devtool-reset-actions">
          <button
            type="button"
            className="secondary"
            onClick={onClear}
            disabled={!hasContent}
          >
            <Eraser size={15} aria-hidden="true" /> Clear
          </button>
          <button type="button" className="secondary" onClick={onReset}>
            <RotateCcw size={15} aria-hidden="true" /> Reset
          </button>
        </div>
        <div className="foot-actions">
          {download ? (
            <button
              type="button"
              className="secondary"
              onClick={download}
              disabled={!downloadable}
            >
              <Download size={15} aria-hidden="true" /> {downloadLabel}
            </button>
          ) : (
            <button
              type="button"
              className="secondary"
              disabled={!downloadable}
              onClick={() =>
                downloadText(
                  output,
                  filename ?? "quickkit-output.txt",
                  mimeType,
                )
              }
            >
              <Download size={15} aria-hidden="true" /> {downloadLabel}
            </button>
          )}
          <CopyButton key={copyable} text={copyable} />
        </div>
      </div>
      {help ? <p className="help devtool-help">{help}</p> : null}
    </fieldset>
  );
}

export function DevCodeInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  maxLength = 1_000_000,
  sample,
  onSample,
  onFileSelect,
  fileAccept,
  fileLabel = "Open file",
  minHeight = 220,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  maxLength?: number;
  sample?: string;
  onSample?: () => void;
  onFileSelect?: (file: File) => void;
  fileAccept?: string;
  fileLabel?: string;
  minHeight?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="devtool-editor">
      <div className="devtool-editor-toolbar">
        <label htmlFor={id}>{label}</label>
        <div className="devtool-editor-actions">
          {onSample ? (
            <button
              type="button"
              className="toolbar-button"
              onClick={onSample}
              title={sample}
            >
              <Sparkles size={14} aria-hidden="true" /> Sample
            </button>
          ) : null}
          {onFileSelect ? (
            <>
              <button
                type="button"
                className="toolbar-button"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp size={14} aria-hidden="true" /> {fileLabel}
              </button>
              <input
                ref={fileRef}
                className="sr-only"
                type="file"
                accept={fileAccept}
                aria-label={fileLabel}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) onFileSelect(file);
                  event.currentTarget.value = "";
                }}
              />
            </>
          ) : null}
        </div>
      </div>
      <textarea
        id={id}
        className="code-input devtool-code-input"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        spellCheck={false}
        maxLength={maxLength}
        style={{ minHeight }}
      />
      <div className="input-footer devtool-input-footer">
        <CharMeter value={value.length} max={maxLength} />
        <span>Processed locally in this browser</span>
      </div>
    </div>
  );
}

export function DevTextOutput({
  id,
  label,
  value,
  placeholder = "Your result will appear here…",
  minHeight = 220,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  minHeight?: number;
}) {
  return (
    <div className="devtool-editor">
      <div className="devtool-editor-toolbar">
        <label htmlFor={id}>{label}</label>
        <span className="char-meter">
          {value.length.toLocaleString()} characters
        </span>
      </div>
      <textarea
        id={id}
        className="code-input devtool-code-input devtool-output-text"
        value={value}
        readOnly
        aria-live="polite"
        placeholder={placeholder}
        spellCheck={false}
        style={{ minHeight }}
      />
      <div className="input-footer devtool-input-footer">
        <span>
          {value
            ? `${new TextEncoder().encode(value).byteLength.toLocaleString()} UTF-8 bytes`
            : "Output is ready for your next step."}
        </span>
        <span>Nothing is uploaded</span>
      </div>
    </div>
  );
}

function tokenClass(language: CodeLanguage, token: string): string {
  if (/^\s+$/u.test(token)) return "";
  if (/^(?:\/\*|\/\/|<!--|<!\[CDATA\[)/u.test(token)) return "comment";
  if (language === "json") {
    if (/^"/u.test(token)) return "string";
    if (/^-?\d/u.test(token)) return "number";
    if (/^(?:true|false|null)$/u.test(token)) return "literal";
    return "punctuation";
  }
  if (language === "html" || language === "xml") {
    if (/^<\/?[\w:-]+/u.test(token) || /^<!/u.test(token)) return "tag";
    if (/^["']/u.test(token)) return "string";
    if (/^[\w:-]+$/u.test(token)) return "attribute";
    return "punctuation";
  }
  if (/^["'`]/u.test(token)) return "string";
  if (/^#[\da-f]{3,8}$/iu.test(token)) return "number";
  if (/^\d/u.test(token)) return "number";
  if (/^(?:true|false|null|undefined|NaN|Infinity)$/u.test(token))
    return "literal";
  if (
    /^(?:const|let|var|function|return|if|else|for|while|new|class|extends|import|export|from|default|async|await|throw|try|catch|finally|typeof|instanceof|this|void|delete|switch|case|break|continue|yield|of|in)$/u.test(
      token,
    )
  )
    return "keyword";
  if (/^[{}()[\],.;:=]$/u.test(token)) return "punctuation";
  return "plain";
}

function highlightTokens(source: string, language: CodeLanguage): string[] {
  const patterns: Record<CodeLanguage, RegExp> = {
    json: /("(?:\\.|[^"\\])*"(?=\s*:)|"(?:\\.|[^"\\])*"|-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|\b(?:true|false|null)\b|[{}\[\],:])/gu,
    html: /(<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/?[A-Za-z][\w:.-]*|\/?\s*>|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[\w:-]+(?=\s*=))/gu,
    xml: /(<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![^>]*>|<\/?[A-Za-z][\w:.-]*|\/?\s*>|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[\w:-]+(?=\s*=))/gu,
    css: /(\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|#[\da-f]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw)?\b|@[\w-]+|[{}()[\],.;:=]|[\w-]+(?=\s*:))/giu,
    javascript:
      /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|for|while|new|class|extends|import|export|from|default|async|await|throw|try|catch|finally|typeof|instanceof|this|void|delete|switch|case|break|continue|yield|of|in|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|[{}()[\],.;:=])/gu,
  };
  const expression = patterns[language];
  const output: string[] = [];
  let cursor = 0;
  for (const match of source.matchAll(expression)) {
    const index = match.index ?? cursor;
    if (index > cursor) output.push(source.slice(cursor, index));
    output.push(match[0]);
    cursor = index + match[0].length;
  }
  if (cursor < source.length) output.push(source.slice(cursor));
  return output;
}

export function DevCodeOutput({
  label,
  value,
  language,
  placeholder = "Your formatted code will appear here…",
}: {
  label: string;
  value: string;
  language: CodeLanguage;
  placeholder?: string;
}) {
  const tokens = highlightTokens(value, language);
  return (
    <div className="devtool-editor">
      <div className="devtool-editor-toolbar">
        <span className="field-label">{label}</span>
        <span className="char-meter">
          {value.length.toLocaleString()} characters
        </span>
      </div>
      <pre
        className="devtool-code-output"
        role="textbox"
        aria-label={label}
        aria-readonly="true"
        aria-multiline="true"
        tabIndex={0}
      >
        {value ? (
          <code>
            {tokens.map((token, index) => {
              const style = tokenClass(language, token);
              return style ? (
                <span className={`syntax-${style}`} key={index}>
                  {token}
                </span>
              ) : (
                token
              );
            })}
          </code>
        ) : (
          <span className="devtool-output-placeholder">{placeholder}</span>
        )}
      </pre>
      <div className="input-footer devtool-input-footer">
        <span>
          {value
            ? `${new TextEncoder().encode(value).byteLength.toLocaleString()} UTF-8 bytes`
            : "Output is ready for your next step."}
        </span>
        <span>Syntax is highlighted as inert text</span>
      </div>
    </div>
  );
}

export function DevToggle({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="devtool-toggle-group" aria-label={label}>
      <legend>{label}</legend>
      <div className="devtool-segmented-control">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "active" : ""}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
