import Link from "next/link";
import { contactEmail } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Terms of Use — using QUICKKIT responsibly",
  "The terms for using QUICKKIT’s free local browser tools: acceptable use, your content, availability, disclaimers and liability.",
  "/terms",
);

export default function Page() {
  return (
    <article className="container prose legal">
      <span className="eyebrow">The fine print, in plain language</span>
      <h1>Terms of Use</h1>
      <p className="legal-updated">
        Last updated: 1 November 2026. These terms describe the current free
        release of QUICKKIT.
      </p>
      <div className="legal-notice">
        <strong>A quick note from the team</strong>
        <p>
          QUICKKIT is in active development. Before a full public launch the
          operator will confirm its legal identity, governing jurisdiction and
          consumer terms, and this page should receive a professional legal
          review.
        </p>
      </div>

      <h2>1. Acceptance of these terms</h2>
      <p>
        By accessing or using QUICKKIT you agree to these Terms of Use and to
        our <Link href="/privacy">Privacy Policy</Link>. If you do not agree,
        please do not use the site. We may update these terms; the current
        version always lives on this page with its date.
      </p>

      <h2>2. What QUICKKIT provides</h2>
      <p>
        QUICKKIT provides free, browser-based utilities that run locally on your
        device — no account, installation or payment required Categories marked
        “Coming soon” are not yet available. Features may be added, changed or
        removed as the toolkit grows.
      </p>

      <h2>3. Permitted use</h2>
      <p>
        Use the tools for lawful purposes and only with content you are entitled
        to process. In particular: only enter a PDF password when you are
        authorized to open that document; check QR code destinations before
        sharing them; and don’t rely on generated passwords as a complete
        security solution (use a reputable password manager).
      </p>

      <h2>4. Your responsibilities</h2>
      <p>
        You must not use QUICKKIT to create or distribute harmful or illegal
        material, impersonate others, compromise accounts, interfere with the
        service or other people’s systems, or attempt to bypass the site’s
        security measures. You are responsible for the outputs you copy,
        download and share.
      </p>

      <h2>5. Your content and intellectual property</h2>
      <p>
        You keep all rights in your inputs and outputs. QUICKKIT does not
        upload, publish or claim ownership of them. The QUICKKIT name, logo,
        design and site content belong to the QUICKKIT operator (or its
        licensors) and may not be copied or reused to imply endorsement without
        permission.
      </p>

      <h2>6. Check your results</h2>
      <p>
        Outputs are provided as a convenience and can have limitations: word and
        reading-time figures are estimates; case conversion doesn’t replace
        language review; JSON parsing may round very large numbers; image
        encoding can change quality, metadata and transparency; PDF merging can
        flatten forms and does not preserve original bookmarks, attachments,
        layers, tagged structure, scripts or digital-signature validity. Verify
        important results independently and keep your originals.
      </p>

      <h2>7. Availability and changes to the service</h2>
      <p>
        We aim to keep QUICKKIT available and fast, but we don’t promise
        uninterrupted access or fitness for a particular task. We may modify,
        suspend or discontinue tools, and we may update these terms — material
        changes will be reflected here with a new date.
      </p>

      <h2>8. Disclaimers and limitation of liability</h2>
      <p>
        The tools are provided “as is” and “as available”, without promises of
        absolute security or error-free output. To the extent permitted by law,
        the operator is not liable for indirect or consequential losses arising
        from use of the tools or their outputs. Nothing in these terms excludes
        rights or protections that cannot lawfully be excluded; final liability
        wording will be confirmed for the operator’s jurisdiction before public
        launch.
      </p>

      <h2>9. Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or the{" "}
        <Link href="/contact">contact page</Link>. For how data is handled, see
        the <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>
    </article>
  );
}
