import Link from "next/link";
import { Cpu, EyeOff, ShieldCheck, UserRoundX } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata = pageMetadata(
  "Privacy Policy — how QUICKKIT handles data",
  "Understand local tool processing, clipboard and downloads, hosting requests and the absence of analytics and tracking cookies.",
  "/privacy",
);

const sections = [
  {
    id: "tool-inputs",
    title: "Tool inputs stay in your browser",
    body: (
      <p>
        The six tools process text, JSON, passwords, QR content and images
        locally. QUICKKIT does not intentionally send these inputs to a server,
        store them in a database or write them to application logs. Inputs are
        held in the page’s memory. Refreshing or leaving the tool clears the
        application state; your browser may separately retain form state or
        history.
      </p>
    ),
  },
  {
    id: "clipboard-files-downloads",
    title: "Clipboard, files and downloads",
    body: (
      <p>
        Copying uses your device’s clipboard when you choose Copy. Other
        applications, browser extensions or synchronized clipboard services may
        access it. Image selection gives the page access only to files you
        choose. Generated downloads are saved by your browser according to its
        settings. Local image-preview URLs are revoked when replaced or when the
        workspace unmounts.
      </p>
    ),
  },
  {
    id: "website-requests",
    title: "Ordinary website requests",
    body: (
      <p>
        Your browser requests pages, scripts, fonts and icons from the hosting
        provider. Those requests can include IP address, browser information,
        requested URLs and timestamps. The application does not implement
        request-log storage. Provider processing and retention must be confirmed
        for the actual deployment; no live hosting provider or retention period
        is represented as finalized here. Do not put sensitive text into page
        URLs.
      </p>
    ),
  },
  {
    id: "no-analytics",
    title: "No tracking analytics or advertising cookies",
    body: (
      <p>
        This release contains no analytics SDK, ad network, account system,
        payment provider, tracking cookies or persistent tool-input storage.
        Hosting infrastructure and browsers may have their own operational
        behavior. Adding third-party tracking or advertising would require
        updating this policy and assessing consent requirements.
      </p>
    ),
  },
  {
    id: "no-remote-service",
    title: "No remote tool service",
    body: (
      <p>
        The QR library and image canvas encoder run on your device. Fonts are
        bundled with the application. We do not call a remote QR API,
        image-compression API or AI service with your inputs.
      </p>
    ),
  },
  {
    id: "your-choices",
    title: "Your choices",
    body: (
      <>
        <p>
          Use Reset or Clear to remove inputs from the current tool. You control
          downloads and clipboard contents on your device. Avoid entering highly
          sensitive data on devices or browsers you do not trust. Privacy
          contact and rights-request procedures must be supplied by the operator
          before public launch.
        </p>
        <p>
          See also our <Link href="/terms">Terms of Use</Link>.
        </p>
      </>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      icon={ShieldCheck}
      eyebrow="Your work stays yours"
      title="Privacy"
      highlight="Policy"
      lead="This policy describes the current QUICKKIT implementation, not a promise of absolute privacy or security. Every tool today runs on your own device."
      updated="31 October 2026"
      scope="All six tools"
      notice={{
        title: "Owner action required before public launch",
        body: "The site owner must supply the operator’s legal identity, jurisdiction, a real privacy contact, and confirmed hosting/log-retention details. These are not yet configured. This draft needs owner and legal review before release.",
      }}
      points={[
        {
          icon: Cpu,
          title: "Processed on your device",
          copy: "Counting, encoding and compressing happen in the browser tab.",
        },
        {
          icon: EyeOff,
          title: "No analytics or trackers",
          copy: "No analytics SDK, ad network or tracking cookies ship with the site.",
        },
        {
          icon: UserRoundX,
          title: "No account, no uploads",
          copy: "Inputs stay in the tab, and there is no sign-up to collect details.",
        },
      ]}
      sections={sections}
    />
  );
}
