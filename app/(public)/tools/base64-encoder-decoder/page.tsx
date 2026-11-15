import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { publicToolMetadata } from "@/lib/supabase/public-catalog";
import DeveloperToolPage from "@/components/tools/devtools/page";
import Base64Tool from "@/components/tools/devtools/base64";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return publicToolMetadata(
    "base64-encoder-decoder",
    TOOL_SEO_METADATA["base64-encoder-decoder"].title,
    TOOL_SEO_METADATA["base64-encoder-decoder"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("base64-encoder-decoder");
  return (
    <DeveloperToolPage publicData={publicData} slug="base64-encoder-decoder">
      <Base64Tool />
    </DeveloperToolPage>
  );
}
