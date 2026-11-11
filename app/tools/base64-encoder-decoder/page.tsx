import DeveloperToolPage from "@/components/tools/devtools/page";
import Base64Tool from "@/components/tools/devtools/base64";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["base64-encoder-decoder"].title,
  TOOL_SEO_METADATA["base64-encoder-decoder"].description,
  "/tools/base64-encoder-decoder",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="base64-encoder-decoder">
      <Base64Tool />
    </DeveloperToolPage>
  );
}
