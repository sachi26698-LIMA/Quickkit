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
import { toolTheme, toolThemeStyle } from "@/lib/tool-theme";
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
    a: "No. You must check the consent box and choose Convert, Refresh, or separately enable automatic re-uploads. Without consent, the files stay on your device and are not sent.",
  },
  {
    q: "How long are uploaded files kept?",
    a: "Files are processed in an ephemeral temporary directory and deleted after processing. Conversion results stay in this tab until you clear them or close it.",
  },
  {
    q: "Which Word files can I convert?",
    a: "The workspace accepts DOCX files up to 20 MiB each, with up to 10 files per queue, 80 MiB total, and 1,000 pages. Legacy .doc and encrypted DOCX files are rejected.",
  },
  {
    q: "Can I edit pages before downloading?",
    a: "Yes. After conversion, page-level changes, ordering, appearance settings, and export settings update the preview. Download is enabled only when the preview and exported PDF are synchronized.",
  },
];

const WORD_TO_PDF_STEPS = [
  "Add one or more .docx files and inspect the queue, page counts, and available conversion engine.",
  "Choose global or per-file conversion settings; select page ranges or use the page editor after the first conversion.",
  "Check the explicit consent box before any upload, then choose Convert documents. Each request uses a no-store policy and the server deletes temporary files after processing.",
  "Review the actual PDF.js preview and any fidelity notes, adjust pages if needed, then download individual PDFs or a ZIP with the conversion report.",
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
            <h2>How to convert DOCX files to PDF</h2>
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
            {related.map((t) => (
              <Link
                className={`related-card cat-${toolTone(t)}`}
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
