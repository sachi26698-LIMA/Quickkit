import ToolShell from "@/components/tool-shell";
import QrScanner from "@/components/tools/qr-scanner";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "QR Code Scanner — scan images, screenshots and camera codes privately",
  "Scan QR codes with your camera, an uploaded photo, a screenshot or a whole batch of images. Decode every code in one picture, see what the content really is, inspect the destination for obvious risks, and export the results as CSV, JSON or TXT — all on your device.",
  "/tools/qr-code-scanner",
);

export default function Page() {
  return (
    <ToolShell
      slug="qr-code-scanner"
      content={{
        steps: [
          "Point your camera at a code and press Start camera, or drop an image, a screenshot or a whole folder of images into the workspace. The scanner decodes images in this tab and its processing logic does not upload them. A separate AdSense script loads site-wide; see the Privacy Policy for that third-party access.",
          "When a code is found, read the result card. It names the content type, shows the parsed fields, and runs a local security check on the destination. For a link you must confirm before anything opens — nothing opens on its own.",
          "Batch mode works through a stack of images with a bounded number running at once. Export the results you need as CSV, JSON or TXT, or keep them in the local History tab.",
        ],
        faqs: [
          {
            q: "Are my images or scanned codes uploaded?",
            a: "The scanner reads and decodes images locally and does not upload them for processing. A separate Google AdSense verification script loads on every page and runs in the page; see the Privacy Policy for its possible access to page or browser information. History is stored in this browser's local storage and you can turn it off or clear it at any time.",
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
