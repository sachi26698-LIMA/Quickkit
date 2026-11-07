import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  isoDatetime,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import LegalRelated from "@/components/legal-related";

export const metadata = pageMetadata(
  "Frequently Asked Questions",
  legalPageByHref("/faq")!.description,
  "/faq",
);

type Group = {
  id: string;
  title: string;
  items: { q: string; a: React.ReactNode }[];
};

const groups: Group[] = [
  {
    id: "privacy",
    title: "Privacy and your files",
    items: [
      {
        q: "Are my files uploaded to a server?",
        a: (
          <>
            Most tools process files in your browser; the application does not
            upload them for those conversions. The site also loads a Google
            AdSense verification script on each page. It runs in the page and
            may access page content, so avoid sensitive files if you are not
            comfortable with that third-party access. Word to PDF is a separate
            explicit-consent exception: requesting conversion sends DOCX bytes
            to an operator-controlled native engine or private worker. Read the
            <Link href="/file-handling">File Handling Policy</Link> for details.
          </>
        ),
      },
      {
        q: "Do you use analytics or advertising cookies?",
        a: (
          <>
            There is no analytics SDK or tracking pixel. A Google AdSense
            verification script loads on every page and may use cookies or
            similar identifiers. See the{" "}
            <Link href="/cookies">Cookie Policy</Link> for details and consent
            considerations.
          </>
        ),
      },
      {
        q: "What do you store in my browser?",
        a: (
          <>
            Only what you create by using a feature: your saved tools, QR design
            presets and recent QR generations, and — if you switch it on — an
            optional conversion history with a 24-hour or 7-day expiry. The
            default history setting stores nothing.
          </>
        ),
      },
      {
        q: "Can I work offline?",
        a: (
          <>
            Once a tool page has loaded, the work happens on your device, so a
            dropped connection does not interrupt a conversion already in
            progress. Opening a new page still needs a connection to fetch it.
          </>
        ),
      },
      {
        q: "What happens to a PDF password I type in?",
        a: (
          <>
            It stays in the tab&rsquo;s memory for that operation and is never
            stored or logged. Note that the output is not re-encrypted, so
            protect the result yourself. Only enter a password for a document
            you are entitled to open.
          </>
        ),
      },
    ],
  },
  {
    id: "accounts",
    title: "Accounts and pricing",
    items: [
      {
        q: "Do I need an account?",
        a: "No. There is no sign-up, no login, no email verification and no profile. Open a tool and use it.",
      },
      {
        q: "Is QUICKKIT free?",
        a: (
          <>
            Yes — every tool currently on the site is free, with no paid tier.
            The AdSense verification script is loaded on each page for site
            verification. This change does not add ad placements; serving ads
            would require further CSP and consent configuration.
          </>
        ),
      },
      {
        q: "Why is there no app to install?",
        a: "The tools only need a modern browser. Keeping it in the browser is what lets the processing stay on your device without an installer, an update cycle or an app-store review.",
      },
      {
        q: "Are the saved tools synced between devices?",
        a: "No. Saved tools live in this browser's local storage, so they do not follow you to another device or another browser. Clearing site data removes them.",
      },
    ],
  },
  {
    id: "results",
    title: "Tools and results",
    items: [
      {
        q: "Why did my compressed image get bigger?",
        a: (
          <>
            Re-encoding can increase size, for example when you convert an
            already-optimised JPEG to PNG, or when you choose a high quality
            setting. Compare the before/after sizes shown in the tool before you
            keep the file. See the{" "}
            <Link href="/disclaimer#images">Disclaimer</Link>.
          </>
        ),
      },
      {
        q: "Why does my merged PDF lose bookmarks?",
        a: (
          <>
            Merging rebuilds the document from its pages. Advanced structure —
            bookmarks, attachments, layers, tagged reading order, scripts and
            signature validity — is not carried over. Keep the originals for
            anything you will file or sign.
          </>
        ),
      },
      {
        q: "How accurate is the PDF to Word conversion?",
        a: (
          <>
            Plain paragraphs and simple tables convert well. Multi-column
            layouts, footnotes, equations, floating text boxes and unusual fonts
            are where heuristics struggle, and scanned pages need OCR, which is
            statistical. Proofread the result before you rely on it.
          </>
        ),
      },
      {
        q: "Is the BMI or EMI calculator authoritative?",
        a: (
          <>
            No. BMI is a screening formula, not a diagnosis, and the loan and
            tax calculators produce estimates from the figures and rates you
            enter. They are planning aids, not professional advice — see{" "}
            <Link href="/disclaimer#no-professional-advice">
              the Disclaimer
            </Link>
            .
          </>
        ),
      },
      {
        q: "Is there a PDF translator?",
        a: (
          <>
            Not yet. It is on the roadmap and marked &ldquo;Coming soon&rdquo;.
            The{" "}
            <Link href="/file-handling#pdf-translator">
              File Handling Policy
            </Link>{" "}
            already explains what will be disclosed when it ships.
          </>
        ),
      },
      {
        q: "Can I recover a result after closing the tab?",
        a: "Not from memory — that is cleared on close. If you enabled conversion history before converting, converted outputs can be re-downloaded from the tool within your retention window. The source file is never kept.",
      },
    ],
  },
  {
    id: "devices",
    title: "Browsers and devices",
    items: [
      {
        q: "Which browsers are supported?",
        a: "Current Chrome, Edge, Firefox and Safari on desktop, tablet and mobile. Older browsers, in-app webviews and browsers with JavaScript or storage disabled may not work.",
      },
      {
        q: "Do the tools work on a phone?",
        a: "Yes. Layouts reflow to 320 pixels wide, and the heavy work runs in workers so the interface stays responsive. Very large files are still bound by the device's memory.",
      },
      {
        q: "Why can't I download on some in-app browsers?",
        a: "Many social and messaging apps embed a restricted webview that blocks downloads or storage. Open the page in your real browser instead.",
      },
    ],
  },
  {
    id: "support",
    title: "Getting help",
    items: [
      {
        q: "How do I report a bug?",
        a: (
          <>
            Send a note through the <Link href="/contact">contact page</Link>{" "}
            (or email <ContactLink />) with the tool name, what you expected,
            what happened, and your browser. Please do not attach a private
            document — a description is usually enough. The{" "}
            <Link href="/contact">contact page</Link> lists every channel.
          </>
        ),
      },
      {
        q: "How do I report a security problem?",
        a: (
          <>
            Follow the responsible disclosure process in the{" "}
            <Link href="/security#reporting">Security Policy</Link> rather than
            posting it publicly.
          </>
        ),
      },
      {
        q: "How quickly do you reply?",
        a: "We aim for two to three working days for general messages and within five working days for accessibility and security reports. QUICKKIT is a small operation, so please be patient.",
      },
    ],
  },
  {
    id: "legal",
    title: "Policies",
    items: [
      {
        q: "Where are your legal documents?",
        a: (
          <>
            Each policy has its own page:{" "}
            <Link href="/terms">Terms and Conditions</Link>,{" "}
            <Link href="/privacy">Privacy Policy</Link>,{" "}
            <Link href="/cookies">Cookie Policy</Link>,{" "}
            <Link href="/disclaimer">Disclaimer</Link>,{" "}
            <Link href="/copyright">Copyright &amp; DMCA</Link>,{" "}
            <Link href="/intellectual-property">Intellectual Property</Link>,{" "}
            <Link href="/security">Security</Link>,{" "}
            <Link href="/accessibility">Accessibility</Link> and{" "}
            <Link href="/file-handling">File Handling</Link>. The{" "}
            <Link href="/sitemap">sitemap</Link> lists them together.
          </>
        ),
      },
      {
        q: "Are your policies legally reviewed?",
        a: (
          <>
            Not yet — they have not been through a lawyer. They are written
            against the actual implementation rather than copied from a
            template, and the specific provisions that still need review
            (liability wording, the DMCA agent, retention statements) are
            flagged where they appear on the page.
          </>
        ),
      },
      {
        q: "Do you claim GDPR or other compliance?",
        a: "No. We describe what the software does; we do not claim compliance with any regulation or hold any certification. The site is operated from India and its terms name the law of India; whether a given regulation applies to the operator is a legal question we do not answer for you.",
      },
    ],
  },
];

export default function FaqPage() {
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="home inner-page legal-page">
      <div className="container">
        <nav className="breadcrumbs legal-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/" prefetch={false}>
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li aria-current="page">FAQ</li>
          </ol>
        </nav>

        <header className="legal-hero">
          <span className="eyebrow">QUICKKIT help</span>
          <h1>Frequently Asked Questions</h1>
          <p className="legal-intro">
            {total} direct answers about privacy, accounts, files, results and
            support. If your question is missing, the{" "}
            <Link href="/help">Help Center</Link> has step-by-step guides.
          </p>
          <p className="legal-updated">
            <span className="legal-updated-pill">
              Last updated{" "}
              <time {...isoDatetime(LEGAL_LAST_UPDATED_ISO)}>
                {LEGAL_LAST_UPDATED}
              </time>
            </span>
            <span className="legal-updated-note">
              Answers describe the current build.
            </span>
          </p>
        </header>

        <div className="legal-layout">
          <aside className="legal-sidebar" aria-label="FAQ topics">
            <div className="legal-toc legal-toc--desktop">
              <h2 id="faq-toc-title">Topics</h2>
              <ol className="legal-toc-list" aria-labelledby="faq-toc-title">
                {groups.map((group) => (
                  <li key={group.id}>
                    <a href={`#${group.id}`}>{group.title}</a>
                  </li>
                ))}
              </ol>
            </div>
            <details className="legal-toc legal-toc--mobile">
              <summary>
                <span>Topics — {groups.length} groups</span>
              </summary>
              <ol className="legal-toc-list">
                {groups.map((group) => (
                  <li key={group.id}>
                    <a href={`#${group.id}`}>{group.title}</a>
                  </li>
                ))}
              </ol>
            </details>
            <div className="legal-sidebar-help">
              <h2>Still stuck?</h2>
              <p>
                Use the <Link href="/contact">contact page</Link> or email{" "}
                <ContactLink />.
              </p>
            </div>
          </aside>

          <div className="legal-body">
            {groups.map((group) => (
              <section
                key={group.id}
                id={group.id}
                className="faq-group"
                aria-labelledby={`${group.id}-title`}
              >
                <h2 id={`${group.id}-title`}>{group.title}</h2>
                <div className="faq-list">
                  {group.items.map((item) => (
                    <details key={item.q}>
                      <summary>{item.q}</summary>
                      <p>{item.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            <LegalRelated current="/faq" />

            <div className="legal-backtotop">
              <a href="#main">Back to top</a>
              <Link href="/contact" className="legal-allpages">
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
