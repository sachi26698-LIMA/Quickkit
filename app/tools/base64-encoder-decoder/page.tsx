import DeveloperToolPage from "@/components/tools/devtools/page";
import Base64Tool from "@/components/tools/devtools/base64";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Base64 Encoder / Decoder — text and file conversion",
  "Encode UTF-8 text or files to Base64 and decode Base64 as text or a binary download. Detect invalid input and process everything locally.",
  "/tools/base64-encoder-decoder",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="base64-encoder-decoder">
      <Base64Tool />
    </DeveloperToolPage>
  );
}
