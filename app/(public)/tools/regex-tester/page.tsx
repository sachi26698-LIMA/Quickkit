import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { publicToolMetadata } from "@/lib/supabase/public-catalog";
import DeveloperToolPage from "@/components/tools/devtools/page";
import RegexTester from "@/components/tools/devtools/regex-tester";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return publicToolMetadata(
    "regex-tester",
    TOOL_SEO_METADATA["regex-tester"].title,
    TOOL_SEO_METADATA["regex-tester"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("regex-tester");
  return (
    <DeveloperToolPage publicData={publicData} slug="regex-tester">
      <RegexTester />
    </DeveloperToolPage>
  );
}
