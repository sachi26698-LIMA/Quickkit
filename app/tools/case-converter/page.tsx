import ToolShell from "@/components/tool-shell";
import CaseConverter from "@/components/tools/case-converter";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "Case Converter — uppercase, lowercase, title & sentence case",
  "Convert text case without losing line breaks. Switch between uppercase, lowercase, title and sentence case locally.",
  "/tools/case-converter",
);
export default function Page() {
  return (
    <ToolShell
      slug="case-converter"
      content={{
        steps: [
          "Paste text into the Original text field.",
          "Choose UPPERCASE, lowercase, Title Case or Sentence case.",
          "Copy the converted output, or reset both fields.",
        ],
        faqs: [
          {
            q: "Will it preserve my line breaks?",
            a: "Yes. Line breaks and whitespace stay in place. Some Unicode characters can expand during case conversion, so character counts may change.",
          },
          {
            q: "Does it follow every language’s title rules?",
            a: "No. Title Case capitalizes word beginnings using simple Unicode-aware rules; Sentence case capitalizes the beginning and text following punctuation or line breaks. Names, acronyms and language-specific conventions may need manual editing.",
          },
          {
            q: "Where is my text processed?",
            a: "Only in the browser. QUICKKIT does not send the editor content to a server.",
          },
        ],
      }}
    >
      <CaseConverter />
    </ToolShell>
  );
}
