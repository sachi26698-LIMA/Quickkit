import Link from "next/link";
import LegalPageShell from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";
import { contactEmail, ownerDetail } from "@/lib/site";

export const metadata = pageMetadata(
  "Intellectual Property Policy",
  legalPageByHref("/intellectual-property")!.description,
  "/intellectual-property",
);

export default function IntellectualPropertyPage() {
  const business = ownerDetail("businessEmail");

  return (
    <LegalPageShell
      href="/intellectual-property"
      title="Intellectual Property Policy"
      intro="Who owns what on QUICKKIT, what the open-source licences allow, what you may quote, and when you need written permission."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
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
        <table className="legal-table">
          <caption className="sr-only">
            Open-source components used by QUICKKIT
          </caption>
          <thead>
            <tr>
              <th scope="col">Component</th>
              <th scope="col">Licence</th>
              <th scope="col">Role</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>pdf.js (pdfjs-dist)</td>
              <td>Apache-2.0</td>
              <td>PDF parsing and page rendering</td>
            </tr>
            <tr>
              <td>@cantoo/pdf-lib</td>
              <td>MIT</td>
              <td>PDF writing, merging, splitting, rewriting</td>
            </tr>
            <tr>
              <td>tesseract.js</td>
              <td>Apache-2.0</td>
              <td>On-device OCR engine</td>
            </tr>
            <tr>
              <td>@tesseract.js-data/eng, hin, guj</td>
              <td>MIT</td>
              <td>OCR language data (English, Hindi, Gujarati)</td>
            </tr>
            <tr>
              <td>docx</td>
              <td>MIT</td>
              <td>Word (.docx) generation</td>
            </tr>
            <tr>
              <td>docx-preview</td>
              <td>Apache-2.0</td>
              <td>In-browser Word preview</td>
            </tr>
            <tr>
              <td>qrcode</td>
              <td>MIT</td>
              <td>QR matrix generation</td>
            </tr>
            <tr>
              <td>fflate</td>
              <td>MIT</td>
              <td>ZIP packaging</td>
            </tr>
            <tr>
              <td>lucide-react</td>
              <td>ISC</td>
              <td>Icon set</td>
            </tr>
            <tr>
              <td>Next.js, React</td>
              <td>MIT</td>
              <td>Framework and rendering</td>
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

      <h2 id="permission">8. Requesting permission</h2>
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

      <h2 id="contact">9. Contact</h2>
      <p>
        Copyright complaints follow the{" "}
        <Link href="/copyright">Copyright and DMCA Policy</Link>, which has its
        own process and designated contact. General enquiries go through the{" "}
        <Link href="/contact">contact page</Link>; brand-related terms are also
        in the <Link href="/terms#ip">Terms and Conditions</Link>.
      </p>
    </LegalPageShell>
  );
}
