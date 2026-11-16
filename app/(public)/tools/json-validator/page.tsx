import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { resolvedToolMetadata } from "@/lib/supabase/tool-seo";
import DeveloperToolPage from "@/components/tools/devtools/page";
import JsonValidator from "@/components/tools/devtools/json-validator";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return resolvedToolMetadata(
    "json-validator",
    TOOL_SEO_METADATA["json-validator"].title,
    TOOL_SEO_METADATA["json-validator"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("json-validator");
  return (
    <DeveloperToolPage publicData={publicData} slug="json-validator">
      <JsonValidator />
    </DeveloperToolPage>
  );
}
