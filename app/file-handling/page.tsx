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
  "File Handling & Data Processing Policy",
  legalPageByHref("/file-handling")!.description,
  "/file-handling",
);

/**
 * Every claim on this page was checked against the code before it was written:
 * `lib/tools/pdf/*` (workers), `lib/tools/pdf-to-word/*` (incl. self-hosted
 * tesseract.js under /ocr), `lib/tools/image-*.ts`, `lib/tools/qr/*`,
 * `lib/tools/download.ts`, `lib/use-favorites.ts`, `next.config.ts` (CSP
 * `connect-src 'self'`, the AdSense `script-src` allowlist, Permissions-Policy)
 * and `components/contact-form.tsx`. If a pipeline changes, this page must be
 * updated in the same commit.
 */
export default function FileHandlingPage() {
  return (
    <LegalPageShell
      href="/file-handling"
      title="Data Processing and File Handling Policy"
      intro="A tool-by-tool account of what QUICKKIT does with the files you give it: where they are read, what is kept, what is written to disk, and when everything is gone."
      lastUpdated={LEGAL_LAST_UPDATED}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
    >
      <h2 id="principles">1. How processing works</h2>
      <p>
        Most tools on QUICKKIT run inside the browser tab you opened. The file
        bytes are read from the <code>File</code> object your file picker
        returned, worked on in JavaScript (on the main thread or in a dedicated
        Web Worker inside the same tab), and turned into a new <code>Blob</code>{" "}
        that you download. The application&rsquo;s tool-processing pipeline does
        not send the bytes anywhere. Separately, the site-wide AdSense script
        runs in the page; see the <Link href="/privacy">Privacy Policy</Link>{" "}
        for that third-party access.
      </p>
      <p>
        Three properties of the architecture make that verifiable, not just
        claimed:
      </p>
      <ul>
        <li>
          <strong>Word to PDF is a consented exception.</strong> Its API accepts
          DOCX only for requested operator-controlled native conversion. It uses
          temporary job files, no permanent document storage by default and no
          automatic third-party fallback. Other file tools process locally.
        </li>
        <li>
          <strong>Browser connections are restricted.</strong> The Content
          Security Policy allows scripts, frames, images and fetch/XHR
          connections only from this site&rsquo;s own origin and the named
          Google AdSense hosts — no wildcards, no other third parties. That
          script runs in the page and may access page content; do not use
          sensitive files if you are not comfortable with that third-party
          access. The application does not intentionally send selected files to
          AdSense.
        </li>
        <li>
          <strong>Processing engines are self-hosted.</strong> The PDF engine,
          OCR engine and language data, and QR library are served from this
          site&rsquo;s own origin, not a CDN. Loading a tool makes no request to
          a third-party processing engine, and the application&rsquo;s local
          engines do not send file data away. The AdSense script is a separate
          site-wide request, not a file-processing service. Word to PDF uses the
          operator-controlled native engine only with explicit upload consent.
        </li>
      </ul>
      <p>
        What is <em>not</em> covered by the above: ordinary requests to the
        hosting provider, and the request for the site-wide AdSense script from
        Google. That script executes in the page and may access page or browser
        information; details are in the{" "}
        <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/cookies">Cookie Policy</Link>.
      </p>

      <h2 id="file-selection">2. File selection</h2>
      <p>
        Files are chosen through the browser&rsquo;s own picker or by dragging
        them onto a drop zone. Your operating system grants the page access to
        that specific file only; the page cannot browse your disk, and it cannot
        read a file you did not select. Where a tool accepts drag-and-drop, the
        same restriction applies to dropped files.
      </p>
      <p>
        Selected files are held as in-memory references for the life of the
        workspace. Removing a file from the queue, resetting the workspace,
        navigating away or closing the tab drops the reference.
      </p>

      <h2 id="memory">3. Temporary memory</h2>
      <p>
        During a conversion the source bytes, the reconstructed output and any
        intermediate canvases or page bitmaps exist in the tab&rsquo;s memory.
        That is why tools publish size and page limits: they exist to keep a
        large job from exhausting the memory available to a single tab, not to
        meter usage.
      </p>
      <ul>
        <li>
          Heavy work (PDF merging, splitting, compressing, image encoding, OCR)
          runs in a Web Worker — still inside the same tab, but off the main
          thread so the interface stays responsive.
        </li>
        <li>
          Local preview URLs (<code>blob:</code> URLs) are created for
          thumbnails and previews and are revoked when replaced or when the
          workspace closes.
        </li>
        <li>
          A PDF open-password, where you supply one, is kept in page or worker
          memory only for the duration of the operation and is never written to
          storage or logs.
        </li>
        <li>
          Memory is returned to the browser when the tab closes. Nothing is
          swapped to a QUICKKIT server for these browser-local tools; Word to
          PDF instead uses its separately consented native server pipeline.
        </li>
      </ul>

      <h2 id="browser-storage">4. Browser storage</h2>
      <p>
        Two features can persist data locally, and both are covered in full in
        the <Link href="/cookies">Cookie Policy</Link>:
      </p>
      <ul>
        <li>
          <strong>Preferences</strong> in <code>localStorage</code> — saved
          tools, QR design presets, QR history preference, retention choices.
        </li>
        <li>
          <strong>Optional conversion history</strong> in IndexedDB, holding
          converted outputs so they can be re-downloaded after a reload. It is
          off by default (&ldquo;session&rdquo;), capped at 20 items, refuses
          results over 10 MB, and stores the converted file only — never your
          original.
        </li>
      </ul>

      <h2 id="per-tool">5. Tool-by-tool processing</h2>
      <p>
        The sections below describe each file-handling tool as implemented. The
        limits quoted are the enforced constants in the source, not guidelines.
      </p>

      <h2 id="pdf-merger">6. PDF Merger</h2>
      <ul>
        <li>
          <strong>Input:</strong> up to 25 PDFs, 50 MB each and 100 MB in total,
          up to 1,000 pages per file and 1,000 pages in the merged result.
        </li>
        <li>
          <strong>Processing:</strong> a Web Worker parses each PDF, copies the
          pages you selected into a new document and writes the merged bytes.
        </li>
        <li>
          <strong>Storage:</strong> none. Neither the sources nor the result are
          written to local storage or IndexedDB.
        </li>
        <li>
          <strong>Output:</strong> a single in-memory PDF you download; the blob
          URL is revoked after the download starts.
        </li>
        <li>
          <strong>Limits:</strong> bookmarks, attachments, layers, tagged
          structure, scripts and signature validity are not preserved; form
          fields may be flattened.
        </li>
      </ul>

      <h2 id="pdf-splitter">7. PDF Splitter</h2>
      <ul>
        <li>
          <strong>Input:</strong> one source PDF, 50 MB, up to 1,000 pages.
        </li>
        <li>
          <strong>Processing:</strong> the plan you build (ranges, extraction,
          every-N-pages) is executed in a worker that writes each output PDF
          separately, then optionally bundles them into a ZIP.
        </li>
        <li>
          <strong>Storage:</strong> none.
        </li>
        <li>
          <strong>Output:</strong> up to 100 PDFs and 1,000 output pages per
          run, downloaded individually or as one ZIP.
        </li>
      </ul>

      <h2 id="pdf-compressor">8. PDF Compressor</h2>
      <ul>
        <li>
          <strong>Input:</strong> up to 20 PDFs, 50 MB each, 100 MB per batch,
          1,000 pages per file and 2,000 pages per batch.
        </li>
        <li>
          <strong>Processing:</strong> a worker decodes the document, re-encodes
          embedded images at your chosen quality or towards a target size, and
          rebuilds the PDF. Nothing is sent out for the image work.
        </li>
        <li>
          <strong>Storage:</strong> none; results live in memory until
          downloaded or the workspace is reset.
        </li>
        <li>
          <strong>Limits:</strong> decoded streams are capped at 64 MB per file
          and generated output at 128 MB; image dimensions are capped at 12,000
          px and 24 megapixels.
        </li>
      </ul>

      <h2 id="pdf-to-word">9. PDF to Word (with optional OCR)</h2>
      <ul>
        <li>
          <strong>Input:</strong> up to 50 PDFs, 25 MB each, 250 MB per batch,
          300 pages converted per file.
        </li>
        <li>
          <strong>Processing:</strong> the PDF is parsed in the browser to
          recover text runs, headings, lists, tables and images; those are
          rebuilt into a DOCX with a bundled document library. Pages with no
          extractable text can be rasterised and passed to a locally hosted OCR
          engine (tesseract.js with WebAssembly, plus English, Hindi and
          Gujarati language data served from <code>/ocr</code> on this site).
        </li>
        <li>
          <strong>Storage:</strong> optional. If you turn history on, converted
          DOCX files go into the local IndexedDB database{" "}
          <code>quickkit-pdf-to-word</code> (20 items, 10 MB each, your chosen
          retention). Source PDFs are never stored. The original document and
          the result are also previewed side by side using local blob URLs.
        </li>
        <li>
          <strong>Limits:</strong> structure detection is heuristic; see{" "}
          <Link href="/disclaimer#ocr">Disclaimer §7</Link> for OCR accuracy.
        </li>
      </ul>

      <h2 id="pdf-translator">10. PDF Translator (not implemented)</h2>
      <p>
        There is no PDF translator in QUICKKIT today. Nothing on the site
        translates a document, and no document text is sent anywhere for
        translation. The roadmap mentions a translator; if one is built, this
        section will state before release whether translation runs on-device
        with a bundled model or calls a remote service, what that service
        receives, its retention, and whether consent is required. Until then,
        treat &ldquo;PDF Translator&rdquo; as unavailable.
      </p>

      <h2 id="image-to-image">11. Image to Image Converter</h2>
      <ul>
        <li>
          <strong>Input:</strong> up to 20 images per batch, 15 MB each, 24
          megapixels and 8,192 px per side, 150 MB per batch.
        </li>
        <li>
          <strong>Processing:</strong> images are decoded (by the browser, or by
          a bundled decoder for formats the browser cannot read), drawn to a
          canvas, transformed (resize, crop, rotate, flip, orient), re-encoded
          to JPG/PNG/WebP/AVIF/BMP/GIF/TIFF, and optionally packed into a ZIP.
          The BMP/GIF/TIFF encoders run in a worker with pixel buffers
          transferred, not copied.
        </li>
        <li>
          <strong>Storage:</strong> optional history in IndexedDB{" "}
          <code>quickkit-image-to-image</code> — converted outputs only, 20
          items, 10 MB each, off by default.
        </li>
        <li>
          <strong>Limits:</strong> re-encoding may strip metadata and colour
          profiles; JPEG has no transparency; output can be larger than input.
        </li>
      </ul>

      <h2 id="image-compressor">12. Image Compressor</h2>
      <ul>
        <li>
          <strong>Input:</strong> up to 20 JPEG, PNG, WebP or AVIF images per
          batch, 15 MB each, 24 megapixels and 8,192 px per side.
        </li>
        <li>
          <strong>Processing:</strong> each image is decoded into a canvas on
          this device, optionally downscaled to a target file size or a quality
          level (10–100), and re-encoded. Nothing is uploaded.
        </li>
        <li>
          <strong>Storage:</strong> none. Source files and results live in page
          memory plus local blob URLs, revoked when an image is removed or the
          tab closes. Your quality and format choices are not persisted.
        </li>
        <li>
          <strong>Limits:</strong> a target size can be unattainable for some
          images; the tool reports the closest result instead of looping
          silently.
        </li>
      </ul>

      <h2 id="image-resizer">13. Image Resizer</h2>
      <ul>
        <li>
          <strong>Input:</strong> up to 20 images per batch, 15 MB each, 24
          megapixels per image. Output dimensions are capped at 8,192 px per
          side and 24 megapixels, with scaling from 5% to 400%.
        </li>
        <li>
          <strong>Processing:</strong> dimensions, percentage or presets are
          applied to a canvas in the browser and the result is re-encoded
          locally.
        </li>
        <li>
          <strong>Storage:</strong> none persistent — blob URLs only, released
          on removal or unmount. No history is written in this tool.
        </li>
      </ul>

      <h2 id="image-cropper">14. Image Cropper</h2>
      <ul>
        <li>
          <strong>Input:</strong> up to 20 images per batch, 15 MB each, 24
          megapixels per image; output is capped at 24 megapixels and 400% of
          the source scale.
        </li>
        <li>
          <strong>Processing:</strong> the crop rectangle and any straightening
          are applied to a canvas in the browser. The undo/redo stack (50 steps)
          lives in page memory and is never written to storage.
        </li>
        <li>
          <strong>Storage:</strong> none. Closing the tab discards the crop
          session.
        </li>
      </ul>

      <h2 id="images-to-pdf">15. Images to PDF</h2>
      <ul>
        <li>
          <strong>Input:</strong> multiple images; 15 MB per image and 25 MB per
          source PDF, 24 megapixels and 8,192 px per side.
        </li>
        <li>
          <strong>Processing:</strong> each image is decoded, fitted to the page
          size, margins and orientation you choose (A4, A3, A5, Letter or
          custom), and written into a single PDF in the browser.
        </li>
        <li>
          <strong>Storage:</strong> page thumbnails use local blob URLs, revoked
          when replaced or when the workspace closes. No persistent storage.
        </li>
      </ul>

      <h2 id="pdf-to-image">16. PDF to Image</h2>
      <ul>
        <li>
          <strong>Input:</strong> one PDF, 25 MB, up to 100 pages rendered per
          run.
        </li>
        <li>
          <strong>Processing:</strong> the PDF is rendered page by page to a
          canvas at the DPI you select (72–600), then encoded as JPG, PNG or
          WebP. The PDF engine (pdf.js, Apache-2.0) is self-hosted under{" "}
          <code>/pdfjs</code>; a rendered page over 36 megapixels is rescaled
          down before encoding.
        </li>
        <li>
          <strong>Storage:</strong> none. Previews are blob URLs, revoked on
          replacement and unmount.
        </li>
        <li>
          <strong>Output:</strong> single-page downloads or one ZIP.
        </li>
      </ul>

      <h2 id="pdf-studio">17. PDF Studio</h2>
      <ul>
        <li>
          <strong>Input:</strong> multiple PDFs, subject to the same per-file
          and total limits as the Merger and Compressor, plus an optional result
          compression step.
        </li>
        <li>
          <strong>Processing:</strong> combines merge, extract/split, delete,
          rotate, reorder and compress in one browser session using the same
          local engines as the individual tools.
        </li>
        <li>
          <strong>Storage:</strong> page thumbnails only, as local blob URLs,
          revoked when the document is removed or the workspace closes.
        </li>
      </ul>

      <h2 id="qr-generator">18. QR Code Generator</h2>
      <ul>
        <li>
          <strong>Input:</strong> text you type, up to about 2,000 UTF-8 bytes.
          No file upload is required.
        </li>
        <li>
          <strong>Processing:</strong> the matrix is generated in the browser,
          rendered to PNG/SVG/PDF, and passed through a bundled decoder before
          download so a non-scannable design is blocked rather than shipped.
        </li>
        <li>
          <strong>Storage:</strong> design presets and a recent-generations
          history can be kept in <code>localStorage</code>; &ldquo;designs
          only&rdquo; mode keeps content out entirely, and sensitive fields (for
          example a Wi-Fi password) are never written.
        </li>
        <li>
          <strong>Sharing:</strong> a share link packs the configuration into
          the URL fragment after <code>#</code>, which browsers do not transmit
          to a server. Do not treat a shared link as secret — anyone holding it
          can read the QR content.
        </li>
      </ul>

      <h2 id="calculators">19. Calculators and other browser tools</h2>
      <p>
        Word Counter, Case Converter, JSON Formatter and Validator, HTML and XML
        Formatters, CSS and JavaScript Minifiers, Base64 and URL tools, UUID and
        Regex tools, Hash Generator, Password Generator and the calculator suite
        process only the text or files you choose in the browser. They hold
        input in page state or a short-lived local worker and store nothing.
        JavaScript is parsed but never executed; regex matching runs in a
        time-limited worker; file hashes are calculated locally in chunks.
        Passwords and UUIDs use the Web Crypto API (
        <code>crypto.getRandomValues</code>) and exist only in the page. Copying
        uses your device clipboard, which other apps and extensions may be able
        to read.
      </p>

      <h2 id="external">20. External processing dependencies</h2>
      <p>
        None of these receive your data — they are all served from this origin —
        but for completeness, the engines doing the work are:
      </p>
      <ul>
        <li>
          <strong>pdf.js</strong> (Apache-2.0) for parsing and rendering, served
          from <code>/pdfjs</code>.
        </li>
        <li>
          <strong>@cantoo/pdf-lib</strong> (MIT) for writing and restructuring
          PDF documents.
        </li>
        <li>
          <strong>tesseract.js</strong> (Apache-2.0) with WebAssembly cores and
          the <code>eng</code>, <code>hin</code> and <code>guj</code> language
          data (MIT), served from <code>/ocr</code>.
        </li>
        <li>
          <strong>docx</strong> (MIT) and <strong>docx-preview</strong>{" "}
          (Apache-2.0) for generating and previewing Word documents.
        </li>
        <li>
          <strong>qrcode</strong> (MIT) plus the project&rsquo;s own encoders
          for QR matrices, PNG, SVG and PDF output.
        </li>
        <li>
          <strong>fflate</strong> (MIT) for ZIP archives.
        </li>
      </ul>
      <p>
        If the operator ever adds a remote processing API, this section and the{" "}
        <Link href="/privacy">Privacy Policy</Link> must change before that
        feature ships, and the tool itself must say so on screen.
      </p>

      <h2 id="downloads">21. Download handling</h2>
      <p>
        Downloads are created with a temporary <code>blob:</code> URL and an
        anchor element with the <code>download</code> attribute. The browser
        saves the file to wherever your download settings point — a folder, the
        Downloads list, or your device&rsquo;s share sheet. The temporary URL is
        revoked shortly after the download begins. From that point the file is a
        normal file on your device, outside QUICKKIT&rsquo;s control and subject
        to your own backup and deletion habits.
      </p>
      <p>
        QUICKKIT cannot see whether a download succeeded, cannot re-issue it,
        and keeps no list of files you saved.
      </p>

      <h2 id="retention">22. Retention and deletion</h2>
      <div className="legal-table-wrap">
        <table className="legal-table">
          <caption className="sr-only">
            Retention of data by storage location
          </caption>
          <thead>
            <tr>
              <th scope="col">Where</th>
              <th scope="col">What</th>
              <th scope="col">How long</th>
              <th scope="col">How to delete</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Page / worker memory</td>
              <td>Sources, intermediates, outputs, PDF passwords</td>
              <td>Until reset, refresh, navigation or tab close</td>
              <td>Reset the workspace, refresh, or close the tab</td>
            </tr>
            <tr>
              <td>localStorage</td>
              <td>Preferences and QR presets/history</td>
              <td>Until removed</td>
              <td>Use the tool&rsquo;s clear action, or clear site data</td>
            </tr>
            <tr>
              <td>IndexedDB</td>
              <td>Optional converted outputs (opt-in)</td>
              <td>Your retention choice, max 7 days, max 20 items</td>
              <td>
                Clear history in the tool, set retention to session, or clear
                site data
              </td>
            </tr>
            <tr>
              <td>Your filesystem</td>
              <td>Files you downloaded</td>
              <td>Until you delete them</td>
              <td>Delete the file</td>
            </tr>
            <tr>
              <td>QUICKKIT servers</td>
              <td>
                Temporary consented Word to PDF job files; no default permanent
                document store
              </td>
              <td>
                Job cleanup; host crash/log retention requires operator
                verification
              </td>
              <td>Contact the operator about server processing/retention</td>
            </tr>
            <tr>
              <td>Hosting provider</td>
              <td>Ordinary request metadata</td>
              <td>Set by the provider; see Privacy Policy §9</td>
              <td>Contact the operator, subject to provider practice</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Browser-local tools send no document data. Word to PDF temporarily
        processes consented uploads and requires verified job cleanup and host
        retention controls. A privacy request can cover that processing, email
        correspondence and any provider-side metadata; see{" "}
        <Link href="/privacy#rights">Privacy Policy §13</Link>.
      </p>

      <h2 id="limitations">23. Technical limitations</h2>
      <ul>
        <li>
          Large files can fail on low-memory devices even below the published
          limits. The tools surface an error rather than hanging where possible.
        </li>
        <li>
          Browser support varies for AVIF/WebP encoding, IndexedDB in private
          windows, and clipboard access.
        </li>
        <li>
          Password-protected PDFs are decrypted in memory for the operation, but
          the output is not re-encrypted — protect the result yourself.
        </li>
        <li>
          In-app browsers (for example a social app&rsquo;s built-in webview)
          may block downloads or storage.
        </li>
        <li>
          Local processing cannot recover information the source does not
          contain: a scan without a text layer needs OCR, and a low-resolution
          source cannot become high-resolution.
        </li>
      </ul>
      <p>
        Questions about a specific file type or behaviour not covered here? Use
        the <Link href="/contact">contact page</Link> or email <ContactLink /> —
        no need to send the file itself. See also the{" "}
        <Link href="/security">Security Policy</Link> and{" "}
        <Link href="/disclaimer">Disclaimer</Link>.
      </p>
    </LegalPageShell>
  );
}
