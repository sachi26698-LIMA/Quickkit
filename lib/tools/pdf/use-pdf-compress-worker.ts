"use client";

import { useCallback, useEffect, useRef } from "react";

import type { PdfCompressionInspectionResult } from "./compress-engine";
import type {
  PdfCompressionProgress,
  PdfCompressionSettings,
} from "./compress-pdf-logic";
import type {
  PdfCompressWorkerRequest,
  PdfCompressWorkerResponse,
  PdfCompressWorkerSuccess,
} from "./compress-worker-types";
import { PdfMergeError } from "./merge-pdf-logic";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

interface PendingRequest {
  onProgress?: (progress: PdfCompressionProgress) => void;
  reject: (error: Error) => void;
  resolve: (response: PdfCompressWorkerResponse) => void;
}

export interface PdfCompressWorkerApi {
  cancel: () => void;
  compress: (
    data: ArrayBuffer,
    sourceName: string,
    settings: PdfCompressionSettings,
    password?: string,
    onProgress?: (progress: PdfCompressionProgress) => void,
  ) => Promise<PdfCompressWorkerSuccess>;
  inspect: (
    data: ArrayBuffer,
    password?: string,
  ) => Promise<PdfCompressionInspectionResult>;
}

export function usePdfCompressWorker(): PdfCompressWorkerApi {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, PendingRequest>());
  const sequenceRef = useRef(0);

  const rejectAll = useCallback((error: PdfMergeError) => {
    for (const pending of pendingRef.current.values()) pending.reject(error);
    pendingRef.current.clear();
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    rejectAll(
      new PdfMergeError(
        "cancelled",
        "PDF compression was cancelled. Your queue and completed downloads are unchanged; adjust the settings and compress again.",
      ),
    );
  }, [rejectAll]);

  const ensureWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../../../workers/pdf-compress.worker.ts", import.meta.url),
        {
          name: "QUICKKIT PDF Compressor",
          type: "module",
        },
      );
    } catch {
      throw new PdfMergeError(
        "worker_failed",
        "This browser could not start local PDF processing. Try a current version of Chrome, Edge, Firefox or Safari; your PDF was not uploaded.",
      );
    }

    worker.onmessage = (event: MessageEvent<PdfCompressWorkerResponse>) => {
      const response = event.data;
      const pending = pendingRef.current.get(response.requestId);
      if (!pending) return;
      if (response.type === "progress") {
        pending.onProgress?.(response.progress);
        return;
      }
      pendingRef.current.delete(response.requestId);
      if (response.type === "error") {
        pending.reject(
          new PdfMergeError(response.code, response.message, response.entryId),
        );
      } else {
        pending.resolve(response);
      }
    };
    worker.onerror = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      rejectAll(
        new PdfMergeError(
          "worker_failed",
          "Local PDF compression stopped unexpectedly. Close other memory-heavy tabs or compress fewer/smaller PDFs, then try again. Nothing was uploaded.",
        ),
      );
    };
    worker.onmessageerror = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      rejectAll(
        new PdfMergeError(
          "worker_failed",
          "The browser could not exchange PDF data with its local worker. Try again with fewer or smaller PDFs; nothing was uploaded.",
        ),
      );
    };

    workerRef.current = worker;
    return worker;
  }, [rejectAll]);

  const send = useCallback(
    (
      requestWithoutId: DistributiveOmit<PdfCompressWorkerRequest, "requestId">,
      transfer: Transferable[],
      onProgress?: (progress: PdfCompressionProgress) => void,
    ): Promise<PdfCompressWorkerResponse> => {
      const worker = ensureWorker();
      const requestId = `pdf-compress-${++sequenceRef.current}`;
      return new Promise<PdfCompressWorkerResponse>((resolve, reject) => {
        pendingRef.current.set(requestId, { onProgress, reject, resolve });
        const request = {
          ...requestWithoutId,
          requestId,
        } as PdfCompressWorkerRequest;
        try {
          worker.postMessage(request, transfer);
        } catch {
          pendingRef.current.delete(requestId);
          reject(
            new PdfMergeError(
              "worker_failed",
              "The browser could not send this PDF to its local worker. It may be too large for available memory; compress it alone or use a smaller batch.",
            ),
          );
        }
      });
    },
    [ensureWorker],
  );

  const inspect = useCallback<PdfCompressWorkerApi["inspect"]>(
    async (data, password) => {
      const response = await send({ data, password, type: "inspect" }, [data]);
      if (response.type !== "inspect-success") {
        throw new PdfMergeError(
          "worker_failed",
          "PDF inspection returned an unexpected result. Please try again.",
        );
      }
      return response.result;
    },
    [send],
  );

  const compress = useCallback<PdfCompressWorkerApi["compress"]>(
    async (data, sourceName, settings, password, onProgress) => {
      const response = await send(
        {
          data,
          password,
          settings,
          sourceName,
          type: "compress",
        },
        [data],
        onProgress,
      );
      if (response.type !== "compress-success") {
        throw new PdfMergeError(
          "worker_failed",
          "Compression returned an unexpected result. Please try again.",
        );
      }
      return response.result;
    },
    [send],
  );

  useEffect(() => cancel, [cancel]);

  return { cancel, compress, inspect };
}
