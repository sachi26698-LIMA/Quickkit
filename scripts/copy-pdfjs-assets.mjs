import { cp, mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = "6.4.299";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "node_modules", "pdfjs-dist");
const destinationRoot = path.join(root, "public", "pdfjs", version);
const directories = ["cmaps", "iccs", "standard_fonts", "wasm"];

await stat(path.join(sourceRoot, "build", "pdf.worker.min.mjs"));
await rm(destinationRoot, { force: true, recursive: true });
await mkdir(destinationRoot, { recursive: true });
for (const directory of directories) {
  await cp(
    path.join(sourceRoot, directory),
    path.join(destinationRoot, directory),
    { recursive: true },
  );
}
await cp(
  path.join(sourceRoot, "LICENSE"),
  path.join(destinationRoot, "LICENSE"),
);
console.log(
  `Copied PDF.js ${version} same-origin preview assets to public/pdfjs/${version}`,
);
