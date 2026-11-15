import ToolShell from "@/components/tool-shell";
import BarcodeDeveloper from "@/components/tools/barcode-developer";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Barcode Developer Tools — Compare, Analyse, Debug",
  "Compare barcode values character by character, screen a photographed symbol for resolution, contrast and quiet-zone faults, and read the lookup endpoint.",
  "/tools/barcode-developer",
);

export default function Page() {
  return (
    <ToolShell
      slug="barcode-developer"
      headingDescription="Three debugging jobs that come up whenever barcodes meet code: are these two values the same product number, why will this photo not decode, and what exactly does the lookup endpoint return?"
      stepsHeading="Debug a barcode problem in three steps"
      faqsHeading="Developer questions, answered"
      relatedHeading="Generate, parse and look up"
      content={{
        steps: [
          "Compare the values first. A parenthesised HRI label and a scanner's raw output are normalised before comparison, so (01)09506000134352 and 09506000134352 are reported as the same GTIN rather than as different strings.",
          "Screen the image if a photo will not scan. The analyser measures pixels per module, contrast ratio, quiet zone and whether ink touches an edge — the four defects that account for most failed mobile scans.",
          "Read the failure as a defect, not a grade. A 1-pixel module is a real problem; a 2.4:1 contrast ratio is a real problem. Neither number is an ISO/IEC 15416 or 15415 grade, and the tool says so on the result.",
          "Use the endpoint section as documentation. It lists the exact status codes the product-lookup proxy can return, so a client can tell a missing product from a rate limit from an upstream outage.",
        ],
        faqs: [
          {
            q: "Is the image analyser a barcode verifier?",
            a: "No. A verifier measures symbol contrast, modulation, defects and decode under calibrated lighting with a defined aperture, and issues a grade under ISO/IEC 15416 for linear symbols or ISO/IEC 15415 for 2D symbols. This tool measures pixels per module, WCAG-style contrast ratio, quiet zone in pixels and edge cropping. Those catch the common printing and photography mistakes, but they are not a grade and must not be presented as one.",
          },
          {
            q: "Why do two identical-looking values compare as different?",
            a: "Usually one of them carries a check character or a normalisation difference the other does not: a Code 128 check digit, a trailing space, a full-width character, or a UPC-A versus EAN-13 notation of the same number. The comparison table shows the first differing index and the differing characters, which identifies the offending character immediately.",
          },
          {
            q: "What does 'same GTIN, different notation' mean?",
            a: "It means both values are the same product number written with different zero padding — a common difference between a 12-digit UPC-A and its 13-digit EAN form, or a 13-digit GTIN and its 14-digit form. They will scan to the same product, so the comparison reports them as the same GTIN rather than as a mismatch.",
          },
          {
            q: "Why does a valid GTIN still fail the check-digit test in the comparison?",
            a: "Because the last digit is not the check digit for the preceding ones, or the number is 7, 9, 10 or 11 digits long and therefore not a GTIN at all. The table reports the expected digit, which makes a transcription error visible; it never silently 'fixes' the value.",
          },
          {
            q: "Does any of this upload my data or photo?",
            a: "No. The comparison runs in memory, and the image is read through a canvas element inside the tab. The endpoint section is static documentation — this page does not call it.",
          },
        ],
      }}
    >
      <BarcodeDeveloper />
    </ToolShell>
  );
}
