import ToolShell from "@/components/tool-shell";
import PdfCompressor from "@/components/tools/compress-pdf";
import { pageMetadata } from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  "Compress PDF Online — Shrink PDF Size Locally",
  "Reduce PDF file size locally in your browser with 4 presets, custom image quality, or a target KiB/MiB cap while keeping text and vector lines sharp.",
  "/tools/compress-pdf",
);

export default function Page() {
  return (
    <ToolShell
      slug="compress-pdf"
      headingDescription="Reduce PDF file size locally in your browser with 4 presets, custom image quality, or a target KiB/MiB cap while keeping text and vector lines sharp."
      stepsHeading="How to shrink a PDF without losing text"
      faqsHeading="Compress PDF questions, answered"
      relatedHeading="More ways to work with PDFs"
      referenceSection={
        <ToolReferenceSection
          slug="compress-pdf"
          entry={TOOL_SEO_CONTENT["compress-pdf"]}
        />
      }
      content={{
        steps: [
          "Add one or more PDFs. QUICKKIT inspects each file locally for page count, dimensions, embedded images, encryption and features that should not be rewritten silently.",
          "Choose Low, Medium, High or Maximum compression, then fine-tune embedded-image quality and maximum image resolution. Text and vector pages stay text and vector data; they are not converted into page images.",
          "Optionally set a target size for each PDF. Target mode tries your quality first, then progressively reduces supported-image quality and resolution. If fonts, text, vector data or unsupported images set a higher floor, the result says target not reached instead of pretending otherwise.",
          "Compress the batch, compare original and compressed first-page previews, review exact sizes and savings, then download individual validated PDFs or a ZIP. Keep the originals and check important documents at reading zoom in your PDF reader.",
        ],
        faqs: [
          {
            q: "Are my PDFs or passwords uploaded?",
            a: "No. A dedicated browser worker inspects and compresses file bytes on your device, and previews are rendered locally to canvas images. QUICKKIT does not receive your PDFs, file names, passwords, settings or compressed outputs. Closing the tab clears the in-memory files, passwords and preview URLs.",
          },
          {
            q: "Why can one PDF shrink a lot while another barely changes?",
            a: "Image-heavy PDFs often shrink when supported embedded JPEG or raster images are resized and re-encoded. Text, fonts and vector drawings may already be efficiently Flate-compressed, and unsupported image formats or transparency models are kept unchanged for safety. If no safely smaller rewrite is found, QUICKKIT returns the original file unchanged and labels it clearly.",
          },
          {
            q: "Will page order, dimensions or readable text change?",
            a: "The compressor rewrites the document in place and validates that the reopened output has the same page count, page sizes and rotations. Page order is not rearranged and text/vector content is not rasterized. Embedded-image quality can still affect scanned text because a scanned page is an image, so review scans carefully at 100–200% zoom.",
          },
          {
            q: "Can I compress password-protected, signed or form PDFs?",
            a: "Supported encrypted PDFs can be opened with their correct open password; a smaller validated rewrite is unencrypted unless QUICKKIT returns the original unchanged, which is stated in the result. Digitally signed PDFs and dynamic XFA forms are blocked so signatures and form behavior are not silently invalidated. Other forms, attachments, bookmarks, layers and tagged structure should be checked in the output, and PDF/A or PDF/UA conformance is not guaranteed after rewriting.",
          },
        ],
      }}
    >
      <PdfCompressor />
    </ToolShell>
  );
}
