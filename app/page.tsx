import { Hero } from "@/components/home/hero";
import { FeaturesSection } from "@/components/home/features-section";
import { PrivacySection } from "@/components/home/privacy-section";
import { CtaSection } from "@/components/home/cta-section";
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

      {/* The search panel overlaps the hero band to add depth. */}
      <div className="relative z-10 -mt-8 sm:-mt-16 lg:-mt-20">
        <div className="container pb-10 sm:pb-14 lg:pb-20">
          <ToolExplorer
            eyebrow="Find your tool"
            title="Everyday favorites"
            description="Search the kit or filter by category. Every tool is free and runs in your browser."
            showDirectoryLink
          />
        </div>
      </div>

      <FeaturesSection />
      <PrivacySection />
      <CtaSection />
    </>
  );
}
