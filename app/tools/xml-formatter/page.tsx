import DeveloperToolPage from "@/components/tools/devtools/page";
import MarkupTool from "@/components/tools/devtools/markup-tool";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "XML Formatter — format and compact XML safely",
  "Format or minify well-formed XML with syntax highlighting, size statistics and local copy or download. DTD declarations are rejected to prevent entity risks.",
  "/tools/xml-formatter",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="xml-formatter">
      <MarkupTool kind="xml" />
    </DeveloperToolPage>
  );
}
