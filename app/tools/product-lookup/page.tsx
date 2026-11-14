import ToolShell from "@/components/tool-shell";
import ProductLookup from "@/components/tools/product-lookup";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "GTIN Product Lookup — Open Food Facts, Labelled",
  "Look up a GTIN in Open Food Facts: ingredients, allergens and nutrition as recorded, missing fields shown as missing, ODbL attribution, no manufacturer claim.",
  "/tools/product-lookup",
);

export default function Page() {
  return (
    <ToolShell
      slug="product-lookup"
      headingDescription="Enter the number under a barcode to see the community record for that product. Missing fields stay missing, a failed lookup is reported with its real reason, and the page never implies the manufacturer confirmed anything."
      stepsHeading="How to read a lookup result"
      faqsHeading="Product lookup questions, answered"
      relatedHeading="Generate, scan, then look up"
      content={{
        steps: [
          "Enter the GTIN printed under the barcode, then look it up. The check digit is validated in the browser first, so an 11-digit mistyping is rejected before any request leaves the page.",
          "Read the answer as one of four states. FOUND shows the record. NOT FOUND means nobody has contributed this product yet — it is not evidence that the barcode is fake. RATE LIMITED means too many lookups were made from one connection. ERROR means the database or the network failed, and the message names which.",
          "Check which fields are actually present. Every missing field is listed: an absent ingredient statement is labelled as absent, never filled with a typical recipe from another product.",
          "Use the attribution. The data is Open Food Facts under ODbL, and images are CC-BY-SA. Export as CSV or JSON with the licence and the missing-field list attached, so the file cannot be mistaken for a manufacturer datasheet.",
        ],
        faqs: [
          {
            q: "Why does a valid barcode sometimes return no product?",
            a: "Because the database is a volunteer effort, not a registry. A manufacturer can print a completely valid GTIN for a product that no contributor has photographed or entered. A missing record says nothing about authenticity, and this page never reports it as such.",
          },
          {
            q: "Is the data from the manufacturer?",
            a: "No. Open Food Facts is crowd-sourced: contributors photograph packs and transcribe labels. Records can be out of date, incomplete or wrong, and the page marks every record as not manufacturer-verified. Where an ingredient matters to your health, the pack in your hand is the authority.",
          },
          {
            q: "What do the different failure messages mean?",
            a: "They are deliberately not merged. A timeout means this site's lookup proxy did not answer in time. An upstream 500, 502 or 503 means the database answered with an error. A 429 means the rate limit for this visitor was reached. A network failure means no response arrived at all. Each has a different fix, so each is reported separately, with the HTTP status when there is one.",
          },
          {
            q: "Why does the lookup go through this site instead of straight to Open Food Facts?",
            a: "Two reasons. The browser never talks to a third-party host, so your IP address is not handed to a third party from this page, and the site's content security policy does not need to trust that host. And the response is normalised and its image type-checked and size-capped in one place, so a malformed record cannot break the page.",
          },
          {
            q: "Is the lookup number stored?",
            a: "Only as a small cache on the server for a short time, so repeated lookups of the same product do not hit the database again. No account exists, no history is kept in the database, and nothing links a GTIN to a person. Scan history on the scanner page stays in your browser's local storage unless you clear it.",
          },
          {
            q: "Can I look up a batch code or a QR code here?",
            a: "No, and you should not: batch codes are not product numbers, and this endpoint only accepts GTINs. Use the batch code checker for lot codes, and the barcode scanner for QR content. A QR code that contains a Digital Link can be parsed with the GS1 intelligence tool.",
          },
        ],
      }}
    >
      <ProductLookup />
    </ToolShell>
  );
}
