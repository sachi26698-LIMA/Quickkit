import type { Metadata } from "next";
import { PageHeading } from "@/components/admin/admin-page";
import AdminFonts from "@/components/admin/fonts/admin-fonts";
import {
  catalogue,
  detectDuplicates,
  readImportReport,
  readLicenses,
  readOverrides,
  readValidationReport,
} from "@/lib/fonts/catalogue";
import { readImportQueue } from "@/lib/fonts/admin-queue";
import { readUsage } from "@/lib/fonts/usage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Font library",
  robots: { index: false, follow: false },
};

export default async function AdminFontsPage() {
  const [overrides, validation, queue, usage] = await Promise.all([
    readOverrides(),
    readValidationReport(),
    readImportQueue(),
    readUsage(),
  ]);
  const licenses = readLicenses().licenses;
  const importReport = readImportReport();
  const duplicates = detectDuplicates();

  const fonts = catalogue.fonts.map((font) => {
    const override = overrides.fonts[font.slug];
    const report = validation.families[font.slug];
    return {
      slug: font.slug,
      family: font.family,
      category: font.category,
      tags: font.styleTags,
      weights: font.weights,
      weightRange: font.weightRange,
      variable: Boolean(font.variable),
      featured: font.featured,
      score: font.verification.score,
      coverage: font.verification.devanagariCoverage,
      conjunctSingleGlyph: font.verification.conjunctSingleGlyph,
      conjunctTotal: font.verification.conjunctTotal,
      licenseType: font.license.type,
      version: font.source.version,
      addedAt: font.addedAt,
      updatedAt: font.updatedAt,
      bytes: font.totalBytes,
      files: font.files.devanagari.length + font.files.latin.length,
      status: override?.status ?? ("approved" as const),
      overrideNote: override?.note ?? "",
      overrideFamily: override?.family ?? "",
      overrideCategory: override?.category ?? "",
      overrideTags: override?.tags ?? [],
      errors: report?.errors ?? [],
      warnings: report?.warnings ?? [],
      sampleText: validation.verifier.sampleText,
      conjuncts: report?.conjuncts ?? [],
      matras: report?.matras ?? [],
      nukta: report?.nukta ?? [],
      latin: report?.latin ?? null,
    };
  });

  return (
    <>
      <PageHeading
        kicker="BioCraft · typography"
        title="Hindi font library"
        description="Import, verify, approve and document Devanagari families. Public font content stays in the local catalogue; Supabase is only used for administrator sign-in."
      />
      <AdminFonts
        generatedAt={catalogue.generatedAt}
        stats={catalogue.stats}
        fonts={fonts}
        rejected={catalogue.rejected}
        validationTotals={validation.totals}
        verifier={validation.verifier}
        queue={queue.items}
        usage={{
          fonts: usage.fonts,
          updatedAt: usage.updatedAt,
          persisted: usage.persisted,
        }}
        duplicates={duplicates}
        licenses={licenses}
        importReport={importReport}
        overridesUpdatedAt={overrides.updatedAt}
      />
    </>
  );
}
