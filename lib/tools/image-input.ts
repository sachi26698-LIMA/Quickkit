export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 24_000_000;
export type ImageFormat = "image/webp" | "image/jpeg" | "image/png";
export function validateImage(file: { type: string; size: number }) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "Choose a JPEG, PNG or WebP image. Other formats are not supported.",
    );
  if (!file.size) throw new Error("This file is empty. Choose another image.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Choose an image smaller than 15 MB.");
}
