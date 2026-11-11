import DeveloperToolPage from "@/components/tools/devtools/page";
import MarkupTool from "@/components/tools/devtools/markup-tool";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["html-formatter"].title,
  TOOL_SEO_METADATA["html-formatter"].description,
  "/tools/html-formatter",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="html-formatter">
      <MarkupTool kind="html" />
    </DeveloperToolPage>
  );
}
