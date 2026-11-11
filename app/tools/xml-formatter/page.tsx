import DeveloperToolPage from "@/components/tools/devtools/page";
import MarkupTool from "@/components/tools/devtools/markup-tool";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["xml-formatter"].title,
  TOOL_SEO_METADATA["xml-formatter"].description,
  "/tools/xml-formatter",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="xml-formatter">
      <MarkupTool kind="xml" />
    </DeveloperToolPage>
  );
}
