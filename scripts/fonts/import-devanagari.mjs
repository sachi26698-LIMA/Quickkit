#!/usr/bin/env node
/**
 * BioCraft — Devanagari font import pipeline.
 *
 * Discovers every family that Fontsource publishes with a `devanagari`
 * subset (the Fontsource metadata is itself generated from Google Fonts
 * `METADATA.pb` files), downloads the published WOFF2 builds straight from
 * the npm registry, and copies the Devanagari + Latin subsets and the
 * upstream licence text into `public/fonts/hindi/<slug>/`.
 *
 * The script never claims a font supports Hindi: it only copies files.
 * `scripts/fonts/verify_fonts.py` inspects the actual glyph table and shapes
 * real Hindi text with HarfBuzz before a family reaches the catalogue.
 *
 * Usage:
 *   node scripts/fonts/import-devanagari.mjs            # import all
 *   node scripts/fonts/import-devanagari.mjs --only hind,kalam
 *   node scripts/fonts/import-devanagari.mjs --force    # re-download
 *
 * Requires `tar` on PATH (used only to unpack the npm tarballs).
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ROOT = process.cwd();
const CACHE = path.join(ROOT, ".cache", "fontsource");
const OUT = path.join(ROOT, "public", "fonts", "hindi");
const DATA = path.join(ROOT, "lib", "fonts", "data");
const SOURCES = path.join(ROOT, "scripts", "fonts", "sources.json");
const MANIFEST = path.join(DATA, "import-manifest.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const onlyIndex = args.indexOf("--only");
const only =
  onlyIndex !== -1
    ? new Set(
        (args[onlyIndex + 1] ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : null;

function log(...parts) {
  process.stdout.write(`${parts.join(" ")}\n`);
}

async function mojibakeFreeJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return response.json();
}

async function registryPackage(name) {
  const data = await mojibakeFreeJson(
    `https://registry.npmjs.org/${encodeURIComponent(name)}`,
  );
  const version = data["dist-tags"]?.latest;
  if (!version) throw new Error(`No published version for ${name}`);
  return {
    version,
    tarball: data.versions[version].dist.tarball,
  };
}

const tarballCache = new Map();

/**
 * Downloads and unpacks an npm tarball once, returning a map of the requested
 * package-relative paths to absolute files on disk.
 */
async function extract(tarballUrl, version, wanted) {
  let cached = tarballCache.get(tarballUrl);
  if (!cached) {
    const fileName = tarballUrl.split("/").pop();
    const file = path.join(CACHE, fileName);
    if (!existsSync(file)) {
      const response = await fetch(tarballUrl);
      if (!response.ok) throw new Error(`Download failed: ${tarballUrl}`);
      await writeFile(file, Buffer.from(await response.arrayBuffer()));
    }
    const dir = path.join(
      CACHE,
      fileName.replace(/\.tgz$/, "").replace(/[^a-z0-9.-]/gi, "-"),
    );
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
      execFileSync("tar", ["-xzf", file, "-C", dir]);
    }
    cached = dir;
    tarballCache.set(tarballUrl, dir);
  }
  const found = new Map();
  for (const name of wanted) {
    const candidate = path.join(cached, "package", name);
    if (existsSync(candidate)) found.set(name, candidate);
  }
  return { dir: cached, found, version };
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function packageId(id) {
  return id.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

async function importFamily(sources) {
  const slug = packageId(sources.id);
  const target = path.join(OUT, slug);
  const metaPath = path.join(target, "source.json");
  if (!force && existsSync(metaPath)) {
    try {
      const previous = JSON.parse(await readFile(metaPath, "utf8"));
      if (previous.version === sources.version) {
        return { status: "cached", ...previous };
      }
    } catch {
      // Corrupt cache metadata: re-import.
    }
  }

  const isVariable = Boolean(sources.variable?.wght);
  const files = [];
  let licenseText = null;
  let familyMeta = null;
  let npmPackage = null;
  let npmVersion = null;
  let variable = null;

  if (isVariable) {
    try {
      const pkg = await registryPackage(`@fontsource-variable/${slug}`);
      const wanted = [
        `files/${slug}-devanagari-wght-normal.woff2`,
        `files/${slug}-latin-wght-normal.woff2`,
        "LICENSE",
        "metadata.json",
      ];
      const result = await extract(pkg.tarball, pkg.version, wanted);
      const deva = result.found.get(wanted[0]);
      const latin = result.found.get(wanted[1]);
      if (!deva) throw new Error("variable devanagari build missing");
      for (const [subset, source] of [
        ["devanagari", deva],
        ["latin", latin],
      ]) {
        if (!source) continue;
        const buffer = await readFile(source);
        files.push({
          subset,
          weight: null,
          style: "normal",
          variable: "wght",
          origin: source,
          name: `${subset}.woff2`,
          path: `/fonts/hindi/${slug}/${subset}.woff2`,
          bytes: buffer.byteLength,
          sha256: sha256(buffer),
        });
      }
      licenseText = result.found.get("LICENSE")
        ? await readFile(result.found.get("LICENSE"), "utf8")
        : null;
      familyMeta = result.found.get("metadata.json")
        ? JSON.parse(await readFile(result.found.get("metadata.json"), "utf8"))
        : null;
      npmPackage = `@fontsource-variable/${slug}`;
      npmVersion = pkg.version;
      variable = sources.variable;
    } catch (error) {
      log(
        `  · variable build unavailable for ${sources.family}: ${error.message}`,
      );
    }
  }

  if (!files.length) {
    const pkg = await registryPackage(`@fontsource/${slug}`);
    const wanted = [
      "LICENSE",
      "metadata.json",
      ...(sources.subsets.includes("devanagari")
        ? sources.weights.map(
            (weight) => `files/${slug}-devanagari-${weight}-normal.woff2`,
          )
        : []),
      ...(sources.subsets.includes("latin")
        ? sources.weights.map(
            (weight) => `files/${slug}-latin-${weight}-normal.woff2`,
          )
        : []),
    ];
    const result = await extract(pkg.tarball, pkg.version, wanted);
    for (const subset of ["devanagari", "latin"]) {
      for (const weight of sources.weights) {
        const source = result.found.get(
          `files/${slug}-${subset}-${weight}-normal.woff2`,
        );
        if (!source) continue;
        const buffer = await readFile(source);
        files.push({
          subset,
          weight,
          style: "normal",
          variable: null,
          origin: source,
          name: `${subset}-${weight}.woff2`,
          path: `/fonts/hindi/${slug}/${subset}-${weight}.woff2`,
          bytes: buffer.byteLength,
          sha256: sha256(buffer),
        });
      }
    }
    if (!files.some((file) => file.subset === "devanagari")) {
      throw new Error("no devanagari build in npm package");
    }
    licenseText = result.found.get("LICENSE")
      ? await readFile(result.found.get("LICENSE"), "utf8")
      : null;
    familyMeta = result.found.get("metadata.json")
      ? JSON.parse(await readFile(result.found.get("metadata.json"), "utf8"))
      : null;
    npmPackage = `@fontsource/${slug}`;
    npmVersion = pkg.version;
  }

  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  // Copy the exact bytes that were hashed, so the manifest checksum always
  // matches the file served from /public.
  for (const file of files) {
    await copyFile(file.origin, path.join(target, file.name));
    const onDisk = await readFile(file.origin);
    if (sha256(onDisk) !== file.sha256) {
      throw new Error(`Checksum mismatch while copying ${file.path}`);
    }
    delete file.origin;
  }

  if (licenseText) {
    await writeFile(path.join(target, "LICENSE.txt"), licenseText, "utf8");
  }

  const record = {
    id: sources.id,
    slug,
    family: sources.family,
    status: "imported",
    importedAt: new Date().toISOString(),
    upstream: {
      provider: "Google Fonts",
      distributor: "Fontsource",
      npmPackage,
      npmVersion,
      source:
        familyMeta?.source ??
        sources.source ??
        "https://github.com/google/fonts",
      repository: familyMeta?.source ?? "https://github.com/google/fonts",
      version: familyMeta?.version ?? sources.version,
      lastModified: familyMeta?.lastModified ?? sources.lastModified,
    },
    category: familyMeta?.category ?? sources.category,
    weights: familyMeta?.weights ?? sources.weights,
    styles: familyMeta?.styles ?? sources.styles,
    variable,
    license: {
      type: familyMeta?.license?.type ?? sources.license.type,
      url: familyMeta?.license?.url ?? sources.license.url,
      attribution:
        familyMeta?.license?.attribution ?? sources.license.attribution,
      redistribution: true,
      licenseFile: licenseText ? `/fonts/hindi/${slug}/LICENSE.txt` : null,
    },
    files,
  };

  await writeFile(
    path.join(target, "source.json"),
    `${JSON.stringify(record, null, 2)}\n`,
    "utf8",
  );
  return { status: "imported", ...record };
}

const sourceData = JSON.parse(await readFile(SOURCES, "utf8"));
const families = sourceData.families.filter(
  (family) => !only || only.has(family.id),
);
if (!families.length) {
  log("No matching families in scripts/fonts/sources.json");
  process.exit(1);
}

await mkdir(CACHE, { recursive: true });
await mkdir(OUT, { recursive: true });
await mkdir(DATA, { recursive: true });

const results = [];
let failures = 0;
for (const [index, family] of families.entries()) {
  log(`[${index + 1}/${families.length}] ${family.family}`);
  try {
    const result = await importFamily(family);
    results.push(result);
    log(
      `  ✓ ${result.status} · ${result.files.length} files · ${(
        result.files.reduce((total, file) => total + file.bytes, 0) / 1024
      ).toFixed(0)} KB`,
    );
  } catch (error) {
    failures += 1;
    results.push({
      id: family.id,
      slug: packageId(family.id),
      family: family.family,
      status: "failed",
      error: error.message,
    });
    log(`  ✗ ${error.message}`);
  }
}

const manifest = {
  generatedAt: new Date().toISOString(),
  source: sourceData.generatedFrom,
  families: results.sort((a, b) => a.family.localeCompare(b.family)),
  counts: {
    requested: families.length,
    imported: results.filter((result) => result.status !== "failed").length,
    failed: failures,
  },
};
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
log(`\nManifest: ${path.relative(ROOT, MANIFEST)}`);
log(
  `Imported ${manifest.counts.imported}/${manifest.counts.requested} families.`,
);
if (failures) process.exitCode = 1;
