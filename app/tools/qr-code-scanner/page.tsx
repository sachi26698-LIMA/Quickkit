import ToolShell from "@/components/tool-shell";
import QrScanner from "@/components/tools/qr-scanner";
import { pageMetadata } from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  "QR Code Scanner — Camera, Screenshot & Batch Scan",
  "Scan QR codes locally from your camera, photos, screenshots, or image batches. Inspect URL safety heuristics before opening and export CSV or JSON.",
  "/tools/qr-code-scanner",
);

export default function Page() {
  return (
    <ToolShell
      slug="qr-code-scanner"
      headingDescription="Scan QR codes from your camera, an image, or a batch and inspect the decoded content before opening a link."
      stepsHeading="Scan a QR code from camera, image, or batch"
      faqsHeading="QR scanner questions, answered"
      relatedHeading="More ways to create and scan codes"
      referenceSection={
        <ToolReferenceSection
          slug="qr-code-scanner"
          entry={TOOL_SEO_CONTENT["qr-code-scanner"]}
        />
      }
      content={{
        steps: [
          "Point your camera at a code and press Start camera, or drop an image, a screenshot or a whole folder of images into the workspace. The scanner decodes images in this tab and its processing logic does not upload them. When advertising is enabled, a separate AdSense script loads on eligible pages; see the Privacy Policy for that third-party access.",
          "As soon as a code is scanned, a popup opens with all decoded data, a local security check, and a clickable redirect link so you can jump straight to the source in one tap — nothing auto-redirects without your click, and high-risk destinations remain blocked. The full result card and source link also stay listed in the results panel.",
          "Batch mode works through a stack of images with a bounded number running at once. Export the results you need as CSV, JSON or TXT, or keep them in the local History tab.",
          "Treat the warning as a prompt, not a safety verdict: verify the destination domain through a trusted channel before entering credentials or payment details.",
        ],
        faqs: [
          {
            q: "Are my images or scanned codes uploaded?",
            a: "The scanner reads and decodes images locally and does not upload them for processing. When advertising is enabled, a separate Google AdSense verification script loads on eligible pages and runs in the page; see the Privacy Policy for its possible access to page or browser information. History is stored in this browser's local storage and you can turn it off or clear it at any time.",
          },
          {
            q: "Can it read more than one QR code in a screenshot?",
            a: "Yes. When an image contains several symbols the scanner sweeps overlapping tiles of the frame, so each code is handed to the decoder as its own picture, and results are listed as numbered cards. Codes that the decoder genuinely cannot read are reported as unread, not guessed at.",
          },
          {
            q: "Does a security check prove a link is safe?",
            a: "No, and it never will. The check is a local look at the payload's structure — plain HTTP, a raw IP address, a shortened link, punycode, a lookalike domain, embedded credentials, a dangerous scheme. It cannot know whether a domain is currently hosting a scam, because nothing is sent to any reputation service. 'No obvious warning found' means exactly that.",
          },
          {
            q: "Why does the camera not start?",
            a: "Browsers only expose the camera on a secure connection (HTTPS or localhost) and only after you grant permission. If the page is served over plain HTTP the camera API does not exist, and the tool says so instead of showing a fake preview. Uploading an image or a screenshot works everywhere.",
          },
          {
            q: "Which image formats can I scan?",
            a: "JPG, PNG, WebP, GIF (first frame), BMP and AVIF all decode through your browser. HEIC — the default iPhone format — only works in Safari, because no other browser can decode it; the tool tells you that instead of reporting a mystery error. Every image is capped at 40 megapixels and 25 MB.",
          },
          {
            q: "What is kept in History?",
            a: "A timestamp, the content type and the decoded text — unless the payload carries a secret, such as a Wi-Fi password. Those are stored as a redacted line with the content withheld, and you can allow full storage explicitly in Settings. Image files are never stored, only their names, and Clear history removes everything.",
          },
        ],
      }}
    >
      <QrScanner />
    </ToolShell>
  );
}
