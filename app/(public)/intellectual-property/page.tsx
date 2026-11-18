import Link from "next/link";
import LegalPageShell from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import { resolvePageSeo } from "@/lib/seo/pages";
import { legalPageByHref, resolveLegalLastUpdated } from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import { contactEmail, ownerDetail } from "@/lib/site";

// Title composed in the SEO registry (`lib/seo/pages.ts`); the policy text
// itself still lives in `lib/legal.ts`, so the description has one source.
const PAGE_SEO = resolvePageSeo("/intellectual-property")!;
export const metadata = pageMetadata(
  PAGE_SEO.title,
  legalPageByHref("/intellectual-property")!.description,
  "/intellectual-property",
);

export default async function IntellectualPropertyPage() {
  const lastUpdated = await resolveLegalLastUpdated();
  const business = ownerDetail("businessEmail");
  const agent = ownerDetail("copyrightEmail");

  return (
    <LegalPageShell
      href="/intellectual-property"
      title="Intellectual Property & Copyright Policy"
      intro="Who owns what on QUICKKIT, what the open-source licences allow, what you may quote, when you need written permission, and how to report material you believe infringes your rights."
      lastUpdated={lastUpdated.label}
      lastUpdatedIso={lastUpdated.iso}
    >
      <h2 id="quicksummary">1. Summary</h2>
      <ul>
        <li>
          The QUICKKIT brand, design and written content belong to the operator.
        </li>
        <li>
          The software is built on open-source components used under their
          licences; those licences still apply.
        </li>
        <li>
          QUICKKIT&rsquo;s own source code carries no open-source grant — it is
          marked UNLICENSED.
        </li>
        <li>You own your files and the outputs you create with the tools.</li>
        <li>
          Short quotations with credit are welcome; presenting the site or brand
          as your own, or as endorsing you, is not.
        </li>
        <li>
          Copyright complaints and DMCA notices have their own documented
          process, described in sections 8 to 12.
        </li>
      </ul>

      <h2 id="brand">2. Brand and site content</h2>
      <p>
        The following are the operator&rsquo;s intellectual property, protected
        by copyright and, where registered or established through use,
        trademark:
      </p>
      <ul>
        <li>the QUICKKIT name, wordmark and logo;</li>
        <li>
          the interface design — layout, component styling, colour system and
          interaction patterns;
        </li>
        <li>the hero illustration and other original artwork on the site;</li>
        <li>
          the written content: tool descriptions, guides, help material and the
          policy documents published here;
        </li>
        <li>
          the tool catalogue, its categories and the copy describing each tool.
        </li>
      </ul>
      <p>
        Ownership of the brand rests with the operator. The legal entity that
        holds these rights is <strong>the QUICKKIT project itself</strong> — the
        same operator named in the{" "}
        <Link href="/about#operator">About page</Link> and the Terms; no
        separate company is claimed, and brand ownership is not implied by the
        name alone. No trademark registration is claimed on this page.
      </p>

      <h2 id="open-source">3. Open-source components</h2>
      <p>
        QUICKKIT stands on open-source work. The principal components, their
        licences and what they do:
      </p>
      <div className="legal-table-wrap">
        <table role="table" className="legal-table">
          <caption className="sr-only">
            Open-source components used by QUICKKIT
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                Component
              </th>
              <th scope="col" role="columnheader">
                Licence
              </th>
              <th scope="col" role="columnheader">
                Role
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            <tr role="row">
              <td role="cell" data-label="Component">
                pdf.js (pdfjs-dist)
              </td>
              <td role="cell" data-label="Licence">
                Apache-2.0
              </td>
              <td role="cell" data-label="Role">
                PDF parsing and page rendering
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                @cantoo/pdf-lib
              </td>
              <td role="cell" data-label="Licence">
                MIT
              </td>
              <td role="cell" data-label="Role">
                PDF writing, merging, splitting, rewriting
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                tesseract.js
              </td>
              <td role="cell" data-label="Licence">
                Apache-2.0
              </td>
              <td role="cell" data-label="Role">
                On-device OCR engine
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                @tesseract.js-data/eng, hin, guj
              </td>
              <td role="cell" data-label="Licence">
                MIT
              </td>
              <td role="cell" data-label="Role">
                OCR language data (English, Hindi, Gujarati)
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                docx
              </td>
              <td role="cell" data-label="Licence">
                MIT
              </td>
              <td role="cell" data-label="Role">
                Word (.docx) generation
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                docx-preview
              </td>
              <td role="cell" data-label="Licence">
                Apache-2.0
              </td>
              <td role="cell" data-label="Role">
                In-browser Word preview
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                qrcode
              </td>
              <td role="cell" data-label="Licence">
                MIT
              </td>
              <td role="cell" data-label="Role">
                QR matrix generation
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                fflate
              </td>
              <td role="cell" data-label="Licence">
                MIT
              </td>
              <td role="cell" data-label="Role">
                ZIP packaging
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                lucide-react
              </td>
              <td role="cell" data-label="Licence">
                ISC
              </td>
              <td role="cell" data-label="Role">
                Icon set
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Component">
                Next.js, React
              </td>
              <td role="cell" data-label="Licence">
                MIT
              </td>
              <td role="cell" data-label="Role">
                Framework and rendering
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Each component remains under its own licence and copyright. Nothing in
        QUICKKIT&rsquo;s own terms restricts the rights those licences grant
        you, and nothing here re-licenses third-party code. Where a licence
        requires attribution or notice retention, that obligation is preserved.
        The authoritative text for any component is its licence file as
        distributed upstream, not this summary.
      </p>
      <p>
        QUICKKIT&rsquo;s <em>own</em> application code is not open source in
        this release: the package is marked <strong>UNLICENSED</strong>, and no
        permission to copy, modify or redistribute it is granted beyond what
        copyright law allows by default.
      </p>
      <p className="legal-review-flag">
        <strong>Status:</strong> no open-source licence has been chosen for
        QUICKKIT&rsquo;s own code, and none is promised. Until a licence is
        published on this page, <strong>UNLICENSED</strong> is the accurate
        description of the package.
      </p>

      <h2 id="fonts-icons">4. Fonts and icons</h2>
      <p>
        Typography uses the Geist variable font, self-hosted under the SIL Open
        Font License 1.1; the licence text ships in the repository alongside the
        font file. Icons come from Lucide (ISC). Neither is fetched from a
        third-party CDN, so using the site does not create a request to their
        authors.
      </p>

      <h2 id="permitted">5. Permitted use</h2>
      <p>You may, without asking:</p>
      <ul>
        <li>use the tools for personal, educational or commercial work;</li>
        <li>
          quote a short extract of the site&rsquo;s text in a review, article,
          lesson or comparison, with clear attribution and a link to the source
          page;
        </li>
        <li>
          link to any page, including deep links to a specific tool or policy;
        </li>
        <li>
          screenshot the interface for commentary, criticism, teaching or bug
          reporting, provided the screenshot is not presented as your own
          product;
        </li>
        <li>
          use files you generate with the tools however you like — they are
          yours.
        </li>
      </ul>

      <h2 id="not-permitted">6. Uses that need permission</h2>
      <p>You may not, without prior written permission from the operator:</p>
      <ul>
        <li>
          copy, mirror, clone or rehost the site or a substantial part of its
          content, in whole or in part, as a competing service;
        </li>
        <li>
          use the QUICKKIT name, logo or a confusingly similar mark as your own
          brand, domain name, app name, social handle or product name;
        </li>
        <li>
          imply sponsorship, endorsement, partnership or affiliation that does
          not exist;
        </li>
        <li>
          republish the policy documents as your own legal documents — they
          describe QUICKKIT&rsquo;s implementation and are not templates for a
          different product;
        </li>
        <li>
          remove, obscure or alter copyright, licence or attribution notices;
        </li>
        <li>
          train a model on the site&rsquo;s content, or scrape it at scale, for
          commercial redistribution of the content itself.
        </li>
      </ul>
      <p>
        If a use falls outside the permitted list and you are unsure, ask. A
        short email usually settles it, and we would rather grant a reasonable
        request than have an argument later.
      </p>

      <h2 id="user-content">7. Your content and outputs</h2>
      <p>
        You retain all rights in the documents, images and text you process and
        in the results the tools produce. QUICKKIT claims no ownership, no
        licence, no training rights and no reuse rights over them — it never
        receives them in the first place. If a third party claims rights in
        material you converted, that dispute is between you and them; the{" "}
        <Link href="/terms#your-content">Terms and Conditions</Link> put that
        responsibility with you.
      </p>

      <h2 id="reporting">8. Reporting copyright infringement</h2>
      <p>
        If you believe material on QUICKKIT infringes a copyright you own or
        control, send a notice through the{" "}
        <Link href="/contact">contact page</Link> or email{" "}
        <ContactLink channel="copyright" subject="Copyright notice" /> with the
        subject line &ldquo;Copyright notice&rdquo;, and include:
      </p>
      <ol>
        <li>
          identification of the copyrighted work you say is infringed (a title,
          registration number if any, and where the original is published);
        </li>
        <li>
          the exact URL on QUICKKIT where the allegedly infringing material
          appears;
        </li>
        <li>
          your name, postal address, telephone number and email address so we
          can reach you;
        </li>
        <li>
          a statement that you have a good-faith belief the use is not
          authorised by the rights holder, its agent or the law;
        </li>
        <li>
          a statement, under penalty of perjury where that concept applies, that
          the information in your notice is accurate and that you are the rights
          holder or are authorised to act on the holder&rsquo;s behalf;
        </li>
        <li>your physical or electronic signature.</li>
      </ol>
      <p>
        We acknowledge a complete notice, review it, and where it is
        well-founded remove or disable access to the material promptly. We may
        ask for clarification if a notice is incomplete, and we may share the
        notice (or its substance) with the person who supplied the material.
      </p>
      <p>
        One practical note specific to QUICKKIT:{" "}
        <strong>we do not host user-uploaded content.</strong> Your files are
        processed in your own browser and are never stored on a QUICKKIT server,
        so a takedown notice would almost always concern site content — artwork,
        text, a compiled asset — rather than a file somebody uploaded.
      </p>

      <h2 id="dmca">9. DMCA notice process</h2>
      <p>
        The Digital Millennium Copyright Act (17 U.S.C. §512) establishes a
        notice-and-takedown process for online service providers in the United
        States, and a matching counter-notification process. To the extent it
        applies to this site, the elements listed in{" "}
        <a href="#reporting">section 8</a> are designed to satisfy the statutory
        requirements of 17 U.S.C. §512(c)(3).
      </p>
      <p>
        Notices should be sent to the designated copyright contact below. A DMCA
        notice must be substantially complete to be effective, and knowingly
        submitting a materially false notice can give rise to liability under 17
        U.S.C. §512(f).
      </p>
      <p className="legal-owner-line">
        Designated copyright agent (name, postal address and email required by
        17 U.S.C. §512(c)(2)):{" "}
        {agent ? (
          <strong>{agent}</strong>
        ) : contactEmail ? (
          <>
            no agent is published — QUICKKIT names no individual and publishes
            no postal address, so a notice sent to{" "}
            <ContactLink channel="copyright" subject="Copyright notice" /> with
            the subject line &ldquo;Copyright notice&rdquo; reaches the operator
            directly, and no registration with the U.S. Copyright Office is
            claimed.
          </>
        ) : null}
      </p>
      <p className="legal-review-flag">
        <strong>Legal-review note.</strong> Whether QUICKKIT qualifies for DMCA
        safe-harbour protection, whether a registered agent with the U.S.
        Copyright Office is required, and how the equivalent mechanisms work in
        the operator&rsquo;s own jurisdiction are legal determinations. This
        section describes a process; it does not claim safe-harbour status or
        any registration.
      </p>

      <h2 id="counter-notice">10. Counter-notification</h2>
      <p>
        If material you supplied was removed and you believe that was a mistake
        or misidentification, you may send a counter-notification to the same
        address. To be considered it should include:
      </p>
      <ol>
        <li>your name, address, telephone number and email address;</li>
        <li>identification of the removed material and where it appeared;</li>
        <li>
          a statement under penalty of perjury that you have a good-faith belief
          the material was removed as a result of mistake or misidentification;
        </li>
        <li>
          a statement that you consent to the jurisdiction of the federal
          district court for the district in which your address is located (or,
          if outside the United States, any judicial district in which the
          service provider may be found), and that you will accept service of
          process from the person who filed the original notice;
        </li>
        <li>your physical or electronic signature.</li>
      </ol>
      <p>
        Where the process applies, we may forward the counter-notification to
        the original complainant and restore the material after the statutory
        waiting period if no court action is filed. This does not limit our
        ability to keep material removed where we have an independent reason to
        do so.
      </p>

      <h2 id="repeat-infringers">11. Repeat infringers</h2>
      <p>
        Where it applies, QUICKKIT will terminate or restrict access for anyone
        shown to be a repeat infringer. QUICKKIT may restrict access to the site
        or restrict access from the relevant source and remove any material
        involved.
      </p>

      <h2 id="misrepresentation">12. Misrepresentation and misuse</h2>
      <p>
        Do not use this process to suppress criticism, competition, or material
        you simply dislike. Notices are legal documents. Where the law provides
        a remedy for a knowingly false or materially misleading notice (such as
        17 U.S.C. §512(f)), we reserve the right to rely on it, and we may
        decline to act on notices that are abusive, incomplete or repetitive.
      </p>

      <h2 id="permission">13. Requesting permission</h2>
      <p>
        For licensing, trademark use, republication, press assets or partnership
        enquiries, email{" "}
        <ContactLink channel="business" subject="IP permission request" /> (or
        use the <Link href="/contact">contact page</Link>) with the subject line
        &ldquo;IP permission request&rdquo;, describing what you want to use,
        where it will appear, and for how long. Tell us if it is a
        non-commercial or educational use — those are easier to accommodate.
      </p>
      <p>
        A dedicated business or licensing inbox is{" "}
        {business
          ? "configured."
          : contactEmail
            ? "not published: requests go to the same monitored address as everything else."
            : "not published: use the contact page."}{" "}
        Send them to{" "}
        <ContactLink channel="business" subject="IP permission request" /> or
        through the <Link href="/contact">contact page</Link>; they reach the
        same operator, described in the{" "}
        <Link href="/about#operator">About page</Link>.
      </p>

      <h2 id="contact">14. Contact</h2>
      <p>
        Copyright and DMCA notices follow <a href="#reporting">section 8</a> and{" "}
        <a href="#dmca">section 9</a> above, which name the designated contact.
        General enquiries go through the{" "}
        <Link href="/contact">contact page</Link>; brand-related terms are also
        in the <Link href="/terms#ip">Terms and Conditions</Link>.
      </p>
    </LegalPageShell>
  );
}
