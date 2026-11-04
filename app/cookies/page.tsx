import Link from "next/link";
import LegalPageShell from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import { contactEmail } from "@/lib/site";

export const metadata = pageMetadata(
  "Cookie Policy — what QUICKKIT stores (and doesn’t)",
  legalPageByHref("/cookies")!.description,
  "/cookies",
);

export default function CookiesPage() {
  return (
    <LegalPageShell
      href="/cookies"
      title="Cookie Policy"
      intro="QUICKKIT sets zero cookies. This page documents the browser storage the site can create when you use a feature, why each entry exists, and how to remove it."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="summary">1. The short version</h2>
      <ul>
        <li>
          <strong>Cookies: none.</strong> The site does not set a first-party
          cookie, and nothing on the page sets a third-party one.
        </li>
        <li>
          <strong>Local storage and IndexedDB:</strong> used only for
          preferences you create by using a feature — saved tools, QR presets,
          optional conversion history.
        </li>
        <li>
          <strong>Analytics or advertising:</strong> none, so there is no
          consent banner to dismiss.
        </li>
      </ul>

      <h2 id="what-are-cookies">2. Cookies and local storage explained</h2>
      <p>
        A cookie is a small text file a site asks the browser to store and to
        send back with every request to that site. Local storage and session
        storage are a different mechanism: the data lives in the browser, is
        never attached to HTTP requests, and is readable only by scripts from
        the same origin. IndexedDB is the same idea with room for larger binary
        data.
      </p>
      <p>
        QUICKKIT uses no cookies at all. The distinction matters because the
        strictest cookie-consent rules are triggered by setting or reading
        information on a device — which is why the local-storage entries below
        are documented in full even though they are not cookies.
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
        None. No analytics product, no first-party analytics script, no
        server-side visitor counting is implemented. We do not know how many
        people visit, which tools are popular, or which pages you read — and
        that is a deliberate trade: it also means we cannot see you.
      </p>

      <h2 id="advertising">6. Advertising cookies</h2>
      <p>
        None. There is no ad network, no affiliate pixel, no retargeting tag and
        no third-party remarketing script anywhere in the release. QUICKKIT has
        no paid tier and no ads.
      </p>

      <h2 id="inventory">7. Full storage inventory</h2>
      <p>
        The table in <a href="#functional">section 4</a> is the complete list.
        If you inspect your browser&rsquo;s site-data panel for this origin,
        those are the only entries QUICKKIT can create. Anything else under this
        domain would be the result of a browser extension or a third-party tool
        you installed, not this site.
      </p>

      <h2 id="consent">8. Consent</h2>
      <p>
        Consent is required for storage that is not strictly necessary. The
        entries above are either strictly necessary for a feature you explicitly
        switched on, or created by an action you took (hearting a tool, saving a
        preset, enabling history). They are not used for tracking, profiling,
        advertising or cross-site identification.
      </p>
      <p>
        Because no non-essential tracking exists, there is no consent banner.
        Adding one over storage that carries no tracking would be theatre; if
        non-essential storage is ever introduced, a real opt-in mechanism will
        be added first, and this page updated before it is deployed.
      </p>
      <p className="legal-review-flag">
        <strong>Needs legal review before publication.</strong> Whether a
        specific local-storage entry requires consent, and which consent
        standard applies (ePrivacy, GDPR, UK PECR, state privacy laws, DPDP Act
        and others), is a jurisdiction-specific legal question. The operator
        should confirm the classification of each entry above with counsel
        before launch.
      </p>

      <h2 id="third-party">9. Third-party cookies</h2>
      <p>
        There are no embedded third-party frames, widgets, fonts, scripts or
        pixels on QUICKKIT pages, so no third party can set or read a cookie
        here. Fonts are self-hosted, icons are bundled, and the social links in
        the footer are ordinary anchors — a cookie from Instagram, X, YouTube,
        GitHub or LinkedIn can only appear after you follow the link to their
        site, under their policy.
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
        Questions about this policy:{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or the{" "}
        <Link href="/contact">contact page</Link>. For the broader picture of
        what the site does with data, read the{" "}
        <Link href="/privacy">Privacy Policy</Link> and the{" "}
        <Link href="/file-handling">File Handling Policy</Link>.
      </p>
    </LegalPageShell>
  );
}
