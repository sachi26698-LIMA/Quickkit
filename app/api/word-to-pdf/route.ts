import {
  acquire,
  convert,
  engineAvailable,
  release,
} from "@/lib/tools/word-to-pdf/engine";
import { MAX_FILE, validateSettings } from "@/lib/tools/word-to-pdf/settings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    {
      available: await engineAvailable(),
      method: "Self-hosted LibreOffice",
      maxPages: 100,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  const fail = (message: string, status: number) =>
    Response.json(
      { error: message },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  if (
    request.headers.get("x-quickkit-consent") !== "server-conversion" ||
    (request.headers.get("sec-fetch-site") &&
      request.headers.get("sec-fetch-site") !== "same-origin")
  )
    return fail(
      "Explicit same-origin server-processing consent is required.",
      403,
    );
  if (!(await engineAvailable()))
    return fail(
      "Self-hosted LibreOffice conversion is not enabled on this installation. No document was processed.",
      503,
    );
  if (request.headers.get("content-type") !== "application/octet-stream")
    return fail("Unsupported upload format.", 415);
  if (Number(request.headers.get("content-length")) > MAX_FILE)
    return fail("DOCX exceeds 20 MiB.", 413);
  let settings;
  try {
    const value = request.headers.get("x-quickkit-settings") || "";
    if (value.length > 8192) throw new Error("Settings are too large.");
    settings = validateSettings(
      JSON.parse(value.startsWith("%") ? decodeURIComponent(value) : value),
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Invalid settings.", 400);
  }
  if (!acquire())
    return fail("Conversion server is busy. Please retry shortly.", 429);
  const controller = new AbortController();
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort, { once: true });
  if (request.signal.aborted) abort();
  // A total deadline also bounds a client that trickles an upload indefinitely.
  const deadline = setTimeout(abort, 150_000);
  const cleanup = () => {
    clearTimeout(deadline);
    request.signal.removeEventListener("abort", abort);
    release();
  };
  let bytes: Uint8Array;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error("Missing DOCX upload.");
    const cancel = () => {
      void reader.cancel().catch(() => undefined);
    };
    controller.signal.addEventListener("abort", cancel, { once: true });
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        controller.signal.throwIfAborted();
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_FILE) {
          await reader.cancel();
          throw new Error("DOCX exceeds 20 MiB.");
        }
        chunks.push(value);
      }
      bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
    } finally {
      controller.signal.removeEventListener("abort", cancel);
      reader.releaseLock();
    }
  } catch (error) {
    cleanup();
    return fail(error instanceof Error ? error.message : "Upload failed.", 400);
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(output) {
      const send = (value: object) => {
        if (!controller.signal.aborted)
          output.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
      };
      void convert(bytes, settings, controller.signal, (stage) =>
        send({ stage }),
      )
        .then((result) => {
          send({
            result: Buffer.from(
              request.headers.get("x-quickkit-base") === "true"
                ? result.source
                : result.bytes,
            ).toString("base64"),
            pages:
              request.headers.get("x-quickkit-base") === "true"
                ? result.sourcePages
                : result.pages,
            base: request.headers.get("x-quickkit-base") === "true",
          });
        })
        .catch((error) => {
          send({
            error:
              error instanceof Error ? error.message : "Conversion failed.",
          });
        })
        .finally(() => {
          cleanup();
          try {
            output.close();
          } catch {
            /* client disconnected */
          }
        });
    },
    cancel() {
      abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
