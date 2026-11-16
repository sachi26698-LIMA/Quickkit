import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AdUnit from "@/components/ad-unit";
import JsonLd from "@/components/json-ld";
import PageHero from "@/components/page-hero";
import ToolExplorer from "@/components/tool-explorer";
import { getPublicCatalog } from "@/lib/supabase/public-catalog";

export const revalidate = 300;
import {
  breadcrumbStructuredData,
  collectionPageStructuredData,
  pageMetadata,
} from "@/lib/seo";

export async function generateMetadata() {
  const { tools } = await getPublicCatalog();
  return pageMetadata(
    `All ${tools.length} Free Online Tools — PDF, Image & Code`,
    `Browse ${tools.length} published, active QUICKKIT tools: PDF, image, OCR, QR, developer and calculator utilities.`,
    "/tools",
  );
}

export default async function ToolsPage() {
  const { tools, categories } = await getPublicCatalog();
  return (
    <div className="home inner-page">
      <div className="container">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" prefetch={false}>
            Home
          </Link>{" "}
          <ChevronRight size={13} aria-hidden="true" />{" "}
          <span aria-current="page">All Tools</span>
        </nav>
        <JsonLd
          data={breadcrumbStructuredData([
            { name: "Home", path: "/" },
            { name: "All Tools", path: "/tools" },
          ])}
        />
        <JsonLd
          data={collectionPageStructuredData({
            name: "All Free Online Tools — QUICKKIT",
            description:
              "Complete directory of free browser-based PDF, image, QR, text, developer, calculator and security tools on QUICKKIT.",
            path: "/tools",
            items: tools.map((tool) => ({
              name: tool.name,
              path: `/tools/${tool.slug}`,
            })),
          })}
        />
        <PageHero
          eyebrow={`${tools.length} FREE TOOLS · LOCAL IN YOUR BROWSER`}
          title="Every tool in"
          titleAccent="one calm place."
          lede="Search by task, filter by category, or tap the heart on any card to keep your favourites one click away."
        />
        <ToolExplorer tools={tools} categoryMeta={categories} />

        {/* 1 of 1 — below the tool grid, never inside the search or filter bar. */}
        <AdUnit placement="tools-index-bottom" format="auto" />
      </div>
    </div>
  );
}
