import DeveloperToolPage from "@/components/tools/devtools/page";
import JsonValidator from "@/components/tools/devtools/json-validator";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["json-validator"].title,
  TOOL_SEO_METADATA["json-validator"].description,
  "/tools/json-validator",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="json-validator">
      <JsonValidator />
    </DeveloperToolPage>
  );
}
