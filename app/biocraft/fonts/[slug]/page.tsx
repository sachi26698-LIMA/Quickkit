import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FontSpecimenClient from "@/components/biocraft/font-specimen";
import { catalogue, getFont } from "@/lib/fonts/catalogue";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const font = await getFont(slug);
  if (!font) return { title: "Hindi font not found" };
  return {
    title: `${font.family} — Hindi Devanagari font`,
    description: `${font.family}: ${font.description} Download WOFF2 and see the full glyph sheet, conjuncts and licence.`,
    alternates: { canonical: `/biocraft/fonts/${font.slug}` },
    openGraph: {
      title: `${font.family} · BioCraft`,
      description: font.description,
      type: "article",
    },
  };
}

export default async function FontSpecimenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const font = await getFont(slug);
  if (!font) notFound();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: font.family,
    description: font.description,
    inLanguage: ["hi", "en"],
    license: font.license.url,
    version: font.source.version,
    creator: { "@type": "Organization", name: font.license.attribution },
    isFamilyFriendly: true,
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Static, generated from the catalogue; no visitor input is included.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <div className="bc-specimen-hero">
        <FontSpecimenClient font={font} sampleText={catalogue.sampleText} />
      </div>
    </>
  );
}
