import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Privacy Policy — how QUICKKIT handles data",
  "Understand local tool processing, clipboard and downloads, hosting requests and the absence of analytics and tracking cookies.",
  "/privacy",
);
export default function Page() {
  return (
    <article className="container prose">
      <span className="eyebrow">YOUR WORK STAYS YOURS</span>
      <h1>Privacy Policy</h1>
      <p>
        Last updated: 1 November 2026. This policy describes the current
        QUICKKIT implementation, not a promise of absolute privacy or security.
      </p>
      <div className="legal-notice">
        <strong>Owner action required before public launch</strong>
        <p>
          The site owner must supply the operator’s legal identity,
          jurisdiction, a real privacy contact, and confirmed
          hosting/log-retention details. These are not yet configured. This
          draft needs owner and legal review before release.
        </p>
      </div>
      <h2>Tool inputs stay in your browser</h2>
      <p>
        The current tools process PDFs, text, JSON, passwords, QR content and
        images locally. The PDF tools use dedicated browser workers and local
        canvas previews. QUICKKIT does not intentionally send these inputs to a
        server, store them in a database or write them to application logs.
        Inputs are held in the page’s memory. Refreshing or leaving the tool
        clears the application state; your browser may separately retain form
        state or history.
      </p>
      <h2>Clipboard, files and downloads</h2>
      <p>
        Copying uses your device’s clipboard when you choose Copy. Other
        applications, browser extensions or synchronized clipboard services may
        access it. Image and PDF selection gives the page access only to files
        you choose. A PDF open password is held only in current-page/worker
        memory and references are cleared when that file is removed, the
        workspace resets or the PDF operation completes. Generated downloads are
        saved by your browser according to its settings. Local image- and
        PDF-preview URLs are revoked when replaced or when the workspace
        unmounts.
      </p>
      <h2>Ordinary website requests</h2>
      <p>
        Your browser requests pages, scripts, fonts and icons from the hosting
        provider. Those requests can include IP address, browser information,
        requested URLs and timestamps. The application does not implement
        request-log storage. Provider processing and retention must be confirmed
        for the actual deployment; no live hosting provider or retention period
        is represented as finalized here. Do not put sensitive text into page
        URLs.
      </p>
      <h2>No tracking analytics or advertising cookies</h2>
      <p>
        This release contains no analytics SDK, ad network, account system,
        payment provider, tracking cookies or persistent tool-input storage.
        Hosting infrastructure and browsers may have their own operational
        behavior. Adding third-party tracking or advertising would require
        updating this policy and assessing consent requirements.
      </p>
      <h2>No remote tool service</h2>
      <p>
        The PDF merge and split engines, PDF preview renderer, QR library and
        image canvas encoder run on your device. Fonts and same-origin PDF
        preview assets are bundled with the application. We do not call a remote
        PDF API, QR API, image-compression API or AI service with your inputs.
      </p>
      <h2>Your choices</h2>
      <p>
        Use Reset or Clear to remove inputs from the current tool. You control
        downloads and clipboard contents on your device. Avoid entering highly
        sensitive data on devices or browsers you do not trust. Privacy contact
        and rights-request procedures must be supplied by the operator before
        public launch.
      </p>
      <p>
        See also our <Link href="/terms">Terms of Use</Link>.
      </p>
    </article>
  );
}
