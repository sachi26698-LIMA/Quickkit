/**
 * Minimal types for the Node entry of bwip-js.
 *
 * The package ships types for `bwip-js/browser` (the entry the app uses, which
 * renders SVG) but not for the root Node entry, whose `toBuffer` returns PNG
 * bytes. Only the test suite uses the Node entry, and only `toBuffer`, so this
 * declares exactly that instead of duplicating the full barcode API.
 */
declare module "bwip-js" {
  const bwipjs: {
    toBuffer(options: {
      bcid: string;
      text: string;
      scale?: number;
      padding?: number;
      [option: string]: unknown;
    }): Promise<Uint8Array>;
  };
  export default bwipjs;
}
