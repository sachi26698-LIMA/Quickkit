import DeveloperToolPage from "@/components/tools/devtools/page";
import MinifierTool from "@/components/tools/devtools/minifier";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "CSS Minifier — compress CSS and compare sizes",
  "Minify CSS with a syntax-aware parser, remove unnecessary whitespace and comments, compare input and output byte sizes, and download locally.",
  "/tools/css-minifier",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="css-minifier">
      <MinifierTool kind="css" />
    </DeveloperToolPage>
  );
}
