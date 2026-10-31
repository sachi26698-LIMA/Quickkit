import ToolShell from "@/components/tool-shell";
import ImageCompressor from "@/components/tools/image-compressor";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Image Compressor — local JPEG, PNG & WebP compression",
  "Compress, convert and optionally resize images locally — drag & drop, quality control, before/after previews and downloadable JPEG, PNG or WebP output.",
  "/tools/image-compressor",
);
export default function Page() {
  return (
    <ToolShell
      slug="image-compressor"
      content={{
        steps: [
          "Drop, paste or choose a JPEG, PNG or WebP image below 15 MB and within 24 megapixels.",
          "Select the output format, quality and an optional maximum size. Dimensions are preserved unless you choose a cap; JPEG uses a white background for transparency.",
          "Compress, compare the size and preview, then download the result.",
        ],
        faqs: [
          {
            q: "Why can the output be larger?",
            a: "An already optimized image can grow when re-encoded. PNG is lossless; its quality slider does not apply. Try WebP or JPEG and a lower quality value, and compare before downloading.",
          },
          {
            q: "Will I lose transparency, animation or metadata?",
            a: "JPEG does not support transparency, so transparent areas become white. WebP and PNG preserve alpha when supported by the browser. Animation becomes a single frame. Canvas re-encoding can strip metadata, change color profiles and reduce visual quality.",
          },
          {
            q: "What are the limits?",
            a: "JPEG, PNG and WebP inputs up to 15 MB, 24 million pixels and 8,192 pixels per side. Encoding support depends on your browser. HEIC, GIF and SVG are not accepted. Files remain on your device.",
          },
        ],
      }}
    >
      <ImageCompressor />
    </ToolShell>
  );
}
