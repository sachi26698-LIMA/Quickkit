import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ShieldAlert, ShieldCheck } from "lucide-react";
import JsonLd from "@/components/json-ld";
import {
  BRANDS,
  brandBySlug,
  brandCoverage,
} from "@/lib/tools/batch-code/brands";
import { decoderDoc } from "@/lib/tools/batch-code/decoders";
import { CATEGORY_LABELS, PAO_SOURCE } from "@/lib/tools/batch-code/shelf-life";
import { breadcrumbStructuredData, pageMetadata, siteOrigin } from "@/lib/seo";
import styles from "@/components/tools/batch-code-checker/checker.module.css";

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return BRANDS.map((brand) => ({ slug: brand.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const brand = brandBySlug(slug);
  if (!brand)
    return pageMetadata(
      "Brand record not found",
      "No such brand record.",
      `/tools/batch-code-checker/brand/${slug}`,
    );
  return pageMetadata(
    `${brand.name} batch code: decoder and coverage`,
    `${brand.name} batch code: decoder status, code pattern, shelf-life guidance and the limitation, with no invented date logic or guessed shelf life.`,
    `/tools/batch-code-checker/brand/${brand.slug}`,
  );
}

export default async function BrandPage({ params }: Params) {
  const { slug } = await params;
  const brand = brandBySlug(slug);
  if (!brand) notFound();

  const decoder = decoderDoc(brand.decoderId);
  const coverage = brandCoverage();
  const path = `/tools/batch-code-checker/brand/${brand.slug}`;
  const decoded = brand.decoderStatus !== "none";

  const faqs = [
    {
      q: `Can I decode a ${brand.name} batch code with this tool?`,
      a: decoded
        ? `Yes, through the ${decoder.name} decoder (version ${decoder.version}). ${decoder.what} Limitation: ${decoder.limitation}`
        : `Not from the code alone. No public ${brand.name} document describes how its lot number encodes a date, so the record marks the format as undecodable and the checker returns NOT DECODABLE for it. A date printed on the pack — or the GS1 element string on the label, if there is one — is still read and verified.`,
    },
    {
      q: `What does a ${brand.name} lot number look like?`,
      a: `${brand.pattern}. ${brand.dateLogic}`,
    },
    {
      q: `How long does ${brand.name} last, and where does that figure come from?`,
      a:
        brand.shelfLife.months === null
          ? `No shelf life is claimed for this record: ${brand.shelfLife.note}`
          : `The record uses ${brand.shelfLife.months} months as unopened category guidance for ${brand.categories
              .map((category) => CATEGORY_LABELS[category].toLowerCase())
              .join(
                " / ",
              )}. ${brand.shelfLife.note} Source: ${brand.shelfLife.source}. The printed date on the pack always outranks it.`,
    },
    {
      q: `How do I contact ${brand.name} about a batch code?`,
      a: brand.officialGuidance?.url
        ? `The verified public route in this record is the official site: ${brand.officialGuidance.url}. Quote the full lot code and the printed date; a brand's customer care can read its own serial. No phone number or email is invented here.`
        : `No official brand page could be verified for this record, so no contact is invented. Check the packaging or the retailer you bought from for a support address.`,
    },
  ];

  const faqSchema =
    siteOrigin && faqs.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.q,
            acceptedAnswer: { "@type": "Answer", text: faq.a },
          })),
        }
      : undefined;

  const siblings = BRANDS.filter(
    (entry) =>
      entry.parentGroup === brand.parentGroup && entry.slug !== brand.slug,
  ).slice(0, 8);

  return (
    <div
      className={`container ${styles.workspace}`}
      style={{ paddingBlock: "32px" }}
    >
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/" prefetch={false}>
          Home
        </Link>
        <ChevronRight size={13} />
        <Link href="/tools">Tools</Link>
        <ChevronRight size={13} />
        <Link href="/category/qr-barcode">QR &amp; Barcode</Link>
        <ChevronRight size={13} />
        <Link href="/tools/batch-code-checker">Batch Code Checker</Link>
        <ChevronRight size={13} />
        <span>{brand.name}</span>
      </nav>
      <JsonLd
        data={breadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: "QR & Barcode", path: "/category/qr-barcode" },
          { name: "Batch Code Checker", path: "/tools/batch-code-checker" },
          { name: brand.name, path },
        ])}
      />
      {faqSchema ? <JsonLd data={faqSchema} /> : null}

      <header className={styles.brandHeader}>
        <span className={styles.formHint}>
          {brand.parentGroup} ·{" "}
          {brand.categories
            .map((category) => CATEGORY_LABELS[category])
            .join(" · ")}
        </span>
        <h1>{brand.name} batch codes</h1>
        <span
          className={`${styles.statusPill} ${decoded ? styles.statusPillVerified : ""}`}
        >
          {decoded ? (
            <ShieldCheck size={14} aria-hidden />
          ) : (
            <ShieldAlert size={14} aria-hidden />
          )}
          {decoded
            ? "Documented decoder available"
            : "No brand-specific decoder documented"}
        </span>
        <p>
          {decoded
            ? `${decoder.what} Limitation: ${decoder.limitation}`
            : `This record does not claim a date format for ${brand.name} lot numbers, because no public document describes one. The checker returns NOT DECODABLE for the code itself and still verifies a printed date or a GS1 element string, and the official route to ask the brand is listed below.`}
        </p>
        <div className={styles.ctaRow}>
          <Link
            className={styles.button}
            href={`/tools/batch-code-checker?brand=${brand.slug}`}
          >
            Check a {brand.name} code
          </Link>
          <Link
            className={`${styles.button} ${styles.buttonSecondary}`}
            href="/tools/batch-code-checker"
          >
            All brand records
          </Link>
        </div>
      </header>

      <section className={styles.column} aria-labelledby="record-heading">
        <h2 id="record-heading" style={{ margin: 0, fontSize: 19 }}>
          Decoder record
        </h2>
        <dl className={styles.recordGrid}>
          <dt>Decoder</dt>
          <dd>
            {decoder.name} ·{" "}
            <span className={styles.codeChip}>{brand.decoderId}</span> · version{" "}
            {brand.decoderVersion}
          </dd>
          <dt>Verification status</dt>
          <dd>
            {brand.decoderStatus === "standards"
              ? "Standards-backed: every rule comes from the GS1 General Specifications."
              : brand.decoderStatus === "pattern"
                ? "Pattern-based: recognises a date the manufacturer typed into the code, not a brand algorithm."
                : "Not verified. No manufacturer document, and therefore no decoder."}
          </dd>
          <dt>Code pattern</dt>
          <dd>{brand.pattern}</dd>
          <dt>Date logic</dt>
          <dd>{brand.dateLogic}</dd>
          <dt>Source reference</dt>
          <dd>
            {brand.source.url ? (
              <a
                href={brand.source.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {brand.source.label}
              </a>
            ) : (
              brand.source.label
            )}
          </dd>
          <dt>Last verified</dt>
          <dd>
            {brand.lastVerified ??
              "Never reviewed against a manufacturer document"}
          </dd>
          <dt>Limitation</dt>
          <dd>{brand.limitation}</dd>
          <dt>Unopened shelf life</dt>
          <dd>
            {brand.shelfLife.months === null
              ? "None claimed"
              : `${brand.shelfLife.months} months (${brand.shelfLife.confidence})`}
            <br />
            {brand.shelfLife.note}
            <br />
            <span className={styles.formHint}>
              Source: {brand.shelfLife.source}
            </span>
          </dd>
          <dt>Official support</dt>
          <dd>
            {brand.officialGuidance?.url ? (
              <a
                href={brand.officialGuidance.url}
                target="_blank"
                rel="noreferrer noopener"
              >
                {brand.officialGuidance.label}
              </a>
            ) : (
              "No verified official page in this record"
            )}
          </dd>
        </dl>
      </section>

      <section className={styles.column} aria-labelledby="brand-faq-heading">
        <h2 id="brand-faq-heading" style={{ margin: 0, fontSize: 19 }}>
          {brand.name} questions
        </h2>
        {faqs.map((faq) => (
          <details key={faq.q} className={styles.card}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              {faq.q}
            </summary>
            <p className={styles.cardMethod} style={{ marginTop: 8 }}>
              {faq.a}
            </p>
          </details>
        ))}
      </section>

      <section className={styles.column} aria-labelledby="pao-heading">
        <h2 id="pao-heading" style={{ margin: 0, fontSize: 19 }}>
          The open-jar symbol, separately
        </h2>
        <p className={styles.cardMethod}>
          A jar symbol with 6M, 12M or 24M is the period after opening: the
          months the manufacturer expects the product to stay in good condition
          once opened. It is not a batch-code fact and not the printed expiry
          date — it is a third window, calculated only when you enter the date
          you opened the pack.
        </p>
        <p className={styles.cardEvidence}>{PAO_SOURCE}</p>
      </section>

      <section className={styles.column} aria-labelledby="coverage-heading">
        <h2 id="coverage-heading" style={{ margin: 0, fontSize: 19 }}>
          Coverage in this build
        </h2>
        <p className={styles.cardMethod}>
          {coverage.total} brand records · {coverage.verified} brand-specific
          decoders verified · {coverage.pattern} pattern-only · {coverage.none}{" "}
          documented as undecodable · {coverage.withGuidance} records with a
          verified official site.
        </p>
        <p className={styles.cardEvidence}>
          Counts are computed from the records at build time. No coverage claim
          is made beyond them.
        </p>
      </section>

      {siblings.length ? (
        <section className={styles.column} aria-labelledby="siblings-heading">
          <h2 id="siblings-heading" style={{ margin: 0, fontSize: 19 }}>
            Other {brand.parentGroup} records
          </h2>
          <ul className={styles.siblings}>
            {siblings.map((sibling) => (
              <li key={sibling.slug}>
                <Link href={`/tools/batch-code-checker/brand/${sibling.slug}`}>
                  {sibling.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className={styles.disclaimer}>
        <strong>No invented dates</strong>
        <p>
          This record exists so the checker can be honest about a brand, not so
          it can look comprehensive. A lot number is not a date, and the printed
          date on the pack always takes precedence.
        </p>
      </div>
    </div>
  );
}
