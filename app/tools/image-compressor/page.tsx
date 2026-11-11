import ToolShell from "@/components/tool-shell";
import ImageCompressor from "@/components/tools/image-compressor";
import { pageMetadata } from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";

const steps = [
  "Drop up to 20 JPEG, PNG, WebP or AVIF images into the workspace, or choose them from your device.",
  "Pick Quality for a simple level, or Target size to name an exact KB or MB limit and let the app search the best quality.",
  "Choose JPEG, PNG, WebP or AVIF, keep or flatten transparency, and optionally rename the outputs or add a suffix.",
  "Compress the whole batch on your device, then compare before/after sizes, dimensions and the quality that was used.",
  "Download one image at a time or take every finished file in a single ZIP archive.",
];

const faqs = [
  {
    q: "Are my images uploaded to a server?",
    a: "No. Decoding, compression, format conversion and ZIP packaging all run inside this browser tab. Files never touch a QUICKKIT server, there is no storage or analytics around them, and closing the tab discards everything.",
  },
  {
    q: "How does target file size work?",
    a: "The compressor encodes your image at several quality levels and keeps the highest quality that still fits your KB or MB limit. If even the lowest quality is too large, it can downscale in small steps when you allow it, or it returns the smallest possible file and clearly flags that the target was not reachable.",
  },
  {
    q: "Will transparency survive compression?",
    a: "Yes for PNG, WebP and AVIF. JPEG cannot store an alpha channel, so transparent areas are filled with the background colour you choose. The preview uses a checkerboard so you can see exactly what is kept.",
  },
  {
    q: "Why is my compressed file sometimes larger?",
    a: "An already-optimised image can grow when it is re-encoded. PNG is always lossless, so its size depends on the pixels rather than a quality slider. The comparison shows the real byte count and marks output that is larger than the source.",
  },
  {
    q: "Which formats and limits are supported?",
    a: "Inputs and outputs are JPEG, PNG and WebP, plus AVIF wherever your browser can encode it — unsupported options are disabled and labelled. Limits are 15 MB, 24 megapixels and 8,192 pixels per side. HEIC, GIF and SVG are rejected, and animation collapses to the first frame.",
  },
  {
    q: "Does compression keep resolution?",
    a: "By default yes: every pixel dimension stays exactly as it was. In target-size mode you can allow downscaling, and the tool then tells you the exact output dimensions and marks the row as scaled.",
  },
  {
    q: "What happens to EXIF, GPS and colour profiles?",
    a: "Re-encoding from pixels strips EXIF, GPS, XMP and ICC profiles, which is the privacy-safe default. The metadata panel shows what was found before you compress, and the original file on your device is never modified.",
  },
];

export const metadata = pageMetadata(
  "Image Compressor — Shrink JPG, PNG, WebP & AVIF",
  "Compress up to 20 JPEG, PNG, WebP, or AVIF images locally by quality slider or exact KB/MB target size, keep or flatten alpha, and download a ZIP.",
  "/tools/image-compressor",
);

export default function Page() {
  return (
    <ToolShell
      slug="image-compressor"
      headingDescription="Compress up to 20 JPEG, PNG, WebP, or AVIF images locally by quality slider or exact KB/MB target size, keep or flatten alpha, and download a ZIP."
      stepsHeading="How to shrink images by quality or exact size"
      faqsHeading="Image compressor questions, answered"
      relatedHeading="More ways to work with images"
      referenceSection={
        <ToolReferenceSection
          slug="image-compressor"
          entry={TOOL_SEO_CONTENT["image-compressor"]}
        />
      }
      content={{ steps, faqs }}
    >
      <ImageCompressor />
    </ToolShell>
  );
}
