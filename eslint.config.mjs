import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    ".next/**",
    "coverage/**",
    "playwright-report/**",
    "public/ocr/**",
    "public/pdfjs/**",
    "test-results/**",
  ]),
]);
