/**
 * File acceptance policy for the tool workspaces.
 *
 * ## Why the policy is data, not a per-tool `accept` attribute
 *
 * A browser's `accept` attribute is a *filter*, not a check: it hides files the
 * user cannot pick, but a drag-and-drop, a paste, or a scripted input can still
 * hand the page anything at all. Every tool that accepts a file therefore
 * declares what it accepts here, and the same declaration drives the input's
 * `accept` attribute, the drag-and-drop filter, the size limit and the
 * content check. One source, so a tool cannot accept a file in the picker and
 * then reject it (or worse, accept it) during processing.
 *
 * ## Why the content check sniffs bytes
 *
 * The extension and the MIME type are both attacker-controlled — a `.pdf` can
 * be an executable, and a browser-reported MIME type is whatever the operating
 * system believed. So a file is accepted only when its *leading bytes* match
 * the format it claims. Formats with no signature (plain text, CSV, JSON, XML,
 * HTML, Markdown) are validated by decoding them as UTF-8 and rejecting
 * binary content, which is the actual risk for those types.
 *
 * Nothing here uploads anything. A file is read in the browser, checked, and
 * handed back to the caller as bytes it never leaves the tab.
 */

/** A file format the tools can accept, with how to recognise it. */
export type FileFormat = {
  /** Canonical extension, without the dot. */
  ext: string;
  /** MIME types a browser may report for this format. */
  mime: string[];
  /** Human label used in error messages and in the picker. */
  label: string;
  /** Leading bytes that identify the format, as byte values. */
  magic?: number[];
  /** Byte offset at which `magic` must appear. */
  magicOffset?: number;
  /**
   * For container formats (DOCX, XLSX), the bytes that mark the container.
   * A ZIP archive is checked for these markers so a renamed `.docx` is
   * rejected rather than parsed.
   */
  zipMarkers?: string[];
  /** True for formats whose payload is text. */
  text?: boolean;
};

/**
 * The formats the tool workspaces support.
 *
 * `doc` (legacy binary Word) is deliberately absent: it is a compound binary
 * format with no dependable browser-side parser, so accepting it would mean
 * accepting a file we cannot read. A `.doc` file is rejected with a message
 * that names the two formats that do work.
 */
export const FILE_FORMATS: Record<string, FileFormat> = {
  pdf: {
    ext: "pdf",
    mime: ["application/pdf"],
    label: "PDF",
    magic: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  docx: {
    ext: "docx",
    mime: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    label: "Word document (.docx)",
    // A DOCX is a ZIP whose first entry is normally `[Content_Types].xml`.
    zipMarkers: ["[Content_Types].xml", "word/document.xml"],
  },
  xlsx: {
    ext: "xlsx",
    mime: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    label: "Excel workbook (.xlsx)",
    zipMarkers: ["[Content_Types].xml", "xl/workbook.xml"],
  },
  csv: { ext: "csv", mime: ["text/csv"], label: "CSV", text: true },
  txt: { ext: "txt", mime: ["text/plain"], label: "Plain text", text: true },
  md: { ext: "md", mime: ["text/markdown"], label: "Markdown", text: true },
  json: {
    ext: "json",
    mime: ["application/json"],
    label: "JSON",
    text: true,
  },
  xml: {
    ext: "xml",
    mime: ["application/xml", "text/xml"],
    label: "XML",
    text: true,
  },
  html: {
    ext: "html",
    mime: ["text/html"],
    label: "HTML",
    text: true,
  },
  png: {
    ext: "png",
    mime: ["image/png"],
    label: "PNG image",
    magic: [0x89, 0x50, 0x4e, 0x47],
  },
  jpg: {
    ext: "jpg",
    mime: ["image/jpeg"],
    label: "JPEG image",
    magic: [0xff, 0xd8, 0xff],
  },
  webp: {
    ext: "webp",
    mime: ["image/webp"],
    label: "WebP image",
    magic: [0x52, 0x49, 0x46, 0x46], // RIFF
    magicOffset: 0,
  },
  gif: {
    ext: "gif",
    mime: ["image/gif"],
    label: "GIF image",
    magic: [0x47, 0x49, 0x46, 0x38],
  },
};

/** The legacy `.doc` binary Word format is not supported by the parser. */
const LEGACY_DOC_MIME = "application/msword";

/** A per-tool declaration of what it accepts. */
export type FilePolicy = {
  /** Format keys from {@link FILE_FORMATS}. */
  formats: string[];
  /** Maximum accepted size in bytes. */
  maxBytes: number;
  /** Whether more than one file may be selected. */
  multiple?: boolean;
  /** Message shown when the file is rejected. */
  label: string;
};

export const MB = 1024 * 1024;

/**
 * The acceptance policies used by the tool workspaces.
 *
 * Sizes are deliberately generous for text-ish formats and tight for images
 * and documents, because the cost of a large file falls on the reader's
 * device, not on a server.
 */
export const FILE_POLICIES = {
  /** A résumé or a document the user wants read as text. */
  documentText: {
    formats: ["pdf", "docx", "txt", "md"],
    maxBytes: 8 * MB,
    label: "PDF, DOCX, TXT or Markdown",
  },
  /** A page of HTML the user wants analysed. */
  webSource: {
    formats: ["html", "txt", "xml"],
    maxBytes: 4 * MB,
    label: "HTML, TXT or XML",
  },
  /** Any document the user wants inspected for metadata. */
  anyDocument: {
    formats: [
      "pdf",
      "docx",
      "xlsx",
      "csv",
      "txt",
      "json",
      "xml",
      "html",
      "png",
      "jpg",
      "webp",
      "gif",
    ],
    maxBytes: 25 * MB,
    label: "PDF, DOCX, XLSX, CSV, TXT, JSON, XML, HTML or an image",
  },
  /** An image the user wants inspected. */
  image: {
    formats: ["png", "jpg", "webp", "gif"],
    maxBytes: 15 * MB,
    label: "PNG, JPEG, WebP or GIF",
  },
} satisfies Record<string, FilePolicy>;

/** The `accept` attribute value for a policy, built from the real MIME list. */
export function acceptAttribute(policy: FilePolicy): string {
  const parts: string[] = [];
  for (const key of policy.formats) {
    const format = FILE_FORMATS[key];
    if (!format) continue;
    parts.push(...format.mime, `.${format.ext}`);
  }
  return parts.join(",");
}

/** The formats a policy allows, resolved. */
export function policyFormats(policy: FilePolicy): FileFormat[] {
  return policy.formats
    .map((key) => FILE_FORMATS[key])
    .filter((format): format is FileFormat => Boolean(format));
}

export type RejectReason =
  | "too-large"
  | "wrong-type"
  | "empty"
  | "legacy-doc"
  | "binary-text"
  | "corrupt";

export type FileCheck =
  | { ok: true; format: FileFormat }
  | { ok: false; reason: RejectReason; message: string };

/**
 * Check a file against a policy.
 *
 * The order matters: size first (cheapest), then the extension and MIME type
 * (cheap), then the bytes (expensive). A file that passes all three is
 * accepted; anything else returns a message written for the person who will
 * read it, not for a log.
 */
export function checkFile(file: File, policy: FilePolicy): FileCheck {
  if (file.size === 0) {
    return {
      ok: false,
      reason: "empty",
      message: "That file is empty. Choose a file that has content in it.",
    };
  }

  if (file.size > policy.maxBytes) {
    const mb = Math.round(policy.maxBytes / MB);
    return {
      ok: false,
      reason: "too-large",
      message: `That file is larger than the ${mb} MB limit for this tool. Try a smaller file, or split it first.`,
    };
  }

  const formats = policyFormats(policy);
  const name = file.name.toLowerCase();
  const extension = name.includes(".")
    ? name.slice(name.lastIndexOf(".") + 1)
    : "";
  const reported = (file.type || "").toLowerCase();

  if (reported === LEGACY_DOC_MIME || extension === "doc") {
    return {
      ok: false,
      reason: "legacy-doc",
      message:
        "Legacy .doc files are not supported. Open the file and save it as .docx or PDF, then try again.",
    };
  }

  const byExtension = formats.find((format) => format.ext === extension);
  const byMime = formats.find((format) => format.mime.includes(reported));

  // A file whose extension and MIME type both name a format we do not accept
  // is rejected outright; anything else falls back to content sniffing, so a
  // mislabelled but genuine file is still usable.
  if (!byExtension && !byMime) {
    return {
      ok: false,
      reason: "wrong-type",
      message: `That file type is not accepted here. This tool reads ${policy.label}.`,
    };
  }

  const candidates = byExtension ? [byExtension] : formats;

  return { ok: true, format: candidates[0] };
}

/**
 * Verify a file's leading bytes against the format it claims.
 *
 * Called after {@link checkFile} because it is the expensive check. Text
 * formats are decoded and scanned for control characters, which is the actual
 * hazard for them; binary formats are matched on their signature.
 */
export async function verifyContent(
  file: File,
  format: FileFormat,
): Promise<FileCheck> {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());

  if (format.magic) {
    const offset = format.magicOffset ?? 0;
    const matches = format.magic.every(
      (byte, index) => head[offset + index] === byte,
    );
    if (!matches) {
      return {
        ok: false,
        reason: "corrupt",
        message: `That file does not look like a ${format.label}. Its contents do not match its name, so it may be damaged or renamed.`,
      };
    }
    // WebP is a RIFF container: the "WEBP" tag sits at offset 8.
    if (format.ext === "webp") {
      const tag = String.fromCharCode(...head.slice(8, 12));
      if (tag !== "WEBP") {
        return {
          ok: false,
          reason: "corrupt",
          message:
            "That file is a RIFF container but not a WebP image. It may be an audio or video file.",
        };
      }
    }
    return { ok: true, format };
  }

  if (format.zipMarkers) {
    // Look for the marker strings inside the first 4 KiB of the archive.
    const window = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
    const text = new TextDecoder("latin1").decode(window);
    const found = format.zipMarkers.some((marker) => text.includes(marker));
    if (!found) {
      return {
        ok: false,
        reason: "corrupt",
        message: `That file is not a readable ${format.label}. Office files are ZIP archives; this one does not contain the expected parts.`,
      };
    }
    return { ok: true, format };
  }

  if (format.text) {
    const sample = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
    // A NUL byte in a text file means it is binary mislabelled as text.
    if (sample.includes(0)) {
      return {
        ok: false,
        reason: "binary-text",
        message: `That file looks like a binary file with a ${format.label} name. Convert it to plain text first.`,
      };
    }
    return { ok: true, format };
  }

  return { ok: true, format };
}

/**
 * Read a text file as UTF-8, tolerating a byte-order mark.
 *
 * A BOM is common in files exported from Windows tooling and would otherwise
 * appear as a stray character in the first word of a document.
 */
export async function readTextFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let start = 0;
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    start = 3;
  }
  return new TextDecoder("utf-8").decode(bytes.subarray(start));
}

/**
 * Strip a file name down to something safe to show and to use in a download
 * name: no path separators, no control characters, no leading dots.
 *
 * A browser only ever hands a *base* name, but a drag-and-drop from an
 * archive can produce a path, and a crafted name can contain characters that
 * break a header. The result is bounded to 120 characters.
 */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^\w.\- ]+/gu, "_")
    .replace(/^\.+/, "")
    .trim();
  return (cleaned || "file").slice(0, 120);
}
