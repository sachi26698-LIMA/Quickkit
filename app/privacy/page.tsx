import Link from "next/link";
import { contactEmail } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Privacy Policy — how QUICKKIT handles data",
  "Understand local tool processing, clipboard and downloads, hosting requests, saved-tools storage and the absence of analytics and tracking cookies.",
  "/privacy",
);

export default function Page() {
  return (
    <article className="container prose legal">
      <span className="eyebrow">Your work stays yours</span>
      <h1>Privacy Policy</h1>
      <p className="legal-updated">
        Last updated: 1 November 2026. This policy describes the current
        QUICKKIT implementation in plain language. It is not a promise of
        absolute privacy or security — no website can honestly make one.
      </p>
      <div className="legal-notice">
        <strong>A quick note from the team</strong>
        <p>
          QUICKKIT is in active development. Before a full public launch the
          operator will confirm its legal identity, jurisdiction and
          hosting/log-retention details, and this page should receive a
          professional legal review.
        </p>
      </div>

      <h2>1. Information we collect</h2>
      <p>
        Very little, by design. We do not operate user accounts, and tool inputs
        are never sent to us (see §2). The information that exists at all is:
        (a) ordinary technical data in website requests handled by our hosting
        provider (§4), (b) a saved-tools list stored only in your own browser if
        you use the Save feature (§5), and (c) anything you voluntarily send us
        by email (§8).
      </p>

      <h2>2. How the tools process your data — locally</h2>
      <p>
        Every current QUICKKIT tool processes your input on your device, in your
        browser. The PDF tools use dedicated browser workers and local canvas
        previews where a preview is shown. Your PDFs, text, JSON, passwords, QR
        content and images are not uploaded to a server, stored in a database or
        written to application logs. Inputs live in the page’s memory;
        refreshing or leaving the tool clears them (your browser may separately
        retain form state or history).
      </p>

      <h2>3. File privacy, clipboard and downloads</h2>
      <p>
        File pickers give the page access only to files you choose. A PDF open
        password is held only in current-page/worker memory and cleared when the
        file is removed, the workspace resets or the PDF operation completes.
        Copying uses your device clipboard, which other apps, extensions or
        synced clipboard services may access. Downloads are saved by your
        browser under its own settings, and local preview URLs are revoked when
        replaced or when the workspace closes.
      </p>

      <h2>4. Ordinary website requests and hosting</h2>
      <p>
        Like any website, your browser requests pages, scripts, fonts and icons
        from our hosting provider; those requests can include your IP address,
        browser information, requested URLs and timestamps. The QUICKKIT
        application itself does not implement request-log storage. Provider
        processing and retention depend on the deployment and will be confirmed
        by the operator. Please don’t put sensitive text into page URLs (for
        example, tools you open via search links).
      </p>

      <h2>5. Data stored on your device</h2>
      <p>
        If you save tools with the heart icon, their names are stored in your
        browser’s local storage under <code>quickkit:saved-tools</code>. This
        never leaves your device and contains no tool inputs or personal
        information. Clearing your browser data removes it. Details are in our{" "}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2>6. Third-party services</h2>
      <p>
        Tool processing uses no third-party services: no remote PDF, QR,
        image-compression or AI APIs receive your inputs, and there is no
        analytics SDK, advertising network, account system or payment provider
        in this release. Fonts and application code are bundled with the site.
        Outbound links (for example, social profiles in the footer) lead to
        third-party sites with their own privacy practices, which apply once you
        visit them.
      </p>

      <h2>7. Security</h2>
      <p>
        Local processing removes whole categories of risk — there is no server
        copy of your files to breach. The site is served with strict transport
        and content-security headers. Still, your device and browser are part of
        the picture: avoid entering highly sensitive data on devices or browsers
        you do not trust, and keep originals of important files.
      </p>

      <h2>8. Your rights and choices</h2>
      <p>
        Because tool inputs never reach us, there is generally nothing for us to
        access, correct or delete. You control inputs with each tool’s
        Reset/Clear actions, your clipboard and downloads on your device, and
        the saved-tools list in your browser. If you email us, we will use your
        message only to respond, and you may ask us to delete the
        correspondence. Depending on your jurisdiction you may have additional
        rights; the operator will confirm formal procedures before public
        launch.
      </p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions: <a href={`mailto:${contactEmail}`}>{contactEmail}</a>{" "}
        or the <Link href="/contact">contact page</Link>.
      </p>

      <h2>10. Updates to this policy</h2>
      <p>
        If processing practices change — for example, if a future tool ever
        needs a server — we will update this page first, explain the change, and
        reassess consent requirements. See also our{" "}
        <Link href="/terms">Terms of Use</Link> and{" "}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>
    </article>
  );
}
