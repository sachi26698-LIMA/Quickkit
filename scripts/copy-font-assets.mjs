import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Self-host the two Latin Noto faces the browser PDF exporter embeds, under
// public/fonts, so a generated report can carry real Unicode — the rupee
// sign, en and em dashes, arrows, bullets and check marks — instead of the
// ASCII-only subset a standard PDF font can manage.
//
// The faces are the same SIL OFL 1.1 files the server-side DOCX renderer
// already embeds from assets/noto (see lib/tools/word-to-pdf/render/fonts.ts),
// so the project ships one set of font files and one licence.
//
// This mirrors scripts/copy-pdfjs-assets.mjs and scripts/copy-ocr-assets.mjs:
// nothing is fetched from a third-party CDN, and no font file is committed to
// public/ — the copy is generated at build time and ignored by git.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const destinationRoot = path.join(root, "public", "fonts");
const sourceRoot = path.join(root, "assets", "noto");

const FACES = ["NotoSans-Regular.ttf", "NotoSans-Bold.ttf"];

for (const face of FACES) {
  await stat(path.join(sourceRoot, face));
}

await rm(destinationRoot, { force: true, recursive: true });
await mkdir(destinationRoot, { recursive: true });

for (const face of FACES) {
  await cp(path.join(sourceRoot, face), path.join(destinationRoot, face));
}

// The licence travels with the fonts, as it must for SIL OFL.
await cp(
  path.join(sourceRoot, "LICENSE.txt"),
  path.join(destinationRoot, "LICENSE.txt"),
).catch(() => {});

console.log(
  `Copied ${FACES.length} Noto faces to public/fonts for the browser PDF exporter`,
);
