import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { resolvedToolMetadata } from "@/lib/supabase/tool-seo";
import DeveloperToolPage from "@/components/tools/devtools/page";
import MarkupTool from "@/components/tools/devtools/markup-tool";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return resolvedToolMetadata(
    "xml-formatter",
    TOOL_SEO_METADATA["xml-formatter"].title,
    TOOL_SEO_METADATA["xml-formatter"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("xml-formatter");
  return (
    <DeveloperToolPage publicData={publicData} slug="xml-formatter">
      <MarkupTool kind="xml" />
    </DeveloperToolPage>
  );
}
