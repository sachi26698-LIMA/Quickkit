import { Suspense } from "react";
import ToolShell from "@/components/tool-shell";
import BatchChecker from "@/components/tools/batch-code-checker";
import BrandDirectory from "@/components/tools/batch-code-checker/brand-directory";
import BatchCodeReference from "@/components/tools/batch-code-checker/reference";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Batch Code Checker — Lot Codes, Decoded Honestly",
  "Check a cosmetics lot code against documented decoders: verified, estimated from cited guidance, or not decodable — never an invented date.",
  "/tools/batch-code-checker",
);

export default function Page() {
  return (
    <ToolShell
      slug="batch-code-checker"
      headingDescription="Enter a lot code, the brand and any dates printed on the pack. The checker separates what it can verify from what it can only estimate, and says NOT DECODABLE when a brand's format has no public key — with the official route to ask instead."
      stepsHeading="How to check a batch code without guessing"
      faqsHeading="Batch code questions, answered"
      relatedHeading="Read the code, make the label, ask the brand"
      referenceSection={
        <>
          <BrandDirectory />
          <BatchCodeReference />
        </>
      }
      content={{
        steps: [
          "Pick the brand. Every brand in the directory has a record: its decoder status, the code pattern it is known to use, its limitation and its shelf-life guidance. An unknown brand cannot be checked, and the tool says so rather than improvising.",
          "Type the batch or lot code exactly as printed. The checker tries a GS1 element string first (AI 11 production date, AI 17 expiration date), then looks for a date the manufacturer typed into the code itself, and lists every reading when the digits are ambiguous.",
          "Add whatever the pack actually prints — manufacture date, expiry date, the open-jar PAO number and the date you opened it. These become separate, labelled calculations: printed, decoded, estimated and after-opening are never blended into one number.",
          "Read the verdict before the dates. VERIFIED means a standards-defined field or your own printed date produced it; ESTIMATED means disclosed guidance; NOT DECODABLE means the code holds no defensible date and the printed date is the only authority.",
        ],
        faqs: [
          {
            q: "Can this tool decode any cosmetics batch code?",
            a: "No, and it says so. Most brands keep their lot-number format internal, so there is no public algorithm to apply. The checker ships three decoders: GS1 element strings (a published standard), an explicit date typed into the code, and nothing else. Every brand record with no published format is marked as undecodable, and the tool will not produce a date for it.",
          },
          {
            q: "What is the difference between VERIFIED and ESTIMATED?",
            a: "VERIFIED dates come from a standard-defined carrier (GS1 AI 11 or AI 17) or from a date printed on the packaging that you typed in. ESTIMATED covers two disclosed things: a date-shaped token found inside the code, which is a pattern match rather than the brand's algorithm, and an expiry calculated as manufacture date plus category shelf-life guidance. Estimates are labelled on their own card and never outrank a printed date.",
          },
          {
            q: "What does the open-jar symbol mean, and how does it differ from the expiry date?",
            a: "The open-jar symbol carries a number plus M — 6M, 12M, 24M — meaning the product is intended to be used within that many months after opening. It is defined by EU Cosmetics Regulation 1223/2009 Annex VIII. It is a separate window from the printed expiry date: the printed date covers the unopened pack, and a product should not be used beyond either limit. This tool calculates it only when you enter both the opened date and the PAO value.",
          },
          {
            q: "Why does the tool ask for a printed date when it cannot decode the code?",
            a: "Because the printed date is real evidence and a guessed decode is not. When a brand's lot format has no public documentation, the honest output is the explanation plus the official route to ask the manufacturer, not a confident-looking date. If the pack prints EXP or a best-before date, entering it gives you a verified answer immediately.",
          },
          {
            q: "Are the brand records and shelf lives made up?",
            a: "No. Each record lists the parent group, categories, decoder id and version, verification status, limitation and shelf-life source. No brand-specific decoder is claimed for any brand because no manufacturer document describing one was verifiable, so the verified count is zero and every record says so. Shelf lives are general category guidance with the source named, and the printed date always wins.",
          },
          {
            q: "Is my batch code or product name uploaded?",
            a: "No. The check runs in this browser tab: nothing is posted, no account exists, and the code never leaves the device. The only outbound request this page can make is the optional GTIN lookup on the separate barcode scanner page, which sends a product number and never a batch code.",
          },
        ],
      }}
    >
      <Suspense fallback={null}>
        <BatchChecker />
      </Suspense>
    </ToolShell>
  );
}
