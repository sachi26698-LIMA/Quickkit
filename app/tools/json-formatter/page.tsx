import ToolShell from "@/components/tool-shell";
import JsonFormatter from "@/components/tools/json-formatter";
import { pageMetadata } from "@/lib/seo";
import { TOOL_SEO_METADATA } from "@/lib/tool-seo-content";
import ToolReferenceSection from "@/components/tool-reference-section";
import { TOOL_SEO_CONTENT } from "@/lib/tool-seo-content";
export const metadata = pageMetadata(
  TOOL_SEO_METADATA["json-formatter"].title,
  TOOL_SEO_METADATA["json-formatter"].description,
  "/tools/json-formatter",
);
export default function Page() {
  return (
    <ToolShell
      slug="json-formatter"
      headingDescription={TOOL_SEO_METADATA["json-formatter"].description}
      stepsHeading="Format and validate JSON with sorted keys"
      faqsHeading="JSON formatting questions, answered"
      relatedHeading="More developer tools for data and code"
      referenceSection={
        <ToolReferenceSection
          slug="json-formatter"
          entry={TOOL_SEO_CONTENT["json-formatter"]}
        />
      }
      content={{
        steps: [
          "Paste valid JSON into the input editor (up to 1,000,000 characters).",
          "Pick an indent style (and optionally sort keys), then choose Format JSON, Minify or Validate. You can also open a .json file.",
          "Read any syntax feedback and copy the result.",
          "For values used in software, keep identifiers with leading zeros or integers above JavaScript’s safe range as quoted strings before formatting.",
        ],
        faqs: [
          {
            q: "Why is my JSON invalid?",
            a: "JSON needs double-quoted keys and strings. Comments, single quotes, undefined values and trailing commas are not valid JSON.",
          },
          {
            q: "Are large numbers and duplicate keys preserved?",
            a: "JavaScript parsing may round integers beyond the safe integer range (9,007,199,254,740,991). Store such values as quoted strings. Duplicate keys collapse to the last value. Do not use this tool for lossless transformation of those inputs.",
          },
          {
            q: "Does the formatter run code?",
            a: "No. It uses JSON.parse and JSON.stringify, never eval or execution. Unicode strings are preserved.",
          },
          {
            q: "What does sorting change?",
            a: "When enabled, keys are sorted recursively at each object level. Array order and values are not rearranged.",
          },
        ],
      }}
    >
      <JsonFormatter />
    </ToolShell>
  );
}
