import DeveloperToolPage from "@/components/tools/devtools/page";
import MinifierTool from "@/components/tools/devtools/minifier";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "JavaScript Minifier — safely minify JavaScript",
  "Compress JavaScript with a real parser, compare UTF-8 sizes and get syntax errors clearly. User-provided JavaScript is never executed and stays in the browser.",
  "/tools/javascript-minifier",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="javascript-minifier">
      <MinifierTool kind="javascript" />
    </DeveloperToolPage>
  );
}
