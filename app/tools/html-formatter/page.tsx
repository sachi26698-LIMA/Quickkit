import DeveloperToolPage from "@/components/tools/devtools/page";
import MarkupTool from "@/components/tools/devtools/markup-tool";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "HTML Formatter — format and minify HTML locally",
  "Beautify or minify HTML with safe syntax highlighting, real UTF-8 size statistics, and local copy and download actions. Embedded code is never executed.",
  "/tools/html-formatter",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="html-formatter">
      <MarkupTool kind="html" />
    </DeveloperToolPage>
  );
}
