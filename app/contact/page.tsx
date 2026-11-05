import Link from "next/link";
import {
  Bug,
  ChevronRight,
  Copyright,
  Handshake,
  Mail,
  MessageCircleQuestion,
  ShieldCheck,
  Clock,
  Lock,
} from "lucide-react";
import ContactForm from "@/components/contact-form";
import { OwnerPlaceholder } from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  isoDatetime,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import LegalRelated from "@/components/legal-related";
import {
  contactEmail,
  contactFormEndpoint,
  ownerDetail,
  type ContactChannel,
} from "@/lib/site";

export const metadata = pageMetadata(
  "Contact QUICKKIT — support, privacy, security and business",
  legalPageByHref("/contact")!.description,
  "/contact",
);

const channels: {
  id: ContactChannel;
  label: string;
  detail: string;
  Icon: typeof Mail;
  href: string;
}[] = [
  {
    id: "support",
    label: "General & technical support",
    detail:
      "Questions about a tool, a bug report, a feature request, or help understanding a result.",
    Icon: MessageCircleQuestion,
    href: "/faq#support",
  },
  {
    id: "privacy",
    label: "Privacy requests",
    detail:
      "Access, deletion or questions about what the site stores. Subject line: “Privacy request”.",
    Icon: Lock,
    href: "/privacy#rights",
  },
  {
    id: "security",
    label: "Security reports",
    detail:
      "Vulnerability disclosure. Please do not post security issues publicly — follow the policy.",
    Icon: ShieldCheck,
    href: "/security#reporting",
  },
  {
    id: "copyright",
    label: "Copyright complaints",
    detail:
      "Notices of claimed infringement and counter-notifications, with the details the policy lists.",
    Icon: Copyright,
    href: "/copyright#reporting",
  },
  {
    id: "business",
    label: "Business & licensing",
    detail:
      "Partnerships, permission to reuse the brand or content, press assets, and IP licensing.",
    Icon: Handshake,
    href: "/intellectual-property#permission",
  },
];

const sections = legalPageByHref("/contact")!.sections;

export default function ContactPage() {
  const dedicated = (
    [
      "privacyEmail",
      "securityEmail",
      "copyrightEmail",
      "businessEmail",
    ] as const
  ).filter((key) => ownerDetail(key));

  return (
    <div className="home inner-page legal-page">
      <div className="container">
        <nav className="breadcrumbs legal-breadcrumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li aria-current="page">Contact</li>
          </ol>
        </nav>

        <header className="legal-hero">
          <span className="eyebrow">We read every message</span>
          <h1>
            Contact <span>Us</span>
          </h1>
          <p className="legal-intro">
            Questions, bug reports, privacy requests, copyright complaints and
            business enquiries — here is where each one should go, and what to
            expect.
          </p>
          <p className="legal-updated">
            <span className="legal-updated-pill">
              Last updated{" "}
              <time {...isoDatetime(LEGAL_LAST_UPDATED_ISO)}>
                {LEGAL_LAST_UPDATED}
              </time>
            </span>
            <span className="legal-updated-note">
              Channels depend on owner-supplied details.
            </span>
          </p>
        </header>

        <div className="legal-layout">
          <aside className="legal-sidebar" aria-label="On this page">
            <div className="legal-toc legal-toc--desktop">
              <h2 id="contact-toc-title">On this page</h2>
              <ol
                className="legal-toc-list"
                aria-labelledby="contact-toc-title"
              >
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
          </aside>

          <div className="legal-body">
            <section id="channels" className="legal-section contact-channels">
              <h2 id="channels-title">Where to send what</h2>
              <p>
                Routing your message correctly is the fastest way to get a
                useful answer. Each route below names the policy that governs
                it.
              </p>
              <div className="contact-channel-grid">
                {channels.map(({ id, label, detail, Icon, href }) => (
                  <div className="contact-channel-card" key={id}>
                    <span className="why-icon">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3>{label}</h3>
                    <p>{detail}</p>
                    <p className="contact-channel-address">
                      <ContactLink channel={id} />
                    </p>
                    <Link href={href} className="contact-channel-link">
                      Read the policy
                    </Link>
                  </div>
                ))}
              </div>
              <p className="legal-owner-line">
                {contactEmail ? (
                  <>
                    Every route above currently resolves to the same{" "}
                    {dedicated.length ? "partially" : "single"} configured
                    mailbox. A dedicated privacy, security, copyright and
                    business inbox each make response handling clearer.
                  </>
                ) : (
                  <>
                    No contact address is published yet: the address this
                    repository shipped with was a development placeholder, it
                    was never confirmed as a monitored inbox, and it has been
                    withdrawn rather than left to swallow messages. The operator
                    needs to supply{" "}
                    <OwnerPlaceholder what="a verified, monitored contact address" />
                  </>
                )}
              </p>
            </section>

            <div className="contact-layout contact-layout--below">
              <aside className="contact-cards" aria-label="Practical details">
                <div
                  className="contact-card"
                  role="region"
                  aria-labelledby="contact-email-title"
                >
                  <span className="why-icon">
                    <Mail size={24} aria-hidden="true" />
                  </span>
                  <h2 id="contact-email-title">Email</h2>
                  <p>
                    <ContactLink />
                  </p>
                  {contactEmail ? (
                    <span className="contact-card-cta">
                      Opens your email app, or copy the address.
                    </span>
                  ) : (
                    <span className="contact-card-cta">
                      Unpublished pending owner confirmation
                    </span>
                  )}
                </div>
                <div className="contact-card">
                  <span className="why-icon">
                    <Clock size={24} aria-hidden="true" />
                  </span>
                  <h2 id="response">Response times</h2>
                  <p>
                    General messages: two to three working days. Privacy
                    requests: acknowledged promptly, answered within the period
                    the applicable law requires. Accessibility and security
                    reports: within five working days.
                  </p>
                </div>
                <div
                  className="contact-card"
                  role="region"
                  aria-labelledby="contact-bug-title"
                >
                  <span className="why-icon">
                    <Bug size={24} aria-hidden="true" />
                  </span>
                  <h2 id="contact-bug-title">Reporting a bug</h2>
                  <p>
                    Include the tool name, what you expected, what happened,
                    your browser and, if a file is involved, its type and
                    approximate size — not the file.
                  </p>
                </div>
                <p className="contact-privacy-note">
                  <ShieldCheck size={16} aria-hidden="true" /> Please
                  don&rsquo;t send passwords, private documents or personal
                  data. QUICKKIT tools never need your file sent anywhere, so a
                  description is enough for us to reproduce a problem.
                </p>
              </aside>

              <section
                id="form"
                className="contact-form-panel legal-section"
                aria-labelledby="form-title"
              >
                <h2 id="form-title">Send a message</h2>
                <p className="contact-form-lede">
                  {contactFormEndpoint
                    ? "This form sends your message straight to the operator."
                    : contactEmail
                      ? "This form opens your own email app with the message pre-filled — nothing is transmitted to a server by this page."
                      : "No contact channel is open yet, so this form is disabled until the operator supplies a verified address."}
                </p>
                <ContactForm />
                <div className="contact-form-notes">
                  <h3 id="privacy-requests">Privacy requests</h3>
                  <p>
                    Because QUICKKIT stores no files, there is usually nothing
                    to export or delete on our side. What we can answer is
                    whether an email you sent is still held, and how to clear
                    any browser-side storage entry yourself. See{" "}
                    <Link href="/privacy#rights">Privacy Policy §13</Link>.
                  </p>
                  <h3 id="copyright">Copyright complaints</h3>
                  <p>
                    Notices should include the six elements listed in the{" "}
                    <Link href="/copyright#reporting">Copyright Policy</Link>. A
                    complete notice is actioned faster than a link with no
                    detail.
                  </p>
                  <h3 id="business">Business enquiries</h3>
                  <p>
                    Describe the use, where it will appear and for how long.{" "}
                    <Link href="/intellectual-property#permission">
                      IP permission requests
                    </Link>{" "}
                    are handled through the same route.
                  </p>
                  <h3 id="security-reports">Security reports</h3>
                  <p>
                    Report vulnerabilities through the disclosure process in the{" "}
                    <Link href="/security#reporting">Security Policy</Link> —
                    not in a public post. Please include reproduction steps and
                    redact anything sensitive.
                  </p>
                  <h3 id="before-you-write">Before you write</h3>
                  <p>
                    Many questions are already answered in the{" "}
                    <Link href="/faq">FAQ</Link> and the{" "}
                    <Link href="/help">Help Center</Link>. If yours is about how
                    data is handled, the{" "}
                    <Link href="/file-handling">File Handling Policy</Link>{" "}
                    answers it tool by tool.
                  </p>
                </div>
                <LegalRelated current="/contact" />
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
