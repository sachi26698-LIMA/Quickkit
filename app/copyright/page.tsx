import Link from "next/link";
import LegalPageShell, {
  OwnerPlaceholder,
} from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import { ownerDetail } from "@/lib/site";

export const metadata = pageMetadata(
  "Copyright and DMCA Policy",
  legalPageByHref("/copyright")!.description,
  "/copyright",
);

export default function CopyrightPage() {
  const agent = ownerDetail("copyrightEmail");

  return (
    <LegalPageShell
      href="/copyright"
      title="Copyright and DMCA Policy"
      intro="How copyright applies to QUICKKIT, what you may reuse, and the process for reporting material you believe infringes your rights."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="ownership">1. QUICKKIT&rsquo;s own material</h2>
      <p>
        The QUICKKIT name, wordmark, logo, illustration, interface design,
        written copy and the structure of this website are the property of the
        operator or its licensors and are protected by copyright and, where
        applicable, trademark law. That protection exists from the moment the
        work is created; no registration is required for it to apply in most
        jurisdictions.
      </p>
      <p>
        The tools themselves are assembled from open-source libraries used under
        their licences (see <a href="#third-party-ip">section 2</a>). The
        application source code is currently published as{" "}
        <strong>UNLICENSED</strong> — no open-source licence has been granted
        for QUICKKIT&rsquo;s own code. Do not assume you may reuse it.
      </p>

      <h2 id="third-party-ip">2. Third-party intellectual property</h2>
      <p>
        QUICKKIT depends on the open-source community. The principal components
        and their licences are:
      </p>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <caption className="sr-only">
            Third-party software and licences
          </caption>
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col">Licence</th>
              <th scope="col">Used for</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>pdf.js (pdfjs-dist)</td>
              <td>Apache-2.0</td>
              <td>Parsing and rendering PDF pages</td>
            </tr>
            <tr>
              <td>@cantoo/pdf-lib</td>
              <td>MIT</td>
              <td>Writing and restructuring PDF files</td>
            </tr>
            <tr>
              <td>tesseract.js + eng/hin/guj data</td>
              <td>Apache-2.0 / MIT</td>
              <td>On-device optical character recognition</td>
            </tr>
            <tr>
              <td>docx, docx-preview</td>
              <td>MIT / Apache-2.0</td>
              <td>Generating and previewing Word documents</td>
            </tr>
            <tr>
              <td>qrcode</td>
              <td>MIT</td>
              <td>QR matrix generation</td>
            </tr>
            <tr>
              <td>fflate</td>
              <td>MIT</td>
              <td>ZIP archive creation</td>
            </tr>
            <tr>
              <td>Lucide</td>
              <td>ISC</td>
              <td>Interface icons</td>
            </tr>
            <tr>
              <td>Geist (variable font)</td>
              <td>SIL Open Font License 1.1</td>
              <td>Typography, self-hosted</td>
            </tr>
            <tr>
              <td>Next.js, React</td>
              <td>MIT</td>
              <td>Application framework</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        These licences remain in force and their notices are preserved in the
        repository. Nothing on this page modifies, limits or replaces them. If
        you believe a component is used in a way its licence does not permit,
        please tell us — that is a bug we will take seriously.
      </p>
      <p className="legal-review-flag">
        <strong>Owner action:</strong> confirm the packaged licence inventory
        (including transitive dependencies and their notices) before any public
        distribution of the source, and keep third-party notice files with the
        distribution. A fuller inventory must accompany a source release.
      </p>

      <h2 id="user-outputs">3. Your files and outputs</h2>
      <p>
        You own the documents and images you process, and the files QUICKKIT
        produces for you. QUICKKIT does not claim any right over them and never
        receives a copy. Where the source material belongs to a third party, the
        right to make copies or derivative versions is yours to establish, not
        ours.
      </p>

      <h2 id="reporting">4. Reporting infringement</h2>
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
        We will acknowledge a complete notice, review it, and where it is
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

      <h2 id="dmca">5. DMCA notice process</h2>
      <p>
        The Digital Millennium Copyright Act (17 U.S.C. §512) establishes a
        notice-and-takedown process for online service providers in the United
        States, and a matching counter-notification process. To the extent it
        applies to this site, the elements listed in{" "}
        <a href="#reporting">section 4</a> are designed to satisfy the statutory
        requirements of 17 U.S.C. §512(c)(3).
      </p>
      <p>
        Notices should be sent to the designated copyright contact below. Please
        note that a DMCA notice must be substantially complete to be effective,
        and that knowingly submitting a materially false notice can give rise to
        liability under 17 U.S.C. §512(f).
      </p>
      <p className="legal-owner-line">
        Designated copyright agent (name, postal address and email required by
        17 U.S.C. §512(c)(2)):{" "}
        {agent ? (
          <strong>{agent}</strong>
        ) : (
          <OwnerPlaceholder what="designated copyright agent name and postal address" />
        )}
      </p>
      <p className="legal-review-flag">
        <strong>Needs legal review before publication.</strong> Whether QUICKKIT
        qualifies for DMCA safe-harbour protection, whether a registered agent
        with the U.S. Copyright Office is required, and how the equivalent
        mechanisms work in the operator&rsquo;s own jurisdiction are legal
        determinations. This section describes a process; it does not claim
        safe-harbour status or any registration.
      </p>

      <h2 id="counter-notice">6. Counter-notification</h2>
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

      <h2 id="repeat-infringers">7. Repeat infringers</h2>
      <p>
        Where it applies, QUICKKIT will terminate or restrict access for anyone
        shown to be a repeat infringer. In practice the site has no accounts to
        terminate; the equivalent is to block access from the relevant source
        and to remove any material involved.
      </p>

      <h2 id="misrepresentation">8. Misrepresentation and misuse</h2>
      <p>
        Do not use this process to suppress criticism, competition, or material
        you simply dislike. Notices are legal documents. Where the law provides
        a remedy for a knowingly false or materially misleading notice (such as
        17 U.S.C. §512(f)), we reserve the right to rely on it, and we may
        decline to act on notices that are abusive, incomplete or repetitive.
      </p>

      <h2 id="contact">9. Designated contact</h2>
      <p>
        Copyright notices and counter-notices go to{" "}
        <ContactLink channel="copyright" subject="Copyright notice" /> (or
        through the <Link href="/contact">contact page</Link>). Please include
        &ldquo;Copyright notice&rdquo; or &ldquo;Counter-notification&rdquo; in
        the subject line so it is routed correctly. General enquiries go through
        the <Link href="/contact">contact page</Link>; brand and licensing
        questions are covered by the{" "}
        <Link href="/intellectual-property">Intellectual Property Policy</Link>.
      </p>
    </LegalPageShell>
  );
}
