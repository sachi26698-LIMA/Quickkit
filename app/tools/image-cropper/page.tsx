import ToolShell from "@/components/tool-shell";
import ImageCropper from "@/components/tools/image-cropper";
import { pageMetadata, toolStructuredData } from "@/lib/seo";

const steps = [
  "Drop up to 20 JPEG, PNG or WebP images into the workspace, or choose them from your device. Each file is decoded locally and its EXIF orientation is applied before anything is shown.",
  "Drag inside the white frame to reposition the crop, pull a corner handle to resize it, or nudge with the arrow keys. Pick a free crop, a fixed ratio such as 1:1, 4:3 or 16:9, or a social preset for Instagram, YouTube, Facebook, X, LinkedIn, Pinterest or WhatsApp.",
  "Switch to Square or Circle for a 1:1 masked crop, rotate in 90° steps, flip horizontally or vertically, and zoom the stage in up to 400% to frame fine detail — then use Crop to visible area when you want exactly what is on screen.",
  "Choose an export size: the 1:1 crop pixels at full resolution, a percentage scale, an exact custom width and height, or the social preset's pixel size. Pick JPEG, PNG or WebP, set quality, and add a custom base name or suffix.",
  "Crop the batch on your device. Each image keeps its own crop and settings, so you can compare original against cropped, then download images individually or take every finished file in one ZIP archive with unique names.",
];

const faqs = [
  {
    q: "Are my images uploaded to a server?",
    a: "No. Decoding, EXIF correction, rotation, flipping, cropping, circular masking, encoding and ZIP packaging all run inside this browser tab. Files never touch a QUICKKIT server, there is no storage or analytics around them, and closing the tab discards everything.",
  },
  {
    q: "How do circle crops keep transparency?",
    a: "A circle crop is a 1:1 crop with a circular alpha mask. PNG and WebP output keeps the four corners fully transparent. JPEG has no alpha channel, so the corners are filled with the background colour you choose (white by default). The preview uses a checkerboard so transparency is visible before you download.",
  },
  {
    q: "Does cropping reduce resolution?",
    a: "The default Output size is Crop pixels: the export contains exactly the pixels inside the frame at 1:1, with no resampling, so nothing is softened. Fixed social presets set their own pixel size (for example 1080 × 1080), and Scale or Custom px can change the output. If you ask for more pixels than the crop contains, the image is upscaled — extra pixels never add detail.",
  },
  {
    q: "What happens to EXIF rotation, GPS and colour profiles?",
    a: "Phone photos are decoded with their EXIF orientation applied, so the crop frame always matches what you see; the source panel reports the orientation and the header dimensions. Every export is re-encoded from pixels, which removes EXIF, GPS, XMP and ICC profiles — the privacy-safe default. The original file on your device is never modified.",
  },
  {
    q: "Can I give each image in a batch its own crop?",
    a: "Yes. Select any image in the queue and the whole crop workspace follows it: its own frame, ratio, shape, rotation, flips, output size, format, quality and file name. When you press Crop, every image is written with its own settings. Apply ratio & shape to all and Apply export to all copy those settings to the rest of the queue without touching anyone's frame.",
  },
  {
    q: "Which social media sizes are included?",
    a: "The preset list reuses the Image Resizer catalogue: Instagram post 1080 × 1080, portrait 1080 × 1350, story 1080 × 1920 and grid 1440 × 1440; YouTube thumbnail 1280 × 720, banner 2048 × 1152 and Short 1080 × 1920; Facebook post 1200 × 630, cover 851 × 315 and story 1080 × 1920; X post 1600 × 900, header 1500 × 500 and profile 400 × 400; LinkedIn banner 1584 × 396; Pinterest pin 1000 × 1500; WhatsApp status 1080 × 1920, photo 1600 × 1600 and profile 640 × 640. Each preset sets both the crop ratio and the export size.",
  },
  {
    q: "What do undo, redo and reset cover?",
    a: "Undo and redo walk through every crop move, resize, ratio, shape, rotation, flip, output-size, format and quality change for the selected image, up to 50 steps. Reset restores the full frame, removes rotation and flips, and clears the shape while keeping the format, quality and file naming you chose. Downloads and the queue itself are not part of the undo stack.",
  },
];

export const metadata = pageMetadata(
  "Image Cropper — freeform, social, circle, batch",
  "Crop JPEG, PNG and WebP images with freeform or fixed ratios, Instagram, YouTube and Facebook presets, circle and square crops, rotation and per-image batches.",
  "/tools/image-cropper",
);

export default function Page() {
  const jsonLd = toolStructuredData({
    name: "Image Cropper",
    description:
      "Local browser image cropper with freeform and fixed ratios, social media presets, circle and square masks, rotate, flip, zoom, pan, custom output sizes, batch cropping and ZIP downloads.",
    path: "/tools/image-cropper",
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
      <ToolShell slug="image-cropper" content={{ steps, faqs }}>
        <ImageCropper />
      </ToolShell>
    </>
  );
}
