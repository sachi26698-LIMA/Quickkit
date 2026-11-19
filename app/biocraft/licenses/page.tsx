import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";
import { catalogue, readLicenses } from "@/lib/fonts/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Font licences & attribution",
  description:
    "Every BioCraft Hindi font is listed with its licence, upstream source, version, author attribution and bundled licence file.",
  alternates: { canonical: "/biocraft/licenses" },
};

export default async function LicensesPage() {
  const { licenses } = readLicenses();
  const rejected = catalogue.rejected;

  return (
    <>
      <header style={{ padding: "42px 0 10px" }}>
        <span className="bc-kicker">
          <ShieldCheck size={13} /> Licensing & attribution
        </span>
        <h1
          style={{
            fontSize: "clamp(32px, 4.4vw, 50px)",
            letterSpacing: "-0.04em",
            margin: "16px 0 8px",
            fontWeight: 600,
          }}
        >
          Open fonts, named sources.
        </h1>
        <p className="bc-lede" style={{ marginTop: 0 }}>
          BioCraft only ships families whose licence allows redistribution. Each
          font file is served with its original licence text beside it, and the
          table below is the same machine-readable index the admin panel
          exports.
        </p>
      </header>

      <div className="bc-feature-row" style={{ marginTop: 26 }}>
        <div className="bc-card bc-feature">
          <h3>{licenses.length} families indexed</h3>
          <p>
            Licence, author attribution, upstream version and source repository
            are stored per family in <code>lib/fonts/data/licenses.json</code>.
          </p>
        </div>
        <div className="bc-card bc-feature">
          <h3>{catalogue.stats.licenses.join(" · ")}</h3>
          <p>
            All imported families use the SIL Open Font License 1.1, which
            permits embedding and redistribution as long as the licence travels
            with the font.
          </p>
        </div>
        <div className="bc-card bc-feature">
          <h3>{rejected.length} family withheld</h3>
          <p>
            Rejected imports are kept in the admin validation report with the
            failing checks, but are never served or listed publicly.
          </p>
        </div>
      </div>

      <section className="bc-section" aria-labelledby="licence-table">
        <div className="bc-section-head">
          <div>
            <h2 id="licence-table" style={{ fontSize: 26 }}>
              Attribution index
            </h2>
            <p>
              Source links point to the upstream Google Fonts directory. Version
              numbers are read from the published font metadata, not invented.
            </p>
          </div>
        </div>
        <div className="bc-card" style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
                minWidth: 760,
              }}
            >
              <thead>
                <tr style={{ textAlign: "left", color: "var(--bc-ink-faint)" }}>
                  {[
                    "Family",
                    "Licence",
                    "Version",
                    "Author / copyright",
                    "Source",
                    "Licence file",
                  ].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "12px 14px",
                        borderBottom: "1px solid var(--bc-line)",
                        fontWeight: 600,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={license.slug}>
                    <td
                      style={{
                        padding: "11px 14px",
                        borderBottom: "1px solid var(--bc-line)",
                        fontWeight: 560,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Link href={`/biocraft/fonts/${license.slug}`}>
                        {license.family}
                      </Link>
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        borderBottom: "1px solid var(--bc-line)",
                        color: "var(--bc-green)",
                        fontWeight: 560,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {license.type}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        borderBottom: "1px solid var(--bc-line)",
                        fontFamily: "ui-monospace, monospace",
                        fontSize: 11.5,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {license.version}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        borderBottom: "1px solid var(--bc-line)",
                        color: "var(--bc-ink-soft)",
                        maxWidth: 380,
                      }}
                    >
                      {license.attribution}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        borderBottom: "1px solid var(--bc-line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <a
                        href={license.source}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--bc-accent-deep)" }}
                      >
                        Google Fonts <ExternalLink size={10} />
                      </a>
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        borderBottom: "1px solid var(--bc-line)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {license.licenseFile ? (
                        <a
                          href={license.licenseFile}
                          target="_blank"
                          rel="noreferrer"
                        >
                          OFL.txt <ExternalLink size={10} />
                        </a>
                      ) : (
                        <span style={{ color: "var(--bc-ink-faint)" }}>
                          Not bundled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bc-section">
        <div className="bc-card bc-feature" style={{ padding: 26 }}>
          <h3>If you redistribute a font</h3>
          <p>
            Keep <code>LICENSE.txt</code> with the WOFF2, retain the copyright
            line, and do not sell the font on its own. The OFL permits use in
            commercial designs, embedding in apps and web use. This page is
            attribution and provenance, not legal advice.
          </p>
        </div>
      </section>
    </>
  );
}
