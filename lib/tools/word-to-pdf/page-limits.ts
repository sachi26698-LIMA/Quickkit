/**
 * Hard page ceiling shared by the API, the client preview pipeline and the
 * page editor. It is the number the 1,000-page stress run actually verified
 * (see docs/WORD_TO_PDF_V5_QA.md); raising it requires re-running that test.
 */
export const MAX_PAGES = 1000;

/** Largest request/response the browser pipeline will accept. */
export const MAX_NATIVE_PDF_BYTES = 50 * 1024 * 1024;
export const MAX_FINAL_PDF_BYTES = 50 * 1024 * 1024;
