"use client";

import { useCallback, useEffect, useRef } from "react";

import type { PdfMergeProgress } from "./merge-engine";
import { PdfMergeError, type PdfInspection } from "./merge-pdf-logic";
import type {
  PdfSplitWorkerRequest,
  PdfSplitWorkerResponse,
  PdfSplitWorkerSegment,
  PdfSplitWorkerSuccess,
} from "./split-worker-types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

interface PendingRequest {
  onProgress?: (progress: PdfMergeProgress) => void;
  reject: (error: Error) => void;
  resolve: (response: PdfSplitWorkerResponse) => void;
}

export interface PdfSplitWorkerApi {
  cancel: () => void;
  inspect: (data: ArrayBuffer, password?: string) => Promise<PdfInspection>;
  split: (
    data: ArrayBuffer,
    sourceName: string,
    segments: PdfSplitWorkerSegment[],
    zipFilename: string,
    password?: string,
    onProgress?: (progress: PdfMergeProgress) => void,
  ) => Promise<PdfSplitWorkerSuccess>;
}

export function usePdfSplitWorker(): PdfSplitWorkerApi {
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
        "PDF splitting was cancelled. Your source PDF and split plan are unchanged; adjust them and split again.",
      ),
    );
  }, [rejectAll]);

  const ensureWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../../../workers/pdf-split.worker.ts", import.meta.url),
        {
          name: "QUICKKIT PDF Splitter",
          type: "module",
        },
      );
    } catch {
      throw new PdfMergeError(
        "worker_failed",
        "This browser could not start local PDF processing. Try a current version of Chrome, Edge, Firefox or Safari; your PDF was not uploaded.",
      );
    }

    worker.onmessage = (event: MessageEvent<PdfSplitWorkerResponse>) => {
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
          "Local PDF splitting stopped unexpectedly. Close other memory-heavy tabs or split fewer pages, then try again. Nothing was uploaded.",
        ),
      );
    };
    worker.onmessageerror = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      rejectAll(
        new PdfMergeError(
          "worker_failed",
          "The browser could not exchange PDF data with its local worker. Try again with a smaller PDF or fewer outputs; nothing was uploaded.",
        ),
      );
    };

    workerRef.current = worker;
    return worker;
  }, [rejectAll]);

  const send = useCallback(
    (
      requestWithoutId: DistributiveOmit<PdfSplitWorkerRequest, "requestId">,
      transfer: Transferable[],
      onProgress?: (progress: PdfMergeProgress) => void,
    ): Promise<PdfSplitWorkerResponse> => {
      const worker = ensureWorker();
      const requestId = `pdf-split-${++sequenceRef.current}`;
      return new Promise<PdfSplitWorkerResponse>((resolve, reject) => {
        pendingRef.current.set(requestId, { onProgress, reject, resolve });
        const request = {
          ...requestWithoutId,
          requestId,
        } as PdfSplitWorkerRequest;
        try {
          worker.postMessage(request, transfer);
        } catch {
          pendingRef.current.delete(requestId);
          reject(
            new PdfMergeError(
              "worker_failed",
              "The browser could not send this PDF to its local worker. It may be too large for available memory; try a smaller PDF or fewer outputs.",
            ),
          );
        }
      });
    },
    [ensureWorker],
  );

  const inspect = useCallback<PdfSplitWorkerApi["inspect"]>(
    async (data, password) => {
      const response = await send({ data, password, type: "inspect" }, [data]);
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

  const split = useCallback<PdfSplitWorkerApi["split"]>(
    async (data, sourceName, segments, zipFilename, password, onProgress) => {
      const response = await send(
        {
          data,
          password,
          segments,
          sourceName,
          type: "split",
          zipFilename,
        },
        [data],
        onProgress,
      );
      if (response.type !== "split-success") {
        throw new PdfMergeError(
          "worker_failed",
          "The split returned an unexpected result. Please try again.",
        );
      }
      return response.result;
    },
    [send],
  );

  useEffect(() => cancel, [cancel]);

  return { cancel, inspect, split };
}
