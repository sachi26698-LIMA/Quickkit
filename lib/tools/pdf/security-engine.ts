import { PDFDict, PDFDocument, PDFName, PDFNumber } from "@cantoo/pdf-lib";

import { inspectPdfFeatures } from "./merge-engine";
import {
  ALL_ALLOWED_PERMISSIONS,
  DEFAULT_PDF_PERMISSIONS,
  PDF_SECURITY_LIMITS,
  PdfSecurityError,
  assertPdfBytes,
  permissionArgs,
  permissionsFromFlags,
  permissionsMatch,
  securityFeatureWarnings,
  validateLockSettings,
  type PdfEncryptionInfo,
  type PdfLockSettings,
  type PdfPageGeometry,
  type PdfSecurityInspection,
  type PdfSecurityMetadata,
  type PdfSecurityProgress,
  type PdfSecurityResult,
  type PdfSecurityVerification,
} from "./security-logic";

/**
 * QPDF compiled to WebAssembly performs the actual encryption/decryption. It is
 * a lossless, industry-standard PDF security engine, runs entirely on-device,
 * and avoids the metadata/content rewriting quirks of pure-JS PDF writers.
 *
 * The runner is injected so the same engine can be tested in Node and used in a
 * dedicated browser worker. Passwords are passed only as in-memory WASM argv;
 * they are never logged, persisted, or returned in error messages.
 */
export interface QpdfRunResult {
  code: number;
  output?: Uint8Array;
  stderr: string;
  stdout: string;
}

export interface QpdfRunner {
  run(input: Uint8Array, args: string[]): Promise<QpdfRunResult>;
}

interface QpdfInstance {
  callMain(args: string[]): number;
  FS: {
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
    writeFile(path: string, data: Uint8Array): void;
  };
}

export type QpdfFactory = (options: {
  locateFile: () => string;
  print?: (text: string) => void;
  printErr?: (text: string) => void;
}) => Promise<QpdfInstance>;

const INPUT_PATH = "/quickkit-input.pdf";
const OUTPUT_PATH = "/quickkit-output.pdf";

/**
 * Creates a QPDF runner. Emscripten binds console.error during module init, so
 * console output is captured (and discarded) rather than allowed to reach the
 * browser console. QPDF's --check mode can echo passwords; this engine never
 * invokes --check and never exposes captured stdout/stderr to the UI.
 */
export async function createQpdfRunner(options: {
  factory: QpdfFactory;
  locateFile: () => string;
}): Promise<QpdfRunner> {
  let stdout = "";
  let stderr = "";
  const captureOut = (text: string) => {
    stdout += `${text}\n`;
  };
  const captureErr = (text: string) => {
    stderr += `${text}\n`;
  };
  const original = {
    error: console.error,
    log: console.log,
    warn: console.warn,
  };
  const installCapture = () => {
    console.log = captureOut;
    console.warn = captureErr;
    console.error = captureErr;
  };
  const restoreCapture = () => {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  };

  installCapture();
  let instance: QpdfInstance;
  try {
    instance = await options.factory({
      locateFile: options.locateFile,
      print: captureOut,
      printErr: captureErr,
    });
  } finally {
    restoreCapture();
  }
  stdout = "";
  stderr = "";

  return {
    async run(input, args) {
      stdout = "";
      stderr = "";
      installCapture();
      try {
        instance.FS.writeFile(INPUT_PATH, input);
        let code: number;
        try {
          code = instance.callMain([...args, "--", INPUT_PATH, OUTPUT_PATH]);
        } catch (error) {
          code =
            typeof error === "object" && error && "status" in error
              ? Number((error as { status?: number }).status ?? 2)
              : 2;
        }
        let output: Uint8Array | undefined;
        try {
          output = instance.FS.readFile(OUTPUT_PATH);
        } catch {
          output = undefined;
        }
        try {
          instance.FS.unlink(INPUT_PATH);
        } catch {
          /* ignore */
        }
        try {
          instance.FS.unlink(OUTPUT_PATH);
        } catch {
          /* ignore */
        }
        return { code, output, stderr, stdout };
      } finally {
        restoreCapture();
      }
    },
  };
}

const LOAD_OPTIONS = {
  capNumbers: true,
  preserveXFA: true,
  updateMetadata: false,
} as const;

function isSuccessCode(code: number): boolean {
  return code === 0 || code === 3;
}

function classifyQpdfFailure(
  result: QpdfRunResult,
  fallback: PdfSecurityError,
): PdfSecurityError {
  const diagnostic = `${result.stderr}\n${result.stdout}`.toLowerCase();
  if (diagnostic.includes("invalid password")) {
    return new PdfSecurityError(
      "password_invalid",
      "That password did not open this PDF. Check capitalization and try again. The original file is unchanged and the password is not stored.",
      fallback.entryId,
    );
  }
  if (
    diagnostic.includes("can't find pdf header") ||
    diagnostic.includes("can't find startxref") ||
    diagnostic.includes("not a pdf")
  ) {
    return new PdfSecurityError(
      "corrupt_or_unsupported",
      "This file could not be read as a PDF. It may be corrupted or incomplete. Export it again from your PDF app and retry.",
      fallback.entryId,
    );
  }
  return fallback;
}

function readNumber(dict: PDFDict, key: string): number | undefined {
  const value = dict.lookupMaybe(PDFName.of(key), PDFNumber);
  return value?.asNumber();
}

function readName(dict: PDFDict, key: string): string | undefined {
  const value = dict.lookupMaybe(PDFName.of(key), PDFName);
  return value?.decodeText();
}

function readEncryptionInfo(doc: PDFDocument): PdfEncryptionInfo | undefined {
  const encryptRef = doc.context.trailerInfo.Encrypt;
  if (!encryptRef) return undefined;
  const dict = doc.context.lookup(encryptRef, PDFDict);
  if (!dict) return undefined;
  const version = readNumber(dict, "V");
  const revision = readNumber(dict, "R");
  const keyBits = readNumber(dict, "Length");
  let cfm: string | undefined;
  const cf = dict.lookupMaybe(PDFName.of("CF"), PDFDict);
  const stdcf = cf?.lookupMaybe(PDFName.of("StdCF"), PDFDict);
  if (stdcf) cfm = readName(stdcf, "CFM");
  let algorithm: PdfEncryptionInfo["algorithm"] = "unknown";
  if (version === 5 && (revision === 6 || revision === 5))
    algorithm = "AES-256";
  else if (version === 4 && cfm === "AESV2") algorithm = "AES-128";
  else if (version === 1 || version === 2) algorithm = "RC4";
  const flags = readNumber(dict, "P");
  return {
    algorithm,
    keyBits,
    permissions: flags === undefined ? undefined : permissionsFromFlags(flags),
    revision,
    version,
  };
}

function readMetadata(doc: PDFDocument): PdfSecurityMetadata {
  const safe = (read: () => string | undefined) => {
    try {
      return read()?.trim() || undefined;
    } catch {
      return undefined;
    }
  };
  return {
    author: safe(() => doc.getAuthor()),
    creator: safe(() => doc.getCreator()),
    keywords: safe(() => doc.getKeywords()),
    producer: safe(() => doc.getProducer()),
    subject: safe(() => doc.getSubject()),
    title: safe(() => doc.getTitle()),
  };
}

function readGeometries(doc: PDFDocument): PdfPageGeometry[] {
  return doc.getPages().map((page) => {
    const size = page.getSize();
    return {
      height: size.height,
      rotation: page.getRotation().angle,
      width: size.width,
    };
  });
}

function geometriesMatch(a: PdfPageGeometry[], b: PdfPageGeometry[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((page, index) => {
    const other = b[index];
    return (
      Math.abs(page.width - other.width) < 0.01 &&
      Math.abs(page.height - other.height) < 0.01 &&
      page.rotation === other.rotation
    );
  });
}

function metadataMatch(
  a: PdfSecurityMetadata,
  b: PdfSecurityMetadata,
): boolean {
  const keys: (keyof PdfSecurityMetadata)[] = [
    "author",
    "creator",
    "keywords",
    "subject",
    "title",
  ];
  return keys.every((key) => (a[key] ?? "") === (b[key] ?? ""));
}

async function loadProbe(
  bytes: Uint8Array,
  entryId?: string,
): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: true,
    });
  } catch {
    throw new PdfSecurityError(
      "corrupt_or_unsupported",
      "This file could not be read as a PDF. It may be corrupted, incomplete, or use an unsupported structure. Export it again and retry.",
      entryId,
    );
  }
}

async function loadDecrypted(
  bytes: Uint8Array,
  entryId?: string,
): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, {
      ...LOAD_OPTIONS,
      ignoreEncryption: false,
    });
  } catch {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The processed PDF could not be reopened for verification. The original file is unchanged. Try again or export a fresh copy of the source PDF.",
      entryId,
    );
  }
}

function assertPageCount(pageCount: number, entryId?: string): void {
  if (pageCount < 1) {
    throw new PdfSecurityError(
      "corrupt_or_unsupported",
      "This PDF has no readable pages. Export it again from your PDF app and retry.",
      entryId,
    );
  }
  if (pageCount > PDF_SECURITY_LIMITS.maxPagesPerFile) {
    throw new PdfSecurityError(
      "too_many_pages",
      `This PDF has ${pageCount.toLocaleString()} pages, above the ${PDF_SECURITY_LIMITS.maxPagesPerFile.toLocaleString()}-page per-file limit. Split it into smaller PDFs and try again. No pages were truncated.`,
      entryId,
    );
  }
}

function buildInspection(
  doc: PDFDocument,
  encrypted: boolean,
  encryption: PdfEncryptionInfo | undefined,
  metadata: PdfSecurityMetadata,
  mode: "lock" | "unlock",
): PdfSecurityInspection {
  const geometries = readGeometries(doc);
  assertPageCount(geometries.length);
  const features = inspectPdfFeatures(doc);
  return {
    encrypted,
    encryption,
    features,
    geometries,
    metadata,
    pageCount: geometries.length,
    warnings: securityFeatureWarnings(features, mode),
  };
}

function progress(
  onProgress: ((progress: PdfSecurityProgress) => void) | undefined,
  stage: PdfSecurityProgress["stage"],
  message: string,
  current = 1,
  total = 1,
): void {
  onProgress?.({ current, message, stage, total });
}

async function decryptWithPassword(
  runner: QpdfRunner,
  bytes: Uint8Array,
  password: string,
  entryId?: string,
): Promise<Uint8Array> {
  const result = await runner.run(bytes, [
    "--allow-weak-crypto",
    "--decrypt",
    `--password=${password}`,
  ]);
  if (!isSuccessCode(result.code) || !result.output) {
    throw classifyQpdfFailure(
      result,
      new PdfSecurityError(
        "encrypted_unsupported",
        "This PDF's encryption could not be opened locally with the supplied password. The original file is unchanged.",
        entryId,
      ),
    );
  }
  return result.output;
}

export async function inspectPdfSecurity(
  bytes: Uint8Array,
  runner: QpdfRunner,
  options: { entryId?: string; password?: string } = {},
): Promise<PdfSecurityInspection> {
  assertPdfBytes(bytes, options.entryId);
  const probe = await loadProbe(bytes, options.entryId);
  const encrypted = probe.isEncrypted;
  const encryption = encrypted ? readEncryptionInfo(probe) : undefined;
  if (encrypted && options.password) {
    const decrypted = await decryptWithPassword(
      runner,
      bytes,
      options.password,
      options.entryId,
    );
    const doc = await loadDecrypted(decrypted, options.entryId);
    return buildInspection(doc, true, encryption, readMetadata(doc), "unlock");
  }
  const metadata = encrypted ? {} : readMetadata(probe);
  return buildInspection(probe, encrypted, encryption, metadata, "unlock");
}

export async function verifyPdfPassword(
  bytes: Uint8Array,
  runner: QpdfRunner,
  password: string,
  entryId?: string,
): Promise<{ inspection: PdfSecurityInspection; valid: boolean }> {
  assertPdfBytes(bytes, entryId);
  const probe = await loadProbe(bytes, entryId);
  if (!probe.isEncrypted) {
    const inspection = buildInspection(
      probe,
      false,
      undefined,
      readMetadata(probe),
      "unlock",
    );
    return { inspection, valid: true };
  }
  const decrypted = await decryptWithPassword(runner, bytes, password, entryId);
  const doc = await loadDecrypted(decrypted, entryId);
  const inspection = buildInspection(
    doc,
    true,
    readEncryptionInfo(probe),
    readMetadata(doc),
    "unlock",
  );
  return { inspection, valid: true };
}

function encryptionArgs(settings: PdfLockSettings): string[] {
  const ownerPassword = settings.ownerPassword || settings.openPassword;
  const args = [
    "--encrypt",
    settings.openPassword,
    ownerPassword,
    settings.algorithm === "AES-256" ? "256" : "128",
  ];
  if (settings.algorithm === "AES-128") args.push("--use-aes=y");
  args.push(...permissionArgs(settings.permissions));
  return args;
}

function assertNoSignedSignature(
  inspection: PdfSecurityInspection,
  entryId?: string,
): void {
  if (inspection.features.hasSignedSignature) {
    throw new PdfSecurityError(
      "signed_pdf",
      "This PDF is digitally signed. Locking or unlocking rewrites the file and would invalidate the signature. Ask the signer for an unsigned copy, or remove the signature in a PDF editor first.",
      entryId,
    );
  }
}

export async function lockPdfBytes(
  bytes: Uint8Array,
  runner: QpdfRunner,
  settings: PdfLockSettings,
  options: {
    currentPassword?: string;
    entryId?: string;
    onProgress?: (progress: PdfSecurityProgress) => void;
  } = {},
): Promise<PdfSecurityResult> {
  assertPdfBytes(bytes, options.entryId);
  const check = validateLockSettings(settings);
  if (!check.ok) {
    throw new PdfSecurityError(
      "invalid_settings",
      check.message ?? "Check the password settings and try again.",
      options.entryId,
    );
  }
  progress(options.onProgress, "inspecting", "Inspecting the source PDF");
  const probe = await loadProbe(bytes, options.entryId);
  let baselineDoc = probe;
  let encryptionInput = bytes;
  if (probe.isEncrypted) {
    if (!options.currentPassword) {
      throw new PdfSecurityError(
        "password_required",
        "This PDF is already encrypted. Enter its current open password to re-lock it, or unlock it first.",
        options.entryId,
      );
    }
    const decrypted = await decryptWithPassword(
      runner,
      bytes,
      options.currentPassword,
      options.entryId,
    );
    baselineDoc = await loadDecrypted(decrypted, options.entryId);
    // Re-encrypt the decrypted bytes, not the original encrypted container.
    encryptionInput = decrypted;
  }
  const baseline = buildInspection(
    baselineDoc,
    probe.isEncrypted,
    probe.isEncrypted ? readEncryptionInfo(probe) : undefined,
    readMetadata(baselineDoc),
    "lock",
  );
  assertNoSignedSignature(baseline, options.entryId);

  progress(
    options.onProgress,
    "encrypting",
    "Applying encryption and permissions",
  );
  const result = await runner.run(encryptionInput, encryptionArgs(settings));
  if (!isSuccessCode(result.code) || !result.output) {
    throw classifyQpdfFailure(
      result,
      new PdfSecurityError(
        "output_validation_failed",
        "The PDF could not be encrypted. The original file is unchanged. Try again or export a fresh copy of the source PDF.",
        options.entryId,
      ),
    );
  }
  const output = result.output;

  progress(
    options.onProgress,
    "verifying",
    "Reopening the locked PDF to verify protection",
  );
  const outputProbe = await loadProbe(output, options.entryId);
  if (!outputProbe.isEncrypted) {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The output PDF was not encrypted after processing, so it was discarded. The original file is unchanged.",
      options.entryId,
    );
  }
  const outputEncryption = readEncryptionInfo(outputProbe);
  if (outputEncryption?.algorithm !== settings.algorithm) {
    throw new PdfSecurityError(
      "output_validation_failed",
      `The output PDF used ${outputEncryption?.algorithm ?? "an unknown algorithm"} instead of ${settings.algorithm}, so it was discarded.`,
      options.entryId,
    );
  }
  const permissionsVerified = outputEncryption?.permissions
    ? permissionsMatch(settings.permissions, outputEncryption.permissions)
    : false;
  if (!permissionsVerified) {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The output PDF's permission flags did not match the selected settings, so it was discarded. Try again or adjust the permissions.",
      options.entryId,
    );
  }

  const decryptedOutput = await decryptWithPassword(
    runner,
    output,
    settings.openPassword,
    options.entryId,
  );
  const verifiedDoc = await loadDecrypted(decryptedOutput, options.entryId);
  const verifiedGeometries = readGeometries(verifiedDoc);
  const verifiedMetadata = readMetadata(verifiedDoc);
  const geometryVerified = geometriesMatch(
    baseline.geometries,
    verifiedGeometries,
  );
  const metadataVerified = metadataMatch(baseline.metadata, verifiedMetadata);
  if (
    verifiedGeometries.length !== baseline.pageCount ||
    !geometryVerified ||
    !metadataVerified
  ) {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The locked PDF did not preserve the original page count, dimensions or metadata, so it was discarded. The original file is unchanged.",
      options.entryId,
    );
  }

  // A locked PDF must reject an empty password. This is a single negative
  // control, not a password search: no guessing or brute force is performed.
  const noPassword = await runner.run(output, [
    "--allow-weak-crypto",
    "--decrypt",
  ]);
  const openPasswordVerified = !isSuccessCode(noPassword.code);
  if (!openPasswordVerified) {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The locked PDF opened without a password, so it was discarded. The original file is unchanged.",
      options.entryId,
    );
  }

  progress(options.onProgress, "validating", "Verification complete");
  const notices = [...baseline.warnings];
  if (!settings.ownerPassword) {
    notices.push(
      "No separate permissions password was set, so the open password also grants owner access. Anyone with the open password can change permissions in a supporting reader.",
    );
  }
  if (settings.algorithm === "AES-128") {
    notices.push(
      "AES-128 compatibility mode was used. AES-256 is recommended for stronger protection and Unicode passwords.",
    );
  }
  const verification: PdfSecurityVerification = {
    algorithm: settings.algorithm,
    encrypted: true,
    geometryVerified,
    metadataVerified,
    openPasswordVerified,
    pageCount: verifiedGeometries.length,
    permissionsVerified,
  };
  return {
    bytes: output,
    inspection: {
      ...baseline,
      encrypted: true,
      encryption: outputEncryption,
      geometries: verifiedGeometries,
      metadata: verifiedMetadata,
      pageCount: verifiedGeometries.length,
    },
    notices,
    verification,
  };
}

export async function unlockPdfBytes(
  bytes: Uint8Array,
  runner: QpdfRunner,
  options: {
    authorized: boolean;
    entryId?: string;
    onProgress?: (progress: PdfSecurityProgress) => void;
    password?: string;
  },
): Promise<PdfSecurityResult> {
  assertPdfBytes(bytes, options.entryId);
  if (!options.authorized) {
    throw new PdfSecurityError(
      "unauthorized",
      "Confirm that you own this PDF or have permission to remove its protection before unlocking.",
      options.entryId,
    );
  }
  progress(options.onProgress, "inspecting", "Inspecting the source PDF");
  const probe = await loadProbe(bytes, options.entryId);
  const probeGeometries = readGeometries(probe);
  assertPageCount(probeGeometries.length, options.entryId);
  const probeFeatures = inspectPdfFeatures(probe);
  if (probeFeatures.hasSignedSignature) {
    throw new PdfSecurityError(
      "signed_pdf",
      "This PDF is digitally signed. Unlocking rewrites the file and would invalidate the signature. Ask the signer for an unsigned copy first.",
      options.entryId,
    );
  }

  if (!probe.isEncrypted) {
    const inspection = buildInspection(
      probe,
      false,
      undefined,
      readMetadata(probe),
      "unlock",
    );
    progress(
      options.onProgress,
      "validating",
      "This PDF is already unencrypted",
    );
    return {
      bytes,
      inspection,
      notices: [
        "This PDF was already unencrypted. An unchanged copy was returned; no password was required.",
      ],
      verification: {
        encrypted: false,
        geometryVerified: true,
        metadataVerified: true,
        openPasswordVerified: true,
        pageCount: inspection.pageCount,
        permissionsVerified: true,
      },
    };
  }

  if (!options.password) {
    throw new PdfSecurityError(
      "password_required",
      "This PDF is password-protected. Enter its correct existing password to unlock it. QUICKKIT does not guess, crack or bypass passwords.",
      options.entryId,
    );
  }

  progress(
    options.onProgress,
    "unlocking",
    "Removing protection with the supplied password",
  );
  // Reference decrypt of the source establishes the baseline metadata that the
  // produced output must preserve. The source's Info strings are encrypted, so
  // they can only be read after a faithful decrypt with the supplied password.
  const referenceBytes = await decryptWithPassword(
    runner,
    bytes,
    options.password,
    options.entryId,
  );
  const referenceDoc = await loadDecrypted(referenceBytes, options.entryId);
  const baselineMetadata = readMetadata(referenceDoc);
  const output = await decryptWithPassword(
    runner,
    bytes,
    options.password,
    options.entryId,
  );
  progress(
    options.onProgress,
    "verifying",
    "Reopening the unlocked PDF to verify it is unprotected",
  );
  const verifiedDoc = await loadDecrypted(output, options.entryId);
  if (verifiedDoc.isEncrypted) {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The output PDF remained encrypted after processing, so it was discarded. The original file is unchanged.",
      options.entryId,
    );
  }
  const verifiedGeometries = readGeometries(verifiedDoc);
  const geometryVerified = geometriesMatch(probeGeometries, verifiedGeometries);
  if (
    verifiedGeometries.length !== probeGeometries.length ||
    !geometryVerified
  ) {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The unlocked PDF did not preserve the original page count or dimensions, so it was discarded. The original file is unchanged.",
      options.entryId,
    );
  }
  const metadata = readMetadata(verifiedDoc);
  const metadataVerified = metadataMatch(baselineMetadata, metadata);
  if (!metadataVerified) {
    throw new PdfSecurityError(
      "output_validation_failed",
      "The unlocked PDF did not preserve the original document metadata, so it was discarded. The original file is unchanged.",
      options.entryId,
    );
  }
  const inspection = buildInspection(
    verifiedDoc,
    false,
    undefined,
    metadata,
    "unlock",
  );
  const notices = securityFeatureWarnings(probeFeatures, "unlock");
  notices.push(
    "Opening-password protection and permission restrictions were removed with the supplied password. Keep the original until you have checked the unlocked copy in your reader.",
  );
  progress(options.onProgress, "validating", "Verification complete");
  return {
    bytes: output,
    inspection,
    notices,
    verification: {
      encrypted: false,
      geometryVerified,
      metadataVerified,
      openPasswordVerified: true,
      pageCount: verifiedGeometries.length,
      permissionsVerified: true,
    },
  };
}

export { ALL_ALLOWED_PERMISSIONS, DEFAULT_PDF_PERMISSIONS };
