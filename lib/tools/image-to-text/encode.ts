/**
 * PNG encoding for the OCR engine.
 *
 * tesseract.js v7 does not understand `ImageData`: its browser `loadImage`
 * passes anything it does not recognise to `new Uint8Array(...)`, which turns
 * an ImageData object into an empty file and makes Leptonica fail with
 * "Image file /input cannot be read!". The engine therefore has to be given
 * real encoded bytes, which is what this module produces.
 *
 * Encoding happens on the main thread through an `OffscreenCanvas` when the
 * browser has one, falling back to a regular canvas. Both keep the pixels
 * exactly as the preprocessing pipeline produced them.
 */

/** Encode raw RGBA pixels as PNG bytes. */
export async function imageDataToPng(image: ImageData): Promise<Uint8Array> {
  const blob = await rasterToBlob(image);
  return new Uint8Array(await blob.arrayBuffer());
}

function rasterToBlob(image: ImageData): Promise<Blob> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    if (context) {
      context.putImageData(image, 0, 0);
      return canvas.convertToBlob({ type: "image/png" });
    }
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return Promise.reject(
        new Error("This browser cannot prepare an image for OCR."),
      );
    }
    context.putImageData(image, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("This browser cannot prepare an image for OCR."));
      }, "image/png");
    });
  }

  return Promise.reject(
    new Error("This browser cannot prepare an image for OCR."),
  );
}
