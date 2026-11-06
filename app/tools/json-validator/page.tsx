import DeveloperToolPage from "@/components/tools/devtools/page";
import JsonValidator from "@/components/tools/devtools/json-validator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "JSON Validator — check syntax and find errors",
  "Validate JSON locally, locate syntax errors by line and column, and read clear explanations for missing commas, brackets and invalid values.",
  "/tools/json-validator",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="json-validator">
      <JsonValidator />
    </DeveloperToolPage>
  );
}
