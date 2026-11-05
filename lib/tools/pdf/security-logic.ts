import {
  formatMiB,
  isPdfSignature,
  moveItem,
  sanitizeOutputFilename,
  type PdfInspectionFeatures,
} from "./merge-pdf-logic";

/**
 * Browser-safety bounds for the local PDF Lock & Unlock tool. Encryption and
 * decryption are lossless QPDF transformations, but every retained output still
 * counts against memory, so the queue is bounded just like the other PDF tools.
 */
export const PDF_SECURITY_LIMITS = {
  maxFileBytes: 50 * 1024 * 1024,
  maxFiles: 20,
  maxGeneratedBytes: 128 * 1024 * 1024,
  maxPagesPerFile: 1_000,
  maxTotalBytes: 100 * 1024 * 1024,
  maxTotalPages: 2_000,
} as const;

export type PdfSecurityMode = "lock" | "unlock";
export type PdfEncryptionAlgorithm = "AES-256" | "AES-128";
export type PdfDetectedEncryption = "AES-256" | "AES-128" | "RC4" | "unknown";

export type PdfSecurityIssueCode =
  | "cancelled"
  | "corrupt_or_unsupported"
  | "encrypted_unsupported"
  | "file_too_large"
  | "invalid_pdf"
  | "invalid_settings"
  | "output_validation_failed"
  | "password_invalid"
  | "password_required"
  | "signed_pdf"
  | "too_many_files"
  | "too_many_pages"
  | "total_too_large"
  | "unauthorized"
  | "worker_failed";

export class PdfSecurityError extends Error {
  readonly code: PdfSecurityIssueCode;
  readonly entryId?: string;

  constructor(code: PdfSecurityIssueCode, message: string, entryId?: string) {
    super(message);
    this.name = "PdfSecurityError";
    this.code = code;
    this.entryId = entryId;
  }
}

/** The eight reader-facing permission switches exposed by the workspace. */
export interface PdfPermissions {
  annotating: boolean;
  contentAccessibility: boolean;
  copying: boolean;
  documentAssembly: boolean;
  fillingForms: boolean;
  highResolutionPrinting: boolean;
  modifying: boolean;
  printing: boolean;
}

export const DEFAULT_PDF_PERMISSIONS: PdfPermissions = {
  annotating: false,
  contentAccessibility: true,
  copying: false,
  documentAssembly: false,
  fillingForms: true,
  highResolutionPrinting: false,
  modifying: false,
  printing: false,
};

export const ALL_ALLOWED_PERMISSIONS: PdfPermissions = {
  annotating: true,
  contentAccessibility: true,
  copying: true,
  documentAssembly: true,
  fillingForms: true,
  highResolutionPrinting: true,
  modifying: true,
  printing: true,
};

export interface PdfPermissionPreset {
  description: string;
  id: "custom" | "print-only" | "restricted" | "review-forms";
  label: string;
  permissions: PdfPermissions;
}

export const PDF_PERMISSION_PRESETS: PdfPermissionPreset[] = [
  {
    description:
      "No printing, copying or editing. Form filling and accessibility extraction stay on.",
    id: "restricted",
    label: "Restricted",
    permissions: { ...DEFAULT_PDF_PERMISSIONS },
  },
  {
    description:
      "Low-resolution printing, comments and form filling. Copying and content editing stay off.",
    id: "review-forms",
    label: "Review & forms",
    permissions: {
      ...DEFAULT_PDF_PERMISSIONS,
      annotating: true,
      fillingForms: true,
      printing: true,
    },
  },
  {
    description:
      "High-resolution printing and accessibility extraction. Copying and editing stay off.",
    id: "print-only",
    label: "Print only",
    permissions: {
      ...DEFAULT_PDF_PERMISSIONS,
      highResolutionPrinting: true,
      printing: true,
    },
  },
];

export interface PdfLockSettings {
  algorithm: PdfEncryptionAlgorithm;
  confirmPassword: string;
  openPassword: string;
  ownerConfirmPassword?: string;
  ownerPassword?: string;
  permissions: PdfPermissions;
}

export interface PdfPageGeometry {
  height: number;
  rotation: number;
  width: number;
}

export interface PdfSecurityMetadata {
  author?: string;
  creator?: string;
  keywords?: string;
  producer?: string;
  subject?: string;
  title?: string;
}

export interface PdfEncryptionInfo {
  algorithm: PdfDetectedEncryption;
  keyBits?: number;
  permissions?: PdfPermissions;
  revision?: number;
  version?: number;
}

export interface PdfSecurityInspection {
  encrypted: boolean;
  encryption?: PdfEncryptionInfo;
  features: PdfInspectionFeatures;
  geometries: PdfPageGeometry[];
  metadata: PdfSecurityMetadata;
  pageCount: number;
  warnings: string[];
}

export interface PdfSecurityVerification {
  algorithm?: PdfEncryptionAlgorithm;
  encrypted: boolean;
  geometryVerified: boolean;
  metadataVerified: boolean;
  openPasswordVerified: boolean;
  pageCount: number;
  permissionsVerified: boolean;
}

export interface PdfSecurityProgress {
  current: number;
  message: string;
  stage:
    | "encrypting"
    | "inspecting"
    | "saving"
    | "unlocking"
    | "validating"
    | "verifying";
  total: number;
}

export interface PdfSecurityResult {
  bytes: Uint8Array;
  inspection: PdfSecurityInspection;
  notices: string[];
  verification: PdfSecurityVerification;
}

export interface PdfFileCandidate {
  name: string;
  size: number;
  type?: string;
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;
const encoder = new TextEncoder();

export function utf8Length(value: string): number {
  return encoder.encode(value).length;
}

export function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function isAsciiPrintable(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code > 0x7e) return false;
  }
  return true;
}

export interface PasswordCheck {
  message?: string;
  ok: boolean;
}

/**
 * Validates a password that will be written into a new PDF. AES-256 (R6)
 * accepts UTF-8 up to 127 bytes. AES-128 (R4) is limited to printable ASCII and
 * 32 bytes so the legacy handler never silently truncates or re-encodes it.
 */
export function validateNewPassword(
  value: string,
  algorithm: PdfEncryptionAlgorithm,
  label = "Password",
): PasswordCheck {
  if (!value) return { message: `${label} is required.`, ok: false };
  if (hasLoneSurrogate(value)) {
    return {
      message: `${label} contains an invalid Unicode character.`,
      ok: false,
    };
  }
  if (CONTROL_CHARS.test(value)) {
    return {
      message: `${label} cannot contain control characters.`,
      ok: false,
    };
  }
  if (value.length < 8) {
    return { message: `${label} must be at least 8 characters.`, ok: false };
  }
  const bytes = utf8Length(value);
  if (algorithm === "AES-256") {
    if (bytes > 127) {
      return {
        message: `${label} is ${bytes} UTF-8 bytes; AES-256 allows at most 127 bytes.`,
        ok: false,
      };
    }
  } else {
    if (!isAsciiPrintable(value)) {
      return {
        message: `${label} must use printable ASCII characters for AES-128 compatibility. Choose AES-256 for Unicode passwords.`,
        ok: false,
      };
    }
    if (bytes > 32) {
      return {
        message: `${label} must be at most 32 characters for AES-128 compatibility.`,
        ok: false,
      };
    }
  }
  return { ok: true };
}

/** Validates a known password supplied to open an existing PDF. */
export function validateExistingPassword(value: string): PasswordCheck {
  if (!value) {
    return { message: "Enter the existing password for this PDF.", ok: false };
  }
  if (hasLoneSurrogate(value)) {
    return {
      message: "The password contains an invalid Unicode character.",
      ok: false,
    };
  }
  if (utf8Length(value) > 127) {
    return {
      message: "The password is longer than the 127-byte PDF password limit.",
      ok: false,
    };
  }
  return { ok: true };
}

export function validateLockSettings(settings: PdfLockSettings): PasswordCheck {
  const open = validateNewPassword(
    settings.openPassword,
    settings.algorithm,
    "Open password",
  );
  if (!open.ok) return open;
  if (settings.openPassword !== settings.confirmPassword) {
    return { message: "Open passwords do not match.", ok: false };
  }
  if (settings.ownerPassword) {
    const owner = validateNewPassword(
      settings.ownerPassword,
      settings.algorithm,
      "Permissions password",
    );
    if (!owner.ok) return owner;
    if (settings.ownerPassword === settings.openPassword) {
      return {
        message:
          "The permissions password must be different from the open password.",
        ok: false,
      };
    }
    if (settings.ownerPassword !== (settings.ownerConfirmPassword ?? "")) {
      return { message: "Permissions passwords do not match.", ok: false };
    }
  }
  if (settings.algorithm !== "AES-256" && settings.algorithm !== "AES-128") {
    return { message: "Choose a supported encryption standard.", ok: false };
  }
  return { ok: true };
}

export interface PasswordStrength {
  feedback: string;
  label: string;
  percent: number;
  score: 0 | 1 | 2 | 3 | 4;
}

/**
 * A conservative, local heuristic for the strength meter. It is intentionally
 * not presented as a cryptographic entropy guarantee.
 */
export function assessPasswordStrength(value: string): PasswordStrength {
  if (!value) {
    return {
      feedback: "Enter a password to see its strength.",
      label: "Empty",
      percent: 0,
      score: 0,
    };
  }
  let pool = 0;
  if (/[a-z]/.test(value)) pool += 26;
  if (/[A-Z]/.test(value)) pool += 26;
  if (/[0-9]/.test(value)) pool += 10;
  if (/[^A-Za-z0-9]/.test(value)) pool += 33;
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) =>
    re.test(value),
  ).length;
  const common = /^(password|12345678|qwerty|letmein|admin|welcome)/i.test(
    value,
  );
  const repeated = /(.)\1{3,}/.test(value);
  const lengthScore =
    value.length >= 20 ? 3 : value.length >= 14 ? 2 : value.length >= 8 ? 1 : 0;
  let score = Math.min(4, lengthScore + (variety >= 3 ? 1 : 0));
  if (common || repeated) score = Math.min(score, 1);
  if (value.length < 8) score = 0;
  const labels = ["Too short", "Weak", "Fair", "Strong", "Excellent"] as const;
  const feedback = common
    ? "Avoid common words or sequences."
    : repeated
      ? "Avoid repeated characters."
      : value.length < 12
        ? "Add length for a stronger password."
        : variety < 3
          ? "Mix upper case, lower case, numbers and symbols."
          : "Good mix of length and character variety.";
  void pool;
  return {
    feedback,
    label: labels[score],
    percent: Math.round((score / 4) * 100),
    score: score as PasswordStrength["score"],
  };
}

/** Maps the workspace permission switches to QPDF restriction flags. */
export function permissionArgs(permissions: PdfPermissions): string[] {
  const print = permissions.printing
    ? permissions.highResolutionPrinting
      ? "full"
      : "low"
    : "none";
  const modify = permissions.modifying
    ? "all"
    : permissions.annotating
      ? "annotate"
      : permissions.fillingForms
        ? "form"
        : permissions.documentAssembly
          ? "assembly"
          : "none";
  return [
    `--print=${print}`,
    `--modify=${modify}`,
    `--modify-other=${permissions.modifying ? "y" : "n"}`,
    `--annotate=${permissions.annotating ? "y" : "n"}`,
    `--form=${permissions.fillingForms ? "y" : "n"}`,
    `--assemble=${permissions.documentAssembly ? "y" : "n"}`,
    `--extract=${permissions.copying ? "y" : "n"}`,
    `--accessibility=${permissions.contentAccessibility ? "y" : "n"}`,
  ];
}

/** Decodes the standard security handler's /P permission bits. */
export function permissionsFromFlags(flags: number): PdfPermissions {
  return {
    annotating: (flags & 32) !== 0,
    contentAccessibility: (flags & 512) !== 0,
    copying: (flags & 16) !== 0,
    documentAssembly: (flags & 1024) !== 0,
    fillingForms: (flags & 256) !== 0,
    highResolutionPrinting: (flags & 2048) !== 0,
    modifying: (flags & 8) !== 0,
    printing: (flags & 4) !== 0,
  };
}

export function permissionsMatch(
  expected: PdfPermissions,
  actual: PdfPermissions,
): boolean {
  return (
    expected.printing === actual.printing &&
    (!expected.printing ||
      expected.highResolutionPrinting === actual.highResolutionPrinting) &&
    expected.copying === actual.copying &&
    expected.modifying === actual.modifying &&
    expected.annotating === actual.annotating &&
    expected.fillingForms === actual.fillingForms &&
    expected.documentAssembly === actual.documentAssembly &&
    expected.contentAccessibility === actual.contentAccessibility
  );
}

export function validatePdfSecurityCandidate(
  file: PdfFileCandidate,
  currentFileCount: number,
  currentTotalBytes: number,
): PdfSecurityError | null {
  if (currentFileCount >= PDF_SECURITY_LIMITS.maxFiles) {
    return new PdfSecurityError(
      "too_many_files",
      `You can process up to ${PDF_SECURITY_LIMITS.maxFiles} PDFs at once. Remove a file or use smaller batches.`,
    );
  }
  const hasPdfExtension = /\.pdf$/i.test(file.name.trim());
  const hasPdfType =
    !file.type || file.type.toLowerCase() === "application/pdf";
  if (!hasPdfExtension || !hasPdfType) {
    return new PdfSecurityError(
      "invalid_pdf",
      `“${file.name}” is not a PDF. Choose a file ending in .pdf.`,
    );
  }
  if (file.size === 0) {
    return new PdfSecurityError(
      "invalid_pdf",
      `“${file.name}” is empty. Choose a complete PDF exported from your document app.`,
    );
  }
  if (file.size > PDF_SECURITY_LIMITS.maxFileBytes) {
    return new PdfSecurityError(
      "file_too_large",
      `“${file.name}” is ${formatMiB(file.size)}, above the ${formatMiB(PDF_SECURITY_LIMITS.maxFileBytes)} per-file limit. Split or compress it, then add it again.`,
    );
  }
  if (currentTotalBytes + file.size > PDF_SECURITY_LIMITS.maxTotalBytes) {
    return new PdfSecurityError(
      "total_too_large",
      `Adding “${file.name}” would take the queue above the ${formatMiB(PDF_SECURITY_LIMITS.maxTotalBytes)} total limit. Remove a file or use smaller batches.`,
    );
  }
  return null;
}

export function assertPdfBytes(bytes: Uint8Array, entryId?: string): void {
  if (bytes.byteLength === 0) {
    throw new PdfSecurityError(
      "invalid_pdf",
      "This file is empty. Choose a complete PDF exported from your document app.",
      entryId,
    );
  }
  if (bytes.byteLength > PDF_SECURITY_LIMITS.maxFileBytes) {
    throw new PdfSecurityError(
      "file_too_large",
      `This PDF is ${formatMiB(bytes.byteLength)}, above the ${formatMiB(PDF_SECURITY_LIMITS.maxFileBytes)} local limit. Split or compress it, then try again.`,
      entryId,
    );
  }
  if (!isPdfSignature(bytes)) {
    throw new PdfSecurityError(
      "invalid_pdf",
      "This file does not start with PDF data. It may be renamed, incomplete, or corrupted. Export it as a PDF again and retry.",
      entryId,
    );
  }
}

export function defaultOutputName(
  sourceName: string,
  mode: PdfSecurityMode,
): string {
  const base = sourceName.replace(/\.pdf$/i, "");
  return sanitizeOutputFilename(
    `${base}-${mode === "lock" ? "locked" : "unlocked"}`,
    mode === "lock" ? "locked" : "unlocked",
  );
}

export function buildZipFilename(mode: PdfSecurityMode): string {
  return mode === "lock"
    ? "quickkit-locked-pdfs.zip"
    : "quickkit-unlocked-pdfs.zip";
}

export function makeUniqueOutputNames(names: string[]): string[] {
  const counts = new Map<string, number>();
  return names.map((name) => {
    const key = name.toLowerCase();
    const count = counts.get(key) ?? 0;
    counts.set(key, count + 1);
    if (count === 0) return name;
    const base = name.replace(/\.pdf$/i, "");
    return sanitizeOutputFilename(`${base}-${count + 1}`);
  });
}

export function securityFeatureWarnings(
  features: PdfInspectionFeatures,
  mode: PdfSecurityMode,
): string[] {
  const warnings: string[] = [];
  if (features.hasSignedSignature) {
    warnings.push(
      "This PDF contains a digital signature. Locking or unlocking rewrites the file and invalidates the signature, so it is blocked.",
    );
  } else if (features.hasSignatureField) {
    warnings.push(
      "This PDF has an unsigned signature field. The field is preserved, but signing after processing may behave differently in some readers.",
    );
  }
  if (features.hasXFA) {
    warnings.push(
      "This PDF contains a dynamic XFA form. QPDF preserves the form data, but test the output in Adobe Acrobat before relying on it.",
    );
  }
  if (features.hasJavaScript) {
    warnings.push(
      "This PDF contains JavaScript. Scripts are preserved, but reader security settings may still block them.",
    );
  }
  if (features.hasAttachments) {
    warnings.push(
      "Embedded attachments are preserved. Some readers restrict attachments in encrypted PDFs.",
    );
  }
  if (mode === "lock" && features.hasTags) {
    warnings.push(
      "Tagged structure is preserved where possible, but PDF/UA conformance is not guaranteed after encryption.",
    );
  }
  return warnings;
}

export { formatMiB, moveItem, sanitizeOutputFilename };
