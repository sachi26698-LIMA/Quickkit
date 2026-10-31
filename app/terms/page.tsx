import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Terms of Use — using QUICKKIT responsibly",
  "Read the draft terms for free local browser tools, output verification, security limitations and acceptable use.",
  "/terms",
);
export default function Page() {
  return (
    <article className="container prose">
      <span className="eyebrow">THE FINE PRINT, IN PLAIN LANGUAGE</span>
      <h1>Terms of Use</h1>
      <p>
        Last updated: 31 October 2026. These initial terms describe the current
        free tools and require review before a public launch.
      </p>
      <div className="legal-notice">
        <strong>Owner action required before public launch</strong>
        <p>
          The operator’s legal identity, contact method, governing jurisdiction
          and applicable consumer terms have not been provided. The owner must
          complete these details and obtain appropriate legal review. This page
          does not claim legal compliance.
        </p>
      </div>
      <h2>What the service provides</h2>
      <p>
        QUICKKIT provides six browser-based utilities without an account or
        payment. No subscriptions, ad-network approvals or future paid services
        are offered by this release. Features and availability may change.
      </p>
      <h2>Use responsibly</h2>
      <p>
        Use the tools only for lawful purposes and content you are entitled to
        process. Do not use the service to distribute harmful material,
        interfere with others’ systems, impersonate people or compromise
        accounts. Do not rely on generated passwords as a complete security
        solution.
      </p>
      <h2>Check your results</h2>
      <p>
        Outputs are provided as a convenience and may have limitations or
        errors. Verify important results independently. Word and reading
        estimates are approximate; case conversion does not replace language
        review; JSON parsing may round large numbers; QR destinations must be
        checked before sharing; image encoding can alter quality, metadata and
        transparency.
      </p>
      <h2>Your content</h2>
      <p>
        You retain your rights in your inputs. This application does not upload
        or publish them. You are responsible for copied or downloaded output and
        the destinations you choose to encode in QR codes. Standard hosting
        requests are discussed in the{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <h2>Availability and limitations</h2>
      <p>
        The tools are provided as available, without a promise of uninterrupted
        access, fitness for a particular task or absolute security. Keep
        originals of important files. These statements do not exclude rights or
        protections that cannot lawfully be excluded. Any final liability or
        dispute terms must be reviewed for the operator’s jurisdiction.
      </p>
      <h2>Contact and changes</h2>
      <p>
        A verified operator contact must be added before public launch. Material
        changes to these terms should be reflected here with an updated date. No
        contact address or legal entity has been invented.
      </p>
    </article>
  );
}
