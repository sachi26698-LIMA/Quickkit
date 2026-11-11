import DeveloperToolPage from "@/components/tools/devtools/page";
import MinifierTool from "@/components/tools/devtools/minifier";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["css-minifier"].title,
  TOOL_SEO_METADATA["css-minifier"].description,
  "/tools/css-minifier",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="css-minifier">
      <MinifierTool kind="css" />
    </DeveloperToolPage>
  );
}
