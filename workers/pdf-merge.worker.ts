import { inspectPdfBytes, mergePdfBytes } from "@/lib/tools/pdf/merge-engine";
import {
  PDF_MERGE_LIMITS,
  PdfMergeError,
  formatMiB,
} from "@/lib/tools/pdf/merge-pdf-logic";
import type {
  PdfWorkerRequest,
  PdfWorkerResponse,
} from "@/lib/tools/pdf/merge-worker-types";

interface PdfWorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<PdfWorkerRequest>) => void,
  ): void;
  postMessage(message: PdfWorkerResponse, transfer?: Transferable[]): void;
}

const workerScope = globalThis as unknown as PdfWorkerScope;
let busy = false;

function post(message: PdfWorkerResponse, transfer?: Transferable[]): void {
  workerScope.postMessage(message, transfer);
}

function postError(
  requestId: string,
  error: unknown,
  fallbackEntryId?: string,
): void {
  if (error instanceof PdfMergeError) {
    post({
      code: error.code,
      entryId: error.entryId ?? fallbackEntryId,
      message: error.message,
      requestId,
      type: "error",
    });
    return;
  }
  post({
    code: "worker_failed",
    entryId: fallbackEntryId,
    message:
      "Local PDF processing stopped unexpectedly. Close other memory-heavy tabs, remove the largest file, or split the job into smaller batches and try again.",
    requestId,
    type: "error",
  });
}

function validateMergeSizes(
  request: Extract<PdfWorkerRequest, { type: "merge" }>,
): void {
  let total = 0;
  for (const source of request.sources) {
    if (source.data.byteLength === 0) {
      throw new PdfMergeError(
        "invalid_pdf",
        `“${source.name}” is empty. Choose a complete PDF exported from your document app.`,
        source.id,
      );
    }
    if (source.data.byteLength > PDF_MERGE_LIMITS.maxFileBytes) {
      throw new PdfMergeError(
        "file_too_large",
        `“${source.name}” is ${formatMiB(source.data.byteLength)}, above the ${formatMiB(PDF_MERGE_LIMITS.maxFileBytes)} per-file limit. Split or compress it in a PDF editor, then add it again.`,
        source.id,
      );
    }
    total += source.data.byteLength;
  }
  if (total > PDF_MERGE_LIMITS.maxTotalBytes) {
    throw new PdfMergeError(
      "total_too_large",
      `The selected PDFs total ${formatMiB(total)}, above the ${formatMiB(PDF_MERGE_LIMITS.maxTotalBytes)} limit. Remove a file or merge in smaller batches.`,
    );
  }
}

workerScope.addEventListener("message", async (event) => {
  const request = event.data;
  if (
    !request ||
    typeof request.requestId !== "string" ||
    !["inspect", "merge"].includes(request.type)
  ) {
    return;
  }

  if (busy) {
    post({
      code: "worker_failed",
      message:
        "The local PDF worker is already processing another request. Wait for it to finish and try again.",
      requestId: request.requestId,
      type: "error",
    });
    return;
  }

  busy = true;
  try {
    if (request.type === "inspect") {
      if (request.data.byteLength > PDF_MERGE_LIMITS.maxFileBytes) {
        throw new PdfMergeError(
          "file_too_large",
          `This PDF is ${formatMiB(request.data.byteLength)}, above the ${formatMiB(PDF_MERGE_LIMITS.maxFileBytes)} per-file limit. Split or compress it in a PDF editor, then add it again.`,
          request.entryId,
        );
      }
      const inspection = await inspectPdfBytes(
        new Uint8Array(request.data),
        request.password,
        request.entryId,
      );
      post({
        inspection,
        requestId: request.requestId,
        type: "inspect-success",
      });
      return;
    }

    validateMergeSizes(request);
    const result = await mergePdfBytes(
      request.sources.map((source) => ({
        bytes: new Uint8Array(source.data),
        id: source.id,
        name: source.name,
        pageIndices: source.pageIndices,
        password: source.password,
      })),
      {
        createBookmarks: request.createBookmarks,
        onProgress: (progress) =>
          post({ progress, requestId: request.requestId, type: "progress" }),
        title: request.title,
      },
    );

    const data = result.bytes.buffer.slice(
      result.bytes.byteOffset,
      result.bytes.byteOffset + result.bytes.byteLength,
    ) as ArrayBuffer;
    post(
      {
        requestId: request.requestId,
        result: {
          bookmarkTitles: result.bookmarkTitles,
          data,
          notices: result.notices,
          pageCount: result.pageCount,
          removedActions: result.removedActions,
          removedDestinations: result.removedDestinations,
          removedLinkAnnotations: result.removedLinkAnnotations,
        },
        type: "merge-success",
      },
      [data],
    );
  } catch (error) {
    postError(
      request.requestId,
      error,
      request.type === "inspect" ? request.entryId : undefined,
    );
  } finally {
    busy = false;
  }
});
