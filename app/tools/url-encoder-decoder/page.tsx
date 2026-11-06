import DeveloperToolPage from "@/components/tools/devtools/page";
import UrlCodec from "@/components/tools/devtools/url-codec";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "URL Encoder / Decoder — encode URLs and query values",
  "Encode or decode full URLs and individual query components with correct Unicode and reserved-character handling. Nothing is fetched or uploaded.",
  "/tools/url-encoder-decoder",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="url-encoder-decoder">
      <UrlCodec />
    </DeveloperToolPage>
  );
}
