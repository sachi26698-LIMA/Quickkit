import ToolShell from "@/components/tool-shell";
import ImageConverter from "@/components/tools/image-converter";
import { pageMetadata, toolStructuredData } from "@/lib/seo";

const steps = [
  "Choose a mode. Image to image converts between JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF. Images to PDF turns pictures into pages. PDF to image renders PDF pages as JPG, PNG or WEBP.",
  "Add files from your device or drop them into the upload area. The queue shows the real format, dimensions, page count and file size of every file as soon as it is read. Up to 20 files, 15 MB per image, 150 MB per batch and 25 MB per PDF.",
  "For image conversions, pick an output format, set quality when the format is lossy, decide whether to keep transparency or flatten onto a background colour, and optionally resize by percentage, exact pixels or longest side. The per-file Output menu can override the shared format.",
  "For Images to PDF, choose A4, A3, Letter, Legal or a custom page size, portrait or landscape, a margin, contain/cover/fill placement, a page background and the embedded image quality. The live layout preview uses your image and the exact page geometry.",
  "For PDF to image, set JPG, PNG or WEBP, quality, 72–300 DPI and a page range such as 1-3, 5. Every selected page is rendered at the requested resolution; page thumbnails and the real PDF preview stay available while you adjust the range.",
  "Convert the batch. Real progress, success and failure counts appear as each file finishes, and any file that fails keeps its error message with a retry action. Download files individually, or take every finished file in one ZIP archive.",
];

const faqs = [
  {
    q: "Are my images and PDFs uploaded anywhere?",
    a: "No. Decoding, resizing, re-encoding, PDF creation, PDF page rendering and ZIP packaging all run inside this browser tab using the Canvas API, built-in codecs, PDF.js and pdf-lib. There is no upload, no server-side copy and no logging of file contents. Closing the tab clears the queue, results and object URLs; the original files on your device are never modified.",
  },
  {
    q: "Which image formats can it actually convert?",
    a: "Inputs: JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF. Outputs: JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF. JPG, PNG, WEBP and AVIF are encoded by the browser's canvas — QUICKKIT tests the real encoder before offering AVIF or WEBP, and disables a format the browser cannot produce instead of writing a broken file. GIF, BMP and TIFF are written by built-in encoders, and TIFF is also read by a built-in decoder because browsers cannot open TIFF. Unsupported combinations are disabled in the interface and listed in TOOL_DEVELOPMENT_STATUS.md.",
  },
  {
    q: "Does it keep GIF animation or editable PDF text?",
    a: "No to both, and the interface says so. A GIF input is decoded to its first frame, so animated GIFs become a single still image. Images placed in a PDF are embedded as JPEG pixels, so the resulting PDF has no text layer and nothing editable. PDF to image renders visible page content, including annotations, at the DPI you choose.",
  },
  {
    q: "What happens to transparency and EXIF metadata?",
    a: "PNG, WEBP, AVIF, GIF and TIFF outputs can keep transparency; when you choose Flatten onto background, or select JPG or BMP, transparent pixels are composited onto the background colour you pick. EXIF orientation is applied to the pixels by default so photos are not sideways; the other EXIF, GPS, XMP and ICC metadata are dropped because every output is re-encoded from pixels. That is a deliberate privacy default.",
  },
  {
    q: "How do PDF page ranges and resolution work?",
    a: "The page field accepts individual pages and ranges, such as 1, 3-5, 8. Leaving it blank exports every page. Order is normalised and duplicates are removed. Resolution is 72–300 DPI; each page is rendered at that scale and capped at 36 megapixels per page, with the cap reported after conversion. Pages are named with zero-padded numbers so a ZIP stays in order.",
  },
  {
    q: "What are the file limits and what happens to corrupt files?",
    a: "Up to 20 files per batch, 15 MB per image, 150 MB total and 25 MB or 100 pages per PDF. Images are limited to 24 megapixels and 8,192 pixels on either side, and each PDF page is capped at 36 megapixels. Corrupt, truncated, unsupported or password-protected files are rejected with a specific message and never produce a partial file; the rest of the batch still completes.",
  },
  {
    q: "Is the preview really my file?",
    a: "Yes. Image previews are object URLs of your original file, and converted previews are the actual encoded bytes. PDF previews are rendered page-by-page from the real generated or uploaded PDF with PDF.js. Quality, dimensions and byte sizes shown after conversion come from the encoded Blob, not from an estimate. The layout preview before Images to PDF uses your image with the same page geometry and fit maths as the export.",
  },
  {
    q: "Which browsers work best?",
    a: "Recent Chrome, Edge, Firefox and Safari handle JPG, PNG, WEBP, GIF, BMP and PDF. AVIF input depends on the browser's decoder, and AVIF output is only offered where a real encode test succeeds. TIFF is read and written by QUICKKIT itself. Very large batches depend on available memory, which is why the limits above exist.",
  },
];

export const metadata = pageMetadata(
  "Image & PDF Converter — JPG, PNG, WEBP, AVIF, GIF, BMP, TIFF and PDF",
  "Convert images between JPG, PNG, WEBP, AVIF, GIF, BMP and TIFF, build multi-page PDFs from photos, and export PDF pages as images at up to 300 DPI. Local browser conversion with real previews, batch progress and ZIP downloads.",
  "/tools/image-converter",
);

export default function Page() {
  const jsonLd = toolStructuredData({
    name: "Image & PDF Converter",
    description:
      "Local browser image and PDF converter: image format conversion, images to multi-page PDF with page sizes and margins, and PDF pages to JPG, PNG or WEBP with page ranges, DPI and ZIP downloads.",
    path: "/tools/image-converter",
    steps,
    faqs,
  });
  return (
    <>
      <script
        type="application/ld+json"
        // Static, server-rendered structured data; no user input is interpolated.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ToolShell slug="image-converter" content={{ steps, faqs }}>
        <ImageConverter />
      </ToolShell>
    </>
  );
}
