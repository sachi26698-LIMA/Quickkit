#!/usr/bin/env node
/**
 * Builds the public BioCraft Hindi font catalogue from the import manifest,
 * the HarfBuzz verification report and the editorial curation file.
 *
 * Only families whose real glyph table passed verification are published.
 * Rejected imports stay in the admin report (verification.json) so the reason
 * is visible instead of silently disappearing.
 */

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const DATA = path.join(ROOT, "lib", "fonts", "data");

const manifest = JSON.parse(
  await readFile(path.join(DATA, "import-manifest.json"), "utf8"),
);
const verification = JSON.parse(
  await readFile(path.join(DATA, "verification.json"), "utf8"),
);
const curation = JSON.parse(
  await readFile(path.join(ROOT, "scripts", "fonts", "curation.json"), "utf8"),
);

const tagLeaders = new Set([
  "Modern",
  "Traditional",
  "Display",
  "Handwriting",
  "Calligraphy",
  "Editorial",
  "Newspaper",
  "Book",
  "Reading",
  "Rounded",
  "Artistic",
  "Poster",
  "Business",
  "Social Media",
  "Variable",
  "Bold",
  "Light",
  "Condensed",
  "Headline",
  "Scholarly",
  "Devotional",
  "Geometric",
  "Compact",
  "Technical",
  "Multilingual",
  "Clean",
  "Literary",
  "Friendly",
  "Casual",
  "Playful",
]);

const categories = {
  "sans-serif": "Sans Serif",
  serif: "Serif",
  handwriting: "Handwriting",
  display: "Display",
  monospace: "Monospace",
};

function descriptionFor(family, category, tags) {
  const primary = tags.slice(0, 3).join(" · ");
  return `${family} is a ${(categories[category] ?? category).toLowerCase()} Devanagari family${primary ? ` — ${primary}` : ""}. Its Devanagari glyph coverage, matras, conjuncts, nukta and numerals were verified with HarfBuzz before publication.`;
}

const published = [];
const rejected = [];

for (const entry of manifest.families) {
  const report = verification.families[entry.slug];
  if (!report || report.status !== "verified") {
    rejected.push({
      family: entry.family,
      slug: entry.slug,
      reason:
        report?.errors?.[0] ??
        entry.error ??
        "Family did not pass Devanagari verification.",
      errors: report?.errors ?? [],
      warnings: report?.warnings ?? [],
    });
    continue;
  }
  if (entry.status === "failed") {
    rejected.push({
      family: entry.family,
      slug: entry.slug,
      reason: entry.error,
      errors: [entry.error],
      warnings: [],
    });
    continue;
  }

  const files = entry.files
    .map((file) => ({
      subset: file.subset,
      weight: file.weight,
      style: file.style,
      variable: file.variable,
      path: file.path,
      bytes: file.bytes,
      sha256: file.sha256,
    }))
    .sort(
      (a, b) =>
        (a.subset === "devanagari" ? 0 : 1) -
          (b.subset === "devanagari" ? 0 : 1) ||
        (a.weight ?? 0) - (b.weight ?? 0),
    );

  const devanagari = files.filter((file) => file.subset === "devanagari");
  const latin = files.filter((file) => file.subset === "latin");
  const primary =
    devanagari.find((file) => file.weight === 400) ??
    devanagari.find((file) => file.weight === null) ??
    devanagari[0];
  const latinPrimary =
    latin.find((file) => file.weight === (primary.weight ?? 400)) ??
    latin[0] ??
    null;

  const wght = report.axes?.wght ?? entry.variable?.wght ?? null;
  const weights = entry.weights?.length
    ? entry.weights
    : [wght?.min, wght?.max].filter(Boolean);
  const weightRange = wght
    ? [Number(wght.min), Number(wght.max)]
    : [Math.min(...weights), Math.max(...weights)];

  const curatedTags = curation.tags[entry.slug] ?? [];
  const tags = new Set(curatedTags);
  if (wght) tags.add("Variable");
  if (weightRange[1] >= 700) tags.add("Bold");
  if (weightRange[0] <= 300) tags.add("Light");
  const categoryLabel = categories[report.category] ?? "Sans Serif";
  const categoryTags = new Set([categoryLabel]);

  const verificationSummary = {
    status: "verified",
    score: report.score,
    checkedWith: verification.verifier.engine,
    sampleText: verification.verifier.sampleText,
    conjuncts: (report.conjuncts ?? []).map((item) => ({
      text: item.text,
      singleGlyph: item.singleGlyph,
      ok: item.ok,
    })),
    conjunctSingleGlyph: (report.conjuncts ?? []).filter(
      (item) => item.singleGlyph,
    ).length,
    conjunctTotal: (report.conjuncts ?? []).length,
    nuktaPassed: (report.nukta ?? []).filter((item) => item.ok).length,
    nuktaTotal: (report.nukta ?? []).length,
    matrasPassed: (report.matras ?? []).filter((item) => item.ok).length,
    matrasTotal: (report.matras ?? []).length,
    devanagariCoverage: report.coverage?.consonants?.percent ?? 0,
    latinCoverage: report.latin?.percent ?? 0,
    preBaseMatraReordered: Boolean(report.preBaseMatraReordered),
    variableWght: wght,
  };

  const record = {
    slug: entry.slug,
    family: entry.family,
    category: categoryLabel,
    categorySlug: report.category,
    description: descriptionFor(entry.family, report.category, curatedTags),
    tags: [...new Set([...categoryTags, ...tags])].sort(),
    styleTags: [...tags].sort(),
    scripts: ["Devanagari", "Latin"],
    languageSupport: ["Hindi", "Marathi", "Sanskrit", "Nepali", "English"],
    weights,
    weightRange,
    styles: entry.styles?.length ? entry.styles : ["normal"],
    variable: wght ? { wght } : null,
    files: { devanagari, latin },
    primaryFile: primary,
    latinFile: latinPrimary,
    filesSha256: createHash("sha256")
      .update(files.map((file) => `${file.path}:${file.sha256}`).join("|"))
      .digest("hex"),
    license: {
      type: entry.license.type,
      url: entry.license.url,
      attribution: entry.license.attribution,
      redistribution: true,
      downloadAllowed: true,
      licenseFile: entry.license.licenseFile,
    },
    source: {
      provider: entry.upstream.provider,
      distributor: entry.upstream.distributor,
      repository: entry.upstream.repository,
      npmPackage: entry.upstream.npmPackage,
      npmVersion: entry.upstream.npmVersion,
      version: entry.upstream.version,
      lastModified: entry.upstream.lastModified,
      downloadReference: `https://github.com/google/fonts/tree/main/ofl/${entry.slug}`,
    },
    addedAt: entry.importedAt,
    updatedAt: entry.upstream.lastModified,
    featured: (curation.featuredOrder ?? []).includes(entry.slug),
    featuredRank: (curation.featuredOrder ?? []).indexOf(entry.slug),
    verification: verificationSummary,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
  };
  published.push(record);
}

published.sort((a, b) => a.family.localeCompare(b.family));

const categoryCounts = {};
const tagCounts = {};
for (const font of published) {
  categoryCounts[font.category] = (categoryCounts[font.category] ?? 0) + 1;
  for (const tag of font.styleTags) {
    if (!tagLeaders.has(tag)) continue;
    tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
}

const catalogue = {
  generatedAt: new Date().toISOString(),
  generator: "scripts/fonts/build-catalogue.mjs",
  sources: {
    primary: "Google Fonts, distributed as WOFF2 by Fontsource (npm registry)",
    discovery:
      "Fontsource metadata (derived from google/fonts METADATA.pb) — every family advertising a devanagari subset",
    verification: "HarfBuzz + fontTools glyph and shaping verification",
  },
  sampleText: verification.verifier.sampleText,
  stats: {
    discovered: manifest.counts.requested,
    verified: published.length,
    rejected: rejected.length,
    families: published.length,
    files: published.reduce(
      (total, font) =>
        total + font.files.devanagari.length + font.files.latin.length,
      0,
    ),
    woff2Bytes: published.reduce((total, font) => total + font.totalBytes, 0),
    variableFamilies: published.filter((font) => font.variable).length,
    licenses: [...new Set(published.map((font) => font.license.type))],
  },
  categories: Object.entries(categoryCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count),
  tags: Object.entries(tagCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  fonts: published,
  rejected,
};

await writeFile(
  path.join(DATA, "catalogue.json"),
  `${JSON.stringify(catalogue, null, 2)}\n`,
  "utf8",
);

// Licences are shipped both as individual text files next to each font and
// as a single machine-readable index for the attribution page and admin.
const licenses = published.map((font) => ({
  family: font.family,
  slug: font.slug,
  type: font.license.type,
  url: font.license.url,
  attribution: font.license.attribution,
  licenseFile: font.license.licenseFile,
  source: font.source.repository,
  version: font.source.version,
  downloadAllowed: font.license.downloadAllowed,
}));
await writeFile(
  path.join(DATA, "licenses.json"),
  `${JSON.stringify({ generatedAt: catalogue.generatedAt, licenses }, null, 2)}\n`,
  "utf8",
);

const importReport = {
  generatedAt: catalogue.generatedAt,
  summary: catalogue.stats,
  sources: [
    ...new Set(manifest.families.map((family) => family.upstream?.npmPackage)),
  ].length,
  imported: published.map((font) => ({
    family: font.family,
    slug: font.slug,
    files: font.files.devanagari.length + font.files.latin.length,
    bytes: font.totalBytes,
    verified: true,
    score: font.verification.score,
  })),
  rejected,
};
await writeFile(
  path.join(DATA, "import-report.json"),
  `${JSON.stringify(importReport, null, 2)}\n`,
  "utf8",
);

console.log(
  `Catalogue: ${published.length} verified families, ${rejected.length} rejected, ` +
    `${(catalogue.stats.woff2Bytes / 1024 / 1024).toFixed(1)} MB WOFF2.`,
);
for (const item of rejected)
  console.log(`  rejected ${item.family}: ${item.reason}`);
