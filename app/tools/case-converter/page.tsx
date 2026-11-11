import ToolShell from "@/components/tool-shell";
import CaseConverter from "@/components/tools/case-converter";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";
export const metadata = pageMetadata(
  TOOL_SEO_METADATA["case-converter"].title,
  TOOL_SEO_METADATA["case-converter"].description,
  "/tools/case-converter",
);
export default function Page() {
  return (
    <ToolShell
      slug="case-converter"
      headingDescription={TOOL_SEO_METADATA["case-converter"].description}
      stepsHeading="How to convert text between case styles"
      faqsHeading="Case converter questions, answered"
      relatedHeading="More ways to work with text"
      referenceSection={
        <ToolReferenceSection
          slug="case-converter"
          entry={TOOL_SEO_CONTENT["case-converter"]}
        />
      }
      content={{
        steps: [
          "Paste text into the Original text field.",
          "Choose from ten styles: reading cases, developer identifiers (camelCase, snake_case…) or playful aLtErNaTiNg. The result updates live as you type.",
          "Copy or download the converted output, send it back to the input for another pass, or reset both fields.",
          "Review proper names and acronyms after conversion because the title and sentence modes use simple language-independent rules.",
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
          {
            q: "Are identifier styles applied to each line?",
            a: "Yes. camelCase, PascalCase, snake_case, kebab-case, and CONSTANT_CASE are converted line by line, with line breaks preserved.",
          },
        ],
      }}
    >
      <CaseConverter />
    </ToolShell>
  );
}
