import type { Metadata } from "next";
import FontLibrary from "@/components/biocraft/font-library";
import { catalogue, fontFacets, listFonts } from "@/lib/fonts/catalogue";
import type { FontListResponse } from "@/lib/fonts/client-api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hindi font library",
  description:
    "Browse every verified Devanagari family in BioCraft. Search, filter by style, preview your own Hindi text, compare fonts and download WOFF2 files where the licence allows.",
  alternates: { canonical: "/biocraft/fonts" },
};

export default async function FontLibraryPage() {
  const [page, facets] = await Promise.all([
    listFonts({ limit: 12 }),
    fontFacets(),
  ]);
  const initial: FontListResponse = {
    ...page,
    facets: {
      categories: facets.categories,
      tags: facets.tags,
      total: facets.total,
    },
    catalogue: {
      generatedAt: catalogue.generatedAt,
      sampleText: catalogue.sampleText,
      stats: catalogue.stats,
    },
  };

  return (
    <>
      <header style={{ padding: "42px 0 4px" }}>
        <span className="bc-kicker">The library</span>
        <h1
          style={{
            fontSize: "clamp(34px, 4.6vw, 52px)",
            letterSpacing: "-0.04em",
            margin: "16px 0 8px",
            fontWeight: 600,
          }}
        >
          हिंदी फ़ॉन्ट लाइब्रेरी
        </h1>
        <p className="bc-lede" style={{ marginTop: 0 }}>
          {facets.total} verified Devanagari families. Search in English or
          Hindi, set your own preview text, and only the fonts on screen are
          downloaded.
        </p>
      </header>
      <FontLibrary initial={initial} sampleText={catalogue.sampleText} />
    </>
  );
}
