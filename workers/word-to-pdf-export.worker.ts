/// <reference lib="webworker" />
import { Zip, ZipPassThrough } from "fflate";
import type {
  ZipRequest,
  ZipResponse,
} from "../lib/tools/word-to-pdf/export-zip";
const scope = self as unknown as DedicatedWorkerGlobalScope;
const send = (value: ZipResponse, transfer: Transferable[] = []) =>
  scope.postMessage(value, transfer);
let zip: Zip | undefined, file: ZipPassThrough | undefined;
scope.onmessage = (event: MessageEvent<ZipRequest>) => {
  try {
    const request = event.data;
    if (request.type === "init")
      zip = new Zip((error, data, final) => {
        if (error) {
          send({ type: "error", message: "Could not build ZIP archive." });
          return;
        }
        if (data.length) {
          const bytes = data.slice().buffer;
          send({ type: "data", bytes }, [bytes]);
        }
        if (final) send({ type: "done" });
      });
    else if (request.type === "file") {
      if (!zip) throw new Error("ZIP not initialized.");
      file = new ZipPassThrough(request.name);
      zip.add(file);
    } else if (request.type === "chunk") {
      if (!file) throw new Error("ZIP entry missing.");
      file.push(new Uint8Array(request.bytes), request.last);
    } else {
      if (!zip) throw new Error("ZIP not initialized.");
      zip.end();
      return;
    }
    send({ type: "ready" });
  } catch {
    send({
      type: "error",
      message: "ZIP export failed. Retry or download individual PDFs.",
    });
  }
};
