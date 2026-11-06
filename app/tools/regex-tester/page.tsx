import DeveloperToolPage from "@/components/tools/devtools/page";
import RegexTester from "@/components/tools/devtools/regex-tester";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Regex Tester — live matches, groups and replacements",
  "Test regular expressions with flags, match highlights, capture groups and replacement previews. Runs in a time-limited local worker; no arbitrary code is executed.",
  "/tools/regex-tester",
);

export default function Page() {
  return (
    <DeveloperToolPage slug="regex-tester">
      <RegexTester />
    </DeveloperToolPage>
  );
}
