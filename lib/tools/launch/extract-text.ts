/**
 * Read the text out of a document the user chose.
 *
 * ## Why this exists
 *
 * Several tools — the résumé analyser, the ATS checker, the keyword matcher —
 * are only useful if the user can hand them their actual résumé. Asking
 * someone to open a PDF, select all, copy, and paste it into a textarea is a
 * small but real tax, and it is a tax that falls hardest on the people who
 * most need the tool: a candidate whose résumé is a PDF exported from a
 * desktop editor.
 *
 * ## How it reads each format
 *
 * - **PDF** — `pdfjs-dist`, already a dependency and already used by the
 *   PDF tools, so the text layer is read with the same library that renders
 *   the file. A PDF with no text layer (a scan) produces no text; that is
 *   reported rather than silently returning an empty string.
 * - **DOCX** — a DOCX is a ZIP archive whose `word/document.xml` holds the
 *   text. The archive is unpacked with `fflate`, already a dependency, and
 *   the paragraph boundaries are read from the XML. This is much faster than
 *   rendering the document, and it does not need a layout engine.
 * - **TXT / Markdown** — read as UTF-8.
 *
 * ## Privacy
 *
 * Everything happens in the browser tab. The bytes are read with
 * `FileReader`, parsed locally, and the text is handed back to the caller.
 * Nothing is uploaded, and no network request carries the document.
 */

/** The outcome of reading a document. */
export type ExtractResult =
  | { ok: true; text: string; pages?: number; note?: string }
  | { ok: false; message: string };

/** Read a plain text or Markdown file. */
export async function extractPlainText(file: File): Promise<ExtractResult> {
  const text = await file.text();
  if (!text.trim()) {
    return {
      ok: false,
      message: "That file has no readable text in it.",
    };
  }
  return { ok: true, text };
}

/**
 * Read the text layer of a PDF.
 *
 * Pages are read in order and joined with a blank line, which keeps the
 * paragraph structure a résumé or a letter had.
 */
export async function extractPdfText(file: File): Promise<ExtractResult> {
  type PdfJsModule = typeof import("pdfjs-dist");
  let pdfjsPromise: Promise<PdfJsModule> | null = null;
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }

  let pdfjs: PdfJsModule;
  try {
    pdfjs = await pdfjsPromise;
  } catch {
    return {
      ok: false,
      message:
        "The PDF reader could not be loaded. Check your connection and try again.",
    };
  }

  let document_: Awaited<ReturnType<PdfJsModule["getDocument"]>["promise"]>;
  try {
    const buffer = await file.arrayBuffer();
    document_ = await pdfjs.getDocument({ data: new Uint8Array(buffer) })
      .promise;
  } catch (cause) {
    const name = cause instanceof Error ? cause.name : "";
    if (name === "PasswordException") {
      return {
        ok: false,
        message:
          "That PDF is password-protected. Remove the password, save it again, and try.",
      };
    }
    return {
      ok: false,
      message:
        "That PDF could not be opened. It may be damaged or not really a PDF.",
    };
  }

  const pages: string[] = [];
  try {
    for (let index = 1; index <= document_.numPages; index += 1) {
      const page = await document_.getPage(index);
      const content = await page.getTextContent();
      let line = "";
      const lines: string[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        line += item.str;
        if (item.hasEOL) {
          lines.push(line);
          line = "";
        }
      }
      if (line) lines.push(line);
      const text = lines.join("\n").trim();
      if (text) pages.push(text);
    }
  } catch {
    return {
      ok: false,
      message:
        "That PDF could not be read. Try exporting it again from your app.",
    };
  } finally {
    // Releasing the document frees the worker-side resources; a failure here
    // must not mask a successful extraction.
    try {
      await document_.cleanup();
    } catch {
      /* the document is being discarded anyway */
    }
  }

  const text = pages.join("\n\n").trim();
  if (!text) {
    return {
      ok: false,
      message:
        "No text could be read from that PDF — it looks like a scan or an image. Export it with a text layer, or paste the text in directly.",
    };
  }
  return {
    ok: true,
    text,
    pages: pages.length,
    note:
      pages.length > 1
        ? `Read ${pages.length} pages. Check the text is complete before relying on the analysis.`
        : undefined,
  };
}

/**
 * Read the text of a DOCX.
 *
 * The archive is unpacked in memory and `word/document.xml` is read. Paragraph
 * marks (`<w:p>`) become newlines and tabs become spaces, so the result reads
 * like the document rather than like its markup.
 */
export async function extractDocxText(file: File): Promise<ExtractResult> {
  let unzip: typeof import("fflate").unzipSync;
  try {
    ({ unzipSync: unzip } = await import("fflate"));
  } catch {
    return {
      ok: false,
      message:
        "The document reader could not be loaded. Try again in a moment.",
    };
  }

  let files: Record<string, Uint8Array>;
  try {
    const buffer = await file.arrayBuffer();
    files = unzip(new Uint8Array(buffer));
  } catch {
    return {
      ok: false,
      message:
        "That file could not be opened as a Word document. It may be damaged or saved in an older format.",
    };
  }

  const documentXml = files["word/document.xml"];
  if (!documentXml) {
    return {
      ok: false,
      message:
        "That Word file has no readable body text. It may be an empty document or a template.",
    };
  }

  const xml = new TextDecoder("utf-8").decode(documentXml);

  // Walk the runs, turning paragraph ends into newlines and tabs into spaces.
  let text = "";
  let index = 0;
  while (index < xml.length) {
    const open = xml.indexOf("<w:t", index);
    const paragraphEnd = xml.indexOf("</w:p>", index);
    const tab = xml.indexOf("<w:tab", index);
    if (open === -1) break;

    if (paragraphEnd !== -1 && paragraphEnd < open) {
      text += "\n";
      index = paragraphEnd + 6;
      continue;
    }
    if (tab !== -1 && tab < open) {
      text += " ";
      index = tab + 6;
      continue;
    }

    const close = xml.indexOf(">", open);
    if (close === -1) break;
    const start = close + 1;
    const end = xml.indexOf("</w:t>", start);
    if (end === -1) break;
    text += decodeXmlEntities(xml.slice(start, end));
    index = end + 6;
  }

  const cleaned = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) {
    return {
      ok: false,
      message: "That Word document has no readable text in it.",
    };
  }
  return { ok: true, text: cleaned };
}

/** Decode the five XML entities a Word document can contain. */
export function decodeXmlEntities(source: string): string {
  return source
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)),
    )
    .replace(/&amp;/g, "&");
}

/**
 * Read a document of any supported type.
 *
 * The format is decided by the file's own extension, not by the browser's
 * MIME type, because the type has already been checked against the file's
 * bytes by the time this is called.
 */
export async function extractDocumentText(
  file: File,
  format: "pdf" | "docx" | "txt" | "md",
): Promise<ExtractResult> {
  if (format === "pdf") return extractPdfText(file);
  if (format === "docx") return extractDocxText(file);
  return extractPlainText(file);
}
