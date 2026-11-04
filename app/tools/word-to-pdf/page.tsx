import WordToPdf from "@/components/tools/word-to-pdf";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Word to PDF Converter — DOCX batch workspace",
  "Convert DOCX to PDF with opt-in self-hosted LibreOffice processing, page settings, individual batch controls and PDF previews. No lossless conversion claim.",
  "/tools/word-to-pdf",
);
export default function Page() {
  return <WordToPdf />;
}
