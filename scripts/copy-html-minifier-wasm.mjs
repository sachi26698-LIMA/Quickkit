import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(
  root,
  "node_modules",
  "minify-html-wasm",
  "dist",
  "web",
);
const destinationRoot = path.join(root, "public", "html-minifier");

await stat(path.join(sourceRoot, "index_bg.wasm"));
await mkdir(destinationRoot, { recursive: true });
await cp(
  path.join(sourceRoot, "index_bg.wasm"),
  path.join(destinationRoot, "index_bg.wasm"),
);
await cp(
  path.join(root, "node_modules", "minify-html-wasm", "LICENSE"),
  path.join(destinationRoot, "LICENSE"),
);

console.log(
  "Copied the local HTML minifier WASM asset to public/html-minifier",
);
