import DeveloperToolPage from "@/components/tools/devtools/page";
import UuidGenerator from "@/components/tools/devtools/uuid-generator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "UUID Generator — secure bulk UUID v4 values",
  "Generate cryptographically random UUID v4 identifiers in configurable, duplicate-checked batches. Copy or download up to 2,000 local UUIDs at once.",
  "/tools/uuid-generator",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="uuid-generator">
      <UuidGenerator />
    </DeveloperToolPage>
  );
}
