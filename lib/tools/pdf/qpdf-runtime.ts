import { createQpdfRunner, type QpdfRunner } from "./security-engine";

/**
 * Same-origin QPDF WebAssembly assets. The copy script in
 * scripts/copy-qpdf-assets.mjs publishes these during predev/prebuild so no
 * external CDN or upload service is ever contacted.
 */
export const QPDF_VERSION = "0.3.1";
export const QPDF_ASSET_BASE = `/qpdf/${QPDF_VERSION}`;

let runnerPromise: Promise<QpdfRunner> | null = null;

export function loadBrowserQpdfRunner(): Promise<QpdfRunner> {
  runnerPromise ??= (async () => {
    const moduleUrl = `${QPDF_ASSET_BASE}/qpdf.mjs`;
    const loaded = (await import(/* webpackIgnore: true */ moduleUrl)) as {
      default: Parameters<typeof createQpdfRunner>[0]["factory"];
    };
    return createQpdfRunner({
      factory: loaded.default,
      locateFile: () => `${QPDF_ASSET_BASE}/qpdf.wasm`,
    });
  })();
  return runnerPromise;
}
