import {
  PDFArray,
  PDFCheckBox,
  PDFDict,
  PDFDocument,
  PDFForm,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFObjectCopier,
  PDFPage,
  PDFPageLeaf,
  PDFRadioGroup,
  PDFRef,
  PDFSignature,
  PDFStream,
  PDFString,
  PDFWidgetAnnotation,
  type PDFField,
  type PDFObject,
} from "@cantoo/pdf-lib";

import {
  PDF_MERGE_LIMITS,
  PdfMergeError,
  getInspectionWarnings,
  isPdfSignature,
  makeUniqueBookmarkTitles,
  sanitizePdfTitle,
  type PdfInspection,
  type PdfInspectionFeatures,
} from "./merge-pdf-logic";
import { PDF_SPLIT_LIMITS } from "./split-pdf-logic";

const LOAD_OPTIONS = {
  capNumbers: true,
  preserveXFA: true,
  updateMetadata: false,
} as const;

export type PdfMergeProgressStage =
  | "copying"
  | "finalizing"
  | "inspecting"
  | "preparing"
  | "saving"
  | "validating";

export interface PdfMergeProgress {
  current: number;
  fileName?: string;
  message: string;
  stage: PdfMergeProgressStage;
  total: number;
}

export interface PdfMergeSourceBytes {
  bytes: Uint8Array;
  id: string;
  name: string;
  pageIndices: number[];
  password?: string;
}

export interface PdfMergeOptions {
  createBookmarks: boolean;
  now?: Date;
  onProgress?: (progress: PdfMergeProgress) => void;
  title: string;
  yieldControl?: () => Promise<void>;
}

export interface PdfMergeResult {
  bookmarkTitles: string[];
  bytes: Uint8Array;
  notices: string[];
  pageCount: number;
  removedActions: number;
  removedDestinations: number;
  removedLinkAnnotations: number;
}

interface LoadedPdf {
  doc: PDFDocument;
  encrypted: boolean;
}

interface PageGeometry {
  height: number;
  rotation: number;
  width: number;
}

function corruptError(entryId?: string): PdfMergeError {
  return new PdfMergeError(
    "corrupt_or_unsupported",
    "This file could not be read as a PDF. It may be corrupted, incomplete, or use an unsupported PDF structure. Open it in a PDF reader, export or print it to a new PDF, then try again.",
    entryId,
  );
}

function classifyPasswordFailure(
  error: unknown,
  entryId?: string,
  passwordWasExplicit = true,
): PdfMergeError {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (!passwordWasExplicit || message.includes("needs password")) {
    return new PdfMergeError(
      "password_required",
      "This PDF is password-protected. Enter its open password to inspect and merge it. The password stays on this device.",
      entryId,
    );
  }
  if (
    message.includes("password incorrect") ||
    message.includes("incorrect password") ||
    message.includes("invalid password")
  ) {
    return new PdfMergeError(
      "password_invalid",
      "That password did not open this PDF. Check capitalization and try again; the password is not stored.",
      entryId,
    );
  }
  return new PdfMergeError(
    "encrypted_unsupported",
    "This PDF’s encryption could not be opened locally. Remove the password in a PDF editor or export an unencrypted copy, then try again.",
    entryId,
  );
}

async function loadPdf(
  bytes: Uint8Array,
  password?: string,
  entryId?: string,
): Promise<LoadedPdf> {
  if (!isPdfSignature(bytes)) {
    throw new PdfMergeError(
      "invalid_pdf",
      "This file does not start with PDF data. It may be renamed, incomplete, or corrupted. Export it as a PDF again and retry.",
      entryId,
    );
  }

  let probe: PDFDocument;
  try {
    probe = await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: true,
    });
  } catch {
    throw corruptError(entryId);
  }

  if (!probe.isEncrypted) return { doc: probe, encrypted: false };

  const explicitPassword = password !== undefined;
  try {
    const doc = await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: false,
      password: password ?? "",
    });
    return { doc, encrypted: true };
  } catch (error) {
    throw classifyPasswordFailure(error, entryId, explicitPassword);
  }
}

function safeBoolean(read: () => boolean): boolean {
  try {
    return read();
  } catch {
    return false;
  }
}

function existingForm(doc: PDFDocument): PDFForm | undefined {
  const acroForm = doc.catalog.getAcroForm();
  return acroForm ? PDFForm.of(acroForm, doc) : undefined;
}

function dictName(dict: PDFDict, key: string): string | undefined {
  try {
    const value = dict.lookupMaybe(PDFName.of(key), PDFName);
    return value?.decodeText();
  } catch {
    return undefined;
  }
}

function widgetAnnotations(
  doc: PDFDocument,
): { dict: PDFDict; pageIndex: number }[] {
  const widgets: { dict: PDFDict; pageIndex: number }[] = [];
  doc.getPages().forEach((page, pageIndex) => {
    const annots = page.node.Annots();
    if (!annots) return;
    for (let index = 0; index < annots.size(); index += 1) {
      const annot = doc.context.lookup(annots.get(index));
      if (annot instanceof PDFDict && dictName(annot, "Subtype") === "Widget") {
        widgets.push({ dict: annot, pageIndex });
      }
    }
  });
  return widgets;
}

export function inspectPdfFeatures(doc: PDFDocument): PdfInspectionFeatures {
  const catalog = doc.catalog;
  const form = existingForm(doc);
  let fields: PDFField[] = [];
  try {
    fields = form?.getFields() ?? [];
  } catch {
    fields = [];
  }

  const hasSignedSignature = fields.some(
    (field) =>
      field instanceof PDFSignature &&
      field.acroField.V() !== undefined &&
      field.acroField.V() !== PDFNull,
  );
  const hasSignatureField = fields.some(
    (field) => field instanceof PDFSignature,
  );

  const names = safeBoolean(() => catalog.Names() !== undefined);
  const hasJavaScript =
    safeBoolean(() => doc.getDocumentJavaScripts().length > 0) ||
    safeBoolean(() => {
      const namesDict = catalog.Names();
      return namesDict?.has(PDFName.of("JavaScript")) === true;
    }) ||
    safeBoolean(() => {
      const openAction = catalog.lookup(PDFName.of("OpenAction"));
      return (
        openAction instanceof PDFDict &&
        dictName(openAction, "S") === "JavaScript"
      );
    });

  return {
    hasAttachments:
      safeBoolean(() => doc.getAttachments().length > 0) ||
      safeBoolean(
        () =>
          catalog.AttachedFiles()?.size() !== undefined &&
          catalog.AttachedFiles()!.size() > 0,
      ),
    hasForm: fields.length > 0 || widgetAnnotations(doc).length > 0,
    hasJavaScript: names ? hasJavaScript : hasJavaScript,
    hasLayers: safeBoolean(() => doc.getOptionalContentGroups().length > 0),
    hasOutlines: safeBoolean(() => catalog.has(PDFName.of("Outlines"))),
    hasSignatureField,
    hasSignedSignature,
    hasTags: safeBoolean(
      () =>
        catalog.has(PDFName.of("StructTreeRoot")) ||
        catalog.has(PDFName.of("MarkInfo")),
    ),
    hasXFA: safeBoolean(() => form?.hasXFA() === true),
  };
}

export async function inspectPdfBytes(
  bytes: Uint8Array,
  password?: string,
  entryId?: string,
): Promise<PdfInspection> {
  const { doc, encrypted } = await loadPdf(bytes, password, entryId);
  let pageCount: number;
  let firstPage: PageGeometry;
  try {
    pageCount = doc.getPageCount();
    if (pageCount < 1) throw new Error("No pages");
    const page = doc.getPage(0);
    const size = page.getSize();
    if (
      !Number.isFinite(size.width) ||
      !Number.isFinite(size.height) ||
      size.width <= 0 ||
      size.height <= 0
    ) {
      throw new Error("Invalid first page");
    }
    firstPage = { ...size, rotation: page.getRotation().angle };
  } catch (error) {
    if (error instanceof PdfMergeError) throw error;
    throw corruptError(entryId);
  }

  if (pageCount > PDF_MERGE_LIMITS.maxPagesPerFile) {
    throw new PdfMergeError(
      "too_many_pages",
      `This PDF has ${pageCount.toLocaleString()} pages, above the ${PDF_MERGE_LIMITS.maxPagesPerFile.toLocaleString()}-page per-file limit. Split it into smaller PDFs, then add the part you need.`,
      entryId,
    );
  }

  const features = inspectPdfFeatures(doc);
  let title: string | undefined;
  try {
    title = doc.getTitle()?.trim() || undefined;
  } catch {
    title = undefined;
  }

  return {
    encrypted,
    features,
    firstPage,
    pageCount,
    title,
    warnings: getInspectionWarnings(features),
  };
}

function refKey(ref: PDFRef): string {
  return ref.toString();
}

function lookupObject(
  doc: PDFDocument,
  value: PDFObject | undefined,
): PDFObject | undefined {
  return value instanceof PDFRef ? doc.context.lookup(value) : value;
}

function isSelectedPageRef(
  doc: PDFDocument,
  value: PDFObject | undefined,
  selectedPageRefs: Set<string>,
): boolean {
  return (
    value instanceof PDFRef &&
    selectedPageRefs.has(refKey(value)) &&
    doc.context.lookup(value) instanceof PDFPageLeaf
  );
}

function isStalePageRef(
  doc: PDFDocument,
  value: PDFObject | undefined,
  selectedPageRefs: Set<string>,
): boolean {
  return (
    value instanceof PDFRef &&
    !selectedPageRefs.has(refKey(value)) &&
    doc.context.lookup(value) instanceof PDFPageLeaf
  );
}

function destinationIsValid(
  doc: PDFDocument,
  value: PDFObject | undefined,
  selectedPageRefs: Set<string>,
  selectedPageObjects: Set<PDFObject>,
  seen: Set<PDFObject> = new Set(),
): boolean {
  if (!value || seen.has(value)) return false;
  seen.add(value);

  if (value instanceof PDFRef) {
    const resolved = doc.context.lookup(value);
    if (resolved instanceof PDFPageLeaf)
      return selectedPageRefs.has(refKey(value));
    return destinationIsValid(
      doc,
      resolved,
      selectedPageRefs,
      selectedPageObjects,
      seen,
    );
  }

  if (value instanceof PDFArray) {
    if (value.size() === 0) return false;
    const first = value.get(0);
    if (first instanceof PDFRef)
      return isSelectedPageRef(doc, first, selectedPageRefs);
    return first instanceof PDFPageLeaf && selectedPageObjects.has(first);
  }

  if (value instanceof PDFDict) {
    return destinationIsValid(
      doc,
      value.get(PDFName.of("D")),
      selectedPageRefs,
      selectedPageObjects,
      seen,
    );
  }

  return false;
}

function textValue(
  doc: PDFDocument,
  value: PDFObject | undefined,
): string | undefined {
  const resolved = lookupObject(doc, value);
  if (resolved instanceof PDFString || resolved instanceof PDFHexString)
    return resolved.decodeText();
  return undefined;
}

const ALLOWED_URI_SCHEMES = new Set(["http", "https", "mailto", "tel"]);

function sanitizeActionValue(
  doc: PDFDocument,
  value: PDFObject | undefined,
  selectedPageRefs: Set<string>,
  selectedPageObjects: Set<PDFObject>,
  stats: { removedActions: number; removedDestinations: number },
  active: Set<PDFObject> = new Set(),
): boolean {
  const resolved = lookupObject(doc, value);
  if (!resolved || active.has(resolved)) return false;

  if (resolved instanceof PDFArray) {
    active.add(resolved);
    for (let index = resolved.size() - 1; index >= 0; index -= 1) {
      if (
        !sanitizeActionValue(
          doc,
          resolved.get(index),
          selectedPageRefs,
          selectedPageObjects,
          stats,
          active,
        )
      ) {
        resolved.remove(index);
        stats.removedActions += 1;
      }
    }
    active.delete(resolved);
    return resolved.size() > 0;
  }

  if (!(resolved instanceof PDFDict)) return false;
  active.add(resolved);
  const subtype = dictName(resolved, "S");
  let valid = false;

  if (subtype === "GoTo") {
    valid = destinationIsValid(
      doc,
      resolved.get(PDFName.of("D")),
      selectedPageRefs,
      selectedPageObjects,
    );
    if (!valid) {
      resolved.delete(PDFName.of("D"));
      stats.removedDestinations += 1;
    }
  } else if (subtype === "URI") {
    const uri = textValue(doc, resolved.get(PDFName.of("URI")));
    const scheme = uri?.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
    valid = scheme !== undefined && ALLOWED_URI_SCHEMES.has(scheme);
  }

  if (valid) {
    const next = resolved.get(PDFName.of("Next"));
    if (
      next &&
      !sanitizeActionValue(
        doc,
        next,
        selectedPageRefs,
        selectedPageObjects,
        stats,
        active,
      )
    ) {
      resolved.delete(PDFName.of("Next"));
      stats.removedActions += 1;
    }
  }

  active.delete(resolved);
  return valid;
}

function sanitizeAdditionalActions(
  doc: PDFDocument,
  value: PDFObject | undefined,
  selectedPageRefs: Set<string>,
  selectedPageObjects: Set<PDFObject>,
  stats: { removedActions: number; removedDestinations: number },
): boolean {
  const resolved = lookupObject(doc, value);
  if (!(resolved instanceof PDFDict)) return false;
  for (const [key, action] of [...resolved.entries()]) {
    if (
      !sanitizeActionValue(
        doc,
        action,
        selectedPageRefs,
        selectedPageObjects,
        stats,
      )
    ) {
      resolved.delete(key);
      stats.removedActions += 1;
    }
  }
  return resolved.entries().length > 0;
}

export interface PdfGraphSanitizeResult {
  prunedObjects: number;
  removedActions: number;
  removedDestinations: number;
  removedLinkAnnotations: number;
}

/**
 * Repairs internal destinations and then performs a mark-and-sweep prune from
 * the document catalog/info roots. This is the safety gate that prevents a
 * pdf-lib-style recursive page copy from leaking unselected page objects into
 * the serialized file as unreachable indirect objects.
 */
export function sanitizeAndPruneMergedDocument(
  doc: PDFDocument,
  selectedRefs: PDFRef[],
): PdfGraphSanitizeResult {
  const selectedPageRefs = new Set(selectedRefs.map(refKey));
  const selectedPageObjects = new Set<PDFObject>(
    doc.getPages().map((page) => page.node),
  );
  const stats = {
    removedActions: 0,
    removedDestinations: 0,
    removedLinkAnnotations: 0,
  };
  const visited = new Set<PDFObject>();
  const visitedRefs = new Set<string>();
  const unresolved = new Set<string>();
  let foundWidget = false;

  const visitAnnotations = (
    value: PDFObject | undefined,
    parent: PDFDict,
  ): void => {
    const array = lookupObject(doc, value);
    if (!(array instanceof PDFArray)) return;
    if (!visited.has(array)) visited.add(array);

    for (let index = array.size() - 1; index >= 0; index -= 1) {
      const element = array.get(index);
      const annot = lookupObject(doc, element);
      if (!(annot instanceof PDFDict)) {
        if (isStalePageRef(doc, element, selectedPageRefs))
          unresolved.add("annotation page reference");
        else visit(element, "Annots");
        continue;
      }
      const pagePointerWasStale = isStalePageRef(
        doc,
        annot.get(PDFName.of("P")),
        selectedPageRefs,
      );
      visit(element, "Annots");
      const subtype = dictName(annot, "Subtype");
      if (subtype === "Widget") foundWidget = true;
      const inertLink =
        subtype === "Link" &&
        !annot.has(PDFName.of("Dest")) &&
        !annot.has(PDFName.of("A"));
      if (pagePointerWasStale || inertLink) {
        array.remove(index);
        stats.removedLinkAnnotations += 1;
      }
    }
    if (array.size() === 0) parent.delete(PDFName.of("Annots"));
  };

  const visit = (value: PDFObject | undefined, parentKey = ""): void => {
    if (!value) return;

    if (value instanceof PDFRef) {
      const key = refKey(value);
      const resolved = doc.context.lookup(value);
      if (resolved instanceof PDFPageLeaf && !selectedPageRefs.has(key)) {
        unresolved.add(`orphan page reference ${key}`);
        return;
      }
      if (visitedRefs.has(key)) return;
      visitedRefs.add(key);
      visit(resolved, parentKey);
      return;
    }

    if (value instanceof PDFDict) {
      if (visited.has(value)) return;
      visited.add(value);
      if (dictName(value, "Subtype") === "Widget") foundWidget = true;

      for (const [keyObject, entryValue] of [...value.entries()]) {
        const key = keyObject.decodeText();

        if (key === "Annots") {
          visitAnnotations(entryValue, value);
          continue;
        }

        if (key === "Dest") {
          if (
            destinationIsValid(
              doc,
              entryValue,
              selectedPageRefs,
              selectedPageObjects,
            )
          )
            visit(entryValue, key);
          else {
            value.delete(keyObject);
            stats.removedDestinations += 1;
          }
          continue;
        }

        if (key === "A") {
          if (
            sanitizeActionValue(
              doc,
              entryValue,
              selectedPageRefs,
              selectedPageObjects,
              stats,
            )
          )
            visit(entryValue, key);
          else {
            value.delete(keyObject);
            stats.removedActions += 1;
          }
          continue;
        }

        if (key === "AA") {
          if (
            sanitizeAdditionalActions(
              doc,
              entryValue,
              selectedPageRefs,
              selectedPageObjects,
              stats,
            )
          )
            visit(entryValue, key);
          else {
            value.delete(keyObject);
            stats.removedActions += 1;
          }
          continue;
        }

        if (key === "Next" && dictName(value, "S")) {
          if (
            sanitizeActionValue(
              doc,
              entryValue,
              selectedPageRefs,
              selectedPageObjects,
              stats,
            )
          )
            visit(entryValue, key);
          else {
            value.delete(keyObject);
            stats.removedActions += 1;
          }
          continue;
        }

        if (key === "D" && dictName(value, "S") === "GoTo") {
          if (
            destinationIsValid(
              doc,
              entryValue,
              selectedPageRefs,
              selectedPageObjects,
            )
          )
            visit(entryValue, key);
          else {
            value.delete(keyObject);
            stats.removedDestinations += 1;
          }
          continue;
        }

        if (key === "OpenAction") {
          const resolved = lookupObject(doc, entryValue);
          const valid =
            resolved instanceof PDFDict
              ? sanitizeActionValue(
                  doc,
                  entryValue,
                  selectedPageRefs,
                  selectedPageObjects,
                  stats,
                )
              : destinationIsValid(
                  doc,
                  entryValue,
                  selectedPageRefs,
                  selectedPageObjects,
                );
          if (valid) visit(entryValue, key);
          else {
            value.delete(keyObject);
            stats.removedActions += 1;
          }
          continue;
        }

        if (key === "B" && value instanceof PDFPageLeaf) {
          const beads = lookupObject(doc, entryValue);
          let hasStaleBead = false;
          if (beads instanceof PDFArray) {
            for (let index = 0; index < beads.size(); index += 1) {
              const bead = lookupObject(doc, beads.get(index));
              if (
                bead instanceof PDFDict &&
                isStalePageRef(doc, bead.get(PDFName.of("P")), selectedPageRefs)
              ) {
                hasStaleBead = true;
              }
            }
          }
          if (hasStaleBead) {
            value.delete(keyObject);
            stats.removedDestinations += 1;
            continue;
          }
        }

        if (isStalePageRef(doc, entryValue, selectedPageRefs)) {
          if (["D", "Dest", "P", "Page", "Pg", "SD"].includes(key)) {
            value.delete(keyObject);
            stats.removedDestinations += 1;
          } else {
            unresolved.add(`page reference under /${key}`);
          }
          continue;
        }

        visit(entryValue, key);
      }
      return;
    }

    if (value instanceof PDFArray) {
      if (visited.has(value)) return;
      visited.add(value);
      for (let index = 0; index < value.size(); index += 1) {
        const element = value.get(index);
        if (isStalePageRef(doc, element, selectedPageRefs)) {
          unresolved.add(`page reference in /${parentKey || "array"}`);
          continue;
        }
        visit(element, parentKey);
      }
      return;
    }

    if (value instanceof PDFStream) {
      if (visited.has(value)) return;
      visited.add(value);
      visit(value.dict, parentKey);
    }
  };

  const trailer = doc.context.trailerInfo;
  if (trailer.Root) visit(trailer.Root, "Root");
  if (trailer.Info) visit(trailer.Info, "Info");
  selectedRefs.forEach((ref) => visit(ref, "SelectedPage"));

  if (foundWidget) {
    throw new PdfMergeError(
      "unsupported_form",
      "A form field could not be flattened safely, so the merge was stopped instead of producing a file with silent field loss. Flatten the form in a PDF editor, then try again.",
    );
  }

  if (unresolved.size > 0) {
    throw new PdfMergeError(
      "unsupported_pdf_structure",
      "A page link or document structure points to a page that is not in this merge, and it could not be repaired safely. Include the linked page, remove the affected PDF, or export a flattened copy in a PDF editor.",
    );
  }

  const reachableRefs = new Set<string>();
  const reachableObjects = new Set<PDFObject>();
  const collect = (value: PDFObject | undefined): void => {
    if (!value) return;
    if (value instanceof PDFRef) {
      const key = refKey(value);
      if (reachableRefs.has(key)) return;
      reachableRefs.add(key);
      collect(doc.context.lookup(value));
      return;
    }
    if (reachableObjects.has(value)) return;
    reachableObjects.add(value);
    if (value instanceof PDFDict)
      value.entries().forEach(([, entry]) => collect(entry));
    else if (value instanceof PDFArray) {
      for (let index = 0; index < value.size(); index += 1)
        collect(value.get(index));
    } else if (value instanceof PDFStream) collect(value.dict);
  };

  if (trailer.Root) collect(trailer.Root);
  if (trailer.Info) collect(trailer.Info);

  let prunedObjects = 0;
  for (const [ref] of doc.context.enumerateIndirectObjects()) {
    if (!reachableRefs.has(refKey(ref))) {
      doc.context.delete(ref);
      prunedObjects += 1;
    }
  }

  const remainingLeaves = doc.context
    .enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFPageLeaf).length;
  if (remainingLeaves !== doc.getPageCount()) {
    throw new PdfMergeError(
      "unsupported_pdf_structure",
      "The merged PDF still contains page data outside the pages you selected, so it was not created. This protects unselected pages from being hidden inside the output.",
    );
  }

  return { ...stats, prunedObjects };
}

function addSourceBookmarks(
  doc: PDFDocument,
  outlineItems: { pageRef: PDFRef; title: string }[],
): void {
  if (outlineItems.length === 0) return;
  const context = doc.context;
  const outlineRoot = context.obj({ Type: "Outlines" });
  const outlineRootRef = context.register(outlineRoot);
  const itemRefs: PDFRef[] = [];
  const itemDicts: PDFDict[] = [];

  outlineItems.forEach(({ pageRef, title }) => {
    const dict = context.obj({});
    const ref = context.register(dict);
    dict.set(PDFName.of("Title"), PDFHexString.fromText(title));
    dict.set(PDFName.of("Parent"), outlineRootRef);
    dict.set(
      PDFName.of("Dest"),
      context.obj([pageRef, PDFName.of("XYZ"), PDFNull, PDFNull, PDFNull]),
    );
    itemRefs.push(ref);
    itemDicts.push(dict);
  });

  itemDicts.forEach((dict, index) => {
    if (index > 0) dict.set(PDFName.of("Prev"), itemRefs[index - 1]);
    if (index < itemRefs.length - 1)
      dict.set(PDFName.of("Next"), itemRefs[index + 1]);
  });

  outlineRoot.set(PDFName.of("First"), itemRefs[0]);
  outlineRoot.set(PDFName.of("Last"), itemRefs[itemRefs.length - 1]);
  outlineRoot.set(PDFName.of("Count"), PDFNumber.of(itemRefs.length));
  doc.catalog.set(PDFName.of("Outlines"), outlineRootRef);
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}

function pageGeometry(doc: PDFDocument): PageGeometry[] {
  return doc
    .getPages()
    .map((page) => ({ ...page.getSize(), rotation: page.getRotation().angle }));
}

function assertNoWidgetAnnotations(doc: PDFDocument): void {
  if (widgetAnnotations(doc).length > 0) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF still contains interactive form widgets, so it was not offered for download. Please try again or flatten the source form in a PDF editor.",
    );
  }
}

function assertDestinations(doc: PDFDocument): void {
  const selectedRefs = new Set(doc.getPages().map((page) => refKey(page.ref)));
  const selectedObjects = new Set<PDFObject>(
    doc.getPages().map((page) => page.node),
  );
  for (const page of doc.getPages()) {
    const annots = page.node.Annots();
    if (!annots) continue;
    for (let index = 0; index < annots.size(); index += 1) {
      const annot = lookupObject(doc, annots.get(index));
      if (!(annot instanceof PDFDict)) continue;
      const dest = annot.get(PDFName.of("Dest"));
      if (
        dest &&
        !destinationIsValid(doc, dest, selectedRefs, selectedObjects)
      ) {
        throw new PdfMergeError(
          "output_validation_failed",
          "A link in the merged PDF points outside the selected pages, so the file was not offered for download.",
        );
      }
      const action = lookupObject(doc, annot.get(PDFName.of("A")));
      if (action instanceof PDFDict && dictName(action, "S") === "GoTo") {
        if (
          !destinationIsValid(
            doc,
            action.get(PDFName.of("D")),
            selectedRefs,
            selectedObjects,
          )
        ) {
          throw new PdfMergeError(
            "output_validation_failed",
            "A link in the merged PDF points outside the selected pages, so the file was not offered for download.",
          );
        }
      }
    }
  }
}

function assertOutline(
  doc: PDFDocument,
  expected: { outputPageIndex: number; title: string }[],
): void {
  if (expected.length === 0) return;
  const outlineRoot = lookupObject(
    doc,
    doc.catalog.get(PDFName.of("Outlines")),
  );
  if (!(outlineRoot instanceof PDFDict)) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The requested source bookmarks were not present after reopening the merged PDF, so the file was not offered for download.",
    );
  }

  const count = outlineRoot
    .lookupMaybe(PDFName.of("Count"), PDFNumber)
    ?.asNumber();
  if (count !== expected.length) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF’s bookmark count did not validate after reopening, so the file was not offered for download.",
    );
  }

  const pageRefs = doc.getPages().map((page) => refKey(page.ref));
  let current: PDFObject | undefined = outlineRoot.get(PDFName.of("First"));
  for (const item of expected) {
    const dict = lookupObject(doc, current);
    if (!(dict instanceof PDFDict)) break;
    const title = textValue(doc, dict.get(PDFName.of("Title")));
    const dest = lookupObject(doc, dict.get(PDFName.of("Dest")));
    const first = dest instanceof PDFArray ? dest.get(0) : undefined;
    if (
      title !== item.title ||
      !(first instanceof PDFRef) ||
      refKey(first) !== pageRefs[item.outputPageIndex]
    ) {
      throw new PdfMergeError(
        "output_validation_failed",
        "A requested source bookmark points to the wrong page after reopening, so the file was not offered for download.",
      );
    }
    current = dict.get(PDFName.of("Next"));
  }
  if (current) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF contains an unexpected extra bookmark, so the file was not offered for download.",
    );
  }
}

export async function validateMergedPdfBytes(
  bytes: Uint8Array,
  expectedGeometry: PageGeometry[],
  expectedOutline: { outputPageIndex: number; title: string }[] = [],
  expectedTitle?: string,
): Promise<PDFDocument> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: false,
    });
  } catch {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF could not be reopened for validation, so it was not offered for download. Please try again.",
    );
  }

  if (doc.isEncrypted) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF unexpectedly remained encrypted, so it was not offered for download.",
    );
  }

  const geometry = pageGeometry(doc);
  const leafCount = doc.context
    .enumerateIndirectObjects()
    .filter(([, object]) => object instanceof PDFPageLeaf).length;
  if (
    geometry.length !== expectedGeometry.length ||
    leafCount !== expectedGeometry.length
  ) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF’s page count did not validate after reopening, so it was not offered for download.",
    );
  }

  geometry.forEach((actual, index) => {
    const expected = expectedGeometry[index];
    if (
      Math.abs(actual.width - expected.width) > 0.01 ||
      Math.abs(actual.height - expected.height) > 0.01 ||
      actual.rotation !== expected.rotation
    ) {
      throw new PdfMergeError(
        "output_validation_failed",
        `Page ${index + 1} changed size or rotation during validation, so the merged PDF was not offered for download.`,
      );
    }
  });

  if (doc.catalog.AcroForm()) {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF unexpectedly contains a form dictionary, so it was not offered for download.",
    );
  }
  assertNoWidgetAnnotations(doc);
  assertDestinations(doc);
  assertOutline(doc, expectedOutline);

  if (expectedTitle) {
    let actualTitle: string | undefined;
    try {
      actualTitle = doc.getTitle();
    } catch {
      actualTitle = undefined;
    }
    if (actualTitle !== expectedTitle) {
      throw new PdfMergeError(
        "output_validation_failed",
        "The merged PDF title did not validate after reopening, so the file was not offered for download.",
      );
    }
  }

  return doc;
}

function assertAppearanceStream(
  doc: PDFDocument,
  appearanceRef: PDFRef,
  entryId?: string,
): void {
  if (!(doc.context.lookup(appearanceRef) instanceof PDFStream)) {
    throw new PdfMergeError(
      "unsupported_form",
      "A form field is missing a usable appearance, so it cannot be flattened without risking invisible values. Open and flatten this PDF in a PDF editor, then add the flattened copy.",
      entryId,
    );
  }
}

function appearanceRefForFieldWidget(
  doc: PDFDocument,
  field: PDFField,
  widget: PDFWidgetAnnotation,
  entryId?: string,
): PDFRef {
  let refOrDict: PDFRef | PDFDict;
  try {
    refOrDict = widget.getNormalAppearance();
  } catch {
    throw new PdfMergeError(
      "unsupported_form",
      `Form field “${field.getName()}” is missing a usable appearance, so it cannot be flattened without risking invisible values. Open and flatten this PDF in a PDF editor, then add the flattened copy.`,
      entryId,
    );
  }

  if (field instanceof PDFCheckBox || field instanceof PDFRadioGroup) {
    const dict =
      refOrDict instanceof PDFRef ? doc.context.lookup(refOrDict) : refOrDict;
    if (dict instanceof PDFDict) {
      const getter = (
        field.acroField as unknown as { getValue?: () => PDFName }
      ).getValue;
      const value =
        typeof getter === "function" ? getter.call(field.acroField) : undefined;
      const selected =
        (value ? dict.get(value) : undefined) ?? dict.get(PDFName.of("Off"));
      if (selected instanceof PDFRef) return selected;
      throw new PdfMergeError(
        "unsupported_form",
        `Form field “${field.getName()}” does not have an appearance for its selected value, so it cannot be flattened safely. Flatten it in a PDF editor first.`,
        entryId,
      );
    }
  }

  if (refOrDict instanceof PDFRef) return refOrDict;
  throw new PdfMergeError(
    "unsupported_form",
    `Form field “${field.getName()}” uses an appearance layout this local engine cannot flatten safely. Flatten it in a PDF editor first.`,
    entryId,
  );
}

function appearanceRefForOrphanWidget(
  doc: PDFDocument,
  widget: PDFWidgetAnnotation,
  entryId?: string,
): PDFRef {
  let normal: PDFRef | PDFDict;
  try {
    normal = widget.getNormalAppearance();
  } catch {
    throw new PdfMergeError(
      "unsupported_form",
      "An orphaned form widget is missing a usable appearance, so it cannot be flattened safely. Flatten this PDF in a PDF editor first.",
      entryId,
    );
  }
  const resolved =
    normal instanceof PDFRef ? doc.context.lookup(normal) : normal;
  if (resolved instanceof PDFDict) {
    const value = widget.dict.lookup(PDFName.of("V"));
    const state =
      widget.getAppearanceState() ??
      (value instanceof PDFName ? value : PDFName.of("Off"));
    const selected = resolved.get(state) ?? resolved.get(PDFName.of("Off"));
    if (selected instanceof PDFRef) return selected;
    throw new PdfMergeError(
      "unsupported_form",
      "An orphaned form widget does not have an appearance for its current state, so it cannot be flattened safely. Flatten this PDF in a PDF editor first.",
      entryId,
    );
  }
  if (normal instanceof PDFRef) return normal;
  throw new PdfMergeError(
    "unsupported_form",
    "An orphaned form widget uses an appearance layout this local engine cannot flatten safely. Flatten this PDF in a PDF editor first.",
    entryId,
  );
}

function validateWidgetForFlattening(
  doc: PDFDocument,
  widget: PDFWidgetAnnotation,
  pageWidgetDicts: Set<PDFDict>,
  entryId?: string,
  fieldName?: string,
): void {
  let rectangle: { height: number; width: number };
  try {
    rectangle = widget.getRectangle();
  } catch {
    throw new PdfMergeError(
      "unsupported_form",
      fieldName
        ? `Form field “${fieldName}” has an invalid widget rectangle, so it cannot be flattened safely. Flatten it in a PDF editor first.`
        : "A form widget has an invalid rectangle, so it cannot be flattened safely. Flatten this PDF in a PDF editor first.",
      entryId,
    );
  }
  if (
    !Number.isFinite(rectangle.width) ||
    !Number.isFinite(rectangle.height) ||
    rectangle.width <= 0 ||
    rectangle.height <= 0
  ) {
    throw new PdfMergeError(
      "unsupported_form",
      fieldName
        ? `Form field “${fieldName}” has a zero-size widget, so its value cannot be proven visible after flattening. Flatten it in a PDF editor first.`
        : "A form widget has a zero-size rectangle, so its value cannot be proven visible after flattening. Flatten this PDF in a PDF editor first.",
      entryId,
    );
  }

  const flags =
    widget.dict.lookupMaybe(PDFName.of("F"), PDFNumber)?.asNumber() ?? 0;
  if ((flags & 0b100010) !== 0) {
    throw new PdfMergeError(
      "unsupported_form",
      fieldName
        ? `Form field “${fieldName}” is hidden or marked no-view. It is blocked so flattening cannot accidentally reveal a hidden value. Remove the field or flatten the PDF in an editor.`
        : "A form widget is hidden or marked no-view. It is blocked so flattening cannot accidentally reveal a hidden value.",
      entryId,
    );
  }

  const widgetPage = widget.P();
  const pageRefs = new Set(doc.getPages().map((page) => refKey(page.ref)));
  const onKnownPage =
    pageWidgetDicts.has(widget.dict) ||
    (widgetPage ? pageRefs.has(refKey(widgetPage)) : false);
  if (!onKnownPage) {
    throw new PdfMergeError(
      "unsupported_form",
      fieldName
        ? `Form field “${fieldName}” has a widget that cannot be tied to a page, so it cannot be flattened safely. Flatten it in a PDF editor first.`
        : "A form widget cannot be tied to a page, so it cannot be flattened safely. Flatten this PDF in a PDF editor first.",
      entryId,
    );
  }
}

function prepareAndFlattenForm(
  doc: PDFDocument,
  form: PDFForm,
  fields: PDFField[],
  entryId: string,
  sourceName: string,
): void {
  const needsAppearances = safeBoolean(() => {
    const value = form.acroForm.dict.lookup(PDFName.of("NeedAppearances"));
    return value?.toString() === "true";
  });
  const features = inspectPdfFeatures(doc);
  if (needsAppearances && features.hasJavaScript) {
    throw new PdfMergeError(
      "unsupported_form",
      `“${sourceName}” uses script-calculated form appearances that this browser-only engine cannot recalculate safely. Open it in a PDF editor, let it calculate, flatten/save a copy, then merge that copy.`,
      entryId,
    );
  }

  try {
    form.updateFieldAppearances();
  } catch {
    throw new PdfMergeError(
      "unsupported_form",
      `A form field in “${sourceName}” needs a new appearance that could not be generated locally (for example, unsupported text encoding). Open and flatten it in a PDF editor, then add the flattened copy.`,
      entryId,
    );
  }

  const pageWidgets = widgetAnnotations(doc);
  const pageWidgetDicts = new Set(pageWidgets.map(({ dict }) => dict));
  const fieldWidgetDicts = new Set<PDFDict>();

  for (const field of fields) {
    const widgets = field.acroField.getWidgets();
    for (const widget of widgets) {
      fieldWidgetDicts.add(widget.dict);
      validateWidgetForFlattening(
        doc,
        widget,
        pageWidgetDicts,
        entryId,
        field.getName(),
      );
      assertAppearanceStream(
        doc,
        appearanceRefForFieldWidget(doc, field, widget, entryId),
        entryId,
      );
    }
  }

  for (const { dict } of pageWidgets) {
    if (fieldWidgetDicts.has(dict)) continue;
    if (!dict.has(PDFName.of("FT"))) {
      throw new PdfMergeError(
        "unsupported_form",
        `“${sourceName}” contains a form widget that is not connected to a readable field. Flatten or repair it in a PDF editor, then try again.`,
        entryId,
      );
    }
    const widget = PDFWidgetAnnotation.fromDict(dict);
    validateWidgetForFlattening(doc, widget, pageWidgetDicts, entryId);
    assertAppearanceStream(
      doc,
      appearanceRefForOrphanWidget(doc, widget, entryId),
      entryId,
    );
  }

  const capturedErrors: unknown[][] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    capturedErrors.push(args);
  };
  try {
    form.flatten({ updateFieldAppearances: false });
  } catch {
    throw new PdfMergeError(
      "unsupported_form",
      `The form in “${sourceName}” could not be flattened safely, so the merge was stopped. Flatten it in a PDF editor and add that copy.`,
      entryId,
    );
  } finally {
    console.error = originalConsoleError;
  }

  if (
    capturedErrors.length > 0 ||
    form.getFields().length > 0 ||
    widgetAnnotations(doc).length > 0
  ) {
    throw new PdfMergeError(
      "unsupported_form",
      `At least one form field in “${sourceName}” could not be flattened with proof that its visible value survived, so the merge was stopped instead of silently dropping it. Flatten the PDF in an editor and try again.`,
      entryId,
    );
  }
}

async function defaultYield(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

export async function mergePdfBytes(
  sources: PdfMergeSourceBytes[],
  options: PdfMergeOptions,
): Promise<PdfMergeResult> {
  if (sources.length < 2) {
    throw new PdfMergeError(
      "invalid_selection",
      "Add at least two PDFs before merging. A single PDF does not need to be merged.",
    );
  }
  if (sources.length > PDF_MERGE_LIMITS.maxFiles) {
    throw new PdfMergeError(
      "too_many_files",
      `You can merge up to ${PDF_MERGE_LIMITS.maxFiles} PDFs at once. Remove a file or split this into smaller batches.`,
    );
  }

  const totalSelected = sources.reduce(
    (sum, source) => sum + source.pageIndices.length,
    0,
  );
  if (totalSelected < 1) {
    throw new PdfMergeError(
      "invalid_selection",
      "Select at least one page from the PDFs before merging.",
    );
  }
  if (totalSelected > PDF_MERGE_LIMITS.maxOutputPages) {
    throw new PdfMergeError(
      "too_many_pages",
      `The selected pages add up to ${totalSelected.toLocaleString()}, above the ${PDF_MERGE_LIMITS.maxOutputPages.toLocaleString()}-page output limit. Deselect pages or merge in smaller batches.`,
    );
  }

  const progress = options.onProgress ?? (() => undefined);
  const yieldControl = options.yieldControl ?? defaultYield;
  const output = await PDFDocument.create({ updateMetadata: false });
  const selectedPageRefs: PDFRef[] = [];
  const outlineTargets: { outputPageIndex: number; pageRef: PDFRef }[] = [];
  const notices = new Set<string>();
  let copiedPages = 0;

  for (const [sourceIndex, source] of sources.entries()) {
    progress({
      current: sourceIndex + 1,
      fileName: source.name,
      message: `Reading ${source.name}`,
      stage: "inspecting",
      total: sources.length,
    });

    if (source.pageIndices.length === 0) {
      throw new PdfMergeError(
        "invalid_selection",
        `“${source.name}” has no pages selected. Select at least one page or remove the file; it will not be skipped silently.`,
        source.id,
      );
    }
    if (new Set(source.pageIndices).size !== source.pageIndices.length) {
      const duplicate = source.pageIndices.find(
        (page, index) => source.pageIndices.indexOf(page) !== index,
      )!;
      throw new PdfMergeError(
        "duplicate_page_selection",
        `Page ${duplicate + 1} in “${source.name}” is selected more than once. Remove the duplicate page selection and try again.`,
        source.id,
      );
    }

    const { doc: sourceDoc } = await loadPdf(
      source.bytes,
      source.password,
      source.id,
    );
    let sourcePageCount: number;
    try {
      sourcePageCount = sourceDoc.getPageCount();
    } catch {
      throw corruptError(source.id);
    }
    if (sourcePageCount < 1) throw corruptError(source.id);
    if (sourcePageCount > PDF_MERGE_LIMITS.maxPagesPerFile) {
      throw new PdfMergeError(
        "too_many_pages",
        `“${source.name}” has ${sourcePageCount.toLocaleString()} pages, above the ${PDF_MERGE_LIMITS.maxPagesPerFile.toLocaleString()}-page per-file limit. Split it into smaller PDFs first.`,
        source.id,
      );
    }

    for (const pageIndex of source.pageIndices) {
      if (
        !Number.isInteger(pageIndex) ||
        pageIndex < 0 ||
        pageIndex >= sourcePageCount
      ) {
        throw new PdfMergeError(
          "invalid_page_range",
          `Page ${pageIndex + 1} is outside “${source.name}” (pages 1–${sourcePageCount}). Update its page selection and try again.`,
          source.id,
        );
      }
    }

    const features = inspectPdfFeatures(sourceDoc);
    getInspectionWarnings(features).forEach((warning) => notices.add(warning));
    if (features.hasXFA) {
      throw new PdfMergeError(
        "unsupported_xfa",
        `“${source.name}” is a dynamic XFA form, which cannot be merged safely in the browser. Print or export it to a standard PDF, then add that copy.`,
        source.id,
      );
    }
    if (features.hasSignedSignature) {
      throw new PdfMergeError(
        "signed_pdf",
        `“${source.name}” appears to be digitally signed. Merging is blocked so the signature is not silently invalidated. Merge an unsigned copy if you have permission to create one.`,
        source.id,
      );
    }

    const pageWidgets = widgetAnnotations(sourceDoc);
    const sourceForm = existingForm(sourceDoc);
    let formFields: PDFField[] = [];
    try {
      formFields = sourceForm?.getFields() ?? [];
    } catch {
      throw new PdfMergeError(
        "unsupported_form",
        `The form structure in “${source.name}” could not be read safely. Flatten or repair it in a PDF editor, then try again.`,
        source.id,
      );
    }

    if (formFields.length > 0 || pageWidgets.length > 0) {
      if (!sourceForm) {
        throw new PdfMergeError(
          "unsupported_form",
          `“${source.name}” contains form widgets without a readable form dictionary. Flatten or repair it in a PDF editor, then try again.`,
          source.id,
        );
      }
      progress({
        current: sourceIndex + 1,
        fileName: source.name,
        message: `Flattening form fields in ${source.name}`,
        stage: "preparing",
        total: sources.length,
      });
      prepareAndFlattenForm(
        sourceDoc,
        sourceForm,
        formFields,
        source.id,
        source.name,
      );
      notices.add(
        "Interactive form fields were flattened to static page content.",
      );
    }

    await sourceDoc.flush();
    const copier = PDFObjectCopier.for(sourceDoc.context, output.context);
    const firstOutputPageIndex = output.getPageCount();
    let firstCopiedRef: PDFRef | undefined;

    for (const pageIndex of source.pageIndices) {
      let copiedRef: PDFObject;
      try {
        copiedRef = copier.copy(sourceDoc.getPage(pageIndex).ref);
      } catch {
        throw new PdfMergeError(
          "unsupported_pdf_structure",
          `Page ${pageIndex + 1} of “${source.name}” could not be copied safely. Export that PDF again from a reader or editor, then retry.`,
          source.id,
        );
      }
      if (!(copiedRef instanceof PDFRef)) {
        throw new PdfMergeError(
          "unsupported_pdf_structure",
          `Page ${pageIndex + 1} of “${source.name}” could not be copied safely. Export that PDF again from a reader or editor, then retry.`,
          source.id,
        );
      }
      const copiedNode = output.context.lookup(copiedRef);
      if (!(copiedNode instanceof PDFPageLeaf)) {
        throw new PdfMergeError(
          "unsupported_pdf_structure",
          `Page ${pageIndex + 1} of “${source.name}” did not copy as a page. Export that PDF again from a reader or editor, then retry.`,
          source.id,
        );
      }
      output.addPage(PDFPage.of(copiedNode, copiedRef, output));
      selectedPageRefs.push(copiedRef);
      firstCopiedRef ??= copiedRef;
      copiedPages += 1;
      progress({
        current: copiedPages,
        fileName: source.name,
        message: `Copying page ${pageIndex + 1} from ${source.name}`,
        stage: "copying",
        total: totalSelected,
      });
      await yieldControl();
    }

    if (firstCopiedRef) {
      outlineTargets.push({
        outputPageIndex: firstOutputPageIndex,
        pageRef: firstCopiedRef,
      });
    }
  }

  const cleanTitle = sanitizePdfTitle(options.title);
  const now = options.now ?? new Date();
  output.setTitle(cleanTitle, { showInWindowTitleBar: true });
  output.setCreator("QUICKKIT PDF Merger");
  output.setProducer("QUICKKIT PDF Merger");
  output.setCreationDate(now);
  output.setModificationDate(now);

  const bookmarkTitles = options.createBookmarks
    ? makeUniqueBookmarkTitles(sources.map((source) => source.name))
    : [];
  if (options.createBookmarks) {
    addSourceBookmarks(
      output,
      outlineTargets.map((target, index) => ({
        pageRef: target.pageRef,
        title: bookmarkTitles[index],
      })),
    );
    notices.add("Added one new bookmark for each source PDF.");
  }

  progress({
    current: totalSelected,
    message: "Repairing page links and removing unselected page data",
    stage: "finalizing",
    total: totalSelected,
  });
  await yieldControl();
  const graph = sanitizeAndPruneMergedDocument(output, selectedPageRefs);
  if (graph.removedDestinations > 0) {
    notices.add(
      `${graph.removedDestinations} internal destination${graph.removedDestinations === 1 ? "" : "s"} pointed to unselected pages and were removed rather than left broken.`,
    );
  }
  if (graph.removedActions > 0) {
    notices.add(
      "Unsupported or script-based actions were removed; ordinary web links and safe internal page links were kept where possible.",
    );
  }
  if (graph.removedLinkAnnotations > 0) {
    notices.add(
      `${graph.removedLinkAnnotations} link area${graph.removedLinkAnnotations === 1 ? "" : "s"} had no valid destination in the selected pages and were removed.`,
    );
  }

  const expectedGeometry = pageGeometry(output);
  progress({
    current: 1,
    message: "Writing the merged PDF",
    stage: "saving",
    total: 1,
  });
  await yieldControl();
  let bytes: Uint8Array;
  try {
    bytes = await output.save({
      objectsPerTick: 50,
      updateFieldAppearances: false,
      useObjectStreams: true,
    });
  } catch {
    throw new PdfMergeError(
      "output_validation_failed",
      "The merged PDF could not be written. Try fewer or smaller files, or export the source PDFs again.",
    );
  }

  progress({
    current: 1,
    message: "Reopening and validating the merged PDF",
    stage: "validating",
    total: 1,
  });
  await yieldControl();
  await validateMergedPdfBytes(
    bytes,
    expectedGeometry,
    options.createBookmarks
      ? outlineTargets.map((target, index) => ({
          outputPageIndex: target.outputPageIndex,
          title: bookmarkTitles[index],
        }))
      : [],
    cleanTitle,
  );

  return {
    bookmarkTitles,
    bytes,
    notices: [...notices],
    pageCount: expectedGeometry.length,
    removedActions: graph.removedActions,
    removedDestinations: graph.removedDestinations,
    removedLinkAnnotations: graph.removedLinkAnnotations,
  };
}

export interface PdfSplitSegmentInput {
  pageIndices: number[];
  title: string;
}

export interface PdfSplitOptions {
  now?: Date;
  onProgress?: (progress: PdfMergeProgress) => void;
  yieldControl?: () => Promise<void>;
}

export interface PdfSplitOutputBytes {
  bytes: Uint8Array;
  pageCount: number;
}

export interface PdfSplitResult {
  notices: string[];
  outputs: PdfSplitOutputBytes[];
  removedActions: number;
  removedDestinations: number;
  removedLinkAnnotations: number;
  totalBytes: number;
}

function splitFeatureNotices(
  features: PdfInspectionFeatures,
  encrypted: boolean,
): string[] {
  const notices: string[] = [];
  if (features.hasForm) {
    notices.push(
      "Interactive form fields were flattened to static page content in the split PDFs.",
    );
  }
  if (features.hasOutlines) {
    notices.push(
      "The original document outline is not copied into split PDFs; page content is preserved without a misleading shared bookmark tree.",
    );
  }
  if (features.hasAttachments) {
    notices.push(
      "Embedded file attachments are not copied into split PDFs. Download or extract them from the original PDF if you need them.",
    );
  }
  if (features.hasLayers) {
    notices.push(
      "Optional-content layers may not behave interactively in split PDFs; review pages that rely on layer toggles.",
    );
  }
  if (features.hasTags) {
    notices.push(
      "Tagged-PDF accessibility structure is not guaranteed after splitting; check the output if tagged reading order matters.",
    );
  }
  if (features.hasJavaScript) {
    notices.push(
      "Document JavaScript and unsupported script-based actions are not carried into split PDFs.",
    );
  }
  if (features.hasSignatureField && !features.hasSignedSignature) {
    notices.push(
      "Unsigned signature fields were treated like other form fields and flattened where they appear.",
    );
  }
  if (encrypted) {
    notices.push(
      "The source open password is not re-applied; split PDFs are unencrypted.",
    );
  }
  return notices;
}

function rewriteMergeWordingForSplit(error: unknown): never {
  if (error instanceof PdfMergeError) {
    throw new PdfMergeError(
      error.code,
      error.message
        .replace(/the merge was stopped/gi, "the split was stopped")
        .replace(/then merge that copy/gi, "then split that copy")
        .replace(/not in this merge/gi, "not in this output")
        .replace(/merged PDF/gi, "split PDF"),
      error.entryId,
    );
  }
  throw error;
}

/**
 * Splits one already-selected source into independently sanitized and
 * reopen-validated outputs. This shares the Merger's reviewed page-copying
 * and object-pruning internals instead of introducing a second copy path.
 */
export async function splitPdfBytes(
  sourceBytes: Uint8Array,
  sourceName: string,
  segments: PdfSplitSegmentInput[],
  options: PdfSplitOptions & { password?: string } = {},
): Promise<PdfSplitResult> {
  if (sourceBytes.byteLength > PDF_SPLIT_LIMITS.maxSourceBytes) {
    throw new PdfMergeError(
      "file_too_large",
      `“${sourceName}” is above the ${Math.round(PDF_SPLIT_LIMITS.maxSourceBytes / (1024 * 1024))} MiB local Splitter limit. Split or compress it in a PDF editor first.`,
    );
  }
  if (segments.length === 0) {
    throw new PdfMergeError(
      "invalid_selection",
      "Choose at least one output range before splitting.",
    );
  }
  if (segments.length > PDF_SPLIT_LIMITS.maxOutputFiles) {
    throw new PdfMergeError(
      "too_many_files",
      `This plan would create ${segments.length.toLocaleString()} PDFs. Create no more than ${PDF_SPLIT_LIMITS.maxOutputFiles} PDFs in one local run.`,
    );
  }
  const totalOutputPages = segments.reduce(
    (total, segment) => total + segment.pageIndices.length,
    0,
  );
  if (totalOutputPages > PDF_SPLIT_LIMITS.maxOutputPages) {
    throw new PdfMergeError(
      "too_many_pages",
      `This plan would write ${totalOutputPages.toLocaleString()} output pages. Reduce overlapping ranges so the total is no more than ${PDF_SPLIT_LIMITS.maxOutputPages.toLocaleString()} pages.`,
    );
  }
  for (const [index, segment] of segments.entries()) {
    if (segment.pageIndices.length === 0) {
      throw new PdfMergeError(
        "invalid_selection",
        `Output ${index + 1} has no pages. Add at least one page to every output.`,
      );
    }
    if (new Set(segment.pageIndices).size !== segment.pageIndices.length) {
      const duplicate = segment.pageIndices.find(
        (page, pageIndex) => segment.pageIndices.indexOf(page) !== pageIndex,
      )!;
      throw new PdfMergeError(
        "duplicate_page_selection",
        `Page ${duplicate + 1} appears more than once inside Output ${index + 1}. Remove the duplicate inside that output.`,
      );
    }
  }

  const progress = options.onProgress ?? (() => undefined);
  const yieldControl = options.yieldControl ?? defaultYield;
  progress({
    current: 1,
    fileName: sourceName,
    message: `Reading ${sourceName}`,
    stage: "inspecting",
    total: 1,
  });
  await yieldControl();

  const { doc: sourceDoc, encrypted } = await loadPdf(
    sourceBytes,
    options.password,
    "split-source",
  ).catch(rewriteMergeWordingForSplit);
  let sourcePageCount: number;
  try {
    sourcePageCount = sourceDoc.getPageCount();
  } catch {
    throw corruptError("split-source");
  }
  if (sourcePageCount < 1) throw corruptError("split-source");
  if (sourcePageCount > PDF_SPLIT_LIMITS.maxSourcePages) {
    throw new PdfMergeError(
      "too_many_pages",
      `“${sourceName}” has ${sourcePageCount.toLocaleString()} pages, above the ${PDF_SPLIT_LIMITS.maxSourcePages.toLocaleString()}-page local Splitter limit. Split it into smaller PDFs in an editor first.`,
      "split-source",
    );
  }
  for (const [segmentIndex, segment] of segments.entries()) {
    for (const pageIndex of segment.pageIndices) {
      if (
        !Number.isInteger(pageIndex) ||
        pageIndex < 0 ||
        pageIndex >= sourcePageCount
      ) {
        throw new PdfMergeError(
          "invalid_page_range",
          `Page ${pageIndex + 1} in Output ${segmentIndex + 1} is outside “${sourceName}” (pages 1–${sourcePageCount}). Update the split plan and try again.`,
          "split-source",
        );
      }
    }
  }

  const features = inspectPdfFeatures(sourceDoc);
  if (features.hasXFA) {
    throw new PdfMergeError(
      "unsupported_xfa",
      `“${sourceName}” is a dynamic XFA form, which cannot be split safely in the browser. Print or export it to a standard PDF, then split that copy.`,
      "split-source",
    );
  }
  if (features.hasSignedSignature) {
    throw new PdfMergeError(
      "signed_pdf",
      `“${sourceName}” appears to be digitally signed. Splitting is blocked so the signature is not silently invalidated. Split an unsigned copy only if you have permission to create one.`,
      "split-source",
    );
  }

  const notices = new Set(splitFeatureNotices(features, encrypted));
  const pageWidgets = widgetAnnotations(sourceDoc);
  const sourceForm = existingForm(sourceDoc);
  let formFields: PDFField[] = [];
  try {
    formFields = sourceForm?.getFields() ?? [];
  } catch {
    throw new PdfMergeError(
      "unsupported_form",
      `The form structure in “${sourceName}” could not be read safely. Flatten or repair it in a PDF editor, then try splitting again.`,
      "split-source",
    );
  }
  if (formFields.length > 0 || pageWidgets.length > 0) {
    if (!sourceForm) {
      throw new PdfMergeError(
        "unsupported_form",
        `“${sourceName}” contains form widgets without a readable form dictionary. Flatten or repair it in a PDF editor, then try splitting again.`,
        "split-source",
      );
    }
    progress({
      current: 1,
      fileName: sourceName,
      message: `Flattening form fields in ${sourceName}`,
      stage: "preparing",
      total: 1,
    });
    await yieldControl();
    try {
      prepareAndFlattenForm(
        sourceDoc,
        sourceForm,
        formFields,
        "split-source",
        sourceName,
      );
    } catch (error) {
      rewriteMergeWordingForSplit(error);
    }
  }
  await sourceDoc.flush();

  const outputs: PdfSplitOutputBytes[] = [];
  let copiedPages = 0;
  let totalBytes = 0;
  let removedActions = 0;
  let removedDestinations = 0;
  let removedLinkAnnotations = 0;
  const now = options.now ?? new Date();

  for (const [segmentIndex, segment] of segments.entries()) {
    const output = await PDFDocument.create({ updateMetadata: false });
    const selectedPageRefs: PDFRef[] = [];
    const copier = PDFObjectCopier.for(sourceDoc.context, output.context);

    for (const pageIndex of segment.pageIndices) {
      let copiedObject: PDFObject;
      try {
        copiedObject = copier.copy(sourceDoc.getPage(pageIndex).ref);
      } catch {
        throw new PdfMergeError(
          "unsupported_pdf_structure",
          `Page ${pageIndex + 1} could not be copied into Output ${segmentIndex + 1} safely. Export the source PDF again from a reader or editor, then retry.`,
          "split-source",
        );
      }
      if (!(copiedObject instanceof PDFRef)) {
        throw new PdfMergeError(
          "unsupported_pdf_structure",
          `Page ${pageIndex + 1} could not be copied into Output ${segmentIndex + 1} safely. Export the source PDF again from a reader or editor, then retry.`,
          "split-source",
        );
      }
      const copiedNode = output.context.lookup(copiedObject);
      if (!(copiedNode instanceof PDFPageLeaf)) {
        throw new PdfMergeError(
          "unsupported_pdf_structure",
          `Page ${pageIndex + 1} did not copy as a page into Output ${segmentIndex + 1}. Export the source PDF again from a reader or editor, then retry.`,
          "split-source",
        );
      }
      output.addPage(PDFPage.of(copiedNode, copiedObject, output));
      selectedPageRefs.push(copiedObject);
      copiedPages += 1;
      progress({
        current: copiedPages,
        fileName: sourceName,
        message: `Copying page ${pageIndex + 1} into output ${segmentIndex + 1} of ${segments.length}`,
        stage: "copying",
        total: totalOutputPages,
      });
      await yieldControl();
    }

    const cleanTitle = sanitizePdfTitle(segment.title, "Split PDF");
    output.setTitle(cleanTitle, { showInWindowTitleBar: true });
    output.setCreator("QUICKKIT PDF Splitter");
    output.setProducer("QUICKKIT PDF Splitter");
    output.setCreationDate(now);
    output.setModificationDate(now);

    progress({
      current: segmentIndex + 1,
      fileName: sourceName,
      message: `Checking links and removing unselected data from output ${segmentIndex + 1}`,
      stage: "finalizing",
      total: segments.length,
    });
    await yieldControl();
    let graph: ReturnType<typeof sanitizeAndPruneMergedDocument>;
    try {
      graph = sanitizeAndPruneMergedDocument(output, selectedPageRefs);
    } catch (error) {
      rewriteMergeWordingForSplit(error);
    }
    removedActions += graph.removedActions;
    removedDestinations += graph.removedDestinations;
    removedLinkAnnotations += graph.removedLinkAnnotations;

    const expectedGeometry = pageGeometry(output);
    progress({
      current: segmentIndex + 1,
      fileName: sourceName,
      message: `Writing output ${segmentIndex + 1} of ${segments.length}`,
      stage: "saving",
      total: segments.length,
    });
    await yieldControl();
    let bytes: Uint8Array;
    try {
      bytes = await output.save({
        objectsPerTick: 50,
        updateFieldAppearances: false,
        useObjectStreams: true,
      });
    } catch {
      throw new PdfMergeError(
        "output_validation_failed",
        `Output ${segmentIndex + 1} could not be written. Try fewer pages per output, or export the source PDF again.`,
        "split-source",
      );
    }

    totalBytes += bytes.byteLength;
    if (totalBytes > PDF_SPLIT_LIMITS.maxGeneratedPdfBytes) {
      throw new PdfMergeError(
        "total_too_large",
        `The generated split PDFs exceeded the ${Math.round(PDF_SPLIT_LIMITS.maxGeneratedPdfBytes / (1024 * 1024))} MiB local safety limit while creating Output ${segmentIndex + 1}. Split fewer pages at a time or reduce overlapping ranges.`,
        "split-source",
      );
    }

    progress({
      current: segmentIndex + 1,
      fileName: sourceName,
      message: `Reopening and validating output ${segmentIndex + 1} of ${segments.length}`,
      stage: "validating",
      total: segments.length,
    });
    await yieldControl();
    try {
      await validateMergedPdfBytes(bytes, expectedGeometry, [], cleanTitle);
    } catch {
      throw new PdfMergeError(
        "output_validation_failed",
        `Output ${segmentIndex + 1} could not be reopened and validated, so it was not offered for download. Try that range separately or export the source PDF again.`,
        "split-source",
      );
    }
    outputs.push({ bytes, pageCount: expectedGeometry.length });
  }

  if (removedDestinations > 0) {
    notices.add(
      `${removedDestinations} internal destination${removedDestinations === 1 ? "" : "s"} pointed to pages outside an output and were removed rather than left broken.`,
    );
  }
  if (removedActions > 0) {
    notices.add(
      "Unsupported or script-based actions were removed; ordinary web links and safe internal page links were kept where possible.",
    );
  }
  if (removedLinkAnnotations > 0) {
    notices.add(
      `${removedLinkAnnotations} link area${removedLinkAnnotations === 1 ? "" : "s"} had no valid destination inside the same output and were removed.`,
    );
  }

  return {
    notices: [...notices],
    outputs,
    removedActions,
    removedDestinations,
    removedLinkAnnotations,
    totalBytes,
  };
}
