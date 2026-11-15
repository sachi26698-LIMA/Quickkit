import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { publicToolMetadata } from "@/lib/supabase/public-catalog";
import DeveloperToolPage from "@/components/tools/devtools/page";
import UuidGenerator from "@/components/tools/devtools/uuid-generator";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return publicToolMetadata(
    "uuid-generator",
    TOOL_SEO_METADATA["uuid-generator"].title,
    TOOL_SEO_METADATA["uuid-generator"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("uuid-generator");
  return (
    <DeveloperToolPage publicData={publicData} slug="uuid-generator">
      <UuidGenerator />
    </DeveloperToolPage>
  );
}
