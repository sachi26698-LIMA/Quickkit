import ToolShell from "@/components/tool-shell";
import ImageResizer from "@/components/tools/image-resizer";
import { pageMetadata } from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";

const steps = [
  "Drop up to 20 JPEG, PNG, WebP or AVIF images into the workspace, or choose them from your device.",
  "Pick Dimensions, Percentage, Presets, or resize by the longest or shortest side. Lock the aspect ratio, or unlock it to fill, fit, stretch or crop.",
  "Open the Edit tab to crop with a fixed ratio, rotate by 90° steps or any angle, flip, and adjust brightness, contrast, saturation and filters.",
  "Choose JPEG, PNG, WebP or AVIF, set quality and the output name or suffix, then process the whole batch on your device.",
  "Compare original and result, check the estimated and actual file size, then download individual images or the whole batch as a ZIP archive.",
];

const faqs = [
  {
    q: "Are my photos uploaded anywhere?",
    a: "No. Decoding, cropping, rotating, colour grading, resizing, compression and ZIP packaging all run in this browser tab. Files never touch a QUICKKIT server, and there is no storage or analytics around them. Closing or refreshing the tab discards everything.",
  },
  {
    q: "What happens to EXIF, GPS and colour profiles?",
    a: "Every download is re-encoded from pixels, so EXIF, GPS coordinates, XMP and ICC profiles are removed automatically — that is the privacy-safe default. The metadata panel shows what was found before you export, and you can keep or ignore the EXIF rotation flag while editing.",
  },
  {
    q: "How do the aspect-ratio lock, fill, fit and stretch differ?",
    a: "With the lock on, changing width recalculates height from the edited image's proportions, so nothing is distorted. Unlock it to force both values and stretch. In preset mode, Fill takes a centred crop to the exact preset, Fit inside keeps the whole frame, and Stretch forces the preset box.",
  },
  {
    q: "Which formats are supported and can I output AVIF?",
    a: "Inputs and outputs are JPEG, PNG, WebP and AVIF, with AVIF only offered when the browser can encode it; unsupported options are disabled and labelled. Limits are 15 MB, 24 megapixels and 8,192 pixels per side. Animated images become a single frame, and HEIC or SVG files are rejected.",
  },
  {
    q: "Does the tool write DPI metadata?",
    a: "No browser canvas encoder can embed a DPI tag, so the pixel dimensions are what printers read. The DPI and print-size panel converts between centimetres and pixels in both directions, so you can choose exact pixel dimensions for a 10 × 15 cm print at 300 DPI.",
  },
  {
    q: "Does resizing make an image sharper?",
    a: "No. Scaling up adds pixels but cannot create detail, and large reductions can soften fine texture. The resizer uses progressive halving for clean reductions, but the best result always starts from a source at least as large as the target.",
  },
  {
    q: "What is in the ZIP download?",
    a: "Only successfully processed images, named from the original file (plus any rename or suffix you chose) with the new pixel size, for example photo-web-1080x1080.webp. Duplicate names get a numbered suffix. The archive is built in your browser and never stored.",
  },
];

export const metadata = pageMetadata(
  "Image Resizer — Pixels, Percent & Social Presets",
  "Resize JPEG, PNG or WebP images by pixels, percentage, longest side, or social presets. Export JPEG, PNG, WebP, or AVIF when supported; crop and ZIP locally.",
  "/tools/image-resizer",
);

export default function Page() {
  return (
    <ToolShell
      slug="image-resizer"
      stepsHeading="Resize and export images"
      faqsHeading="Image resizing questions"
      relatedHeading="More ways to edit images"
      headingDescription="Resize up to 20 JPEG, PNG, WebP, or AVIF images in your browser by exact pixels, percentage, longest side, or social presets with crop and ZIP export."
      referenceSection={
        <ToolReferenceSection
          slug="image-resizer"
          entry={TOOL_SEO_CONTENT["image-resizer"]}
        />
      }
      content={{ steps, faqs }}
    >
      <ImageResizer />
    </ToolShell>
  );
}
