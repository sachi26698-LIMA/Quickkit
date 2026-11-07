import AdUnit from "@/components/ad-unit";
import WordToPdf from "@/components/tools/word-to-pdf";
import { pageMetadata } from "@/lib/seo";
import { toolTheme, toolThemeStyle } from "@/lib/tool-theme";
import "@/app/tool-pages.css";
export const metadata = pageMetadata(
  "Word to PDF Converter — DOCX batch workspace",
  "Convert DOCX to PDF on this server with real conversion stages, per-page editing, page settings, individual batch controls and PDF.js previews of the actual output. No lossless conversion claim.",
  "/tools/word-to-pdf",
);
export default function Page() {
  // Stand-alone studio (no ToolShell): give it the same per-tool colour tokens.
  return (
    <div
      className="tool-theme"
      data-tool="word-to-pdf"
      style={toolThemeStyle(toolTheme("word-to-pdf", "PDF Tools"))}
    >
      <WordToPdf />
      {/* 2 of 2 — the end of the page, outside the workspace component. */}
      <AdUnit placement="tool-bottom" format="auto" />
    </div>
  );
}
