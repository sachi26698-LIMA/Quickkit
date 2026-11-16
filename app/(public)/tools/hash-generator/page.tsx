import { getPublicToolShellData } from "@/lib/supabase/public-catalog";
import { resolvedToolMetadata } from "@/lib/supabase/tool-seo";
import DeveloperToolPage from "@/components/tools/devtools/page";
import ConsolidatedWorkspace from "@/components/tools/security/consolidated-workspace";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export async function generateMetadata() {
  return resolvedToolMetadata(
    "hash-generator",
    TOOL_SEO_METADATA["hash-generator"].title,
    TOOL_SEO_METADATA["hash-generator"].description,
  );
}

export default async function Page() {
  const publicData = await getPublicToolShellData("hash-generator");
  return (
    <DeveloperToolPage publicData={publicData} slug="hash-generator">
      {/* Three operations share this address: hashing, digest comparison and
          file signature checks. The old /tools/hash-comparison and
          /tools/file-privacy-checker links redirect to their tab here. */}
      <ConsolidatedWorkspace slug="hash-generator" />
    </DeveloperToolPage>
  );
}
