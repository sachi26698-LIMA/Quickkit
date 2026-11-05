import {
  inspectPdfSecurity,
  lockPdfBytes,
  unlockPdfBytes,
  verifyPdfPassword,
} from "@/lib/tools/pdf/security-engine";
import {
  PdfSecurityError,
  type PdfSecurityProgress,
} from "@/lib/tools/pdf/security-logic";
import { loadBrowserQpdfRunner } from "@/lib/tools/pdf/qpdf-runtime";
import type {
  PdfSecurityWorkerRequest,
  PdfSecurityWorkerResponse,
} from "@/lib/tools/pdf/security-worker-types";

interface PdfWorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<PdfSecurityWorkerRequest>) => void,
  ): void;
  postMessage(
    message: PdfSecurityWorkerResponse,
    transfer?: Transferable[],
  ): void;
}

const workerScope = globalThis as unknown as PdfWorkerScope;
let busy = false;
let runnerPromise: ReturnType<typeof loadBrowserQpdfRunner> | null = null;

function post(
  message: PdfSecurityWorkerResponse,
  transfer?: Transferable[],
): void {
  workerScope.postMessage(message, transfer);
}

function postError(requestId: string, entryId: string, error: unknown): void {
  if (error instanceof PdfSecurityError) {
    post({
      code: error.code,
      entryId: error.entryId ?? entryId,
      message: error.message,
      requestId,
      type: "error",
    });
    return;
  }
  // Never forward raw library/WASM diagnostics: they could contain sensitive
  // document details. The UI receives a stable, local-only explanation.
  post({
    code: "worker_failed",
    entryId,
    message:
      "Local PDF security processing stopped unexpectedly. Close other memory-heavy tabs, try fewer or smaller PDFs, and retry. Nothing was uploaded and the original file is unchanged.",
    requestId,
    type: "error",
  });
}

function bytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function reportProgress(
  requestId: string,
  entryId: string,
  progress: PdfSecurityProgress,
): void {
  post({ entryId, progress, requestId, type: "progress" });
}

workerScope.addEventListener("message", async (event) => {
  const request = event.data;
  if (
    !request ||
    typeof request.requestId !== "string" ||
    typeof request.entryId !== "string" ||
    !["inspect", "verify", "lock", "unlock"].includes(request.type)
  ) {
    return;
  }
  if (busy) {
    post({
      code: "worker_failed",
      entryId: request.entryId,
      message:
        "The local PDF security worker is already processing another file. Wait for it to finish and try again.",
      requestId: request.requestId,
      type: "error",
    });
    return;
  }
  busy = true;
  try {
    runnerPromise ??= loadBrowserQpdfRunner();
    const runner = await runnerPromise;
    const bytes = new Uint8Array(request.data);

    if (request.type === "inspect") {
      const inspection = await inspectPdfSecurity(bytes, runner, {
        entryId: request.entryId,
        password: request.password,
      });
      post({
        entryId: request.entryId,
        inspection,
        requestId: request.requestId,
        type: "inspect-success",
      });
      return;
    }

    if (request.type === "verify") {
      const { inspection, valid } = await verifyPdfPassword(
        bytes,
        runner,
        request.password,
        request.entryId,
      );
      post({
        entryId: request.entryId,
        inspection,
        requestId: request.requestId,
        type: "verify-success",
        valid,
      });
      return;
    }

    if (request.type === "lock") {
      const result = await lockPdfBytes(bytes, runner, request.settings, {
        currentPassword: request.currentPassword,
        entryId: request.entryId,
        onProgress: (progress) =>
          reportProgress(request.requestId, request.entryId, progress),
      });
      const data = bytesToArrayBuffer(result.bytes);
      post(
        {
          entryId: request.entryId,
          requestId: request.requestId,
          result: {
            data,
            inspection: result.inspection,
            notices: result.notices,
            verification: result.verification,
          },
          type: "lock-success",
        },
        [data],
      );
      return;
    }

    const result = await unlockPdfBytes(bytes, runner, {
      authorized: request.authorized,
      entryId: request.entryId,
      onProgress: (progress) =>
        reportProgress(request.requestId, request.entryId, progress),
      password: request.password,
    });
    const data = bytesToArrayBuffer(result.bytes);
    post(
      {
        entryId: request.entryId,
        requestId: request.requestId,
        result: {
          data,
          inspection: result.inspection,
          notices: result.notices,
          verification: result.verification,
        },
        type: "unlock-success",
      },
      [data],
    );
  } catch (error) {
    postError(request.requestId, request.entryId, error);
  } finally {
    busy = false;
  }
});
