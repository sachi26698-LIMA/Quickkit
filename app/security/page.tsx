import Link from "next/link";
import LegalPageShell, {
  OwnerPlaceholder,
} from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import { ownerDetail } from "@/lib/site";

export const metadata = pageMetadata(
  "Security Policy",
  legalPageByHref("/security")!.description,
  "/security",
);

export default function SecurityPage() {
  const named = ownerDetail("securityEmail");

  return (
    <LegalPageShell
      href="/security"
      title="Security Policy"
      intro="What protects the site and your data, what that protection cannot cover, and how to report a vulnerability without doing harm."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="model">1. Security model</h2>
      <p>
        Most QUICKKIT tools are client-side. Word to PDF adds an
        explicit-consent server endpoint and an authenticated
        operator-controlled native worker. It requires isolation, bounded
        resources, temporary-file cleanup and verified host retention practices;
        it is not production-certified by this policy. There is no user account
        or permanent document store by default.
      </p>
      <p>That design removes whole classes of risk:</p>
      <ul>
        <li>
          browser-local tools have no server document copy; consented Word to
          PDF processing additionally requires secured temporary server files;
        </li>
        <li>there are no credentials of yours for us to store or lose;</li>
        <li>
          there is no account takeover path, because there is no account to take
          over.
        </li>
      </ul>
      <p>
        What remains is the security of the site&rsquo;s own code and supply
        chain, the integrity of what your browser downloads, the security of
        your device, and the ordinary request metadata handled by the hosting
        provider. Those are addressed below.
      </p>

      <h2 id="development">2. Secure development practices</h2>
      <ul>
        <li>
          <strong>Strict TypeScript.</strong> The project builds with{" "}
          <code>strict</code> enabled and no suppressed type errors in tool
          logic; unsafe HTML injection is not used to render content.
        </li>
        <li>
          <strong>Server-rendered content, client islands.</strong> Nothing the
          user typed is interpolated into HTML, and structured data is built
          from static strings only.
        </li>
        <li>
          <strong>Pinned dependencies</strong> with a committed lockfile, so a
          build is reproducible and a surprise version bump cannot appear
          silently.
        </li>
        <li>
          <strong>Peer review and tests before merge.</strong> Formatting, lint,
          unit tests, a production build, a type check, a production dependency
          audit and Playwright suites run in CI on every push and pull request.
        </li>
        <li>
          <strong>No secrets in the client.</strong> The application needs no
          API keys. Anything environment-specific is an origin string, not a
          credential.
        </li>
      </ul>

      <h2 id="data-handling">3. Data handling</h2>
      <p>
        Inputs are processed in tab memory and discarded on reset, refresh or
        tab close. Preferences use browser storage; optional conversion history
        is opt-in, capped at 20 items and 10 MB each, and expires on your chosen
        retention window. Source documents are never written to history — only
        converted outputs. Details are in the{" "}
        <Link href="/file-handling">File Handling Policy</Link>.
      </p>
      <p>
        PDF passwords you supply are kept in page or worker memory for the
        duration of the operation and are not logged or stored. Output files are
        not re-encrypted; if the source was protected, protect the result
        yourself.
      </p>

      <h2 id="browser-side">4. Browser-side security</h2>
      <ul>
        <li>
          <strong>Worker isolation.</strong> Heavy processing runs in Web
          Workers: same origin, no DOM access, and structured-clone boundaries
          between the page and the worker.
        </li>
        <li>
          <strong>Blob URLs are short-lived.</strong> Preview and download URLs
          are revoked when replaced, on reset and on unmount, so a stale handle
          to a document does not linger in the tab.
        </li>
        <li>
          <strong>Untrusted files are parsed defensively.</strong> Every PDF and
          image tool validates structure, size and page counts before work
          starts, reports a clear error for corrupt or unsupported input, and
          refuses jobs that exceed its documented memory limits rather than
          exhausting the tab.
        </li>
        <li>
          <strong>Decompression is bounded.</strong> Image and PDF decoders
          enforce pixel, dimension and decoded-stream ceilings to limit
          decompression-bomb style inputs.
        </li>
        <li>
          <strong>No eval.</strong> The Content Security Policy allows
          WebAssembly compilation (<code>&apos;wasm-unsafe-eval&apos;</code>)
          for the OCR engine and nothing more; raw <code>eval</code> is not
          permitted in production.
        </li>
      </ul>

      <h2 id="headers">5. Response headers and transport</h2>
      <p>Every response is served with:</p>
      <ul>
        <li>
          <strong>Content-Security-Policy</strong> —{" "}
          <code>default-src &apos;self&apos;</code>,{" "}
          <code>connect-src &apos;self&apos;</code> (so a script cannot
          exfiltrate data to another origin),{" "}
          <code>object-src &apos;none&apos;</code>,{" "}
          <code>base-uri &apos;self&apos;</code>,{" "}
          <code>form-action &apos;self&apos;</code>,{" "}
          <code>frame-ancestors &apos;none&apos;</code>.
        </li>
        <li>
          <strong>Strict-Transport-Security</strong> — enforces HTTPS for a
          year.
        </li>
        <li>
          <strong>X-Content-Type-Options: nosniff</strong> — no MIME sniffing.
        </li>
        <li>
          <strong>Referrer-Policy: strict-origin-when-cross-origin</strong> — no
          full URL leakage to other sites.
        </li>
        <li>
          <strong>Permissions-Policy</strong> — camera, microphone and
          geolocation are disabled for the page.
        </li>
        <li>
          <strong>X-Robots-Tag</strong> — set to <code>noindex</code> while the
          site is unapproved for indexing, so a preview build is not crawled.
        </li>
      </ul>
      <p>
        During local development the identical policy is delivered in{" "}
        <code>Content-Security-Policy-Report-Only</code> mode, because
        React&rsquo;s development runtime needs <code>eval</code> to reconstruct
        component stacks. No <code>&apos;unsafe-eval&apos;</code> is ever
        granted, in either mode, and production enforces the policy.
      </p>
      <p className="legal-owner-line">
        <strong>Known configuration note:</strong> the shipped policy omits{" "}
        <code>frame-ancestors</code> restrictions in the deployment currently
        used for preview embedding. Confirm the framing policy for the
        standalone production domain before launch — a public site should
        normally forbid being framed.
      </p>

      <h2 id="dependencies">6. External dependencies</h2>
      <p>
        Third-party engines are served from this origin rather than a CDN, so a
        compromised or unreachable CDN cannot inject code into the page or
        observe when a tool is used. The production dependency audit reports no
        known vulnerabilities. A residual set of moderate advisories exists in
        the development-only lint toolchain; it has been reviewed and documented
        in the repository, and it is not shipped to users. We do not describe
        that review as a clean full audit.
      </p>
      <p>
        Engine components and their licences are listed in the{" "}
        <Link href="/intellectual-property#open-source">
          Intellectual Property Policy
        </Link>
        . If an upstream advisory affects a shipped engine, this page will say
        so rather than quietly bumping a version.
      </p>

      <h2 id="reporting">7. Reporting a vulnerability</h2>
      <p>
        We welcome good-faith reports. Email{" "}
        <ContactLink channel="security" subject="Security report" /> (or use the{" "}
        <Link href="/contact">contact page</Link>) with the subject line
        &ldquo;Security report&rdquo;, and include:
      </p>
      <ul>
        <li>a description of the issue and the impact you believe it has;</li>
        <li>
          the URL, tool or component affected, and the browser/OS if relevant;
        </li>
        <li>reproduction steps, ideally minimal;</li>
        <li>
          any proof-of-concept, with sensitive values redacted — never send us a
          real document, credential or other person&rsquo;s data;
        </li>
        <li>
          how you would like to be credited, or a request to stay anonymous.
        </li>
      </ul>
      <p>
        To protect everyone, please do not run automated scanners against the
        site, do not attempt to access data that is not yours, do not degrade
        availability, and give us a reasonable period to fix the issue before
        any public disclosure. Reports are handled by a human.
      </p>

      <h2 id="disclosure">8. Responsible disclosure</h2>
      <p>
        We aim to acknowledge a report within five working days and to keep you
        informed while it is investigated. Where a fix is warranted, we will say
        what changed once it is deployed, and credit the reporter if they wish.
        There is currently no paid bounty programme; we will not promise one
        informally.
      </p>
      <p>
        Safe harbour: we will not pursue legal action against a researcher who
        acts in good faith under this policy, stays within the scope below, and
        does not harm users or data. This is a statement of intent, not a legal
        guarantee, and it cannot bind third parties such as the hosting
        provider.
      </p>

      <h2 id="scope">9. Out of scope</h2>
      <ul>
        <li>
          Reports from automated scanners with no demonstrated impact, or best
          practice suggestions with no exploitable consequence.
        </li>
        <li>
          Missing security headers that are already documented above as known
          configuration notes.
        </li>
        <li>
          Vulnerabilities in a browser, extension or operating system — report
          those upstream.
        </li>
        <li>Social engineering of the operator, or physical attacks.</li>
        <li>
          Denial-of-service testing, spam, and anything that affects other
          visitors.
        </li>
        <li>
          Findings that depend on a compromised device, a malicious extension,
          or access to the user&rsquo;s own unlocked machine.
        </li>
      </ul>

      <h2 id="contact">10. Security contact</h2>
      <p>
        <ContactLink channel="security" subject="Security report" />
        {named ? (
          " — reported messages reach the operator directly."
        ) : (
          <>
            {" "}
            A dedicated, monitored security inbox is{" "}
            <OwnerPlaceholder what="a dedicated, monitored security inbox" />{" "}
            until then, reports should go through the{" "}
            <Link href="/contact">contact page</Link> and will be handled on a
            best-effort basis only.
          </>
        )}
      </p>
      <p>
        General questions and bug reports (not security-sensitive) go through
        the <Link href="/contact">contact page</Link>. Related reading:{" "}
        <Link href="/file-handling">File Handling Policy</Link>,{" "}
        <Link href="/privacy">Privacy Policy</Link>,{" "}
        <Link href="/terms">Terms and Conditions</Link>.
      </p>

      <h2 id="no-certifications">11. Certifications and compliance</h2>
      <p>
        QUICKKIT holds <strong>no</strong> security certifications. It is not
        ISO/IEC 27001 certified, not SOC 2 attested, not PCI DSS assessed, and
        it has not undergone a third-party penetration test. No claim of
        compliance with any security framework or regulation (GDPR, HIPAA, DPDP
        Act or otherwise) is made on this page or anywhere else on the site.
      </p>
      <p>
        The measures above describe engineering practice. They are not an audit
        opinion, and they are not a warranty that the service is free of
        vulnerabilities. See the <Link href="/disclaimer">Disclaimer</Link> for
        the limits of what is promised.
      </p>
      <p className="legal-review-flag">
        <strong>Owner action:</strong> obtain an independent security review
        before launch, publish a dedicated security contact, decide the
        disclosure window, and confirm which regulatory frameworks actually
        apply to the operator&rsquo;s business.
      </p>
    </LegalPageShell>
  );
}
