/**
 * BioCraft Hindi typography — shared types.
 *
 * These describe the generated catalogue (`lib/fonts/data/catalogue.json`).
 * The catalogue is built by `scripts/fonts/build-catalogue.mjs` from real
 * imported WOFF2 files and the HarfBuzz verification report, so every field
 * here corresponds to something that was measured, not guessed.
 */

export type FontSubset = "devanagari" | "latin";

export type FontFile = {
  subset: FontSubset;
  /** `null` for a variable build that covers the whole axis. */
  weight: number | null;
  style: string;
  variable: "wght" | null;
  path: string;
  bytes: number;
  sha256: string;
};

export type FontVariableAxis = {
  min: number;
  default: number;
  max: number;
};

export type FontConjunctTest = {
  text: string;
  singleGlyph: boolean;
  ok: boolean;
};

export type FontVerification = {
  status: "verified" | "rejected";
  score: number;
  checkedWith: string;
  sampleText: string;
  conjuncts: FontConjunctTest[];
  conjunctSingleGlyph: number;
  conjunctTotal: number;
  nuktaPassed: number;
  nuktaTotal: number;
  matrasPassed: number;
  matrasTotal: number;
  devanagariCoverage: number;
  latinCoverage: number;
  preBaseMatraReordered: boolean;
  variableWght: FontVariableAxis | null;
};

export type FontLicense = {
  type: string;
  url: string;
  attribution: string;
  redistribution: boolean;
  downloadAllowed: boolean;
  licenseFile: string | null;
};

export type FontSource = {
  provider: string;
  distributor: string;
  repository: string;
  npmPackage: string;
  npmVersion: string;
  version: string;
  lastModified: string;
  downloadReference: string;
};

export type FontRecord = {
  slug: string;
  family: string;
  category: string;
  categorySlug: string;
  description: string;
  tags: string[];
  styleTags: string[];
  scripts: string[];
  languageSupport: string[];
  weights: number[];
  weightRange: [number, number];
  styles: string[];
  variable: { wght: FontVariableAxis } | null;
  files: {
    devanagari: FontFile[];
    latin: FontFile[];
  };
  primaryFile: FontFile;
  latinFile: FontFile | null;
  filesSha256: string;
  license: FontLicense;
  source: FontSource;
  addedAt: string;
  updatedAt: string;
  featured: boolean;
  featuredRank: number;
  verification: FontVerification;
  totalBytes: number;
};

export type FontFacet = { name: string; count: number };

export type RejectedFont = {
  family: string;
  slug: string;
  reason: string;
  errors: string[];
  warnings: string[];
};

export type FontCatalogue = {
  generatedAt: string;
  generator: string;
  sources: {
    primary: string;
    discovery: string;
    verification: string;
  };
  sampleText: string;
  stats: {
    discovered: number;
    verified: number;
    rejected: number;
    families: number;
    files: number;
    woff2Bytes: number;
    variableFamilies: number;
    licenses: string[];
  };
  categories: FontFacet[];
  tags: FontFacet[];
  fonts: FontRecord[];
  rejected: RejectedFont[];
};

export type FontSort = "name" | "name-desc" | "recent" | "popular" | "weight";

export type FontListQuery = {
  q?: string;
  category?: string;
  tag?: string;
  sort?: FontSort;
  cursor?: string | null;
  limit?: number;
};

export type FontListPage = {
  items: FontRecord[];
  nextCursor: string | null;
  total: number;
  query: {
    q: string;
    category: string;
    tag: string;
    sort: FontSort;
    limit: number;
  };
};

export type FontLicenseIndexEntry = {
  family: string;
  slug: string;
  type: string;
  url: string;
  attribution: string;
  licenseFile: string | null;
  source: string;
  version: string;
  downloadAllowed: boolean;
};

export type FontUsage = Record<string, number>;

export type FontImportIssue = {
  code: string;
  severity: "error" | "warning";
  message: string;
};

export type FontInspectionReport = {
  family: string;
  subfamily: string | null;
  version: string | null;
  unitsPerEm: number;
  glyphCount: number;
  cmapEntries: number;
  licenses: string | null;
  hasGsub: boolean;
  hasGpos: boolean;
  variableAxes: Record<string, { min: number; max: number; default: number }>;
  checks: {
    devanagariCoverage: number;
    conjunctsSingleGlyph: number;
    conjunctsTested: number;
    matrasRendered: number;
    nuktaRendered: number;
    numeralsRendered: number;
    latinRendered: boolean;
    mixedRendered: boolean;
  };
  issues: FontImportIssue[];
  status: "pass" | "warn" | "fail";
  sha256: string;
  bytes: number;
  suggestedTheme: {
    slug: string;
    family: string;
    category: string;
    tags: string[];
  };
};
