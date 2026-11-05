import WordToPdf from "@/components/tools/word-to-pdf";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Word to PDF Converter — DOCX batch workspace",
  "Convert DOCX to PDF on this server with real conversion stages, per-page editing, page settings, individual batch controls and PDF.js previews of the actual output. No lossless conversion claim.",
  "/tools/word-to-pdf",
);
export default function Page() {
  return <WordToPdf />;
}
