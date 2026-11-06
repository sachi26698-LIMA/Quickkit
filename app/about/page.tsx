import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  MonitorSmartphone,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CategoryIcon from "@/components/category-icon";
import { OwnerPlaceholder } from "@/components/legal-page-shell";
import { categoryMeta, tools, toolsByCategory } from "@/lib/catalog";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  isoDatetime,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import LegalRelated from "@/components/legal-related";
import { ownerDetail } from "@/lib/site";

export const metadata = pageMetadata(
  "About QUICKKIT — free browser tools",
  legalPageByHref("/about")!.description,
  "/about",
);

const principles = [
  {
    Icon: ShieldCheck,
    title: "Private by design",
    text: "Most tools run in your browser. Word to PDF is an explicit-consent exception: documents are sent to operator-controlled LibreOffice processing only when you request conversion. No automatic third-party conversion fallback.",
  },
  {
    Icon: Sparkles,
    title: "Simple on purpose",
    text: "One job per tool, clear instructions, honest limits stated next to the controls. No setup wizard, no account, no dark patterns.",
  },
  {
    Icon: Rocket,
    title: "Fast and lightweight",
    text: "Most work happens locally, while native Word to PDF depends on the operator-controlled engine and connection.",
  },
  {
    Icon: MonitorSmartphone,
    title: "Everywhere you are",
    text: "Desktop, tablet or phone, the layout reflows from 320 pixels up and the tools behave the same way.",
  },
];

const sections = [
  { id: "mission", label: "Mission and purpose" },
  { id: "whats-inside", label: "Main tool categories" },
  { id: "privacy", label: "How privacy is designed in" },
  { id: "devices", label: "Supported devices" },
  { id: "philosophy", label: "Product philosophy" },
  { id: "roadmap", label: "Future development" },
  { id: "operator", label: "Who runs QUICKKIT" },
  { id: "more", label: "Where to go next" },
];

export default function AboutPage() {
  const jurisdiction = ownerDetail("jurisdiction");
  const liveTools = tools.length;

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
            <li aria-current="page">About</li>
          </ol>
        </nav>

        <header className="legal-hero">
          <span className="eyebrow">About QUICKKIT</span>
          <h1>
            Useful tools. <span>Less busywork.</span>
          </h1>
          <p className="legal-intro">
            QUICKKIT is an everyday digital toolkit — {liveTools} free browser
            utilities for the small jobs that interrupt a working day, built so
            most work stays on your device; Word to PDF asks before server
            processing.
          </p>
          <p className="legal-updated">
            <span className="legal-updated-pill">
              Last updated{" "}
              <time {...isoDatetime(LEGAL_LAST_UPDATED_ISO)}>
                {LEGAL_LAST_UPDATED}
              </time>
            </span>
            <span className="legal-updated-note">
              Describes the current build.
            </span>
          </p>
        </header>

        <div className="legal-layout">
          <aside className="legal-sidebar" aria-label="On this page">
            <div className="legal-toc legal-toc--desktop">
              <h2 id="about-toc-title">On this page</h2>
              <ol className="legal-toc-list" aria-labelledby="about-toc-title">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.label}</a>
                  </li>
                ))}
              </ol>
            </div>
            <details className="legal-toc legal-toc--mobile">
              <summary>
                <span>On this page — {sections.length} sections</span>
              </summary>
              <ol className="legal-toc-list">
                {sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.label}</a>
                  </li>
                ))}
              </ol>
            </details>
            <div className="legal-sidebar-help">
              <h2>Get in touch</h2>
              <p>
                <ContactLink /> · <Link href="/contact">Contact page</Link>
              </p>
            </div>
          </aside>

          <div className="legal-body">
            <section id="mission" className="legal-section">
              <h2>Mission and purpose</h2>
              <p>
                Combining PDFs before a deadline. Counting words in an
                application. Turning a link into a QR code for a classroom
                poster. Sizing a photo for a form. These jobs are small,
                frequent and urgent — and they should not require expensive
                software, a sign-up flow, or handing your file to a
                stranger&rsquo;s server.
              </p>
              <p>
                QUICKKIT exists to make them take seconds: open a tool, get the
                result, get back to your day. The constraint we design around is
                simple — if a task can be done on your device, it should be.
              </p>
            </section>

            <section id="whats-inside" className="legal-section">
              <h2>Main tool categories</h2>
              <p>
                {liveTools} tools across seven working categories. Every one of
                them is live; the eighth category, AI Tools, is on the roadmap
                and labelled &ldquo;Coming soon&rdquo; until it is genuinely
                ready.
              </p>
              <div className="more-categories-row about-cat-row">
                {categoryMeta.map((meta) => {
                  const count = toolsByCategory(meta.name).length;
                  return (
                    <Link
                      key={meta.slug}
                      className="more-category-chip"
                      href={`/category/${meta.slug}`}
                    >
                      <span className={`dropdown-icon ${meta.tint}`}>
                        <CategoryIcon meta={meta} size={16} />
                      </span>
                      {meta.name}
                      <span className="more-category-count">
                        {count ? `${count}` : "Soon"}
                      </span>
                    </Link>
                  );
                })}
              </div>
              <ul className="about-cat-list">
                <li>
                  <strong>PDF Tools</strong> — merge, split, compress, convert
                  to and from images, turn PDFs into editable Word documents,
                  and a combined studio for page-level work.
                </li>
                <li>
                  <strong>Image Tools</strong> — compress to a quality or a
                  target size, resize, crop, and convert between JPG, PNG, WebP,
                  AVIF, GIF, BMP and TIFF.
                </li>
                <li>
                  <strong>QR &amp; Barcode</strong> — generate styled QR codes
                  for links, Wi-Fi, contacts and events, with a real decode
                  check before download.
                </li>
                <li>
                  <strong>Text &amp; Writing</strong> — word and character
                  counts, reading-time estimates, and case conversion.
                </li>
                <li>
                  <strong>Developer Tools</strong> — JSON formatting, validation
                  and minification.
                </li>
                <li>
                  <strong>Calculators</strong> — percentages, GST, discounts,
                  loans and EMI, dates, units, temperature and a scientific
                  calculator.
                </li>
                <li>
                  <strong>Security &amp; Privacy</strong> — cryptographically
                  random password generation.
                </li>
              </ul>
              <p>
                <Link className="text-link" href="/tools">
                  Browse all tools <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </p>
            </section>

            <section id="privacy" className="legal-section">
              <h2>How privacy is designed in</h2>
              <p>
                Most tools read files with the browser file picker and process
                them in the tab. Word to PDF is a clearly disclosed exception:
                DOCX files are sent to operator-controlled native processing
                only after consent and a requested conversion. No permanent
                document storage or automatic third-party fallback is used by
                default. Native host isolation, cleanup and retention require
                operator verification before production approval.
              </p>
              <p>
                Every page is served with a Content Security Policy whose{" "}
                <code>connect-src</code> is restricted to this origin, which
                means the browser itself would block an attempt to send your
                file elsewhere. There is no analytics and no advertising: we do
                not add tracking analytics. This browser policy does not prevent
                consented server processing by the Word to PDF private worker.
              </p>
              <p>
                Where privacy is <em>not</em> absolute, we say so: the hosting
                provider necessarily sees ordinary page requests, your browser
                may keep preferences you created, and any email you send us is
                correspondence we hold. All three are documented in the{" "}
                <Link href="/privacy">Privacy Policy</Link> and the{" "}
                <Link href="/file-handling">File Handling Policy</Link>.
              </p>
            </section>

            <section id="devices" className="legal-section">
              <h2>Supported devices and browsers</h2>
              <p>
                QUICKKIT targets current versions of Chrome, Edge, Firefox and
                Safari on desktop, tablet and mobile. Layouts reflow to 320 CSS
                pixels, work at 200% zoom, and every control is operable by
                keyboard. Some outputs depend on what your browser can encode —
                a tool will tell you when a format is unavailable instead of
                silently substituting another.
              </p>
              <p>
                It may not work, or may work partially, on older browsers,
                in-app webviews inside social apps, browsers with JavaScript
                disabled, or devices without the memory for a large file.
                Details are in the{" "}
                <Link href="/accessibility">Accessibility Statement</Link>.
              </p>
            </section>

            <section id="philosophy" className="legal-section">
              <h2>Product philosophy</h2>
              <div className="why-grid about-principles">
                {principles.map(({ Icon, title, text }) => (
                  <div className="why-card" key={title}>
                    <span className="why-icon">
                      <Icon size={24} aria-hidden="true" />
                    </span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
              <p>
                Two further rules shape the work.{" "}
                <strong>Honesty over polish:</strong> every tool states its
                limits beside the control that has them, and the{" "}
                <Link href="/disclaimer">Disclaimer</Link> collects those limits
                in one place. <strong>No dark patterns:</strong> no forced
                sign-up, no artificial wait, no confusing download button, no
                upsell between you and your file.
              </p>
            </section>

            <section id="roadmap" className="legal-section">
              <h2>Future development</h2>
              <p>
                Development proceeds category by category. Calculators, the PDF
                suite and the image suite have shipped; AI Tools and a PDF
                translator are planned, and they are the areas where the
                privacy-first model is hardest to keep. Each of them will be
                described on this page and in the{" "}
                <Link href="/file-handling">File Handling Policy</Link> before
                it ships, including whether any part of it needs a remote
                service.
              </p>
              <p>
                There is no fixed release calendar and nothing here is a promise
                of a date. Features may also be withdrawn if they cannot be made
                to work well on a device.
              </p>
            </section>

            <section id="operator" className="legal-section">
              <h2>Who runs QUICKKIT</h2>
              <p>
                QUICKKIT is an independent project. The legal entity behind it,
                the jurisdiction it operates from and the registered contact
                details are{" "}
                {jurisdiction ? (
                  <>confirmed as {jurisdiction}.</>
                ) : (
                  <>
                    still to be supplied by the operator:{" "}
                    <OwnerPlaceholder what="operator identity and jurisdiction" />
                  </>
                )}{" "}
                Those details will appear in the{" "}
                <Link href="/terms">Terms and Conditions</Link> and the{" "}
                <Link href="/privacy">Privacy Policy</Link> as soon as they are
                verified. Nothing on this site invents a company name,
                registration number or address.
              </p>
            </section>

            <section id="more" className="legal-section">
              <h2>Where to go next</h2>
              <ul>
                <li>
                  Start using the <Link href="/tools">toolkit</Link>, or read
                  the <Link href="/help">Help Center</Link>.
                </li>
                <li>
                  Understand the data model:{" "}
                  <Link href="/privacy">Privacy Policy</Link>,{" "}
                  <Link href="/file-handling">File Handling Policy</Link>,{" "}
                  <Link href="/security">Security Policy</Link>.
                </li>
                <li>
                  Ask something: <Link href="/faq">FAQ</Link> or{" "}
                  <Link href="/contact">contact</Link>.
                </li>
                <li>
                  See everything on the site:{" "}
                  <Link href="/sitemap">sitemap</Link>.
                </li>
              </ul>
            </section>

            <LegalRelated current="/about" />

            <div className="legal-backtotop">
              <a href="#main">Back to top</a>
              <Link href="/tools" className="legal-allpages">
                Explore the tools <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
