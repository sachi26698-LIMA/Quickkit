import type { Metadata } from "next";
import BioCraftStudio from "@/components/biocraft/studio";
import { catalogue, featuredFonts } from "@/lib/fonts/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hindi preview, bio, shayari & caption studio",
  description:
    "Write Hindi text and set it in any verified Devanagari font. Generate Instagram bios, shayari, quotes, captions, usernames and stylish text, then copy or turn it into a poster.",
  alternates: { canonical: "/biocraft/studio" },
};

export default async function StudioPage() {
  const fonts = await featuredFonts(8);
  return (
    <BioCraftStudio initialFonts={fonts} sampleText={catalogue.sampleText} />
  );
}
