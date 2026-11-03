import Link from "next/link";
import { contactEmail } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Cookie Policy — what QUICKKIT stores (and doesn’t)",
  "QUICKKIT uses no analytics or advertising cookies. Learn what cookies are, what this site stores locally, and how to manage it.",
  "/cookies",
);

export default function Page() {
  return (
    <article className="container prose legal">
      <span className="eyebrow">Small files, plain language</span>
      <h1>Cookie Policy</h1>
      <p className="legal-updated">
        Last updated: 1 November 2026. This page describes the current QUICKKIT
        implementation.
      </p>

      <h2>The short version</h2>
      <p>
        QUICKKIT does not use analytics, advertising or tracking cookies, and it
        does not run third-party trackers. The only thing stored on your device
        by the site itself is a small local-storage entry for your Saved Tools
        list — and only if you use the save (heart) feature.
      </p>

      <h2>What cookies are</h2>
      <p>
        Cookies are small text files a website asks your browser to store. They
        can be essential (keeping you signed in), functional (remembering
        preferences) or used for analytics and advertising. Browser “local
        storage” is a related technology: data stored by the site in your
        browser that is <em>not</em> automatically sent with each request the
        way cookies are.
      </p>

      <h2>What QUICKKIT stores today</h2>
      <ul>
        <li>
          <strong>Saved Tools (local storage).</strong> When you tap the heart
          on a tool card, its name is saved under the key{" "}
          <code>quickkit:saved-tools</code> in your browser’s local storage so
          the Saved page can show your list. It never leaves your device,
          contains no personal information, and you can clear it by un-saving
          tools or clearing your browser data.
        </li>
        <li>
          <strong>Essential request handling.</strong> Serving pages requires
          ordinary HTTP requests to our hosting provider. QUICKKIT sets no
          cookies for this, and there are no user accounts to keep signed in.
        </li>
      </ul>

      <h2>Analytics and third-party cookies</h2>
      <p>
        None. This release contains no analytics SDK, advertising network,
        embedded social widgets or other third-party scripts that could set
        cookies. Links to social profiles are plain outbound links — those sites
        have their own policies once you visit them.
      </p>

      <h2>Managing cookies and local storage</h2>
      <p>
        Every modern browser lets you view, block and delete cookies and site
        data (usually under Settings → Privacy). Blocking storage will simply
        disable the Saved Tools list; every tool keeps working. Note that
        downloads and clipboard actions are handled by your browser and
        operating system as described in our{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        If we ever add cookies or analytics, we will update this page first,
        explain what changed and why, and assess consent requirements before
        anything is stored.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy:{" "}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or via the{" "}
        <Link href="/contact">contact page</Link>. (This is our current contact
        address while QUICKKIT is in active development.)
      </p>
    </article>
  );
}
