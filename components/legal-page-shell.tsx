import Link from "next/link";
import { ArrowRight, ChevronRight, Mail, ShieldAlert } from "lucide-react";
import { isoDatetime, legalPageByHref } from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import LegalRelated from "@/components/legal-related";
import OwnerPlaceholder from "@/components/owner-placeholder";
import { hasOwnerDetail, ownerDetail } from "@/lib/site";

/**
 * Server-rendered shell shared by every legal / information page.
 *
 * It owns the chrome that must never differ between documents:
 *   1. breadcrumbs, 2. title + intro, 3. last-updated line,
 *   4. table of contents, 5. related-page sidebar, 6. back-to-top,
 *   7. feedback link.
 * The body itself is written per page — this is a design system, not a template
 * that flattens every document into the same words.
 *
 * The "owner input required" notice is derived from `lib/site.ts`, so it
 * disappears by itself once the operator supplies the missing details.
 */
export default function LegalPageShell({
  href,
  title,
  intro,
  lastUpdated,
  lastUpdatedIso,
  children,
}: {
  href: string;
  title: string;
  intro: string;
  lastUpdated: string;
  lastUpdatedIso: string;
  children: React.ReactNode;
}) {
  const page = legalPageByHref(href);
  const sections = page?.sections ?? [];
  const missing: string[] = [
    !hasOwnerDetail("legalName") ? "the operator's legal name" : null,
    !hasOwnerDetail("jurisdiction") ? "the governing jurisdiction" : null,
    !hasOwnerDetail("publicEmail") ? "a verified contact address" : null,
  ].filter(Boolean) as string[];

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
            <li>
              <Link href="/sitemap">Policies &amp; information</Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight size={12} />
            </li>
            <li aria-current="page">{title}</li>
          </ol>
        </nav>

        <header className="legal-hero">
          <span className="eyebrow">QUICKKIT policies</span>
          <h1>{title}</h1>
          <p className="legal-intro">{intro}</p>
          <p className="legal-updated">
            <span className="legal-updated-pill">
              Last updated{" "}
              <time {...isoDatetime(lastUpdatedIso)}>{lastUpdated}</time>
            </span>
            {missing.length ? (
              <span className="legal-updated-note">
                Draft — pending owner details.
              </span>
            ) : null}
          </p>
        </header>

        {missing.length ? (
          <div className="legal-notice legal-owner-notice" role="note">
            <strong>
              <ShieldAlert size={16} aria-hidden="true" /> Owner input required
            </strong>
            <p>
              This document is a draft written against QUICKKIT&rsquo;s actual
              implementation. Still to be supplied by the operator:{" "}
              {missing.join(" and ")}. Anything marked{" "}
              <span className="owner-placeholder-inline">Owner to supply</span>{" "}
              is a placeholder, not a claim. See{" "}
              <Link href="/sitemap">the sitemap</Link> for the full policy set
              and <Link href="/contact">contact</Link> if you need clarity on
              status.
            </p>
          </div>
        ) : null}

        <div className="legal-layout">
          <aside className="legal-sidebar" aria-label="On this page">
            {/* Desktop: a persistent panel beside the document.
                Mobile/tablet: the same entries as a closed disclosure. Only one
                copy is rendered visible at any breakpoint via CSS, and each has
                its own id so neither duplicates an in-page anchor target. */}
            <div className="legal-toc legal-toc--desktop">
              <h2 id="toc-desktop-title">On this page</h2>
              <ol
                className="legal-toc-list"
                aria-labelledby="toc-desktop-title"
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
            <div className="legal-sidebar-help">
              <h2>Questions about this page?</h2>
              <p>
                Use the <Link href="/contact">contact page</Link>, or email{" "}
                <ContactLink />.
              </p>
            </div>
          </aside>

          <article className="prose legal legal-body">
            {children}

            <hr className="legal-divider" />

            <section
              className="legal-feedback"
              aria-labelledby="feedback-title"
            >
              <h2 id="feedback-title">Was this page clear?</h2>
              <p>
                If something here is wrong, out of date or hard to understand,
                tell us — policy clarity is a bug we want to fix. Use the{" "}
                <Link href="/contact">contact page</Link>, or write to{" "}
                <ContactLink />.
              </p>
            </section>

            <LegalRelated current={href} />

            <div className="legal-backtotop">
              <a href="#main">
                Back to top <ArrowRight size={14} aria-hidden="true" />
              </a>
              <Link href="/sitemap" className="legal-allpages">
                All policies <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            <p className="legal-review-note">
              <Mail size={14} aria-hidden="true" /> This document is written in
              plain language to describe the software as built. It is
              information, not legal advice
              {missing.length
                ? `, and it should be reviewed by a qualified lawyer${
                    ownerDetail("jurisdiction")
                      ? ` in ${ownerDetail("jurisdiction")}`
                      : ""
                  } before QUICKKIT is launched publicly`
                : ". Questions about this page are welcome at any time"}
              .
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}

// Re-exported so existing imports from this module keep working.
export { OwnerPlaceholder };
