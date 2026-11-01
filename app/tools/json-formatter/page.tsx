import ToolShell from "@/components/tool-shell";
import JsonFormatter from "@/components/tools/json-formatter";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata(
  "JSON Formatter & Validator — format or minify JSON",
  "Format JSON with 2/4-space or tab indentation, sort keys, validate syntax with exact error locations, or minify. A local editor with no code execution.",
  "/tools/json-formatter",
);
export default function Page() {
  return (
    <ToolShell
      slug="json-formatter"
      content={{
        steps: [
          "Paste valid JSON into the input editor (up to 1,000,000 characters).",
          "Pick an indent style (and optionally sort keys), then choose Format JSON, Minify or Validate. You can also open a .json file.",
          "Read any syntax feedback and copy the result.",
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
        ],
      }}
    >
      <JsonFormatter />
    </ToolShell>
  );
}
