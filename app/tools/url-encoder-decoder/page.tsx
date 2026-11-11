import DeveloperToolPage from "@/components/tools/devtools/page";
import UrlCodec from "@/components/tools/devtools/url-codec";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["url-encoder-decoder"].title,
  TOOL_SEO_METADATA["url-encoder-decoder"].description,
  "/tools/url-encoder-decoder",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="url-encoder-decoder">
      <UrlCodec />
    </DeveloperToolPage>
  );
}
