"use client";

import { useCallback, useEffect, useRef } from "react";

import type { PdfMergeProgress } from "./merge-engine";
import { PdfMergeError, type PdfInspection } from "./merge-pdf-logic";
import type {
  PdfWorkerMergeSuccess,
  PdfWorkerRequest,
  PdfWorkerResponse,
  PdfWorkerSource,
} from "./merge-worker-types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

interface PendingRequest {
  onProgress?: (progress: PdfMergeProgress) => void;
  reject: (error: Error) => void;
  resolve: (response: PdfWorkerResponse) => void;
}

export interface PdfMergeWorkerApi {
  cancel: () => void;
  inspect: (
    entryId: string,
    data: ArrayBuffer,
    password?: string,
  ) => Promise<PdfInspection>;
  merge: (
    sources: PdfWorkerSource[],
    options: { createBookmarks: boolean; title: string },
    onProgress?: (progress: PdfMergeProgress) => void,
  ) => Promise<PdfWorkerMergeSuccess>;
}

export function usePdfMergeWorker(): PdfMergeWorkerApi {
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
        "PDF processing was cancelled. Your files and queue are unchanged; you can adjust them and merge again.",
      ),
    );
  }, [rejectAll]);

  const ensureWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../../../workers/pdf-merge.worker.ts", import.meta.url),
        {
          name: "QUICKKIT PDF Merger",
          type: "module",
        },
      );
    } catch {
      throw new PdfMergeError(
        "worker_failed",
        "This browser could not start local PDF processing. Try a current version of Chrome, Edge, Firefox or Safari; your files were not uploaded.",
      );
    }

    worker.onmessage = (event: MessageEvent<PdfWorkerResponse>) => {
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
          "Local PDF processing stopped unexpectedly. Close other memory-heavy tabs or use fewer/smaller files, then try again. Nothing was uploaded.",
        ),
      );
    };
    worker.onmessageerror = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      rejectAll(
        new PdfMergeError(
          "worker_failed",
          "The browser could not exchange PDF data with its local worker. Try again with fewer or smaller files; nothing was uploaded.",
        ),
      );
    };

    workerRef.current = worker;
    return worker;
  }, [rejectAll]);

  const send = useCallback(
    (
      requestWithoutId: DistributiveOmit<PdfWorkerRequest, "requestId">,
      transfer: Transferable[],
      onProgress?: (progress: PdfMergeProgress) => void,
    ): Promise<PdfWorkerResponse> => {
      const worker = ensureWorker();
      const requestId = `pdf-${++sequenceRef.current}`;
      return new Promise<PdfWorkerResponse>((resolve, reject) => {
        pendingRef.current.set(requestId, { onProgress, reject, resolve });
        const request = { ...requestWithoutId, requestId } as PdfWorkerRequest;
        try {
          worker.postMessage(request, transfer);
        } catch {
          pendingRef.current.delete(requestId);
          reject(
            new PdfMergeError(
              "worker_failed",
              "The browser could not send this PDF to its local worker. The file may be too large for available memory; try a smaller batch.",
            ),
          );
        }
      });
    },
    [ensureWorker],
  );

  const inspect = useCallback<PdfMergeWorkerApi["inspect"]>(
    async (entryId, data, password) => {
      const response = await send(
        { data, entryId, password, type: "inspect" },
        [data],
      );
      if (response.type !== "inspect-success") {
        throw new PdfMergeError(
          "worker_failed",
          "PDF inspection returned an unexpected result. Please try again.",
        );
      }
      return response.inspection;
    },
    [send],
  );

  const merge = useCallback<PdfMergeWorkerApi["merge"]>(
    async (sources, options, onProgress) => {
      const transfer = sources.map((source) => source.data);
      const response = await send(
        {
          createBookmarks: options.createBookmarks,
          sources,
          title: options.title,
          type: "merge",
        },
        transfer,
        onProgress,
      );
      if (response.type !== "merge-success") {
        throw new PdfMergeError(
          "worker_failed",
          "The merge returned an unexpected result. Please try again.",
        );
      }
      return response.result;
    },
    [send],
  );

  useEffect(() => cancel, [cancel]);

  return { cancel, inspect, merge };
}
