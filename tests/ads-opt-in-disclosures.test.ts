import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** User-facing pages that explain AdSense or its access to page/browser data. */
const DISCLOSURE_PAGES = [
  "app/(public)/about/page.tsx",
  "app/(public)/cookies/page.tsx",
  "app/(public)/faq/page.tsx",
  "app/(public)/file-handling/page.tsx",
  "app/(public)/privacy/page.tsx",
  "app/(public)/security/page.tsx",
  "app/(public)/terms/page.tsx",
  "app/(public)/tools/qr-code-scanner/page.tsx",
];

const UNCONDITIONAL_LOAD_CLAIMS = [
  /(?:AdSense|advertising|verification)[^.!?]{0,80}script[^.!?]{0,100}(?:loaded|loads|runs|embedded)[^.!?]{0,60}(?:every|each|site-wide)/i,
  /site-wide[^.!?]{0,80}(?:AdSense|script)[^.!?]{0,100}(?:loaded|loads|runs)/i,
  /(?:every|each) page[^.!?]{0,80}(?:AdSense|script)[^.!?]{0,100}(?:loaded|loads|runs|embedded)/i,
];

describe("AdSense opt-in disclosures", () => {
  it("conditions every user-facing script disclosure on advertising being enabled", () => {
    for (const page of DISCLOSURE_PAGES) {
      const source = readFileSync(page, "utf8").replace(/\s+/g, " ");
      expect(source, `${page} must explain the opt-in condition`).toMatch(
        /when advertising is enabled/i,
      );
      for (const claim of UNCONDITIONAL_LOAD_CLAIMS) {
        expect(
          source,
          `${page} must not claim ads load on every page`,
        ).not.toMatch(claim);
      }
    }
  });
});
