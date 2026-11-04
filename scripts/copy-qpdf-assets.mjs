import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(
  root,
  "node_modules",
  "@neslinesli93",
  "qpdf-wasm",
);
const packageJson = JSON.parse(
  await readFile(path.join(sourceRoot, "package.json"), "utf8"),
);
const version = packageJson.version;
const destinationRoot = path.join(root, "public", "qpdf", version);

await stat(path.join(sourceRoot, "dist", "qpdf.wasm"));
await rm(destinationRoot, { force: true, recursive: true });
await mkdir(destinationRoot, { recursive: true });
await cp(
  path.join(sourceRoot, "dist", "qpdf.wasm"),
  path.join(destinationRoot, "qpdf.wasm"),
);
await cp(
  path.join(sourceRoot, "LICENSE"),
  path.join(destinationRoot, "LICENSE"),
);

// Publish the Emscripten factory as a same-origin ES module so the dedicated
// PDF security worker can import it without bundling Node-only require paths.
const script = await readFile(path.join(sourceRoot, "dist", "qpdf.js"), "utf8");
await writeFile(
  path.join(destinationRoot, "qpdf.mjs"),
  `${script}\nexport default Module;\n`,
);

console.log(
  `Copied QPDF ${version} same-origin security assets to public/qpdf/${version}`,
);
