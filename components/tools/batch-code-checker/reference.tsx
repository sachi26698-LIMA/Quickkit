import ToolReferenceSection from "@/components/tool-reference-section";
import { brandCoverage } from "@/lib/tools/batch-code/brands";

/**
 * Reference content for /tools/batch-code-checker.
 *
 * Every claim here is derived from the engine: the coverage numbers are computed
 * from the brand records at build time, and the three verdict states are the
 * only states the checker can return.
 */
export default function BatchCodeReference() {
  const coverage = brandCoverage();
  return (
    <ToolReferenceSection
      slug="batch-code-checker"
      entry={{
        referenceHeading:
          "How this batch code checker decides what it can tell you",
        referenceIntro:
          "There are only three possible answers, and each one names its evidence. A brand's lot number is usually an internal serial with no published key, so the honest result for most packs is NOT DECODABLE — followed by the printed date, not by an invented one.",
        specsTitle: "The three result states",
        specs: [
          {
            label: "VERIFIED",
            detail:
              "A documented, standards-defined field produced the date: a GS1 element string carrying AI 11 (production date) or AI 17 (expiration date), including the rule that a day of 00 means the last day of the month. A date you read off the pack and type in is also verified — it is a fact, not an inference.",
          },
          {
            label: "ESTIMATED",
            detail:
              "Either a date-shaped token inside the code (06/2027, 2027-06-12, 20270612, 260612) with the alternative readings listed when the digits are ambiguous, or an unopened-expiry estimate built from a manufacture date plus published category shelf-life guidance. Both are labelled estimates and neither outranks a printed date.",
          },
          {
            label: "NOT DECODABLE",
            detail: `The code carries no date this tool can defend. That is the case for ${coverage.none} of ${coverage.total} brand records, because no manufacturer document describing their lot format is public. The page then explains the limitation, links the brand's official site where one is verified, and asks for the printed date instead.`,
          },
        ],
        examplesTitle: "Separate calculations, never mixed",
        examples: [
          {
            scenario: "Printed expiry",
            input: "EXP 06/2027 typed into the form",
            output: "1 Jun 2027 · printed · outranks every estimate",
          },
          {
            scenario: "Manufacture + shelf life",
            input:
              "MFG 15 Jan 2024 on a skincare record with 36-month guidance",
            output:
              "15 Jan 2027 · estimate · guidance, not a manufacturer statement",
          },
          {
            scenario: "Opened + PAO",
            input: "Opened 10 Jan 2026, open-jar symbol 12M",
            output:
              "10 Jan 2027 · period after opening · starts when you opened it",
          },
          {
            scenario: "A GTIN in the lot-code field",
            input: "13-digit product barcode with a valid check digit",
            output:
              "Flagged as a product number, not treated as a batch or a date",
          },
        ],
        privacyNote: `Runs entirely in your browser: no code, date or product name is uploaded, and there is no account. Coverage as shipped: ${coverage.total} brand records, ${coverage.verified} brand-specific decoders verified against a manufacturer document, ${coverage.pattern} pattern-only, ${coverage.none} documented as undecodable.`,
      }}
    />
  );
}
