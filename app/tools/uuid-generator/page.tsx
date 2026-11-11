import DeveloperToolPage from "@/components/tools/devtools/page";
import UuidGenerator from "@/components/tools/devtools/uuid-generator";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["uuid-generator"].title,
  TOOL_SEO_METADATA["uuid-generator"].description,
  "/tools/uuid-generator",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="uuid-generator">
      <UuidGenerator />
    </DeveloperToolPage>
  );
}
