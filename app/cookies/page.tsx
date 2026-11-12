import Link from "next/link";
import LegalPageShell from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";

export const metadata = pageMetadata(
  "Cookie Policy — what we store and what we don’t",
  legalPageByHref("/cookies")!.description,
  "/cookies",
);

export default function CookiesPage() {
  return (
    <LegalPageShell
      href="/cookies"
      title="Cookie Policy"
      intro="QUICKKIT application code does not intentionally set cookies. When advertising is enabled, Google AdSense may use cookies or similar identifiers; this page also documents the browser storage created by site features."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="summary">1. The short version</h2>
      <ul>
        <li>
          <strong>Cookies:</strong> QUICKKIT application code does not
          intentionally set cookies. When advertising is enabled, the Google
          AdSense script may load and use cookies or similar advertising
          identifiers, depending on its settings and your browser.
        </li>
        <li>
          <strong>Local storage and IndexedDB:</strong> used only for
          preferences you create by using a feature — saved tools, QR presets,
          optional conversion history.
        </li>
        <li>
          <strong>Analytics:</strong> none. When advertising is enabled, the
          AdSense verification script is an advertising-platform script; review
          sections 6 and 8 for its potential cookie use and consent
          considerations.
        </li>
      </ul>

      <h2 id="what-are-cookies">2. Cookies and local storage explained</h2>
      <p>
        A cookie is a small text file a site asks the browser to store and to
        send back with every request to that site. Local storage and session
        storage are a different mechanism: the data lives in the browser, is
        never attached to HTTP requests. Scripts running in this page context,
        including the AdSense script when advertising is enabled, may be able to
        read it. IndexedDB is the same idea with room for larger binary data.
      </p>
      <p>
        QUICKKIT&rsquo;s own application code does not intentionally set
        cookies. When advertising is enabled, the AdSense script may read or set
        cookies or similar identifiers, depending on Google&rsquo;s
        configuration and browser settings. The distinction matters because
        rules can apply to storing or reading information on a device, which is
        why local-storage entries are documented below as well.
      </p>

      <h2 id="essential">3. Essential storage</h2>
      <p>
        There is none that persists. Serving a page requires an ordinary HTTP
        request, but QUICKKIT stores nothing to make that work: no session
        identifier, no CSRF token in a cookie, no load-balancer affinity cookie,
        no authentication state — because there is no session, no form that
        posts to a server, and no account.
      </p>

      <h2 id="functional">4. Functional storage</h2>
      <p>
        All site storage is functional: it exists to remember a choice you made,
        and the tool keeps working without it. Every entry is first-party and
        device-local.
      </p>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <caption className="sr-only">
            Functional browser storage created by QUICKKIT
          </caption>
          <thead>
            <tr>
              <th scope="col">Key / database</th>
              <th scope="col">Type</th>
              <th scope="col">What it holds</th>
              <th scope="col">Created when</th>
              <th scope="col">Removed when</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code>quickkit:saved-tools</code>
              </td>
              <td>localStorage</td>
              <td>
                Slugs of tools you hearted. No file content, no personal data.
              </td>
              <td>You tap the heart on a tool card</td>
              <td>You un-heart the last tool, or clear site data</td>
            </tr>
            <tr>
              <td>
                <code>qk:qr-presets:v1</code>
              </td>
              <td>localStorage</td>
              <td>
                Up to 24 named QR design presets (colours, shapes, size, logo).
              </td>
              <td>You save a preset in the QR Code Generator</td>
              <td>You delete the preset, or clear site data</td>
            </tr>
            <tr>
              <td>
                <code>qk:qr-history:v1</code>
              </td>
              <td>localStorage</td>
              <td>
                Up to 20 recent QR generations — content type, a short label,
                design and non-sensitive field values. Wi-Fi passwords and other
                sensitive fields are never written.
              </td>
              <td>You generate a QR code (history panel)</td>
              <td>You clear the history, or clear site data</td>
            </tr>
            <tr>
              <td>
                <code>qk:qr-history-mode:v1</code>
              </td>
              <td>localStorage</td>
              <td>
                Your history preference — &ldquo;designs only&rdquo; keeps all
                content out of storage entirely.
              </td>
              <td>You change the history setting</td>
              <td>Clear site data</td>
            </tr>
            <tr>
              <td>
                <code>qk:i2i-retention</code>, <code>qk:p2w-retention</code>
              </td>
              <td>localStorage</td>
              <td>
                Retention window for the optional conversion histories (session
                / 24 hours / 7 days).
              </td>
              <td>You change the retention setting</td>
              <td>Clear site data</td>
            </tr>
            <tr>
              <td>
                <code>quickkit-image-to-image</code> (IndexedDB)
              </td>
              <td>IndexedDB</td>
              <td>
                Up to 20 converted images so they can be re-downloaded after a
                reload. Opt-in; off by default (&ldquo;session&rdquo;).
              </td>
              <td>You enable history in the Image to Image Converter</td>
              <td>
                Retention window passes, you clear the history, or clear site
                data
              </td>
            </tr>
            <tr>
              <td>
                <code>quickkit-pdf-to-word</code> (IndexedDB)
              </td>
              <td>IndexedDB</td>
              <td>
                Converted DOCX outputs only — never the source PDF. Opt-in; off
                by default.
              </td>
              <td>You enable history in PDF to Word</td>
              <td>
                Retention window passes, you clear the history, or clear site
                data
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="analytics">5. Analytics cookies</h2>
      <p>
        QUICKKIT does not implement a separate analytics product, first-party
        analytics script or server-side visitor counter. When advertising is
        enabled, Google may receive requests and advertising-related data
        through the AdSense script; any publisher reporting depends on its
        account settings. See section 6.
      </p>

      <h2 id="advertising">6. Advertising cookies</h2>
      <p>
        When advertising is enabled, a Google AdSense verification script loads
        on eligible pages. It may access or store cookies or similar advertising
        identifiers under Google&rsquo;s policies and your browser settings.
        This code change adds no explicit ad-slot markup, and the current
        Content Security Policy blocks frames. Serving ads would require a
        separately reviewed CSP and consent configuration. QUICKKIT has no paid
        tier.
      </p>

      <h2 id="inventory">7. Full storage inventory</h2>
      <p>
        The table in <a href="#functional">section 4</a> is the complete list of
        first-party local-storage and IndexedDB entries created by the
        application. When advertising is enabled, any cookies or identifiers
        used by AdSense are outside this first-party inventory; their storage
        context depends on Google&rsquo;s implementation and your browser
        settings.
      </p>

      <h2 id="consent">8. Consent</h2>
      <p>
        The local-storage entries above are functional preferences. When
        advertising is enabled, the AdSense script is a separate
        advertising-platform integration and may use cookies or similar
        identifiers. This release does not include a consent banner or
        consent-management platform.
      </p>
      <p>
        Before enabling ad serving or personalized advertising, the operator
        should review applicable consent requirements and configure AdSense and
        any required consent-management platform for the audience. This is a
        deployment and legal-review requirement, not a claim of compliance.
      </p>
      <p className="legal-review-flag">
        <strong>Legal-review note.</strong> Whether a specific local-storage
        entry requires consent, and which consent standard applies (ePrivacy,
        GDPR, UK PECR, state privacy laws, DPDP Act and others), is a
        jurisdiction-specific legal question. The operator should confirm the
        classification of each entry above has not yet been settled with
        counsel.
      </p>

      <h2 id="third-party">9. Third-party cookies</h2>
      <p>
        When advertising is enabled, the Google AdSense script is embedded on
        eligible QUICKKIT pages and may set or read cookies or similar
        identifiers under Google&rsquo;s policies and your browser settings.
        Fonts are self-hosted, icons are bundled, and social links in the footer
        are ordinary anchors — their destinations can only set cookies after you
        follow a link to those sites.
      </p>

      <h2 id="managing">10. Managing and deleting storage</h2>
      <p>
        Every current browser lets you inspect and delete cookies and site data.
        The path is usually{" "}
        <em>
          Settings → Privacy and security → Third-party cookies / Site data
        </em>
        ; per-site controls are available from the padlock or site-information
        panel in the address bar.
      </p>
      <ul>
        <li>
          Deleting QUICKKIT&rsquo;s site data removes your saved tools, QR
          presets, history and retention choices. Nothing else is affected and
          the tools keep working.
        </li>
        <li>
          Blocking site data entirely only disables those memory features; QR
          generation and every other tool still run.
        </li>
        <li>
          Private or incognito windows discard this storage when the window
          closes, wherever the browser supports it.
        </li>
      </ul>
      <p>
        Downloads and clipboard actions are handled by your browser and
        operating system, not by a cookie or a storage key; see the{" "}
        <Link href="/privacy">Privacy Policy</Link> for those paths.
      </p>

      <h2 id="changes">11. Changes to this policy</h2>
      <p>
        If QUICKKIT ever adds a cookie, an analytics service or any
        non-essential storage, this page will be updated first with what it is,
        what it collects, how long it lasts and how to refuse it — and, where
        the law requires it, an opt-in control will ship at the same time.
      </p>

      <h2 id="contact">12. Contact</h2>
      <p>
        Questions about this policy: use the{" "}
        <Link href="/contact">contact page</Link>, or email <ContactLink />. For
        the broader picture of what the site does with data, read the{" "}
        <Link href="/privacy">Privacy Policy</Link> and the{" "}
        <Link href="/file-handling">File Handling Policy</Link>.
      </p>
    </LegalPageShell>
  );
}
