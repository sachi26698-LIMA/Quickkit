"use client";

import { useCallback, useEffect, useRef } from "react";

import {
  PdfSecurityError,
  type PdfLockSettings,
  type PdfSecurityInspection,
  type PdfSecurityProgress,
} from "./security-logic";
import type {
  PdfSecurityWorkerRequest,
  PdfSecurityWorkerResponse,
  PdfSecurityWorkerSuccess,
} from "./security-worker-types";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;

interface PendingRequest {
  onProgress?: (progress: PdfSecurityProgress) => void;
  reject: (error: Error) => void;
  resolve: (response: PdfSecurityWorkerResponse) => void;
}

export interface PdfSecurityWorkerApi {
  cancel: () => void;
  inspect: (
    entryId: string,
    data: ArrayBuffer,
    password?: string,
  ) => Promise<PdfSecurityInspection>;
  lock: (
    entryId: string,
    data: ArrayBuffer,
    settings: PdfLockSettings,
    currentPassword?: string,
    onProgress?: (progress: PdfSecurityProgress) => void,
  ) => Promise<PdfSecurityWorkerSuccess>;
  unlock: (
    entryId: string,
    data: ArrayBuffer,
    password: string | undefined,
    authorized: boolean,
    onProgress?: (progress: PdfSecurityProgress) => void,
  ) => Promise<PdfSecurityWorkerSuccess>;
  verify: (
    entryId: string,
    data: ArrayBuffer,
    password: string,
  ) => Promise<{ inspection: PdfSecurityInspection; valid: boolean }>;
}

export function usePdfSecurityWorker(): PdfSecurityWorkerApi {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(new Map<string, PendingRequest>());
  const sequenceRef = useRef(0);

  const rejectAll = useCallback((error: PdfSecurityError) => {
    for (const pending of pendingRef.current.values()) pending.reject(error);
    pendingRef.current.clear();
  }, []);

  const cancel = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    rejectAll(
      new PdfSecurityError(
        "cancelled",
        "PDF processing was cancelled. Completed downloads are unchanged; password fields were cleared for your privacy.",
      ),
    );
  }, [rejectAll]);

  const ensureWorker = useCallback((): Worker => {
    if (workerRef.current) return workerRef.current;
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../../../workers/pdf-security.worker.ts", import.meta.url),
        { name: "QUICKKIT PDF Lock & Unlock", type: "module" },
      );
    } catch {
      throw new PdfSecurityError(
        "worker_failed",
        "This browser could not start local PDF processing. Try a current version of Chrome, Edge, Firefox or Safari. Your PDF was not uploaded.",
      );
    }

    worker.onmessage = (event: MessageEvent<PdfSecurityWorkerResponse>) => {
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
          new PdfSecurityError(
            response.code,
            response.message,
            response.entryId,
          ),
        );
      } else {
        pending.resolve(response);
      }
    };
    worker.onerror = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      rejectAll(
        new PdfSecurityError(
          "worker_failed",
          "Local PDF security processing stopped unexpectedly. Close other memory-heavy tabs or try fewer/smaller PDFs. Nothing was uploaded.",
        ),
      );
    };
    worker.onmessageerror = () => {
      worker.terminate();
      if (workerRef.current === worker) workerRef.current = null;
      rejectAll(
        new PdfSecurityError(
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
      requestWithoutId: DistributiveOmit<PdfSecurityWorkerRequest, "requestId">,
      transfer: Transferable[],
      onProgress?: (progress: PdfSecurityProgress) => void,
    ): Promise<PdfSecurityWorkerResponse> => {
      const worker = ensureWorker();
      const requestId = `pdf-security-${++sequenceRef.current}`;
      return new Promise<PdfSecurityWorkerResponse>((resolve, reject) => {
        pendingRef.current.set(requestId, { onProgress, reject, resolve });
        const request = {
          ...requestWithoutId,
          requestId,
        } as PdfSecurityWorkerRequest;
        try {
          worker.postMessage(request, transfer);
        } catch {
          pendingRef.current.delete(requestId);
          reject(
            new PdfSecurityError(
              "worker_failed",
              "The browser could not send this PDF to its local worker. It may be too large for available memory; process it alone or use a smaller batch.",
            ),
          );
        }
      });
    },
    [ensureWorker],
  );

  const inspect = useCallback<PdfSecurityWorkerApi["inspect"]>(
    async (entryId, data, password) => {
      const response = await send(
        { data, entryId, password, type: "inspect" },
        [data],
      );
      if (response.type !== "inspect-success") {
        throw new PdfSecurityError(
          "worker_failed",
          "PDF inspection returned an unexpected result. Please try again.",
        );
      }
      return response.inspection;
    },
    [send],
  );

  const verify = useCallback<PdfSecurityWorkerApi["verify"]>(
    async (entryId, data, password) => {
      const response = await send({ data, entryId, password, type: "verify" }, [
        data,
      ]);
      if (response.type !== "verify-success") {
        throw new PdfSecurityError(
          "worker_failed",
          "Password verification returned an unexpected result. Please try again.",
        );
      }
      return { inspection: response.inspection, valid: response.valid };
    },
    [send],
  );

  const lock = useCallback<PdfSecurityWorkerApi["lock"]>(
    async (entryId, data, settings, currentPassword, onProgress) => {
      const response = await send(
        { currentPassword, data, entryId, settings, type: "lock" },
        [data],
        onProgress,
      );
      if (response.type !== "lock-success") {
        throw new PdfSecurityError(
          "worker_failed",
          "PDF locking returned an unexpected result. Please try again.",
        );
      }
      return response.result;
    },
    [send],
  );

  const unlock = useCallback<PdfSecurityWorkerApi["unlock"]>(
    async (entryId, data, password, authorized, onProgress) => {
      const response = await send(
        { authorized, data, entryId, password, type: "unlock" },
        [data],
        onProgress,
      );
      if (response.type !== "unlock-success") {
        throw new PdfSecurityError(
          "worker_failed",
          "PDF unlocking returned an unexpected result. Please try again.",
        );
      }
      return response.result;
    },
    [send],
  );

  useEffect(() => cancel, [cancel]);

  return { cancel, inspect, lock, unlock, verify };
}
