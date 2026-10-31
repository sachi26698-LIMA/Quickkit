import Link from "next/link";
import { BadgeCheck, CircleSlash, FileCheck2 } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { LegalPage } from "@/components/layout/legal-page";

export const metadata = pageMetadata(
  "Terms of Use — using QUICKKIT responsibly",
  "Read the draft terms for free local browser tools, output verification, security limitations and acceptable use.",
  "/terms",
);

const sections = [
  {
    id: "what-this-covers",
    title: "What the service provides",
    body: (
      <p>
        QUICKKIT provides six browser-based utilities without an account or
        payment. No subscriptions, ad-network approvals or future paid services
        are offered by this release. Features and availability may change.
      </p>
    ),
  },
  {
    id: "use-responsibly",
    title: "Use responsibly",
    body: (
      <p>
        Use the tools only for lawful purposes and content you are entitled to
        process. Do not use the service to distribute harmful material,
        interfere with others’ systems, impersonate people or compromise
        accounts. Do not rely on generated passwords as a complete security
        solution.
      </p>
    ),
  },
  {
    id: "check-results",
    title: "Check your results",
    body: (
      <p>
        Outputs are provided as a convenience and may have limitations or
        errors. Verify important results independently. Word and reading
        estimates are approximate; case conversion does not replace language
        review; JSON parsing may round large numbers; QR destinations must be
        checked before sharing; image encoding can alter quality, metadata and
        transparency.
      </p>
    ),
  },
  {
    id: "your-content",
    title: "Your content",
    body: (
      <p>
        You retain your rights in your inputs. This application does not upload
        or publish them. You are responsible for copied or downloaded output and
        the destinations you choose to encode in QR codes. Standard hosting
        requests are discussed in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    ),
  },
  {
    id: "availability",
    title: "Availability and limitations",
    body: (
      <p>
        The tools are provided as available, without a promise of uninterrupted
        access, fitness for a particular task or absolute security. Keep
        originals of important files. These statements do not exclude rights or
        protections that cannot lawfully be excluded. Any final liability or
        dispute terms must be reviewed for the operator’s jurisdiction.
      </p>
    ),
  },
  {
    id: "contact-and-changes",
    title: "Contact and changes",
    body: (
      <p>
        A verified operator contact must be added before public launch. Material
        changes to these terms should be reflected here with an updated date. No
        contact address or legal entity has been invented.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      icon={FileCheck2}
      eyebrow="The fine print, in plain language"
      title="Terms of"
      highlight="Use"
      lead="These initial terms describe the current free tools and require review before a public launch. They are written to be read once, not skimmed past."
      updated="31 October 2026"
      scope="The current free release"
      notice={{
        title: "Owner action required before public launch",
        body: "The operator’s legal identity, contact method, governing jurisdiction and applicable consumer terms have not been provided. The owner must complete these details and obtain appropriate legal review. This page does not claim legal compliance.",
      }}
      points={[
        {
          icon: FileCheck2,
          title: "Six focused utilities",
          copy: "Browser-based tools with no account and no payment step today.",
        },
        {
          icon: BadgeCheck,
          title: "Results need a check",
          copy: "Outputs are a convenience, so verify anything that matters.",
        },
        {
          icon: CircleSlash,
          title: "No invented details",
          copy: "No legal entity or contact address has been made up for this draft.",
        },
      ]}
      sections={sections}
    />
  );
}
