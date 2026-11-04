import Link from "next/link";
import { ArrowRight, ChevronRight, Mail, ShieldAlert } from "lucide-react";
import { legalPages, legalPageByHref } from "@/lib/legal";
import { contactEmail, hasOwnerDetail, ownerDetail } from "@/lib/site";

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
  const related = legalPages.filter((candidate) => candidate.href !== href);
  const missing: string[] = [
    !hasOwnerDetail("legalName") ? "the operator's legal name" : null,
    !hasOwnerDetail("jurisdiction") ? "the governing jurisdiction" : null,
  ].filter(Boolean) as string[];

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
              Last updated <time dateTime={lastUpdatedIso}>{lastUpdated}</time>
            </span>
            <span className="legal-updated-note">
              Draft — pending owner details and legal review.
            </span>
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
            <div className="legal-toc">
              <h2>On this page</h2>
              <ol>
                {page?.sections.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`}>{section.label}</a>
                  </li>
                ))}
              </ol>
            </div>
            <div className="legal-sidebar-help">
              <h2>Questions about this page?</h2>
              <p>
                Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or
                use the <Link href="/contact">contact page</Link>.
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
                tell us — policy clarity is a bug we want to fix. Write to{" "}
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or use the{" "}
                <Link href="/contact">contact page</Link>.
              </p>
            </section>

            <nav className="legal-related" aria-labelledby="related-title">
              <h2 id="related-title">Related pages</h2>
              <ul>
                {related.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <span>{item.title}</span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

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
              information, not legal advice, and it should be reviewed by a
              qualified lawyer
              {ownerDetail("jurisdiction")
                ? ` in ${ownerDetail("jurisdiction")}`
                : ""}{" "}
              before QUICKKIT is launched publicly.
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline marker for a detail only the owner can supply. Rendered as visible
 * text (not an `aria-hidden` decoration) so assistive technology announces the
 * gap too.
 */
export function OwnerPlaceholder({ what }: { what: string }) {
  return (
    <span className="owner-placeholder">
      <span className="owner-placeholder-label">Owner to supply</span>
      <span className="owner-placeholder-what">{what}</span>
    </span>
  );
}
