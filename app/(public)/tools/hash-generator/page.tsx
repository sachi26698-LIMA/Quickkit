import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { publicToolMetadata } from "@/lib/supabase/public-catalog";
import DeveloperToolPage from "@/components/tools/devtools/page";
import HashGenerator from "@/components/tools/devtools/hash-generator";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return publicToolMetadata(
    "hash-generator",
    TOOL_SEO_METADATA["hash-generator"].title,
    TOOL_SEO_METADATA["hash-generator"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("hash-generator");
  return (
    <DeveloperToolPage publicData={publicData} slug="hash-generator">
      <HashGenerator />
    </DeveloperToolPage>
  );
}
