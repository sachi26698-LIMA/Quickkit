import DeveloperToolPage from "@/components/tools/devtools/page";
import MinifierTool from "@/components/tools/devtools/minifier";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["javascript-minifier"].title,
  TOOL_SEO_METADATA["javascript-minifier"].description,
  "/tools/javascript-minifier",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="javascript-minifier">
      <MinifierTool kind="javascript" />
    </DeveloperToolPage>
  );
}
