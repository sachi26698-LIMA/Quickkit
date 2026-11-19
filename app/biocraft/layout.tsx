import type { Metadata } from "next";
import BioCraftShellNav from "@/components/biocraft/shell";
import "./biocraft.css";

export const metadata: Metadata = {
  title: {
    default: "BioCraft — Hindi Fonts & Typography Studio",
    template: "%s | BioCraft",
  },
  description:
    "A verified Devanagari font library and Hindi typography studio: real glyph checks, matras, conjuncts, nukta and numerals, live previews, bios, shayari, captions and posters.",
  alternates: { canonical: "/biocraft" },
};

export default function BioCraftLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bc">
      <link
        rel="preload"
        href="/fonts/hindi/noto-sans-devanagari/devanagari.woff2"
        as="font"
        type="font/woff2"
        crossOrigin="anonymous"
      />
      <BioCraftShellNav />
      <main className="bc-shell">{children}</main>
    </div>
  );
}
