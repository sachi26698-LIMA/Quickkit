import type { PDFRef as PdfRefType } from "@cantoo/pdf-lib";
import { preflightImage } from "../image-header";
import { scanMetadata } from "../exif";
export async function inspectImage(file: File) {
  const dimensions = await preflightImage(file);
  const report = scanMetadata(
    new Uint8Array(await file.arrayBuffer()),
    file.type,
    15 * 1024 * 1024,
  );
  return `Format: ${report.format}\nDimensions: ${dimensions.width} × ${dimensions.height}\nEXIF detected: ${report.hasExif ? "yes" : "no"}\nGPS tag detected: ${report.hasGps ? "yes" : "no"}\nXMP detected: ${report.hasXmp ? "yes" : "no"}\nICC profile detected: ${report.hasIcc ? "yes" : "no"}\nOrientation: ${report.orientation ?? "not found"}\nCamera: ${report.camera ?? "not found"}\nCapture date: ${report.captured ?? "not found"}\n\nThe file is scanned for selected metadata markers (JPEG before image data; PNG and WebP chunks). Missing or unsupported metadata may remain undetected; this is not a complete privacy audit.`;
}
export async function cleanImage(file: File) {
  await preflightImage(file);
  const bitmap = await createImageBitmap(file);
  try {
    if (
      bitmap.width * bitmap.height > 24_000_000 ||
      bitmap.width > 8192 ||
      bitmap.height > 8192
    )
      throw new Error("Image dimensions exceed the supported limit.");
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this browser.");
    context.drawImage(bitmap, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob || blob.type !== "image/png")
      throw new Error("Could not encode PNG in this browser.");
    return blob;
  } finally {
    bitmap.close();
  }
}
export async function inspectPdf(file: File) {
  if (file.size === 0 || file.size > 15 * 1024 * 1024)
    throw new Error("Choose a PDF up to 15 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("File does not have a PDF signature.");
  try {
    const { PDFDocument, PDFName, PDFDict, PDFArray } =
      await import("@cantoo/pdf-lib");
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const safe = (fn: () => string | undefined) => {
      try {
        return fn() || "not present";
      } catch {
        return "unreadable";
      }
    };
    const date = (fn: () => Date | undefined) => {
      try {
        return fn()?.toISOString() ?? "not present";
      } catch {
        return "unreadable";
      }
    };
    const catalogXmp = pdf.catalog.has(PDFName.of("Metadata"));
    const pagesWithXmp = pdf
      .getPages()
      .filter((page) => page.node.has(PDFName.of("Metadata"))).length;
    // These are shallow catalog/page indicators, not a scan of all PDF objects.
    const embeddedFiles = (() => {
      try {
        const names = pdf.catalog.lookupMaybe(PDFName.of("Names"), PDFDict);
        return names?.has(PDFName.of("EmbeddedFiles"))
          ? "present"
          : "not detected at catalog name tree";
      } catch {
        return "unreadable";
      }
    })();
    const annotations = (() => {
      try {
        let count = 0;
        for (const page of pdf.getPages()) {
          const key = PDFName.of("Annots");
          if (!page.node.has(key)) continue;
          const entries = page.node.lookup(key, PDFArray);
          count += entries.size();
        }
        return String(count);
      } catch {
        return "unreadable";
      }
    })();
    return `Pages: ${pdf.getPageCount()}\nCatalog embedded-file name tree: ${embeddedFiles}\nPage annotation references: ${annotations}\nInteractive form reference: ${pdf.catalog.has(PDFName.of("AcroForm")) ? "present" : "not detected"}\nCatalog XMP reference: ${catalogXmp ? "present" : "not present"}\nPages with metadata references: ${pagesWithXmp}\nTitle: ${safe(() => pdf.getTitle())}\nAuthor: ${safe(() => pdf.getAuthor())}\nSubject: ${safe(() => pdf.getSubject())}\nKeywords: ${safe(() => pdf.getKeywords())}\nCreator: ${safe(() => pdf.getCreator())}\nProducer: ${safe(() => pdf.getProducer())}\nCreated: ${date(() => pdf.getCreationDate())}\nModified: ${date(() => pdf.getModificationDate())}\n\nOnly common document-info fields and shallow catalog/page indicators are shown. A missing indicator does not prove that attachments, annotations, forms, metadata or sensitive content are absent. XMP content, embedded files, revision history and other objects may contain additional information.`;
  } catch {
    throw new Error(
      "Could not read this PDF. It may be encrypted, malformed or unsupported.",
    );
  }
}

export async function inspectDocx(file: File) {
  if (file.size === 0 || file.size > 15 * 1024 * 1024)
    throw new Error("Choose a DOCX up to 15 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b)
    throw new Error("File is not a DOCX ZIP package.");
  try {
    const { unzipSync, strFromU8 } = await import("fflate");
    let count = 0;
    let hasContentTypes = false;
    let hasDocument = false;
    const indicators = {
      comments: false,
      customProperties: false,
      embeddedObjects: false,
      externalLinks: false,
      macros: false,
    };
    const seen = new Set<string>();
    const parts = unzipSync(bytes, {
      filter: (entry) => {
        if (++count > 2000) throw new Error("Too many entries.");
        if (entry.name === "[Content_Types].xml") hasContentTypes = true;
        if (entry.name === "word/document.xml") hasDocument = true;
        const path = entry.name.toLowerCase();
        if (/^word\/comments(?:extended|ids|extensible)?\.xml$/.test(path))
          indicators.comments = true;
        if (path === "docprops/custom.xml") indicators.customProperties = true;
        if (path.startsWith("word/embeddings/") && !path.endsWith("/"))
          indicators.embeddedObjects = true;
        if (path.startsWith("word/externallinks/") && !path.endsWith("/"))
          indicators.externalLinks = true;
        if (path === "word/vbaproject.bin") indicators.macros = true;
        if (!["docProps/core.xml", "docProps/app.xml"].includes(entry.name))
          return false;
        if (seen.has(entry.name)) throw new Error("Duplicate metadata part.");
        seen.add(entry.name);
        if (entry.originalSize > 1024 * 1024)
          throw new Error("Metadata part too large.");
        return true;
      },
    });
    if (!hasContentTypes || !hasDocument)
      throw new Error("Missing DOCX document parts.");
    const { DOMParser } = await import("@xmldom/xmldom");
    const lines: string[] = [];
    for (const [name, data] of Object.entries(parts)) {
      const xml = strFromU8(data);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml))
        throw new Error("Unsafe XML declarations.");
      const doc = new DOMParser({
        onError: () => {
          throw new Error("Malformed XML.");
        },
      }).parseFromString(xml, "application/xml");
      const keys = name.endsWith("core.xml")
        ? [
            "title",
            "subject",
            "creator",
            "description",
            "keywords",
            "lastModifiedBy",
            "created",
            "modified",
          ]
        : ["Application", "Company", "Manager"];
      for (const key of keys) {
        const value = doc
          .getElementsByTagNameNS("*", key)
          .item(0)
          ?.textContent?.trim();
        if (value) lines.push(`${key}: ${value.slice(0, 2000)}`);
      }
    }
    return `${lines.length ? lines.join("\n") : "No common document properties found."}\n\nPackage entry indicators (names only):\nComments part: ${indicators.comments ? "present" : "not detected"}\nCustom properties part: ${indicators.customProperties ? "present" : "not detected"}\nEmbedded object entries: ${indicators.embeddedObjects ? "present" : "not detected"}\nExternal-links entries: ${indicators.externalLinks ? "present" : "not detected"}\nVBA project entry: ${indicators.macros ? "present" : "not detected"}\n\nOnly common DOCX core and application properties are shown. Package indicators are shallow filename checks, not content analysis: undetected comments, revisions, custom properties, embedded files, external relationships and document content may contain sensitive data. An absent indicator does not establish safety.`;
  } catch {
    throw new Error(
      "Could not inspect this DOCX: the package or metadata is malformed or exceeds safe limits.",
    );
  }
}

/** Remove Info plus catalog/page metadata references. This is not a PDF sanitizer. */
export async function cleanPdfDocumentMetadata(file: File) {
  if (file.size === 0 || file.size > 15 * 1024 * 1024)
    throw new Error("Choose a PDF up to 15 MiB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("File does not have a PDF signature.");
  try {
    const { PDFDocument, PDFName, PDFRef, PDFDict, PDFArray, PDFStream } =
      await import("@cantoo/pdf-lib");
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const candidates = new Map<string, PdfRefType>();
    const addCandidate = (value: unknown) => {
      if (value instanceof PDFRef) candidates.set(value.toString(), value);
    };
    const metadataKey = PDFName.of("Metadata");
    addCandidate(pdf.context.trailerInfo.Info);
    pdf.context.trailerInfo.Info = undefined;
    addCandidate(pdf.catalog.get(metadataKey));
    pdf.catalog.delete(metadataKey);
    for (const page of pdf.getPages()) {
      addCandidate(page.node.get(metadataKey));
      page.node.delete(metadataKey);
    }
    // Never delete an object still referenced elsewhere. Traverse direct nested
    // objects without dereferencing: all indirect objects are enumerated below.
    const used = new Set<string>();
    const seen = new Set<object>();
    const stack: unknown[] = [
      ...Object.values(pdf.context.trailerInfo),
      ...pdf.context.enumerateIndirectObjects().map(([, object]) => object),
    ];
    let visited = 0;
    while (stack.length) {
      const item = stack.pop();
      if (item instanceof PDFRef) {
        if (candidates.has(item.toString())) used.add(item.toString());
        continue;
      }
      if (!item || typeof item !== "object" || seen.has(item)) continue;
      seen.add(item);
      if (++visited > 500_000)
        throw new Error("PDF object graph exceeds safe processing limit.");
      if (item instanceof PDFStream) stack.push(item.dict);
      else if (item instanceof PDFDict) {
        for (const value of item.values()) stack.push(value);
      } else if (item instanceof PDFArray) {
        for (const value of item.asArray()) stack.push(value);
      }
    }
    for (const [id, ref] of candidates)
      if (!used.has(id)) pdf.context.delete(ref);
    const output = new Uint8Array(
      await pdf.save({
        useObjectStreams: false,
        updateFieldAppearances: false,
      }),
    );
    // Confirm document-level references are absent in the resulting file.
    const check = await PDFDocument.load(output, { updateMetadata: false });
    if (
      check.context.trailerInfo.Info ||
      check.catalog.has(PDFName.of("Metadata")) ||
      check.getPages().some((page) => page.node.has(PDFName.of("Metadata")))
    )
      throw new Error("Output metadata check failed.");
    return new Blob([output], { type: "application/pdf" });
  } catch {
    throw new Error(
      "Could not clean this PDF. It may be encrypted, malformed, unsupported, or could not be verified.",
    );
  }
}
