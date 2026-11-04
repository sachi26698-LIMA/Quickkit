/** Bound both pixel area and browser canvas edge size before allocating a preview. */
export function boundedPreviewScale(
  width: number,
  height: number,
  targetWidth: number,
  maxPixels: number,
) {
  if (
    ![width, height, targetWidth, maxPixels].every(
      (v) => Number.isFinite(v) && v > 0,
    ) ||
    !Number.isFinite(width * height)
  )
    throw new Error("Unsupported PDF page geometry.");
  const edge = Math.min(16_384, maxPixels);
  return Math.min(
    targetWidth / width,
    Math.sqrt(maxPixels / (width * height)),
    edge / width,
    edge / height,
  );
}
