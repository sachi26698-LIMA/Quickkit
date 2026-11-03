import {
  compressPdfBytes,
  inspectPdfForCompression,
} from "@/lib/tools/pdf/compress-engine";
import {
  PDF_COMPRESS_LIMITS,
  normalizeCompressionSettings,
} from "@/lib/tools/pdf/compress-pdf-logic";
import type {
  PdfCompressWorkerRequest,
  PdfCompressWorkerResponse,
} from "@/lib/tools/pdf/compress-worker-types";
import { PdfMergeError, formatMiB } from "@/lib/tools/pdf/merge-pdf-logic";

interface PdfWorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<PdfCompressWorkerRequest>) => void,
  ): void;
  postMessage(
    message: PdfCompressWorkerResponse,
    transfer?: Transferable[],
  ): void;
}

const workerScope = globalThis as unknown as PdfWorkerScope;
let busy = false;

function post(
  message: PdfCompressWorkerResponse,
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
      "Local PDF compression stopped unexpectedly. Close other memory-heavy tabs, try Low compression, or compress this PDF by itself. Nothing was uploaded.",
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
  if (data.byteLength > PDF_COMPRESS_LIMITS.maxFileBytes) {
    throw new PdfMergeError(
      "file_too_large",
      `“${sourceName}” is ${formatMiB(data.byteLength)}, above the ${formatMiB(PDF_COMPRESS_LIMITS.maxFileBytes)} local Compressor limit. Split it into smaller PDFs, then compress each part.`,
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
    !["inspect", "compress"].includes(request.type)
  ) {
    return;
  }

  if (busy) {
    post({
      code: "worker_failed",
      message:
        "The local PDF Compressor is already processing another request. Wait for it to finish and try again.",
      requestId: request.requestId,
      type: "error",
    });
    return;
  }

  busy = true;
  try {
    if (request.type === "inspect") {
      validateSourceSize(request.data, "This PDF");
      const result = await inspectPdfForCompression(
        new Uint8Array(request.data),
        request.password,
        "compress-source",
      );
      post({
        requestId: request.requestId,
        result,
        type: "inspect-success",
      });
      return;
    }

    validateSourceSize(request.data, request.sourceName);
    const settings = normalizeCompressionSettings(request.settings);
    const result = await compressPdfBytes(
      new Uint8Array(request.data),
      settings,
      {
        entryId: "compress-source",
        onProgress: (progress) =>
          post({
            progress: { ...progress, fileName: request.sourceName },
            requestId: request.requestId,
            type: "progress",
          }),
        password: request.password,
      },
    );
    const data = bytesToArrayBuffer(result.bytes);
    const { bytes: discardedBytes, ...rest } = result;
    void discardedBytes;
    post(
      {
        requestId: request.requestId,
        result: { ...rest, data },
        type: "compress-success",
      },
      [data],
    );
  } catch (error) {
    postError(request.requestId, error);
  } finally {
    busy = false;
  }
});
