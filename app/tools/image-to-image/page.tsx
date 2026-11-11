import ToolShell from "@/components/tool-shell";
import ImageToImage from "@/components/tools/image-to-image";
import { pageMetadata } from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";

const steps = [
  "Add images from your device or drop them into the upload area. The queue shows the real format, dimensions and file size of every file as soon as it is read. Up to 20 files, 15 MB each, 150 MB per batch.",
  "Pick an output format. JPG, PNG, WEBP and AVIF are encoded by your browser's canvas — QUICKKIT probes the real encoder first and disables a format it cannot produce rather than writing a broken file. GIF, BMP and TIFF are written by built-in encoders.",
  "Choose how to trade size against quality. Fixed quality encodes once at the quality you set. Target size runs the compression engine, which tries lossless first, then searches quality, then downscales — and tells you plainly when a target cannot be met without visible loss.",
  "Optionally crop, rotate, flip or straighten, resize by percentage, exact pixels or longest side, and set a DPI for print. The aspect lock keeps proportions unless you turn it off.",
  "Decide what happens to transparency and metadata. Transparent pixels are kept for formats that support them, or flattened onto a background colour you pick. EXIF orientation is applied to the pixels so photos are not sideways; other metadata is dropped because every output is re-encoded.",
  "Convert. Real per-file progress, success and failure counts appear as each file finishes, and a failed file keeps its error message with a retry action — nothing is skipped silently. Download files individually or take every finished file in one ZIP archive.",
];

const faqs = [
  {
    q: "Are my images uploaded anywhere?",
    a: "No. Decoding, cropping, resizing, re-encoding and ZIP packaging all run inside this browser tab using the Canvas API and built-in codecs. There is no upload, no server-side copy and no logging of file contents. Closing the tab clears the queue, results and object URLs; the original files on your device are never modified.",
  },
  {
    q: "Which formats can it actually convert?",
    a: "Inputs: JPG, JPEG, PNG, WEBP, AVIF, GIF, BMP and TIFF, plus HEIC/HEIF where your browser can decode it. Outputs: JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF. AVIF and WEBP output are offered only after a real encode test succeeds on your browser. TIFF is read and written by QUICKKIT itself because browsers cannot open it.",
  },
  {
    q: "Will it ruin my image quality to hit a target size?",
    a: "It will not do it silently. The engine always tries lossless first, then a bounded quality search, then downscaling, and it compares the result with your source. If the target cannot be reached without significant degradation, you get a warning with the best achievable size instead of a quietly damaged file. Quality is prioritised over hitting an arbitrary number.",
  },
  {
    q: "What happens to transparency and EXIF metadata?",
    a: "PNG, WEBP, AVIF, GIF and TIFF outputs can keep transparency. When you choose Flatten onto background, or select JPG or BMP, transparent pixels are composited onto the background colour you pick. EXIF orientation is applied to the pixels by default; the remaining EXIF, GPS, XMP and ICC metadata are dropped because every output is re-encoded from pixels. That is a deliberate privacy default, and the interface says so.",
  },
  {
    q: "Does it keep GIF animation?",
    a: "Only when you change nothing else. An unedited animated GIF is passed through as a byte-for-byte copy, so the animation survives. As soon as you apply a crop, rotate, resize or re-encode, the GIF is decoded to its first frame and exported as a single still image — the queue shows the real frame count so you can see this coming.",
  },
  {
    q: "Is the preview really my file?",
    a: "Yes. The original preview is an object URL of your own file, and the converted preview is the actual encoded output — the before/after slider and full-screen view compare those two real files. Dimensions and byte sizes shown after conversion are read from the encoded Blob, not estimated.",
  },
  {
    q: "What are the limits and what happens to corrupt files?",
    a: "Up to 20 files per batch, 15 MB per image and 150 MB total. Images are limited to 24 megapixels and 8,192 pixels on either side. Corrupt, truncated, empty or unsupported files are rejected with a specific message and never produce a partial file; the rest of the batch still completes and the batch report lists every failure.",
  },
  {
    q: "Which browsers work best?",
    a: "Recent Chrome, Edge, Firefox and Safari handle JPG, PNG, WEBP, GIF and BMP. AVIF input depends on the browser's decoder, AVIF output only appears where a real encode test succeeds, and HEIC/HEIF input depends on your browser's HEIF support. Very large batches depend on available memory, which is why the limits above exist.",
  },
];

export const metadata = pageMetadata(
  "Image Converter — JPG, PNG, WebP, AVIF & TIFF",
  "Convert up to 20 images between JPG, PNG, WebP, AVIF, GIF, BMP, and TIFF locally in your browser with resize, crop, target KB/MB size, and ZIP export.",
  "/tools/image-to-image",
);

export default function Page() {
  return (
    <ToolShell
      slug="image-to-image"
      stepsHeading="Convert image formats and adjust output"
      faqsHeading="Image conversion questions"
      relatedHeading="More ways to edit images"
      headingDescription="Convert up to 20 images between JPG, PNG, WebP, AVIF, GIF, BMP, and TIFF locally in your browser with resize, crop, target KB/MB size, and ZIP export."
      referenceSection={
        <ToolReferenceSection
          slug="image-to-image"
          entry={TOOL_SEO_CONTENT["image-to-image"]}
        />
      }
      content={{ steps, faqs }}
    >
      <ImageToImage />
    </ToolShell>
  );
}
