import ToolShell from "@/components/tool-shell";
import ImagesToPdf from "@/components/tools/images-to-pdf";
import { pageMetadata } from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";

const steps = [
  "Add images from your device or drop them into the upload area. Each image becomes one PDF page, in the order it appears in the queue. Up to 20 images, 15 MB each, 150 MB per batch.",
  "Set the page order. Drag an image onto another to move it, or use the up and down buttons — the buttons give you exactly the same control on a phone, where dragging is awkward.",
  "Choose the paper. A4, A3, A5, Letter, Legal or a custom size in millimetres, portrait or landscape, with a margin you set. The live layout preview uses your own image and the exact page geometry.",
  "Pick how each image sits on the page. Contain shows the whole image with even margins, cover fills the area and centre-crops any overflow, fill stretches to the box and changes the aspect ratio.",
  "Set a page background colour, the embedded image quality and the document title and file name. Images are embedded as JPEG pixels at the quality you choose.",
  "Create the PDF. Progress counts the pages as they are placed, and the preview below is rendered page-by-page from the PDF that was actually written. Download it, or go back and reorder.",
];

const faqs = [
  {
    q: "Are my images uploaded anywhere?",
    a: "No. Reading the images, encoding them and assembling the PDF with pdf-lib all happen inside this browser tab. There is no upload, no server-side copy and no logging of file contents. Closing the tab clears the queue, results and object URLs; the original files on your device are never modified.",
  },
  {
    q: "Can I reorder, rotate or remove pages?",
    a: "Yes. Drag an image onto another position, or use the Move earlier and Move later buttons, which are also the reliable way to reorder on a touch screen. Each image has its own remove button. Every change is reflected in the page count before you create the PDF, and in the written file.",
  },
  {
    q: "Which paper sizes and orientations are supported?",
    a: "A4, A3, A5, Letter and Legal presets, or a custom width and height in millimetres. Portrait and landscape are both available, along with a margin in millimetres. The layout preview shows the real aspect ratio and margin before you export.",
  },
  {
    q: "What do contain, cover and fill actually do?",
    a: "Contain scales the image to fit inside the page area and centres it, so the whole image is visible and the aspect ratio is preserved. Cover fills the page area and centre-crops whatever overflows, again preserving the aspect ratio. Fill stretches the image to the exact box, which does change the aspect ratio. The preview updates as you switch.",
  },
  {
    q: "Will the text in my PDF be selectable?",
    a: "No. Images are embedded as JPEG pixels, so the resulting PDF has no text layer and nothing is selectable or editable. If you need searchable text, run the PDF through an OCR tool afterwards. This is stated in the interface as well.",
  },
  {
    q: "Is the preview the real PDF?",
    a: "Yes. Before you export, the layout preview uses your image with the same page geometry and placement maths as the export. After you export, the preview is rendered page-by-page from the PDF that was actually written, with PDF.js, and you can step through every page and see its thumbnail.",
  },
  {
    q: "What are the limits and what happens to a bad file?",
    a: "Up to 20 images, 15 MB each, 150 MB per batch, and images are capped at 24 megapixels and 8,192 pixels on either side. Corrupt, truncated, empty or unsupported files are rejected with a specific message and are not placed in the queue, so they cannot quietly produce a blank page.",
  },
  {
    q: "Why is a PDF rejected here?",
    a: "This tool takes images and writes a PDF. A PDF dropped here is rejected with a message pointing you to PDF Studio or the PDF to Image Converter, rather than being silently ignored or producing a document with a picture of a PDF inside it.",
  },
];

export const metadata = pageMetadata(
  "Images to PDF Converter — JPG, PNG & WebP to PDF",
  "Combine up to 20 JPG, PNG, WebP, AVIF, GIF, BMP, TIFF, and browser-supported HEIC images into a PDF. Reorder pages; choose A4, Letter, or custom page sizes.",
  "/tools/images-to-pdf",
);

export default function Page() {
  return (
    <ToolShell
      slug="images-to-pdf"
      stepsHeading="Arrange images and create a PDF"
      faqsHeading="Image-to-PDF questions"
      relatedHeading="More ways to work with PDFs"
      headingDescription="Combine up to 20 JPG, PNG, WebP, AVIF, GIF, BMP, or TIFF images into one PDF in your browser. Reorder pages and set A4, Letter, or custom mm sizes."
      referenceSection={
        <ToolReferenceSection
          slug="images-to-pdf"
          entry={TOOL_SEO_CONTENT["images-to-pdf"]}
        />
      }
      content={{ steps, faqs }}
    >
      <ImagesToPdf />
    </ToolShell>
  );
}
