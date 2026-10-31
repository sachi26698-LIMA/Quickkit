import { Hero } from "@/components/home/hero";
import { TrustSection } from "@/components/home/trust-section";
import { PrinciplesSection } from "@/components/home/principles-section";
import { FreeBand } from "@/components/home/free-band";
import { ToolExplorer } from "@/components/tools/tool-explorer";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata(
  "Free browser tools for everyday tasks",
  "Count words, convert text, format JSON, create passwords, generate QR codes and compress images locally in your browser.",
  "/",
);

export default function Home() {
  return (
    <>
      <Hero />

      <section
        className="relative"
        style={{
          background:
            "linear-gradient(180deg, #f8f6ff 0%, #ffffff 42%, #ffffff 100%)",
        }}
      >
        <div className="container pb-16 sm:pb-20">
          <ToolExplorer
            eyebrow="Find your tool"
            title="Everyday favorites"
            description="Search the kit or filter by category. Every tool is free and runs in your browser."
            showDirectoryLink
          />
        </div>
      </section>

      <TrustSection />
      <PrinciplesSection />
      <FreeBand />
    </>
  );
}
