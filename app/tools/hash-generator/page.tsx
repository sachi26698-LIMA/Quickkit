import DeveloperToolPage from "@/components/tools/devtools/page";
import HashGenerator from "@/components/tools/devtools/hash-generator";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Hash Generator — MD5, SHA-1, SHA-256 and SHA-512",
  "Generate MD5, SHA-1, SHA-256 or SHA-512 digests from UTF-8 text or files with local chunked processing, algorithm notes, copy and download.",
  "/tools/hash-generator",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="hash-generator">
      <HashGenerator />
    </DeveloperToolPage>
  );
}
