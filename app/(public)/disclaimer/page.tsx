import Link from "next/link";
import LegalPageShell from "@/components/legal-page-shell";
import { pageMetadata } from "@/lib/seo";
import {
  LEGAL_LAST_UPDATED,
  LEGAL_LAST_UPDATED_ISO,
  legalPageByHref,
} from "@/lib/legal";
import ContactLink from "@/components/contact-link";

export const metadata = pageMetadata(
  "Disclaimer — limits, estimates and accuracy",
  legalPageByHref("/disclaimer")!.description,
  "/disclaimer",
);

export default function DisclaimerPage() {
  return (
    <LegalPageShell
      href="/disclaimer"
      title="Disclaimer"
      intro="Every tool on QUICKKIT is an approximation of something. This page says where each approximation can go wrong, so you know which results to check before you rely on them."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="general">1. General information only</h2>
      <p>
        QUICKKIT and everything on it — the tools, the guides, the help centre,
        the numbers a calculator shows — are provided for general informational
        and practical purposes. They are offered &ldquo;as is&rdquo; and
        &ldquo;as available&rdquo;, without warranties of any kind, express or
        implied, including fitness for a particular purpose, accuracy or
        non-infringement.
      </p>
      <p>
        You use the tools and their outputs at your own discretion and risk. If
        a result matters, verify it independently.
      </p>

      <h2 id="no-professional-advice">
        2. No legal, financial or medical advice
      </h2>
      <p>Nothing on QUICKKIT is professional advice. In particular:</p>
      <ul>
        <li>
          <strong>Legal and compliance.</strong> Templates, policies, converted
          documents and text tools are not legal services. QUICKKIT&rsquo;s own
          legal pages describe our implementation; they are not advice for your
          situation.
        </li>
        <li>
          <strong>Financial.</strong> Loan, EMI, GST, discount, percentage and
          interest calculators implement standard formulae and produce estimates
          only. They are not a quote, an offer of credit, tax advice, or a
          statement of what any lender, employer or tax authority will compute.
        </li>
        <li>
          <strong>Medical and health.</strong> The BMI calculator is a
          population-level screening formula, not a diagnosis. BMI ignores body
          composition, age, sex, ethnicity and pregnancy. Never use it — or any
          other QUICKKIT tool — to diagnose, treat or decide about a health
          condition. Speak to a qualified clinician.
        </li>
      </ul>
      <p>
        Consult an appropriately qualified professional before acting on
        anything that could affect your legal position, your finances or your
        health.
      </p>

      <h2 id="calculations">3. Accuracy of calculations</h2>
      <p>
        Calculators compute with JavaScript&rsquo;s double-precision floating
        point numbers. That has visible consequences:
      </p>
      <ul>
        <li>
          Results are rounded for display. A percentage shown as 33.33% is
          displayed with a fixed number of decimal places, not stored exactly.
        </li>
        <li>
          Very large integers (beyond 2<sup>53</sup>) lose precision, and
          currency arithmetic can accumulate tiny fractional differences.
        </li>
        <li>
          Scientific and trigonometric functions inherit the precision of the
          host platform and use radians/degrees according to the selected mode.
        </li>
        <li>
          Date and time arithmetic uses the browser&rsquo;s locale and time
          zone; a difference in days can appear to shift when daylight saving
          changes.
        </li>
        <li>
          Loan and EMI schedules assume a constant rate and exact periodic
          payments. Real statements round each instalment, charge fees, and may
          vary the rate.
        </li>
        <li>
          GST and discount results depend entirely on the rate and treatment you
          enter. QUICKKIT does not look up statutory rates, and rates change.
        </li>
      </ul>
      <p>
        Treat calculator output as a well-formatted estimate, not as an
        accounting record.
      </p>

      <h2 id="financial">4. Financial calculations</h2>
      <p>
        The EMI, loan, discount, GST and percentage calculators are planning
        aids. They do not account for processing fees, insurance, prepayment
        penalties, variable rates, tax treatment, rounding conventions used by
        your lender, or regulatory caps that may apply where you live. The
        amortisation schedule they produce is a model, not a statement of
        account.
      </p>

      <h2 id="images">5. Image compression and conversion quality</h2>
      <ul>
        <li>
          Lossy output (JPEG, and lossy WebP/AVIF) permanently discards detail.
          Compression reduces quality by design; the amount is yours to choose.
        </li>
        <li>
          Output can be <em>larger</em> than the input, for example when
          converting an already-optimised JPEG to PNG, or when re-encoding at a
          higher quality setting. Compare the sizes shown before you keep the
          result.
        </li>
        <li>
          Canvas re-encoding may remove EXIF metadata, colour profiles and
          ancillary chunks. Orientation is corrected where the browser exposes
          it, but other metadata is generally not carried over.
        </li>
        <li>
          Transparency is preserved for PNG, WebP and AVIF; JPEG has no alpha
          channel, so it is flattened onto a background colour you choose.
        </li>
        <li>
          Format support depends on the browser. AVIF or TIFF encoding may be
          unavailable, and the tool will say so rather than silently producing a
          different format.
        </li>
        <li>
          Resampling to a larger size cannot invent detail. Upscaling produces
          interpolated pixels, not sharper ones.
        </li>
        <li>
          A &ldquo;target file size&rdquo; is met by searching quality settings;
          when the target is impossible without severe quality loss, the tool
          warns instead of pretending.
        </li>
      </ul>

      <h2 id="pdf">6. PDF conversion limitations</h2>
      <ul>
        <li>
          Merging, splitting and page operations rebuild the document.
          Bookmarks, attachments, embedded files, layers, JavaScript actions,
          tagged-reading structure and some annotations may not survive; digital
          signatures are invalidated by any rewrite.
        </li>
        <li>
          AcroForm fields can be flattened or dropped depending on the
          operation.
        </li>
        <li>
          Compression reduces the quality or resolution of embedded images. Text
          is not rewritten, but a scanned page can become noticeably blurrier.
        </li>
        <li>
          PDF to Word reconstructs structure heuristically. Multi-column
          layouts, tables that span pages, floating text boxes, footnotes,
          equations and unusual fonts are frequent sources of misordered or
          missing content.
        </li>
        <li>
          PDF to Image rasterises pages at the resolution you select. Text is no
          longer selectable, and a low DPI setting will look soft when printed.
        </li>
        <li>
          Encrypted PDFs can only be opened with a password you are entitled to
          use; output is not re-encrypted, so an unlocked result may be readable
          by anyone you share it with.
        </li>
      </ul>

      <h2 id="ocr">7. OCR and text recognition</h2>
      <p>
        Text recognition in PDF to Word is statistical. Accuracy depends on scan
        resolution, skew, contrast, background noise, font style and language.
        Handwriting, decorative type, dense tables, formulas, stamps and
        low-contrast scans are frequently misread. Recognition can also insert
        characters that look similar (0/O, 1/l/I, 5/S). Always proofread
        recognised text before sending or publishing it. Language data for
        English, Hindi and Gujarati ships with the site; other languages are not
        recognised.
      </p>

      <h2 id="translation">8. Translation (planned feature)</h2>
      <p>
        QUICKKIT does not currently offer a PDF or document translator. The
        category exists on the roadmap and is labelled &ldquo;Coming
        soon&rdquo;. It is mentioned here so that the disclaimer and the{" "}
        <Link href="/file-handling">File Handling Policy</Link> are ready before
        it ships, and so nobody mistakes a planned tool for a working one.
      </p>
      <p>
        When it is implemented, this page will state plainly whether translation
        runs locally or calls a remote service, because machine translation in a
        browser almost always requires a model or an API. No claim is made now.
      </p>

      <h2 id="qr">9. QR codes and scanning</h2>
      <ul>
        <li>
          The generator validates a code by decoding it again before offering a
          download, and it warns when contrast, quiet zone or size is likely to
          scan poorly. That check reduces risk; it does not guarantee that a
          given phone, camera or print quality will read it.
        </li>
        <li>
          Very long content, low error-correction levels, inverted colours,
          heavy logo overlays and physical damage all reduce scannability.
        </li>
        <li>
          A QR code is a pointer, not a verification. Check the destination
          before publishing, and tell users where it leads.
        </li>
        <li>
          QUICKKIT never hosts, redirects or shortens the content of a code you
          generate. If a printed code stops working, the destination has changed
          — the code cannot be updated after printing.
        </li>
      </ul>

      <h2 id="third-party">10. Third-party tools and dependencies</h2>
      <p>
        QUICKKIT is built on open-source libraries for PDF parsing and writing,
        document generation, image codecs, QR encoding and OCR. They are bundled
        and self-hosted, and they are listed with their licences in the{" "}
        <Link href="/intellectual-property#open-source">
          Intellectual Property Policy
        </Link>
        . Their behaviour, bugs and limitations become QUICKKIT&rsquo;s
        limitations. We do not warrant third-party components, and links to
        external sites do not imply endorsement of them.
      </p>

      <h2 id="availability">11. Availability and compatibility</h2>
      <p>
        QUICKKIT targets current versions of Chrome, Edge, Firefox and Safari on
        desktop, tablet and mobile. It may not work, or may work partially, on
        older browsers, unusual embedded browsers (for example in-app webviews),
        browsers with scripts or storage disabled, or devices with limited
        memory for large files. The site may be unavailable during deployment or
        maintenance. No service-level commitment is offered.
      </p>
      <p>
        Some capabilities depend on the browser rather than QUICKKIT itself:
        AVIF encoding, WebP support, IndexedDB availability in private mode, and
        clipboard permission.
      </p>

      <h2 id="estimated-vs-guaranteed">12. Estimates versus guarantees</h2>
      <div className="legal-table-wrap">
        <table role="table" className="legal-table legal-table--compare">
          <caption className="sr-only">
            Which QUICKKIT outputs are estimates and which are exact
          </caption>
          <thead role="rowgroup">
            <tr role="row">
              <th scope="col" role="columnheader">
                Output
              </th>
              <th scope="col" role="columnheader">
                Status
              </th>
              <th scope="col" role="columnheader">
                Why
              </th>
            </tr>
          </thead>
          <tbody role="rowgroup">
            <tr role="row">
              <td role="cell" data-label="Output">
                Word / character counts
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--exact">
                  Exact for its rule
                </span>
              </td>
              <td role="cell" data-label="Why">
                Counted deterministically, but &ldquo;word&rdquo; means
                whitespace-delimited token — not a linguistic judgement.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                Reading time
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--estimate">Estimate</span>
              </td>
              <td role="cell" data-label="Why">
                Derived from a 200 words-per-minute assumption.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                JSON formatting / validation
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--exact">
                  Exact for the standard
                </span>
              </td>
              <td role="cell" data-label="Why">
                Uses the browser&rsquo;s JSON parser; number precision is
                JavaScript&rsquo;s.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                Generated passwords
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--exact">Random</span>
              </td>
              <td role="cell" data-label="Why">
                Cryptographically random per the Web Crypto API; strength
                depends on length and character set you choose.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                Calculators
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--estimate">Estimate</span>
              </td>
              <td role="cell" data-label="Why">
                Formula-based, display-rounded, input-dependent.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                Image output
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--estimate">
                  Approximate
                </span>
              </td>
              <td role="cell" data-label="Why">
                Lossy by design; metadata may change; target sizes vary by a few
                percent.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                PDF merge / split
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--estimate">
                  Best effort
                </span>
              </td>
              <td role="cell" data-label="Why">
                Advanced document features may not be preserved.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                PDF &#8594; Word, OCR
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--estimate">
                  Best effort
                </span>
              </td>
              <td role="cell" data-label="Why">
                Heuristic reconstruction and statistical recognition.
              </td>
            </tr>
            <tr role="row">
              <td role="cell" data-label="Output">
                QR scannability check
              </td>
              <td role="cell" data-label="Status">
                <span className="legal-tag legal-tag--estimate">
                  Indicative
                </span>
              </td>
              <td role="cell" data-label="Why">
                Verified by a decoder, but real-world scanning varies.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 id="contact">13. Questions</h2>
      <p>
        If a result looks wrong, tell us which tool and what happened — without
        attaching private files. Use the{" "}
        <Link href="/contact">contact page</Link>, or email <ContactLink />.
        Related reading: <Link href="/terms">Terms and Conditions</Link>,{" "}
        <Link href="/file-handling">File Handling Policy</Link>,{" "}
        <Link href="/faq">FAQ</Link>.
      </p>
    </LegalPageShell>
  );
}
