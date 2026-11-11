import DeveloperToolPage from "@/components/tools/devtools/page";
import RegexTester from "@/components/tools/devtools/regex-tester";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";

export const metadata = pageMetadata(
  TOOL_SEO_METADATA["regex-tester"].title,
  TOOL_SEO_METADATA["regex-tester"].description,
  "/tools/regex-tester",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="regex-tester">
      <RegexTester />
    </DeveloperToolPage>
  );
}
