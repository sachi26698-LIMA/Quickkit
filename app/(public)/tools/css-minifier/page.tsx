import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { publicToolMetadata } from "@/lib/supabase/public-catalog";
import DeveloperToolPage from "@/components/tools/devtools/page";
import MinifierTool from "@/components/tools/devtools/minifier";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return publicToolMetadata(
    "css-minifier",
    TOOL_SEO_METADATA["css-minifier"].title,
    TOOL_SEO_METADATA["css-minifier"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("css-minifier");
  return (
    <DeveloperToolPage publicData={publicData} slug="css-minifier">
      <MinifierTool kind="css" />
    </DeveloperToolPage>
  );
}
