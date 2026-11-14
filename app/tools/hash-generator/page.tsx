import DeveloperToolPage from "@/components/tools/devtools/page";
import ConsolidatedWorkspace from "@/components/tools/security/consolidated-workspace";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["hash-generator"].title,
  TOOL_SEO_METADATA["hash-generator"].description,
  "/tools/hash-generator",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="hash-generator">
      <ConsolidatedWorkspace slug="hash-generator" />
    </DeveloperToolPage>
  );
}
