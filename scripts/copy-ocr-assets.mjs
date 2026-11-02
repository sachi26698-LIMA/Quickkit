import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Self-host the tesseract.js OCR engine (worker + WASM cores + language
// data) under public/ocr so the PDF to Word tool never loads code
// or data from a third-party CDN. Mirrors scripts/copy-pdfjs-assets.mjs.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destinationRoot = path.join(root, "public", "ocr");

const workerSource = path.join(
  root,
  "node_modules",
  "tesseract.js",
  "dist",
  "worker.min.js",
);
const coreRoot = path.join(root, "node_modules", "tesseract.js-core");
// OCR languages shipped on-device. Keep in sync with OCR_LANGUAGES in
// lib/tools/pdf-to-word/types.ts. Only the chosen language's data file is
// ever downloaded by the browser.
const LANGUAGES = ["eng", "hin", "guj"];
const langSources = LANGUAGES.map((lang) => ({
  lang,
  source: path.join(
    root,
    "node_modules",
    "@tesseract.js-data",
    lang,
    "4.0.0",
    `${lang}.traineddata.gz`,
  ),
}));

await stat(workerSource);
for (const { source } of langSources) await stat(source);
await rm(destinationRoot, { force: true, recursive: true });
await mkdir(destinationRoot, { recursive: true });

await cp(workerSource, path.join(destinationRoot, "worker.min.js"));

const coreFiles = (await readdir(coreRoot)).filter(
  (name) => name.endsWith(".wasm") || name.endsWith(".wasm.js"),
);
if (coreFiles.length === 0) {
  throw new Error("No tesseract.js-core WASM files found to copy.");
}
for (const name of coreFiles) {
  await cp(path.join(coreRoot, name), path.join(destinationRoot, name));
}

for (const { lang, source } of langSources) {
  await cp(source, path.join(destinationRoot, `${lang}.traineddata.gz`));
}
await cp(
  path.join(
    root,
    "node_modules",
    "tesseract.js",
    "dist",
    "tesseract.min.js.LICENSE.txt",
  ),
  path.join(destinationRoot, "LICENSE.txt"),
).catch(() => {});

console.log(
  `Copied tesseract.js OCR assets (${coreFiles.length} core files + worker + ${LANGUAGES.join("/")} data) to public/ocr`,
);
