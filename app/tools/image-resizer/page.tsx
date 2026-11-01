import ToolShell from "@/components/tool-shell";
import ImageResizer from "@/components/tools/image-resizer";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Image Resizer — resize photos locally with social media presets",
  "Resize images by exact pixels, percentage or social media preset, batch convert to JPEG, PNG or WebP and download everything as a ZIP. Free, no upload and no sign-up.",
  "/tools/image-resizer",
);

export default function Page() {
  return (
    <ToolShell
      slug="image-resizer"
      content={{
        steps: [
          "Drop up to 20 JPEG, PNG or WebP images into the workspace, or choose them from your device.",
          "Pick Dimensions, Percentage or a preset. Use the padlock to keep the aspect ratio, or unlock it to stretch, fit inside or fill and crop.",
          "Choose JPEG, PNG or WebP, set quality for JPEG/WebP, then resize the whole batch on your device.",
          "Compare the before and after preview, download images one by one, or take the whole batch as a ZIP archive.",
        ],
        faqs: [
          {
            q: "Are my photos uploaded anywhere?",
            a: "No. Decoding, resizing, cropping, compression and ZIP packaging all run in this browser tab. The files never touch a QUICKKIT server, and there is no storage or analytics around them. Closing or refreshing the tab discards everything.",
          },
          {
            q: "What does the aspect ratio lock do?",
            a: "With the lock on, changing width recalculates height (and the other way round) using each image's own proportions, so nothing is distorted. Unlock it to force exact width and height and stretch the image. In preset mode, Fill & crop takes a centred crop to hit the exact preset, Fit inside keeps the whole frame, and Stretch forces the preset box.",
          },
          {
            q: "Which formats and sizes are supported?",
            a: "JPEG, PNG and WebP inputs up to 15 MB, 24 megapixels and 8,192 pixels per side. Output is JPEG, PNG or WebP up to 8,192 pixels per side and 24 megapixels. Animated images become a single frame. HEIC, GIF and SVG are not supported by this tool.",
          },
          {
            q: "Why does WebP or JPEG quality matter, and why is PNG different?",
            a: "Quality controls how aggressively JPEG and WebP discard detail: lower values make smaller files with more artefacts. PNG is lossless, so the quality slider is disabled. Re-encoding always removes metadata such as EXIF, GPS and colour profiles, so keep the original if you need it.",
          },
          {
            q: "Will resizing make the image sharper?",
            a: "No. Scaling up adds pixels but cannot create real detail, and scaling far down can soften fine texture. The resizer uses progressive halving for clean reductions, but the best result is always a source that is at least as large as the target.",
          },
          {
            q: "What is inside the ZIP download?",
            a: "Only the images that finished successfully, named after the original file with the new pixel size (for example photo-1080x1080.webp). Duplicate names get a numbered suffix. The archive is created in your browser and is never stored.",
          },
        ],
      }}
    >
      <ImageResizer />
    </ToolShell>
  );
}
