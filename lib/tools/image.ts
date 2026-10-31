import { validateImage, MAX_IMAGE_PIXELS } from "./image-input";
import { preflightImage } from "./image-header";
import type { ImageFormat } from "./image-input";
export {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_PIXELS,
  validateImage,
} from "./image-input";
export type { ImageFormat } from "./image-input";
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
export async function compressImage(
  file: File,
  format: ImageFormat,
  quality: number,
) {
  validateImage(file);
  await preflightImage(file);
  if (!Number.isFinite(quality) || quality < 0.1 || quality > 1)
    throw new Error("Quality must be between 10% and 100%.");
  if (!["image/webp", "image/jpeg", "image/png"].includes(format))
    throw new Error("Unsupported output format.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch {
      throw new Error(
        "This image could not be decoded. It may be damaged or unsupported.",
      );
    }
    const width = image.naturalWidth,
      height = image.naturalHeight;
    if (
      !width ||
      !height ||
      width * height > MAX_IMAGE_PIXELS ||
      width > 8192 ||
      height > 8192
    )
      throw new Error(
        "Use an image up to 24 megapixels, with neither side above 8,192 pixels.",
      );
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx)
      throw new Error("Canvas processing is unavailable in this browser.");
    if (format === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(image, 0, 0);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result
              ? resolve(result)
              : reject(new Error("The browser could not encode this image.")),
          format,
          quality,
        ),
      );
      if (blob.type !== format)
        throw new Error(
          "Your browser does not support this output format. Choose PNG or JPEG.",
        );
      return { blob, width, height };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}
