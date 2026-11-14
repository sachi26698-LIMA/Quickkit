import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import AdUnit from "@/components/ad-unit";
import { ToolIcon3D, toolTone } from "@/components/icon-3d";
import JsonLd from "@/components/json-ld";
import WordToPdf from "@/components/tools/word-to-pdf";
import { relatedTools, toolBySlug } from "@/lib/catalog";
import {
  breadcrumbStructuredData,
  pageMetadata,
  toolStructuredData,
} from "@/lib/seo";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT, TOOL_SEO_METADATA } from "@/lib/tool-seo-content";
import { toolSurfaceStyle, toolTheme, toolThemeStyle } from "@/lib/tool-theme";
import "@/app/tool-pages.generated.css";
import "@/app/tool-pages.css";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["word-to-pdf"].title,
  TOOL_SEO_METADATA["word-to-pdf"].description,
  "/tools/word-to-pdf",
);

const WORD_TO_PDF_FAQS = [
  {
    q: "Are my DOCX files uploaded automatically?",
    a: "No. The files stay on your device until you check the explicit server-processing consent box and start conversion. Refreshing or enabling automatic re-uploads also requires consent; without it, no file is sent.",
  },
  {
    q: "Will the PDF look exactly like it does in Microsoft Word?",
    a: "Not always. The available engine is shown before conversion, and the preview and conversion report identify the result and any warnings. Native LibreOffice conversion generally preserves Office layout more closely; QUICKKIT’s built-in renderer can differ on advanced layout, fields, and floating objects. Review the converted pages before downloading.",
  },
  {
    q: "What happens if my document uses fonts that are not available?",
    a: "Font substitution can change line breaks and page layout. QUICKKIT’s built-in renderer embeds its bundled Noto fonts; native LibreOffice conversion uses fonts available to that conversion environment. Check the preview and report for layout differences, especially in documents that depend on specialized fonts.",
  },
  {
    q: "What are the file and batch limits?",
    a: "Add up to 10 DOCX files, with a maximum of 20 MiB per file and 80 MiB total in the queue. The workspace supports up to 1,000 pages. Legacy .doc and encrypted DOCX files are not accepted.",
  },
  {
    q: "Are uploaded documents kept after conversion?",
    a: "The server processes each upload in a temporary directory and removes that directory after processing, including on conversion failure. The generated result remains in this tab until you clear it or close the tab; it is not retained by the conversion endpoint.",
  },
];

const WORD_TO_PDF_STEPS = [
  "Add up to 10 .docx files and review the queue, page counts, limits, and currently available conversion engine.",
  "Choose the document and page settings. You can set page ranges before conversion and make further page or appearance edits in the workspace afterward.",
  "Read and accept the server-processing consent before starting conversion. Files are sent only after consent; each request is non-cacheable and temporary server files are removed after processing.",
  "Review the converted PDF in the page preview, check engine notes and any fidelity warnings, then download an individual PDF or the batch ZIP and report.",
];

export default function Page() {
  const tool = toolBySlug("word-to-pdf");
  const related = tool ? relatedTools(tool) : [];

  // Stand-alone studio (no ToolShell): give it the same per-tool colour tokens,
  // structured data and contextual related-PDF links.
  return (
    <div
      className="tool-theme"
      data-tool="word-to-pdf"
      style={toolThemeStyle(toolTheme("word-to-pdf", "PDF Tools"))}
    >
      <JsonLd
        data={breadcrumbStructuredData([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: "PDF Tools", path: "/category/pdf-tools" },
          { name: "Word to PDF Converter", path: "/tools/word-to-pdf" },
        ])}
      />
      <JsonLd
        data={toolStructuredData({
          name: "Word to PDF Converter",
          description: TOOL_SEO_METADATA["word-to-pdf"].description,
          path: "/tools/word-to-pdf",
          category: "PDF Tools",
          slug: "word-to-pdf",
          faqs: WORD_TO_PDF_FAQS,
        })}
      />
      <WordToPdf />
      <div className="container">
        <ToolReferenceSection
          slug="word-to-pdf"
          entry={TOOL_SEO_CONTENT["word-to-pdf"]}
        />
        <div className="tool-guidance">
          <section>
            <span className="eyebrow">A quick walkthrough</span>
            <h2>How Word to PDF works</h2>
            <ol>
              {WORD_TO_PDF_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section>
            <span className="eyebrow">Good to know</span>
            <h2>Word to PDF questions, answered</h2>
            {WORD_TO_PDF_FAQS.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </section>
        </div>
      </div>
      {related.length > 0 ? (
        <section className="container related">
          <div className="section-heading">
            <h2>More ways to work with PDFs</h2>
            <Link className="text-link" href="/tools">
              All tools <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="related-grid">
            {related.slice(0, 4).map((t) => (
              <Link
                className={`related-card cat-${toolTone(t)}`}
                style={toolSurfaceStyle(toolTheme(t.slug, t.category))}
                key={t.slug}
                href={`/tools/${t.slug}`}
              >
                <ToolIcon3D tool={t} size={48} />
                <span>
                  <strong>{t.name}</strong>
                  <small>{t.category}</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      {/* 2 of 2 — the end of the page, outside the workspace component. */}
      <AdUnit placement="tool-bottom" format="auto" />
    </div>
  );
}
