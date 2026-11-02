import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Self-host the tesseract.js OCR engine (worker + WASM cores + English
// language data) under public/ocr so the PDF to Word tool never loads code
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
const langSource = path.join(
  root,
  "node_modules",
  "@tesseract.js-data",
  "eng",
  "4.0.0",
  "eng.traineddata.gz",
);

await stat(workerSource);
await stat(langSource);
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

await cp(langSource, path.join(destinationRoot, "eng.traineddata.gz"));
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
  `Copied tesseract.js OCR assets (${coreFiles.length} core files + worker + eng data) to public/ocr`,
);
