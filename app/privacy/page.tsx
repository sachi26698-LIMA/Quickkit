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
import { ownerDetail, publishOperatorAsBrand } from "@/lib/site";

export const metadata = pageMetadata(
  "Privacy Policy — how your data is handled",
  legalPageByHref("/privacy")!.description,
  "/privacy",
);

export default function PrivacyPage() {
  const legalName = ownerDetail("legalName");
  const jurisdiction = ownerDetail("jurisdiction");

  return (
    <LegalPageShell
      href="/privacy"
      title="Privacy Policy"
      intro="QUICKKIT processes most tool data in your browser. When advertising is enabled, a third-party AdSense verification script may load; this page explains what stays local, what leaves the page, and what you can do about it."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="summary">1. The short version</h2>
      <ul>
        <li>No account, no login, no profile, no email sign-up.</li>
        <li>
          Optional first-party visitor statistics, with no session recording.
          When advertising is enabled, a Google AdSense verification script
          loads on eligible pages; its third-party processing is described in
          sections 7 and 8.
        </li>
        <li>
          Most tools process files and text in your browser. Word to PDF is an
          explicit-consent exception using operator-controlled LibreOffice
          processing; selecting a file alone does not upload it.
        </li>
        <li>
          A few preferences (saved tools, QR presets, optional conversion
          history) are stored in your browser. The application does not
          intentionally transmit them; the AdSense script&rsquo;s potential page
          access, when advertising is enabled, is described below.
        </li>
        <li>
          Like every website, loading the pages involves ordinary HTTP requests
          to a hosting provider. That is described in{" "}
          <a href="#hosting">section 9</a>.
        </li>
      </ul>

      <h2 id="what-we-collect">2. Information we collect</h2>
      <p>
        We do not ask for, and the application does not collect, your name,
        email address, phone number, postal address, payment details, date of
        birth or location through the application itself. When advertising is
        enabled, the Google AdSense script is separate third-party code and may
        process request or browser information as described below. Word to PDF
        sends document bytes to an operator-controlled conversion endpoint only
        after explicit consent and a conversion request.
      </p>
      <p>What exists, in total, is:</p>
      <ul>
        <li>
          <strong>Technical data in ordinary web requests</strong> handled by
          the hosting provider when your browser fetches a page, script, font or
          image. This can include your IP address, user agent, the URL requested
          and a timestamp. See <a href="#hosting">section 9</a>.
        </li>
        <li>
          <strong>Google AdSense script requests</strong> — when advertising is
          enabled, the verification script loads from Google on eligible pages.
          Google receives ordinary request data and the script may access page
          and browser information, cookies or advertising identifiers according
          to Google&rsquo;s policies and your browser settings. See sections
          6–8.
        </li>
        <li>
          <strong>Browser-local preferences</strong> you choose to create —
          saved tools, QR design presets, recent QR generations and optional
          local conversion history. See <a href="#storage">section 6</a>.
        </li>
        <li>
          <strong>Anything you voluntarily send us</strong> in an email or
          through the contact form. See <a href="#retention">section 10</a>.
        </li>
      </ul>

      <h2 id="accounts">3. Accounts and registration</h2>
      <p>
        QUICKKIT has no account system. Registration is not required, offered or
        planned for the current release. Because there is no account, we hold no
        profile to correct, export or delete, and no password of yours to
        protect — the only passwords you will see in QUICKKIT are ones you
        generate or type into a local PDF prompt, and neither leaves the tab.
      </p>

      <h2 id="local-processing">4. How browser-local processing works</h2>
      <p>
        When you choose a file, your browser grants the page access to that file
        only. The JavaScript already loaded into the page then reads the bytes
        into memory and does the work there: parsing and rebuilding PDFs,
        decoding and re-encoding images on a canvas, generating a QR matrix,
        extracting text, or evaluating a calculator formula.
      </p>
      <p>
        Some operations run in dedicated Web Workers — a separate thread inside
        the same browser tab — so a large PDF merge or image batch does not
        freeze the interface. A worker is still your browser on your device; it
        is not a remote server.
      </p>
      <p>
        This is why the tools work offline once the page has loaded, and why
        there is no upload progress bar in most workspaces: there is no upload.
        It is also why refreshing the page clears a workspace — the inputs only
        ever existed in the tab&rsquo;s memory.
      </p>

      <h2 id="uploads">5. Do files leave my device?</h2>
      <p>
        Most tools do not transmit selected files as part of processing. Word to
        PDF is the exception: with explicit consent, Convert or Refresh sends
        DOCX bytes to the operator-controlled native engine or private worker.
        Automatic re-upload requires separate opt-in. No upload occurs on file
        selection and no third-party conversion fallback is used. Native job
        files are temporary and cleanup is required after processing; actual
        host isolation, crash cleanup and logging/retention remain the
        operator&rsquo;s responsibility and are verified against the running
        deployment. Native conversion is disabled when its engine is
        unavailable. The Content Security Policy allows application fetch and
        XHR connections only to this site&rsquo;s own origin and the Google
        AdSense hosts described in sections 7 and 8 — no wildcards and no other
        third parties.
      </p>
      <p>
        Two honest qualifications. First, the hosting provider still sees the
        ordinary requests for the page and its assets (section 9) — that is
        metadata about the visit, not the content of your files. Separately,
        when advertising is enabled, the AdSense script is third-party code
        running in the page; the application does not deliberately send tool
        inputs to it, but it may be able to read page content. Do not enter
        sensitive material if you are not comfortable with that access. If the
        operator later configures an email-sending endpoint for the contact
        form, the text you type into that form would be transmitted; the form
        states on screen which behaviour is active.
      </p>
      <p>
        A full tool-by-tool account of what happens to each file type is in the{" "}
        <Link href="/file-handling">File Handling Policy</Link>. If you ever
        find a QUICKKIT tool that contradicts this page, please report it — see{" "}
        <Link href="/security">Security Policy</Link>.
      </p>

      <h2 id="storage">6. Cookies and local browser storage</h2>
      <p>
        QUICKKIT application code does not intentionally set cookies and there
        is no application session cookie. When advertising is enabled, the
        Google AdSense script may read or set cookies or similar advertising
        identifiers, subject to Google&rsquo;s configuration and your browser
        settings. The site also uses your browser&rsquo;s own storage for
        preferences that you create by using a feature:
      </p>
      <ul>
        <li>
          <code>quickkit-tool-feedback-v1</code> — optional tool ratings,
          selected feedback options, comments (up to 600 characters) and
          timestamps. Saved only when you choose “Save my feedback”; not sent to
          the operator or published. Please do not include personal information
          or file contents. Your saved tool reviews also appear on the homepage
          laptop screen in this browser, not on other visitors’ screens.
          Feedback invitations can appear after each new completed download;
          dismissing one does not block future invitations. You can read past
          reviews through “Share feedback” on the homepage. Reviews have no
          edit/delete controls in QUICKKIT and new reviews do not replace old
          ones. Browser site-data controls can still erase local feedback;
          clearing site data or using another browser will not preserve it.
        </li>
        <li>
          <code>quickkit:saved-tools</code> — the slugs of tools you hearted, so
          the Saved page can list them.
        </li>
        <li>
          <code>qk:qr-presets:v1</code>, <code>qk:qr-history:v1</code>,{" "}
          <code>qk:qr-history-mode:v1</code> — QR design presets and recent
          generations, if you use those panels. Sensitive QR fields such as a
          Wi-Fi password are never written.
        </li>
        <li>
          <code>qk:i2i-retention</code> and <code>qk:p2w-retention</code> — the
          retention choice for the optional conversion histories.
        </li>
        <li>
          IndexedDB stores <code>quickkit-image-to-image</code> and{" "}
          <code>quickkit-pdf-to-word</code>, used only if you opt in to keeping
          converted outputs so they can be re-downloaded.
        </li>
      </ul>
      <p>
        This storage is scoped to this site, but any script running in the page
        context—including the AdSense verification script when advertising is
        enabled—may be able to read it. You can erase it from your
        browser&rsquo;s site-data settings. The{" "}
        <Link href="/cookies">Cookie Policy</Link> lists every key, its purpose
        and its lifetime.
      </p>

      <h2 id="analytics">7. Analytics and tracking</h2>
      <p>
        QUICKKIT does not load Google Analytics, heatmaps, session recording,
        A/B testing or social embeds. When advertising is enabled, the Google
        AdSense verification script loads on eligible pages. That advertising
        script is supplied by Google, runs in the page, and may process browser
        or page information and advertising identifiers under Google&rsquo;s
        policies and your settings. Ads remain disabled unless explicitly
        enabled; serving them also requires appropriate CSP and consent
        configuration.
      </p>
      <p>
        This release does not include a consent-management banner. Before
        enabling ad serving or personalized advertising, the operator should
        review and configure the consent settings and any consent-management
        requirements that apply to the audience. See the{" "}
        <Link href="/cookies">Cookie Policy</Link> and obtain legal review.
      </p>

      <h2 id="third-party">8. Third-party integrations</h2>
      <p>
        The libraries that perform PDF parsing and writing, document generation,
        image encoding, QR encoding/decoding and on-device OCR are bundled into
        the site and served from the same origin; fonts are self-hosted, not
        fetched from a font CDN. When advertising is enabled, the AdSense
        verification script is a third-party exception: it is fetched from
        Google on eligible pages and its code runs in the page. It is not used
        by the application to process files. Library names and licences are
        listed in the{" "}
        <Link href="/intellectual-property#open-source">
          Intellectual Property Policy
        </Link>
        .
      </p>
      <p>
        Other outbound links — social profiles and external references — leave
        the site when clicked. From that moment the destination&rsquo;s own
        privacy policy governs.
      </p>

      <h2 id="hosting">9. Hosting and server requests</h2>
      <p>
        Serving a website requires a server. Your browser requests each page and
        its assets from the hosting provider, and those requests necessarily
        reveal your IP address, requested URL, user agent and timestamp to that
        provider.
      </p>
      <p>
        The QUICKKIT application offers an opt-in first-party visitor counter,
        described below. It does not implement application-level request logging
        or session recording. Provider-side logging, retention periods,
        subprocessors and hosting region depend on the deployment configuration
        and are set by the operator&rsquo;s hosting account, so we are not going
        to state a retention period we cannot verify.
      </p>
      <p className="legal-owner-line">
        Hosting provider: <strong>Vercel Inc.</strong> (vercel.com), which
        serves this site from its own edge network. Which region answers a given
        request, how long its access logs are kept and which subprocessors it
        uses are governed by Vercel&rsquo;s default configuration and published
        policy for this project; the operator has not set a custom retention
        period, so no retention period is claimed here beyond that.
      </p>
      <p>
        One practical consequence: avoid putting sensitive text into a URL. Tool
        pages accept a search query in the address bar, and the QR Code
        Generator can encode a configuration into the URL fragment (after the
        <code>#</code>, which browsers do not send to a server). Anything before
        the <code>#</code> is a normal request and may be logged by the hosting
        provider.
      </p>

      <h3>Optional live visitor statistics</h3>
      <p>
        Only after you select “Allow anonymous visitor statistics” on the Cookie
        Policy page, the browser sends random visitor and visit identifiers and
        cumulative visible-tab time to our same-origin counter every 20 seconds
        while visible. No tool input, file, page URL, IP address or user agent
        is stored by this counter. Hosting providers still receive ordinary
        request metadata as described above. Do Not Track disables
        participation. The same switch on the Cookie Policy page turns it off
        again.
      </p>
      <p>
        The public laptop graph shows participating browsers seen in the last 45
        seconds, distinct participating browser identifiers since tracking
        began, and average visible time across participating visits (including
        ongoing visits). These are estimates, not verified people: other
        devices, cleared storage and automated requests can affect counts. No
        historical traffic before installation can be recovered. The three bars
        use a logarithmic scale; duration is in seconds, the other bars are
        counts.
      </p>
      <p>
        Server-side visit records are pruned after 24 hours without a heartbeat
        when new heartbeats arrive. Hashed random browser identifiers are
        retained for cumulative deduplication, together with aggregate totals.
        They are not linked to names or accounts. Turning participation off
        stops future reporting and removes the local identifiers, but does not
        subtract past contributions. The operator can reset the database and
        must verify hosting location, retention and any required consent before
        enabling production.
      </p>

      <h2 id="retention">10. Data retention and deletion</h2>
      <ul>
        <li>
          <strong>Tool inputs:</strong> for browser-local tools, held in page
          memory for as long as the tab holds them. Closing the tab, refreshing
          or resetting the workspace deletes those local inputs. Word to PDF
          temporarily processes consented uploads on operator-controlled
          infrastructure; it does not permanently store documents by default.
          Host logs/crash retention must be verified by the operator.
        </li>
        <li>
          <strong>Browser preferences:</strong> retained until you remove them —
          un-heart a tool, delete a preset, set retention to
          &ldquo;session&rdquo;, or clear site data in your browser.
        </li>
        <li>
          <strong>Optional conversion history:</strong> off by default. If you
          enable it, a retention window you choose (24 hours or 7 days) applies
          and older entries are pruned automatically. Choosing
          &ldquo;session&rdquo; stores nothing at all.
        </li>
        <li>
          <strong>Email you send us:</strong> kept only as long as needed to
          answer you and to keep a record of the request, then deleted. Ask us
          to delete the correspondence at any time and we will.
        </li>
        <li>
          <strong>Hosting logs:</strong> see section 9 — governed by the
          provider&rsquo;s configuration.
        </li>
      </ul>

      <h2 id="security">11. Security measures</h2>
      <p>
        Local processing avoids server document copies for browser-local tools.
        Word to PDF additionally requires secure temporary native processing. On
        top of that, the site is served over HTTPS with a Content Security
        Policy, HSTS, <code>nosniff</code>, a restrictive Referrer-Policy and a
        Permissions-Policy that disables camera, microphone and geolocation use
        by the page. Dependencies are reviewed and pinned. The details, and the
        honest limits of each measure, are in the{" "}
        <Link href="/security">Security Policy</Link>.
      </p>
      <p>
        No website can promise absolute security. Your device, browser,
        extensions and operating system are part of the chain. Keep the original
        of anything important.
      </p>

      <h2 id="children">12. Children&rsquo;s privacy</h2>
      <p>
        QUICKKIT is a general-purpose utility site, not a service directed at
        children, and does not ask for personal profiles. Consented Word to PDF
        documents may contain personal information; users are responsible for
        appropriate rights and consent. It has no chat, no profile, no comment
        feature and no way for a child to be contacted through the site.{" "}
        {ownerDetail("minimumAge") ? (
          <>
            The operator&rsquo;s stated minimum age for independent use is{" "}
            <strong>{ownerDetail("minimumAge")}</strong>.
          </>
        ) : (
          <>
            The owner still needs to decide and publish a minimum age for
            independent use: <OwnerPlaceholder what="intended minimum age" />
          </>
        )}{" "}
        If you are a parent or guardian with a concern, contact us and we will
        respond.
      </p>

      <h2 id="rights">13. Your privacy rights</h2>
      <p>
        Depending on where you live, you may have rights to access, correct,
        delete, restrict or object to processing of your personal data, to data
        portability, to withdraw consent, and to complain to a supervisory
        authority. We respect those rights regardless of where you are.
      </p>
      <p>
        In practice, the most useful thing to know is this:{" "}
        <strong>QUICKKIT holds almost no personal data about you.</strong> We
        cannot export or delete browser-local inputs we never received. Word to
        PDF server processing is subject to the operator retention controls.
        What we can do:
      </p>
      <ul>
        <li>
          explain, on request, exactly what the software does with your input
          (this page and the{" "}
          <Link href="/file-handling">File Handling Policy</Link> are written to
          answer that in advance);
        </li>
        <li>
          confirm whether any email you sent us is still held, and delete it on
          request;
        </li>
        <li>
          tell you what a browser-side deletion path is for any local storage
          entry, and point you to it.
        </li>
      </ul>
      <p>
        Send a request through the <Link href="/contact">contact page</Link>{" "}
        with the subject line &ldquo;Privacy request&rdquo;, or email{" "}
        <ContactLink channel="privacy" subject="Privacy request" />. We will
        acknowledge it and respond within the period required by applicable law.
        We will not charge you for a reasonable request, and we will not treat a
        request as consent to anything.
      </p>
      <p className="legal-review-flag">
        <strong>Legal-review note.</strong> Formal request-handling procedure,
        identity verification (where applicable), statutory response deadlines
        and any representative or data-protection-officer appointment are legal
        determinations for the operator&rsquo;s jurisdiction. The list of rights
        above is generic and must be tailored. No compliance claim (GDPR, UK
        GDPR, CCPA/CPRA, DPDP Act or otherwise) is made on this page.
      </p>

      <h2 id="contact">14. Contact and policy updates</h2>
      <p>
        Privacy questions and requests go through the{" "}
        <Link href="/contact">contact page</Link>, or email{" "}
        <ContactLink channel="privacy" subject="Privacy request" /> — the same
        route also handles general enquiries while a dedicated privacy inbox has
        not been supplied.
      </p>
      <p>
        We will update this page before changing how data is handled — including
        any changes to the Word to PDF server-side pipeline, its
        operator-controlled processing providers and consent requirements. The
        revision date at the top of the page always matches the current text.
        Related documents: <Link href="/cookies">Cookie Policy</Link>,{" "}
        <Link href="/file-handling">File Handling Policy</Link>,{" "}
        <Link href="/security">Security Policy</Link>,{" "}
        <Link href="/terms">Terms and Conditions</Link>.
      </p>
      <p>
        Data controller / operator:{" "}
        {legalName ? (
          <strong>{legalName}</strong>
        ) : publishOperatorAsBrand ? (
          <>
            <strong>the QUICKKIT project</strong> — an independently operated
            website published under the QUICKKIT brand, with no registered
            company or separate legal entity claimed behind it.
          </>
        ) : (
          <OwnerPlaceholder what="the operator's legal entity name and contact address" />
        )}
        {jurisdiction ? <> · Jurisdiction: {jurisdiction}</> : null}
      </p>
    </LegalPageShell>
  );
}
