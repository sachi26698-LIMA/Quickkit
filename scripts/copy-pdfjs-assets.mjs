import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = "6.4.299";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "node_modules", "pdfjs-dist");
const destinationRoot = path.join(root, "public", "pdfjs", version);
const directories = ["cmaps", "iccs", "standard_fonts", "wasm"];

const workerSource = path.join(sourceRoot, "build", "pdf.worker.min.mjs");
await stat(workerSource);
await rm(destinationRoot, { force: true, recursive: true });
await mkdir(destinationRoot, { recursive: true });
for (const directory of directories) {
  await cp(
    path.join(sourceRoot, directory),
    path.join(destinationRoot, directory),
    { recursive: true },
  );
}
await cp(workerSource, path.join(destinationRoot, "pdf.worker.min.mjs"));
await writeFile(
  path.join(destinationRoot, "pdf.worker.compat.mjs"),
  `const mapPrototype = Map.prototype;
if (typeof mapPrototype.getOrInsertComputed !== "function") {
  Object.defineProperty(mapPrototype, "getOrInsertComputed", {
    configurable: true,
    writable: true,
    value: function (key, callback) {
      if (this.has(key)) return this.get(key);
      const value = callback(key);
      this.set(key, value);
      return value;
    },
  });
}
if (typeof Math.sumPrecise !== "function") {
  Object.defineProperty(Math, "sumPrecise", {
    configurable: true,
    writable: true,
    value: function (values) {
      let total = 0;
      let compensation = 0;
      let sawValue = false;
      let sawPositiveInfinity = false;
      let sawNegativeInfinity = false;
      let allNegativeZero = true;
      for (const value of values) {
        sawValue = true;
        if (Number.isNaN(value)) return Number.NaN;
        if (value === Number.POSITIVE_INFINITY) {
          sawPositiveInfinity = true;
          allNegativeZero = false;
          continue;
        }
        if (value === Number.NEGATIVE_INFINITY) {
          sawNegativeInfinity = true;
          allNegativeZero = false;
          continue;
        }
        if (!Object.is(value, -0)) allNegativeZero = false;
        const next = total + value;
        if (Math.abs(total) >= Math.abs(value)) compensation += total - next + value;
        else compensation += value - next + total;
        total = next;
      }
      if (sawPositiveInfinity && sawNegativeInfinity) return Number.NaN;
      if (sawPositiveInfinity) return Number.POSITIVE_INFINITY;
      if (sawNegativeInfinity) return Number.NEGATIVE_INFINITY;
      if (!sawValue) return 0;
      if (allNegativeZero) return -0;
      return total + compensation;
    },
  });
}
await import("./pdf.worker.min.mjs");
`,
);
await cp(
  path.join(sourceRoot, "LICENSE"),
  path.join(destinationRoot, "LICENSE"),
);
console.log(
  `Copied PDF.js ${version} same-origin preview assets to public/pdfjs/${version}`,
);
