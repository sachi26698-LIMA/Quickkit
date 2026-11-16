import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { resolvedToolMetadata } from "@/lib/supabase/tool-seo";
import DeveloperToolPage from "@/components/tools/devtools/page";
import UrlCodec from "@/components/tools/devtools/url-codec";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return resolvedToolMetadata(
    "url-encoder-decoder",
    TOOL_SEO_METADATA["url-encoder-decoder"].title,
    TOOL_SEO_METADATA["url-encoder-decoder"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("url-encoder-decoder");
  return (
    <DeveloperToolPage publicData={publicData} slug="url-encoder-decoder">
      <UrlCodec />
    </DeveloperToolPage>
  );
}
