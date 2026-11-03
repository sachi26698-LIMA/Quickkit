/**
 * Worker that runs the dependency-free encoders (BMP, TIFF, GIF) off the main
 * thread. Pixels are transferred in and bytes transferred out, so a 20 MP
 * conversion never blocks typing or scrolling.
 */
import {
  encodeBmp,
  encodeGif,
  encodeTiff,
  type RgbaImage,
} from "@/lib/tools/image-codec";

export type ImageEncodeRequest = {
  id: string;
  format: "bmp" | "gif" | "tiff";
  width: number;
  height: number;
  buffer: ArrayBuffer;
  background: string;
  transparent: boolean;
  compression: "lzw" | "none";
  dpi?: number;
};

export type ImageEncodeResponse =
  | { id: string; bytes: Uint8Array; type: "done" }
  | { id: string; message: string; type: "error" };

interface WorkerScope {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ImageEncodeRequest>) => void,
  ): void;
  postMessage(message: ImageEncodeResponse, transfer?: Transferable[]): void;
}

const scope = globalThis as unknown as WorkerScope;

scope.addEventListener("message", (event) => {
  const request = event.data;
  try {
    const image: RgbaImage = {
      width: request.width,
      height: request.height,
      data: new Uint8ClampedArray(request.buffer),
    };
    let bytes: Uint8Array;
    if (request.format === "bmp") bytes = encodeBmp(image, request.background);
    else if (request.format === "gif")
      bytes = encodeGif(image, {
        transparent: request.transparent,
      });
    else
      bytes = encodeTiff(image, {
        compression: request.compression,
        dpi: request.dpi,
      });
    scope.postMessage({ id: request.id, bytes, type: "done" }, [bytes.buffer]);
  } catch (error) {
    scope.postMessage({
      id: request.id,
      message:
        error instanceof Error ? error.message : "The encoder could not run.",
      type: "error",
    });
  }
});
