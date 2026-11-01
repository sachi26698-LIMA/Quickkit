import { inspectPdfBytes, splitPdfBytes } from "@/lib/tools/pdf/merge-engine";
import { PdfMergeError, formatMiB } from "@/lib/tools/pdf/merge-pdf-logic";
import {
  PDF_SPLIT_LIMITS,
  buildZipFilename,
  createStoredZip,
} from "@/lib/tools/pdf/split-pdf-logic";
import type {
  PdfSplitWorkerRequest,
  PdfSplitWorkerResponse,
} from "@/lib/tools/pdf/split-worker-types";

interface PdfWorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<PdfSplitWorkerRequest>) => void,
  ): void;
  postMessage(message: PdfSplitWorkerResponse, transfer?: Transferable[]): void;
}

const workerScope = globalThis as unknown as PdfWorkerScope;
let busy = false;

function post(
  message: PdfSplitWorkerResponse,
  transfer?: Transferable[],
): void {
  workerScope.postMessage(message, transfer);
}

function postError(requestId: string, error: unknown): void {
  if (error instanceof PdfMergeError) {
    post({
      code: error.code,
      entryId: error.entryId,
      message: error.message,
      requestId,
      type: "error",
    });
    return;
  }
  post({
    code: "worker_failed",
    message:
      "Local PDF splitting stopped unexpectedly. Close other memory-heavy tabs, use a smaller PDF, or create fewer outputs and try again.",
    requestId,
    type: "error",
  });
}

function validateSourceSize(data: ArrayBuffer, sourceName: string): void {
  if (data.byteLength === 0) {
    throw new PdfMergeError(
      "invalid_pdf",
      `“${sourceName}” is empty. Choose a complete PDF exported from your document app.`,
    );
  }
  if (data.byteLength > PDF_SPLIT_LIMITS.maxSourceBytes) {
    throw new PdfMergeError(
      "file_too_large",
      `“${sourceName}” is ${formatMiB(data.byteLength)}, above the ${formatMiB(PDF_SPLIT_LIMITS.maxSourceBytes)} local Splitter limit. Split or compress it in a PDF editor, then add it again.`,
    );
  }
}

function validateSplitRequest(
  request: Extract<PdfSplitWorkerRequest, { type: "split" }>,
): void {
  validateSourceSize(request.data, request.sourceName);
  if (request.segments.length === 0) {
    throw new PdfMergeError(
      "invalid_selection",
      "Choose at least one output range before splitting.",
    );
  }
  if (request.segments.length > PDF_SPLIT_LIMITS.maxOutputFiles) {
    throw new PdfMergeError(
      "too_many_files",
      `This plan would create ${request.segments.length.toLocaleString()} PDFs. Create no more than ${PDF_SPLIT_LIMITS.maxOutputFiles} PDFs in one local run.`,
    );
  }
  const totalPages = request.segments.reduce(
    (total, segment) => total + segment.pageIndices.length,
    0,
  );
  if (totalPages > PDF_SPLIT_LIMITS.maxOutputPages) {
    throw new PdfMergeError(
      "too_many_pages",
      `This plan would write ${totalPages.toLocaleString()} output pages. Reduce overlapping ranges so the total is no more than ${PDF_SPLIT_LIMITS.maxOutputPages.toLocaleString()} pages.`,
    );
  }
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

workerScope.addEventListener("message", async (event) => {
  const request = event.data;
  if (
    !request ||
    typeof request.requestId !== "string" ||
    !["inspect", "split"].includes(request.type)
  ) {
    return;
  }

  if (busy) {
    post({
      code: "worker_failed",
      message:
        "The local PDF Splitter is already processing another request. Wait for it to finish and try again.",
      requestId: request.requestId,
      type: "error",
    });
    return;
  }

  busy = true;
  try {
    if (request.type === "inspect") {
      validateSourceSize(request.data, "This PDF");
      const inspection = await inspectPdfBytes(
        new Uint8Array(request.data),
        request.password,
        "split-source",
      );
      post({
        inspection,
        requestId: request.requestId,
        type: "inspect-success",
      });
      return;
    }

    validateSplitRequest(request);
    const result = await splitPdfBytes(
      new Uint8Array(request.data),
      request.sourceName,
      request.segments.map((segment) => ({
        pageIndices: segment.pageIndices,
        title: segment.title,
      })),
      {
        onProgress: (progress) =>
          post({ progress, requestId: request.requestId, type: "progress" }),
        password: request.password,
      },
    );

    const outputs = result.outputs.map((output, index) => ({
      data: bytesToArrayBuffer(output.bytes),
      filename: request.segments[index].filename,
      pageCount: output.pageCount,
      pagesLabel: request.segments[index].pagesLabel,
      title: request.segments[index].title,
    }));

    let zipBytes: Uint8Array | undefined;
    let zipData: ArrayBuffer | undefined;
    let zipFilename: string | undefined;
    if (outputs.length > 1) {
      post({
        progress: {
          current: 1,
          fileName: request.sourceName,
          message: "Packaging the split PDFs into a ZIP",
          stage: "finalizing",
          total: 1,
        },
        requestId: request.requestId,
        type: "progress",
      });
      zipBytes = createStoredZip(
        outputs.map((output) => ({
          bytes: new Uint8Array(output.data),
          name: output.filename,
        })),
      );
      zipData = bytesToArrayBuffer(zipBytes);
      zipFilename = buildZipFilename(request.zipFilename);
    }

    const transfer = outputs.map((output) => output.data);
    if (zipData) transfer.push(zipData);
    post(
      {
        requestId: request.requestId,
        result: {
          notices: result.notices,
          outputs,
          removedActions: result.removedActions,
          removedDestinations: result.removedDestinations,
          removedLinkAnnotations: result.removedLinkAnnotations,
          totalBytes: result.totalBytes,
          zipData,
          zipFilename,
        },
        type: "split-success",
      },
      transfer,
    );
  } catch (error) {
    postError(request.requestId, error);
  } finally {
    busy = false;
  }
});
