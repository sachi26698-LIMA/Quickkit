import ToolShell from "@/components/tool-shell";
import Gs1Intelligence from "@/components/tools/gs1-intelligence";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "GS1 Intelligence — Parse AIs and Digital Links",
  "Parse GS1 element strings, HRI strings and Digital Links: each AI explained, dates interpreted, the GTIN check digit verified and a Digital Link built.",
  "/tools/gs1-intelligence",
);

export default function Page() {
  return (
    <ToolShell
      slug="gs1-intelligence"
      headingDescription="An element string is not free text: each application identifier has a fixed meaning, a length rule and, for dates, a calendar interpretation. This workspace reads the string the way a scanner does, explains each AI, and refuses a GTIN whose check digit does not hold."
      stepsHeading="How to read a GS1 element string"
      faqsHeading="GS1 questions, answered"
      relatedHeading="Identify, look up, decode"
      content={{
        steps: [
          "Paste the data. Parenthesised HRI such as (01)09506000134352(10)LOT-42 works, and so does the raw element string a scanner emits, where a variable-length field is terminated by an FNC1 character (shown here as <GS>). A GS1 Digital Link URL is recognised too.",
          "Check the identifiers first. AI (01) is the GTIN — the product type, identical on every pack. AI (10) is the batch, (21) the serial. The parser reports a GTIN whose check digit fails, and it never repairs the number for you.",
          "Read the dates as dates. AI (15) is best-before, (17) is expiry, (11) production, (13) packaging. GS1 writes dates as YYMMDD, and a day of 00 means the last day of that month — so (17)250200 is 28 February 2025, not 2 February.",
          "Build a Digital Link only after the pieces are right. The builder pads your GTIN to 14 digits, keeps dates in the query string and the identifying attributes in the path, which is the order the Digital Link standard specifies.",
        ],
        faqs: [
          {
            q: "What is the difference between a GTIN, a batch number and a serial number?",
            a: "A GTIN (AI 01) identifies the product type: every 400 g jar of the same recipe carries the same GTIN. A batch or lot number (AI 10) identifies a production run, so several packs share it. A serial number (AI 21) identifies one single item. Only the serial is unique per unit, and none of the three proves authenticity — a counterfeiter can print all three.",
          },
          {
            q: "Does a valid GTIN check digit mean the number is registered with GS1?",
            a: "No. The check digit is arithmetic anyone can compute, and this tool computes it. The company prefix at the start of a GTIN is assigned by a GS1 member organisation, and only the GS1 registry can confirm that assignment. A correct check digit means the number is well-formed, which is a much weaker claim than licensed.",
          },
          {
            q: "Why does the parser warn about fields that appear twice?",
            a: "An element string carries one value per application identifier in the fixed use cases. A repeated AI usually means two labels were concatenated, or a field was appended by hand. The parser still shows both values, but it flags the repetition instead of silently keeping the last one.",
          },
          {
            q: "Why is a date with day 00 valid?",
            a: "GS1 allows YYMM00 when a label only knows the month, and the standard defines the meaning as the last day of that month. The tool resolves it and says so, so the date you see is never more precise than the data.",
          },
          {
            q: "What is a GS1 Digital Link and how does it differ from a QR code?",
            a: "A Digital Link is a URL whose path and query carry AIs, for example https://id.example.com/01/09506000134352/10/LOT-42?17=251231. A QR code is just the carrier: it can hold a Digital Link, a plain product page URL or arbitrary text. The standard defines the URL structure, not the symbol, which is why the same link can be printed as a QR code or a Data Matrix.",
          },
          {
            q: "Is my data uploaded when I parse it?",
            a: "No. Parsing, date interpretation, check-digit verification and the URL builder all run in this browser tab. The only outbound requests this page can make are the optional QR rendering in your own browser; no element string leaves the device.",
          },
        ],
      }}
    >
      <Gs1Intelligence />
    </ToolShell>
  );
}
