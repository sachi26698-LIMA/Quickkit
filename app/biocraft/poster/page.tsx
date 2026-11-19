import type { Metadata } from "next";
import PosterStudio from "@/components/biocraft/poster-studio";
import { featuredFonts, getFont } from "@/lib/fonts/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hindi poster & typography studio",
  description:
    "Turn Hindi text into a typographic poster. Choose a verified Devanagari font, size, weight and format, then download a 1080 px PNG rendered by the actual font file.",
  alternates: { canonical: "/biocraft/poster" },
};

export default async function PosterPage({
  searchParams,
}: {
  searchParams: Promise<{ font?: string; text?: string }>;
}) {
  const params = await searchParams;
  const [fonts, selected] = await Promise.all([
    featuredFonts(8),
    params.font ? getFont(params.font) : Promise.resolve(null),
  ]);

  return (
    <>
      <header style={{ padding: "42px 0 0" }}>
        <span className="bc-kicker">Poster & social design</span>
        <h1
          style={{
            fontSize: "clamp(32px, 4.4vw, 50px)",
            letterSpacing: "-0.04em",
            margin: "16px 0 8px",
            fontWeight: 600,
          }}
        >
          हिंदी पोस्टर स्टूडियो
        </h1>
        <p className="bc-lede" style={{ marginTop: 0 }}>
          A quote, a shayari, or your own line — painted onto a poster by the
          Devanagari font you choose. Export at {1080} px wide for Instagram.
        </p>
      </header>
      <PosterStudio
        initialFonts={fonts}
        initialFont={selected}
        initialText={params.text?.slice(0, 220) ?? ""}
      />
    </>
  );
}
