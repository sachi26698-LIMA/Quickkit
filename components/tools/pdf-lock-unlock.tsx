"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileArchive,
  FileText,
  GripVertical,
  Info,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LockOpen,
  RotateCcw,
  Settings2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";

import { useHydrated } from "@/lib/use-hydrated";
import { downloadBlob, formatBytes } from "@/lib/tools/download";
import { defaultPasswordOptions, generatePassword } from "@/lib/tools/password";
import { createZip } from "@/lib/tools/zip";
import {
  PDF_SECURITY_LIMITS,
  PDF_PERMISSION_PRESETS,
  DEFAULT_PDF_PERMISSIONS,
  PdfSecurityError,
  assessPasswordStrength,
  buildZipFilename,
  defaultOutputName,
  formatMiB,
  makeUniqueOutputNames,
  moveItem,
  sanitizeOutputFilename,
  validateExistingPassword,
  validateLockSettings,
  validatePdfSecurityCandidate,
  type PdfEncryptionAlgorithm,
  type PdfLockSettings,
  type PdfPermissions,
  type PdfSecurityInspection,
  type PdfSecurityMode,
  type PdfSecurityProgress,
  type PdfSecurityVerification,
} from "@/lib/tools/pdf/security-logic";
import type { PdfSecurityWorkerSuccess } from "@/lib/tools/pdf/security-worker-types";
import { usePdfSecurityWorker } from "@/lib/tools/pdf/use-pdf-security-worker";
import { WorkspaceHeading } from "./tool-ui";
import styles from "./pdf-lock-unlock.module.css";

type EntryStatus =
  | "blocked"
  | "cancelled"
  | "error"
  | "inspecting"
  | "password"
  | "processing"
  | "ready"
  | "success"
  | "verified";

interface EntryResult {
  blob: Blob;
  notices: string[];
  outputBytes: number;
  verification: PdfSecurityVerification;
}

interface PdfEntry {
  currentPassword?: string;
  customConfirm?: string;
  customPassword?: string;
  error?: string;
  file: File;
  id: string;
  inspection?: PdfSecurityInspection;
  name: string;
  outputName: string;
  progress?: PdfSecurityProgress;
  result?: EntryResult;
  size: number;
  status: EntryStatus;
  useCustomPassword: boolean;
}

interface IntakeIssue {
  id: string;
  message: string;
}

interface Toast {
  message: string;
  type: "error" | "info" | "success";
}

interface RunProgress {
  completed: number;
  fileName: string;
  percent: number;
  stage: string;
  total: number;
}

const PERMISSION_LABELS: {
  description: string;
  key: keyof PdfPermissions;
  label: string;
}[] = [
  {
    description: "Allow the reader to print this document.",
    key: "printing",
    label: "Printing",
  },
  {
    description: "Allow full-quality printing instead of low-resolution only.",
    key: "highResolutionPrinting",
    label: "High-resolution printing",
  },
  {
    description: "Allow copying text and images to the clipboard.",
    key: "copying",
    label: "Copy text & images",
  },
  {
    description: "Allow editing document contents.",
    key: "modifying",
    label: "Edit contents",
  },
  {
    description: "Allow adding annotations and comments.",
    key: "annotating",
    label: "Annotations & comments",
  },
  {
    description: "Allow filling existing interactive form fields.",
    key: "fillingForms",
    label: "Fill forms",
  },
  {
    description: "Allow inserting, rotating or deleting pages and bookmarks.",
    key: "documentAssembly",
    label: "Document assembly",
  },
  {
    description: "Allow text extraction for accessibility tools.",
    key: "contentAccessibility",
    label: "Accessibility extraction",
  },
];

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pdf-security-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function stagePercent(progress: PdfSecurityProgress): number {
  switch (progress.stage) {
    case "inspecting":
      return 10;
    case "encrypting":
    case "unlocking":
      return 45;
    case "saving":
      return 60;
    case "verifying":
      return 78;
    case "validating":
      return 96;
    default:
      return 50;
  }
}

function statusLabel(entry: PdfEntry, mode: PdfSecurityMode): string {
  switch (entry.status) {
    case "blocked":
      return "Blocked";
    case "cancelled":
      return "Cancelled";
    case "error":
      return "Needs attention";
    case "inspecting":
      return "Inspecting";
    case "password":
      return mode === "lock" ? "Current password needed" : "Password needed";
    case "processing":
      return mode === "lock" ? "Locking" : "Unlocking";
    case "ready":
      return "Ready";
    case "success":
      return mode === "lock" ? "Locked & verified" : "Unlocked & verified";
    case "verified":
      return "Password verified";
  }
}

function encryptionLabel(inspection?: PdfSecurityInspection): string {
  if (!inspection) return "Checking…";
  if (!inspection.encrypted) return "Not encrypted";
  const algorithm = inspection.encryption?.algorithm;
  if (algorithm === "AES-256") return "AES-256 encrypted";
  if (algorithm === "AES-128") return "AES-128 encrypted";
  if (algorithm === "RC4") return "Legacy RC4 encrypted";
  return "Encrypted";
}

function errorMessage(error: unknown): string {
  if (error instanceof PdfSecurityError) return error.message;
  return "This PDF could not be processed locally. The original file is unchanged. Try again or export a fresh copy.";
}

function PasswordField({
  autoComplete = "off",
  error,
  help,
  id,
  label,
  onChange,
  onCopy,
  onGenerate,
  placeholder,
  required,
  value,
}: {
  autoComplete?: string;
  error?: string;
  help?: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  onCopy?: () => void;
  onGenerate?: () => void;
  placeholder?: string;
  required?: boolean;
  value: string;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label} {required ? <span className={styles.required}>*</span> : null}
      </label>
      <div className={styles.passwordRow}>
        <input
          aria-describedby={error ? errorId : help ? helpId : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete={autoComplete}
          autoCapitalize="off"
          autoCorrect="off"
          className={styles.passwordInput}
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className={styles.iconButton}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {(onGenerate || onCopy) && (
        <div className={styles.passwordActions}>
          {onGenerate ? (
            <button
              className={styles.smallButton}
              onClick={onGenerate}
              type="button"
            >
              <Sparkles size={14} /> Generate strong password
            </button>
          ) : null}
          {onCopy ? (
            <button
              className={styles.smallButton}
              disabled={!value}
              onClick={() => {
                onCopy();
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              }}
              type="button"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </div>
      )}
      {help ? (
        <p className={styles.helpText} id={helpId}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p className={styles.fieldError} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function StrengthMeter({ value }: { value: string }) {
  const strength = assessPasswordStrength(value);
  return (
    <div className={styles.strength} aria-live="polite">
      <div className={styles.strengthBars} aria-hidden="true">
        {[1, 2, 3, 4].map((level) => (
          <span
            className={`${styles.strengthBar} ${
              strength.score >= level ? styles.strengthBarActive : ""
            }`}
            data-score={strength.score}
            key={level}
          />
        ))}
      </div>
      <div className={styles.strengthLabel}>
        <span>Password strength: {strength.label}</span>
        <span>{strength.percent}%</span>
      </div>
      <p className={styles.strengthFeedback}>{strength.feedback}</p>
    </div>
  );
}

export default function PdfLockUnlock() {
  const ready = useHydrated();
  const worker = usePdfSecurityWorker();
  const [mode, setMode] = useState<PdfSecurityMode>("lock");
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [intakeIssues, setIntakeIssues] = useState<IntakeIssue[]>([]);
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [draggingFiles, setDraggingFiles] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [runProgress, setRunProgress] = useState<RunProgress | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const [algorithm, setAlgorithm] = useState<PdfEncryptionAlgorithm>("AES-256");
  const [openPassword, setOpenPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ownerEnabled, setOwnerEnabled] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerConfirmPassword, setOwnerConfirmPassword] = useState("");
  const [permissions, setPermissions] = useState<PdfPermissions>({
    ...DEFAULT_PDF_PERMISSIONS,
  });
  const [preset, setPreset] = useState<string>("restricted");
  const [lockBatchMode, setLockBatchMode] = useState<"common" | "individual">(
    "common",
  );

  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockBatchMode, setUnlockBatchMode] = useState<
    "common" | "individual"
  >("common");
  const [authorized, setAuthorized] = useState(false);
  const [zipName, setZipName] = useState(buildZipFilename("lock"));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const runRef = useRef(0);
  const dragCounterRef = useRef(0);
  const entriesRef = useRef<PdfEntry[]>([]);

  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateEntry = useCallback((id: string, patch: Partial<PdfEntry>) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  }, []);

  const clearPasswords = useCallback(() => {
    setOpenPassword("");
    setConfirmPassword("");
    setOwnerPassword("");
    setOwnerConfirmPassword("");
    setUnlockPassword("");
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        currentPassword: undefined,
        customConfirm: undefined,
        customPassword: undefined,
        status:
          entry.status === "success" || entry.status === "blocked"
            ? entry.status
            : entry.inspection?.encrypted
              ? "password"
              : entry.status === "processing"
                ? "cancelled"
                : entry.status === "verified"
                  ? "ready"
                  : entry.status,
      })),
    );
  }, []);

  const globalLockSettings = useMemo<PdfLockSettings>(
    () => ({
      algorithm,
      confirmPassword,
      openPassword,
      ownerConfirmPassword: ownerEnabled ? ownerConfirmPassword : undefined,
      ownerPassword: ownerEnabled ? ownerPassword || undefined : undefined,
      permissions,
    }),
    [
      algorithm,
      confirmPassword,
      openPassword,
      ownerConfirmPassword,
      ownerEnabled,
      ownerPassword,
      permissions,
    ],
  );

  const lockValidation = validateLockSettings(globalLockSettings);
  const successCount = entries.filter((entry) => entry.result).length;
  const failedCount = entries.filter(
    (entry) => entry.status === "error" || entry.status === "cancelled",
  ).length;
  const processCount = entries.filter(
    (entry) => entry.status !== "blocked" && entry.status !== "success",
  ).length;
  const totalBytes = entries.reduce((sum, entry) => sum + entry.size, 0);
  const totalPages = entries.reduce(
    (sum, entry) => sum + (entry.inspection?.pageCount ?? 0),
    0,
  );

  const inspectEntry = useCallback(
    async (entry: PdfEntry) => {
      try {
        const data = await entry.file.arrayBuffer();
        const inspection = await worker.inspect(entry.id, data);
        const blocked = inspection.features.hasSignedSignature;
        updateEntry(entry.id, {
          inspection,
          status: blocked
            ? "blocked"
            : inspection.encrypted
              ? "password"
              : "ready",
          error: blocked
            ? "This PDF is digitally signed. Locking or unlocking would invalidate the signature, so it is blocked."
            : undefined,
        });
      } catch (error) {
        const message = errorMessage(error);
        updateEntry(entry.id, {
          error: message,
          status:
            error instanceof PdfSecurityError &&
            (error.code === "too_many_pages" ||
              error.code === "corrupt_or_unsupported")
              ? "blocked"
              : "error",
        });
      }
    },
    [updateEntry, worker],
  );

  const addFiles = useCallback(
    async (files: File[]) => {
      if (isProcessing || intakeBusy) return;
      const issues: IntakeIssue[] = [];
      const accepted: PdfEntry[] = [];
      let count = entriesRef.current.length;
      let bytes = entriesRef.current.reduce(
        (sum, entry) => sum + entry.size,
        0,
      );
      for (const file of files) {
        const issue = validatePdfSecurityCandidate(file, count, bytes);
        if (issue) {
          issues.push({ id: createId(), message: issue.message });
          continue;
        }
        const matches = (entry: PdfEntry) =>
          entry.name === file.name &&
          entry.size === file.size &&
          entry.file.lastModified === file.lastModified;
        const duplicate =
          entriesRef.current.some(matches) || accepted.some(matches);
        if (duplicate) {
          issues.push({
            id: createId(),
            message: `“${file.name}” is already in the queue.`,
          });
          continue;
        }
        accepted.push({
          file,
          id: createId(),
          name: file.name,
          outputName: defaultOutputName(file.name, mode),
          size: file.size,
          status: "inspecting",
          useCustomPassword: false,
        });
        count += 1;
        bytes += file.size;
      }
      setIntakeIssues(issues);
      if (!accepted.length) return;
      setEntries((current) => [...current, ...accepted]);
      setIntakeBusy(true);
      for (const entry of accepted) {
        await inspectEntry(entry);
      }
      setIntakeBusy(false);
    },
    [inspectEntry, intakeBusy, isProcessing, mode],
  );

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void addFiles(files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = 0;
    setDraggingFiles(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length) void addFiles(files);
  };

  const removeEntry = (id: string) => {
    if (isProcessing) return;
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  const clearAll = () => {
    if (isProcessing) {
      runRef.current += 1;
      worker.cancel();
      setIsProcessing(false);
    }
    setEntries([]);
    setIntakeIssues([]);
    setConfirmClear(false);
    clearPasswords();
    setToast({
      message: "Queue cleared. No files were uploaded or stored.",
      type: "info",
    });
  };

  const reorder = (from: number, to: number) => {
    if (isProcessing) return;
    setEntries((current) => moveItem(current, from, to));
  };

  const verifyEntry = async (entry: PdfEntry) => {
    const password =
      mode === "lock"
        ? (entry.currentPassword ?? "")
        : unlockBatchMode === "individual"
          ? (entry.customPassword ?? "")
          : unlockPassword;
    const check = validateExistingPassword(password);
    if (!check.ok) {
      updateEntry(entry.id, { error: check.message, status: "password" });
      return;
    }
    updateEntry(entry.id, { error: undefined, status: "inspecting" });
    try {
      const data = await entry.file.arrayBuffer();
      const { inspection } = await worker.verify(entry.id, data, password);
      updateEntry(entry.id, {
        inspection,
        status: mode === "unlock" ? "verified" : "ready",
        error: undefined,
      });
      setToast({
        message: `Password verified for “${entry.name}”.`,
        type: "success",
      });
    } catch (error) {
      updateEntry(entry.id, { error: errorMessage(error), status: "password" });
    }
  };

  const retryEntry = (entry: PdfEntry) => {
    updateEntry(entry.id, {
      error: undefined,
      progress: undefined,
      result: undefined,
      status: entry.inspection?.encrypted ? "password" : "ready",
    });
  };

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setToast({
        message:
          "Password copied to the clipboard. It is not stored by QUICKKIT.",
        type: "success",
      });
    } catch {
      setToast({
        message:
          "Clipboard access was blocked. Use the show-password button to copy manually.",
        type: "error",
      });
    }
  };

  const generateInto = (target: "open" | "owner") => {
    try {
      const value = generatePassword({ ...defaultPasswordOptions, length: 20 });
      if (target === "open") {
        setOpenPassword(value);
        setConfirmPassword(value);
      } else {
        setOwnerPassword(value);
        setOwnerConfirmPassword(value);
      }
    } catch {
      setToast({
        message:
          "Secure randomness is unavailable in this browser. Try a current browser over HTTPS.",
        type: "error",
      });
    }
  };

  const downloadEntry = (entry: PdfEntry) => {
    if (!entry.result) return;
    const filename = sanitizeOutputFilename(
      entry.outputName,
      mode === "lock" ? "locked" : "unlocked",
    );
    downloadBlob(entry.result.blob, filename);
    setToast({
      message: `Download started for “${filename}”. Verify it in your PDF reader.`,
      type: "success",
    });
  };

  const downloadZip = async () => {
    const completed = entries.filter((entry) => entry.result);
    if (!completed.length) return;
    try {
      const names = makeUniqueOutputNames(
        completed.map((entry) =>
          sanitizeOutputFilename(
            entry.outputName,
            mode === "lock" ? "locked" : "unlocked",
          ),
        ),
      );
      const zipEntries = await Promise.all(
        completed.map(async (entry, index) => ({
          data: new Uint8Array(await entry.result!.blob.arrayBuffer()),
          name: names[index],
        })),
      );
      const zip = createZip(zipEntries);
      const filename = zipName.trim().toLowerCase().endsWith(".zip")
        ? zipName.trim()
        : `${zipName.trim() || "quickkit-pdfs"}.zip`;
      downloadBlob(new Blob([zip]), filename);
      setToast({
        message: `ZIP download started with ${completed.length} verified PDF${completed.length === 1 ? "" : "s"}.`,
        type: "success",
      });
    } catch {
      setToast({
        message:
          "The ZIP could not be created. Try downloading the PDFs individually.",
        type: "error",
      });
    }
  };

  const cancelProcessing = () => {
    runRef.current += 1;
    worker.cancel();
    setIsProcessing(false);
    setRunProgress(null);
    setEntries((current) =>
      current.map((entry) =>
        entry.status === "processing" || entry.status === "inspecting"
          ? { ...entry, progress: undefined, status: "cancelled" }
          : entry,
      ),
    );
    clearPasswords();
    setToast({
      message:
        "Processing cancelled. Password fields were cleared; completed downloads are unchanged.",
      type: "info",
    });
  };

  const processQueue = async () => {
    if (isProcessing || intakeBusy) return;
    const targets = entriesRef.current.filter(
      (entry) => entry.status !== "blocked" && entry.status !== "success",
    );
    if (!targets.length) return;
    if (mode === "unlock" && !authorized) {
      setToast({
        message:
          "Confirm that you own these PDFs or have permission to remove protection.",
        type: "error",
      });
      return;
    }
    if (mode === "lock" && lockBatchMode === "common" && !lockValidation.ok) {
      setToast({
        message: lockValidation.message ?? "Check the lock settings.",
        type: "error",
      });
      return;
    }
    if (totalPages > PDF_SECURITY_LIMITS.maxTotalPages) {
      setToast({
        message: `The queue has ${totalPages.toLocaleString()} pages, above the ${PDF_SECURITY_LIMITS.maxTotalPages.toLocaleString()}-page total limit. Remove files or use smaller batches.`,
        type: "error",
      });
      return;
    }
    setIsProcessing(true);
    const runId = ++runRef.current;
    let completed = 0;
    setRunProgress({
      completed: 0,
      fileName: targets[0].name,
      percent: 0,
      stage: "Starting",
      total: targets.length,
    });

    for (const entry of targets) {
      if (runRef.current !== runId) break;
      updateEntry(entry.id, {
        error: undefined,
        progress: undefined,
        status: "processing",
      });
      setRunProgress({
        completed,
        fileName: entry.name,
        percent: Math.round((completed / targets.length) * 100),
        stage: "Reading file",
        total: targets.length,
      });
      try {
        const data = await entry.file.arrayBuffer();
        let result: PdfSecurityWorkerSuccess;
        const onProgress = (progress: PdfSecurityProgress) => {
          if (runRef.current !== runId) return;
          updateEntry(entry.id, { progress });
          const filePercent = stagePercent(progress);
          setRunProgress({
            completed,
            fileName: entry.name,
            percent: Math.round(
              ((completed + filePercent / 100) / targets.length) * 100,
            ),
            stage: progress.message,
            total: targets.length,
          });
        };
        if (mode === "lock") {
          const settings: PdfLockSettings =
            lockBatchMode === "individual" && entry.useCustomPassword
              ? {
                  algorithm,
                  confirmPassword: entry.customConfirm ?? "",
                  openPassword: entry.customPassword ?? "",
                  ownerConfirmPassword: ownerEnabled
                    ? ownerConfirmPassword
                    : undefined,
                  ownerPassword: ownerEnabled
                    ? ownerPassword || undefined
                    : undefined,
                  permissions,
                }
              : globalLockSettings;
          const check = validateLockSettings(settings);
          if (!check.ok)
            throw new PdfSecurityError(
              "invalid_settings",
              check.message ?? "Check the password settings.",
            );
          if (entry.inspection?.encrypted && !entry.currentPassword) {
            throw new PdfSecurityError(
              "password_required",
              "Enter the current open password to re-lock this encrypted PDF.",
            );
          }
          result = await worker.lock(
            entry.id,
            data,
            settings,
            entry.currentPassword,
            onProgress,
          );
        } else {
          const password = entry.inspection?.encrypted
            ? unlockBatchMode === "individual"
              ? (entry.customPassword ?? "")
              : unlockPassword
            : undefined;
          if (entry.inspection?.encrypted) {
            const check = validateExistingPassword(password ?? "");
            if (!check.ok)
              throw new PdfSecurityError(
                "password_required",
                check.message ?? "Enter the existing password.",
              );
          }
          result = await worker.unlock(
            entry.id,
            data,
            password,
            authorized,
            onProgress,
          );
        }
        if (runRef.current !== runId) break;
        const blob = new Blob([result.data], { type: "application/pdf" });
        updateEntry(entry.id, {
          inspection: result.inspection,
          progress: undefined,
          result: {
            blob,
            notices: result.notices,
            outputBytes: result.data.byteLength,
            verification: result.verification,
          },
          status: "success",
        });
        completed += 1;
        setRunProgress({
          completed,
          fileName: entry.name,
          percent: Math.round((completed / targets.length) * 100),
          stage: "Verified",
          total: targets.length,
        });
      } catch (error) {
        if (runRef.current !== runId) {
          updateEntry(entry.id, { progress: undefined, status: "cancelled" });
          break;
        }
        const code =
          error instanceof PdfSecurityError ? error.code : "worker_failed";
        updateEntry(entry.id, {
          error: errorMessage(error),
          progress: undefined,
          status: code === "cancelled" ? "cancelled" : "error",
        });
      }
    }
    clearPasswords();
    setIsProcessing(false);
    setRunProgress(null);
    if (runRef.current === runId) {
      setToast({
        message:
          completed > 0
            ? `${completed} PDF${completed === 1 ? "" : "s"} ${mode === "lock" ? "locked" : "unlocked"} and verified. Password fields were cleared.`
            : "No files were processed. Check the errors and retry.",
        type: completed > 0 ? "success" : "error",
      });
    }
  };

  const switchMode = (next: PdfSecurityMode) => {
    if (isProcessing || next === mode) return;
    setMode(next);
    setZipName(buildZipFilename(next));
    setEntries((current) =>
      current.map((entry) => ({
        ...entry,
        error: undefined,
        outputName: defaultOutputName(entry.name, next),
        progress: undefined,
        result: undefined,
        status: entry.inspection
          ? entry.inspection.features.hasSignedSignature
            ? "blocked"
            : entry.inspection.encrypted
              ? "password"
              : "ready"
          : entry.status,
      })),
    );
    clearPasswords();
    setAuthorized(false);
    setToast(null);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    switchMode(mode === "lock" ? "unlock" : "lock");
  };

  const setPermission = (key: keyof PdfPermissions, value: boolean) => {
    setPermissions((current) => {
      const next = { ...current, [key]: value };
      if (key === "printing" && !value) next.highResolutionPrinting = false;
      if (key === "highResolutionPrinting" && value) next.printing = true;
      return next;
    });
    setPreset("custom");
  };

  const applyPreset = (id: string) => {
    setPreset(id);
    const found = PDF_PERMISSION_PRESETS.find((item) => item.id === id);
    if (found) setPermissions({ ...found.permissions });
  };

  if (!ready) {
    return (
      <div className={styles.workspace} aria-busy="true">
        <WorkspaceHeading
          title="PDF Lock & Unlock"
          description="Protect PDFs with AES encryption or remove protection with the correct password — entirely on your device."
        />
        <div className={styles.emptyQueue}>
          <LoaderCircle size={22} className="spin" />
          <p>Loading local PDF security workspace…</p>
        </div>
      </div>
    );
  }

  const processDisabled =
    isProcessing ||
    intakeBusy ||
    processCount === 0 ||
    (mode === "unlock" && !authorized) ||
    (mode === "lock" && lockBatchMode === "common" && !lockValidation.ok);

  return (
    <div className={styles.workspace}>
      <WorkspaceHeading
        title="PDF Lock & Unlock"
        description="Protect PDFs with AES encryption or remove protection with the correct password — entirely on your device."
      />

      <div
        className={styles.tabs}
        role="tablist"
        aria-label="PDF security mode"
      >
        <button
          aria-controls="pdf-security-lock-panel"
          aria-selected={mode === "lock"}
          className={`${styles.tab} ${mode === "lock" ? styles.tabActive : ""}`}
          id="pdf-security-lock-tab"
          onClick={() => switchMode("lock")}
          onKeyDown={onTabKeyDown}
          role="tab"
          tabIndex={mode === "lock" ? 0 : -1}
          type="button"
        >
          <LockKeyhole size={17} /> Lock PDF
        </button>
        <button
          aria-controls="pdf-security-unlock-panel"
          aria-selected={mode === "unlock"}
          className={`${styles.tab} ${mode === "unlock" ? styles.tabActive : ""}`}
          id="pdf-security-unlock-tab"
          onClick={() => switchMode("unlock")}
          onKeyDown={onTabKeyDown}
          role="tab"
          tabIndex={mode === "unlock" ? 0 : -1}
          type="button"
        >
          <LockOpen size={17} /> Unlock PDF
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.settingsColumn}>
          <section
            aria-labelledby="pdf-security-lock-tab"
            className={styles.card}
            hidden={mode !== "lock"}
            id="pdf-security-lock-panel"
            role="tabpanel"
          >
            <h2 className={styles.cardTitle}>
              <KeyRound size={17} /> Passwords & encryption
            </h2>
            <p className={styles.cardDescription}>
              The open password is required to view the PDF. An optional
              separate permissions password controls who can change reader
              restrictions.
            </p>
            <PasswordField
              error={
                openPassword &&
                confirmPassword &&
                openPassword !== confirmPassword
                  ? "Open passwords do not match."
                  : undefined
              }
              help="At least 8 characters. AES-256 supports Unicode up to 127 UTF-8 bytes."
              id="lock-open-password"
              label="Open password"
              onChange={setOpenPassword}
              onCopy={() => void copyText(openPassword)}
              onGenerate={() => generateInto("open")}
              placeholder="Required to open the PDF"
              required
              value={openPassword}
            />
            <StrengthMeter value={openPassword} />
            <PasswordField
              error={
                confirmPassword && openPassword !== confirmPassword
                  ? "Open passwords do not match."
                  : undefined
              }
              id="lock-confirm-password"
              label="Confirm open password"
              onChange={setConfirmPassword}
              placeholder="Re-enter the open password"
              required
              value={confirmPassword}
            />
            <div className={styles.field}>
              <label className={styles.label} htmlFor="lock-algorithm">
                Encryption standard
              </label>
              <select
                className={styles.select}
                id="lock-algorithm"
                onChange={(event) =>
                  setAlgorithm(event.target.value as PdfEncryptionAlgorithm)
                }
                value={algorithm}
              >
                <option value="AES-256">
                  AES-256 (PDF 2.0 / R6) — recommended
                </option>
                <option value="AES-128">
                  AES-128 (PDF 1.6 / R4) — older readers
                </option>
              </select>
              <p className={styles.helpText}>
                AES-256 is the modern default. AES-128 is offered only for
                compatibility and requires printable ASCII passwords up to 32
                characters. Broken RC4 modes are not offered.
              </p>
            </div>
            <label className={styles.permissionItem}>
              <input
                checked={ownerEnabled}
                onChange={(event) => setOwnerEnabled(event.target.checked)}
                type="checkbox"
              />
              <span className={styles.permissionText}>
                <strong>Set a separate permissions password</strong>
                <small>
                  Without it, the open password also grants owner access in
                  supporting readers.
                </small>
              </span>
            </label>
            {ownerEnabled ? (
              <>
                <PasswordField
                  help="Must be different from the open password."
                  id="lock-owner-password"
                  label="Permissions (owner) password"
                  onChange={setOwnerPassword}
                  onCopy={() => void copyText(ownerPassword)}
                  onGenerate={() => generateInto("owner")}
                  placeholder="Controls permission changes"
                  value={ownerPassword}
                />
                <PasswordField
                  error={
                    ownerConfirmPassword &&
                    ownerPassword !== ownerConfirmPassword
                      ? "Permissions passwords do not match."
                      : undefined
                  }
                  id="lock-owner-confirm-password"
                  label="Confirm permissions password"
                  onChange={setOwnerConfirmPassword}
                  placeholder="Re-enter the permissions password"
                  value={ownerConfirmPassword}
                />
              </>
            ) : null}
            {lockBatchMode === "common" &&
            !lockValidation.ok &&
            openPassword ? (
              <p className={styles.fieldError} role="alert">
                {lockValidation.message}
              </p>
            ) : null}
          </section>

          <section
            aria-labelledby="pdf-security-lock-tab"
            className={styles.card}
            hidden={mode !== "lock"}
            role="tabpanel"
          >
            <h2 className={styles.cardTitle}>
              <Settings2 size={17} /> Permission controls
            </h2>
            <p className={styles.cardDescription}>
              These restrictions are enforced by supporting PDF readers. They
              are not equivalent to strong encryption and can be ignored by
              non-compliant software.
            </p>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="permission-preset">
                Permission preset
              </label>
              <select
                className={styles.select}
                id="permission-preset"
                onChange={(event) => applyPreset(event.target.value)}
                value={preset}
              >
                {PDF_PERMISSION_PRESETS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
            <fieldset
              className={styles.permissionsGrid}
              disabled={isProcessing}
            >
              <legend className="sr-only">PDF permissions</legend>
              {PERMISSION_LABELS.map((item) => {
                const disabled =
                  isProcessing ||
                  (item.key === "highResolutionPrinting" &&
                    !permissions.printing);
                return (
                  <label
                    className={`${styles.permissionItem} ${disabled ? styles.permissionItemDisabled : ""}`}
                    key={item.key}
                  >
                    <input
                      checked={permissions[item.key]}
                      disabled={disabled}
                      onChange={(event) =>
                        setPermission(item.key, event.target.checked)
                      }
                      type="checkbox"
                    />
                    <span className={styles.permissionText}>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <div
              className={`${styles.note} ${styles.warningNote}`}
              style={{ marginTop: 14 }}
            >
              <Info size={16} />
              <span>
                Permission flags depend on reader software. The open password
                and AES encryption protect the file contents; permissions alone
                do not.
              </span>
            </div>
          </section>

          <section
            aria-labelledby="pdf-security-unlock-tab"
            className={styles.card}
            hidden={mode !== "unlock"}
            id="pdf-security-unlock-panel"
            role="tabpanel"
          >
            <h2 className={styles.cardTitle}>
              <LockOpen size={17} /> Known password required
            </h2>
            <p className={styles.cardDescription}>
              Enter the correct existing password. QUICKKIT never guesses,
              brute-forces, cracks or bypasses PDF protection.
            </p>
            {unlockBatchMode === "common" ? (
              <PasswordField
                autoComplete="current-password"
                help="Used for every encrypted PDF in the queue unless individual passwords are enabled."
                id="unlock-common-password"
                label="Existing password"
                onChange={setUnlockPassword}
                placeholder="Password that opens the PDF"
                required
                value={unlockPassword}
              />
            ) : (
              <div className={styles.note}>
                <Info size={16} />
                <span>
                  Individual passwords are enabled. Enter each PDF’s password in
                  its file card below.
                </span>
              </div>
            )}
            <label className={styles.permissionItem} style={{ marginTop: 14 }}>
              <input
                checked={authorized}
                onChange={(event) => setAuthorized(event.target.checked)}
                type="checkbox"
              />
              <span className={styles.permissionText}>
                <strong>
                  I own these PDFs or have permission to remove protection
                </strong>
                <small>
                  Unlocking removes opening-password protection and, where
                  supported, permission restrictions.
                </small>
              </span>
            </label>
            <div
              className={`${styles.note} ${styles.warningNote}`}
              style={{ marginTop: 14 }}
            >
              <ShieldCheck size={16} />
              <span>
                If the password is incorrect, the original PDF is left unchanged
                and a clear error is shown. Passwords are cleared after
                processing and never stored or logged.
              </span>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FileArchive size={17} /> Batch options
            </h2>
            <div className={styles.field}>
              <span className={styles.label} id="batch-mode-label">
                Password application
              </span>
              <div
                className={styles.actions}
                role="radiogroup"
                aria-labelledby="batch-mode-label"
              >
                <label className={styles.smallButton}>
                  <input
                    checked={
                      (mode === "lock" ? lockBatchMode : unlockBatchMode) ===
                      "common"
                    }
                    name="batch-mode"
                    onChange={() =>
                      mode === "lock"
                        ? setLockBatchMode("common")
                        : setUnlockBatchMode("common")
                    }
                    type="radio"
                  />
                  Same password for all
                </label>
                <label className={styles.smallButton}>
                  <input
                    checked={
                      (mode === "lock" ? lockBatchMode : unlockBatchMode) ===
                      "individual"
                    }
                    name="batch-mode"
                    onChange={() =>
                      mode === "lock"
                        ? setLockBatchMode("individual")
                        : setUnlockBatchMode("individual")
                    }
                    type="radio"
                  />
                  Individual passwords
                </label>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="zip-name">
                ZIP filename
              </label>
              <input
                className={styles.input}
                id="zip-name"
                onChange={(event) => setZipName(event.target.value)}
                value={zipName}
              />
            </div>
            <p className={styles.helpText}>
              Up to {PDF_SECURITY_LIMITS.maxFiles} PDFs,{" "}
              {formatMiB(PDF_SECURITY_LIMITS.maxFileBytes)} per file,{" "}
              {PDF_SECURITY_LIMITS.maxPagesPerFile.toLocaleString()} pages per
              file. Files are processed one at a time to keep memory use
              predictable. No pages are silently truncated.
            </p>
          </section>
        </div>

        <div className={styles.queueColumn}>
          <div
            className={`${styles.dropzone} ${draggingFiles ? styles.dropzoneActive : ""}`}
            onDragEnter={(event) => {
              event.preventDefault();
              dragCounterRef.current += 1;
              setDraggingFiles(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
              if (dragCounterRef.current === 0) setDraggingFiles(false);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            <span className={styles.dropzoneIcon}>
              <UploadCloud size={26} />
            </span>
            <h2 className={styles.dropzoneTitle}>Drop PDFs here</h2>
            <p className={styles.dropzoneText}>
              Your PDFs never leave this browser. Encryption, decryption and
              verification run locally in a dedicated worker with QPDF
              WebAssembly.
            </p>
            <button
              className="primary"
              disabled={isProcessing || intakeBusy}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <UploadCloud size={16} /> Choose PDFs
            </button>
            <input
              accept="application/pdf,.pdf"
              aria-label="Choose PDFs"
              className={styles.fileInput}
              multiple
              onChange={onFileInput}
              ref={fileInputRef}
              type="file"
            />
          </div>

          {intakeIssues.length ? (
            <ul className={styles.intakeIssues} role="alert">
              {intakeIssues.map((issue) => (
                <li key={issue.id}>{issue.message}</li>
              ))}
            </ul>
          ) : null}

          <div className={styles.queueHeader}>
            <div>
              <h2 className={styles.queueTitle}>File queue</h2>
              <p className={styles.queueMeta}>
                {entries.length} file{entries.length === 1 ? "" : "s"} ·{" "}
                {formatBytes(totalBytes)}
                {totalPages
                  ? ` · ${totalPages.toLocaleString()} pages`
                  : ""} · {successCount} verified
              </p>
            </div>
            {entries.length ? (
              confirmClear ? (
                <div className={styles.actions}>
                  <button
                    className="toolbar-button danger"
                    onClick={clearAll}
                    type="button"
                  >
                    <Trash2 size={14} /> Confirm clear
                  </button>
                  <button
                    className="toolbar-button"
                    onClick={() => setConfirmClear(false)}
                    type="button"
                  >
                    Keep files
                  </button>
                </div>
              ) : (
                <button
                  className="toolbar-button danger"
                  disabled={isProcessing}
                  onClick={() => setConfirmClear(true)}
                  type="button"
                >
                  <Trash2 size={14} /> Clear all
                </button>
              )
            ) : null}
          </div>

          {entries.length === 0 ? (
            <div className={styles.emptyQueue}>
              <FileText size={24} />
              <p>
                Add one or more PDFs to begin. You can reorder, rename outputs,
                and download individually or as a ZIP.
              </p>
            </div>
          ) : (
            <ol className={styles.entryList} aria-label="PDF file queue">
              {entries.map((entry, index) => (
                <li
                  className={`${styles.entry} ${draggedId === entry.id ? styles.entryDragging : ""} ${dragOverId === entry.id ? styles.entryDragOver : ""}`}
                  key={entry.id}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedId && draggedId !== entry.id)
                      setDragOverId(entry.id);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedId) {
                      const from = entries.findIndex(
                        (item) => item.id === draggedId,
                      );
                      if (from >= 0 && from !== index) reorder(from, index);
                    }
                    setDraggedId(null);
                    setDragOverId(null);
                  }}
                >
                  <div className={styles.entryMain}>
                    <div className={styles.entryOrder}>
                      <button
                        aria-label={`Drag to reorder ${entry.name}`}
                        className={styles.grip}
                        disabled={isProcessing}
                        draggable={!isProcessing}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverId(null);
                        }}
                        onDragStart={(event) => {
                          setDraggedId(entry.id);
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", entry.id);
                        }}
                        type="button"
                      >
                        <GripVertical size={16} />
                      </button>
                      <div className={styles.reorderButtons}>
                        <button
                          aria-label={`Move ${entry.name} up`}
                          disabled={isProcessing || index === 0}
                          onClick={() => reorder(index, index - 1)}
                          type="button"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          aria-label={`Move ${entry.name} down`}
                          disabled={
                            isProcessing || index === entries.length - 1
                          }
                          onClick={() => reorder(index, index + 1)}
                          type="button"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </div>
                    <span className={styles.entryIcon} aria-hidden="true">
                      {entry.result ? (
                        <CheckCircle2 size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </span>
                    <div className={styles.entryContent}>
                      <div className={styles.entryTitleRow}>
                        <h3 className={styles.entryName}>{entry.name}</h3>
                      </div>
                      <p className={styles.entryMeta}>
                        {formatBytes(entry.size)}
                        {entry.inspection
                          ? ` · ${entry.inspection.pageCount.toLocaleString()} page${entry.inspection.pageCount === 1 ? "" : "s"}`
                          : ""}
                        {entry.inspection
                          ? ` · ${encryptionLabel(entry.inspection)}`
                          : ""}
                      </p>
                      <div className={styles.badges}>
                        <span
                          className={`${styles.badge} ${
                            entry.status === "success"
                              ? styles.badgeSuccess
                              : entry.status === "error" ||
                                  entry.status === "blocked"
                                ? styles.badgeError
                                : entry.status === "password"
                                  ? styles.badgeWarning
                                  : styles.badgeInfo
                          }`}
                        >
                          {entry.status === "processing" ||
                          entry.status === "inspecting" ? (
                            <LoaderCircle size={12} className="spin" />
                          ) : null}
                          {statusLabel(entry, mode)}
                        </span>
                        {entry.result?.verification.algorithm ? (
                          <span
                            className={`${styles.badge} ${styles.badgeSuccess}`}
                          >
                            <ShieldCheck size={12} />{" "}
                            {entry.result.verification.algorithm} verified
                          </span>
                        ) : null}
                        {entry.result &&
                        !entry.result.verification.encrypted ? (
                          <span
                            className={`${styles.badge} ${styles.badgeSuccess}`}
                          >
                            <LockOpen size={12} /> Protection removed
                          </span>
                        ) : null}
                      </div>
                      {entry.progress ? (
                        <>
                          <div
                            aria-label={`Processing ${entry.name}`}
                            aria-valuemax={100}
                            aria-valuemin={0}
                            aria-valuenow={stagePercent(entry.progress)}
                            className={styles.progressBar}
                            role="progressbar"
                          >
                            <div
                              className={styles.progressFill}
                              style={{
                                width: `${stagePercent(entry.progress)}%`,
                              }}
                            />
                          </div>
                          <p className={styles.progressText}>
                            {entry.progress.message}
                          </p>
                        </>
                      ) : null}
                      {entry.error ? (
                        <div className={styles.entryAlert} role="alert">
                          <TriangleAlert size={16} />
                          <div>
                            <p>{entry.error}</p>
                            {entry.status === "error" ||
                            entry.status === "cancelled" ? (
                              <button
                                className={styles.smallButton}
                                onClick={() => retryEntry(entry)}
                                type="button"
                              >
                                <RotateCcw size={13} /> Retry
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <button
                      aria-label={`Remove ${entry.name}`}
                      className={styles.removeButton}
                      disabled={isProcessing}
                      onClick={() => removeEntry(entry.id)}
                      type="button"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className={styles.entrySettings}>
                    {mode === "lock" &&
                    entry.inspection?.encrypted &&
                    !entry.result ? (
                      <div className={styles.passwordPanel}>
                        <p className={styles.passwordPanelTitle}>
                          <KeyRound size={14} /> Current password required to
                          re-lock
                        </p>
                        <PasswordField
                          id={`current-${entry.id}`}
                          label="Current open password"
                          onChange={(value) =>
                            updateEntry(entry.id, { currentPassword: value })
                          }
                          placeholder="Existing password"
                          value={entry.currentPassword ?? ""}
                        />
                        <button
                          className={styles.smallButton}
                          disabled={isProcessing || !entry.currentPassword}
                          onClick={() => void verifyEntry(entry)}
                          type="button"
                        >
                          <ShieldCheck size={13} /> Verify password
                        </button>
                      </div>
                    ) : null}

                    {mode === "lock" &&
                    lockBatchMode === "individual" &&
                    !entry.result ? (
                      <label className={styles.permissionItem}>
                        <input
                          checked={entry.useCustomPassword}
                          onChange={(event) =>
                            updateEntry(entry.id, {
                              useCustomPassword: event.target.checked,
                            })
                          }
                          type="checkbox"
                        />
                        <span className={styles.permissionText}>
                          <strong>
                            Use a custom open password for this file
                          </strong>
                          <small>
                            Otherwise the shared open password above is used.
                          </small>
                        </span>
                      </label>
                    ) : null}
                    {mode === "lock" &&
                    lockBatchMode === "individual" &&
                    entry.useCustomPassword &&
                    !entry.result ? (
                      <>
                        <PasswordField
                          id={`custom-open-${entry.id}`}
                          label="Custom open password"
                          onChange={(value) =>
                            updateEntry(entry.id, { customPassword: value })
                          }
                          onGenerate={() => {
                            try {
                              const value = generatePassword({
                                ...defaultPasswordOptions,
                                length: 20,
                              });
                              updateEntry(entry.id, {
                                customPassword: value,
                                customConfirm: value,
                              });
                            } catch {
                              setToast({
                                message: "Secure randomness is unavailable.",
                                type: "error",
                              });
                            }
                          }}
                          value={entry.customPassword ?? ""}
                        />
                        <PasswordField
                          error={
                            entry.customConfirm &&
                            entry.customPassword !== entry.customConfirm
                              ? "Passwords do not match."
                              : undefined
                          }
                          id={`custom-confirm-${entry.id}`}
                          label="Confirm custom password"
                          onChange={(value) =>
                            updateEntry(entry.id, { customConfirm: value })
                          }
                          value={entry.customConfirm ?? ""}
                        />
                      </>
                    ) : null}

                    {mode === "unlock" &&
                    entry.inspection?.encrypted &&
                    !entry.result ? (
                      <div className={styles.passwordPanel}>
                        <p className={styles.passwordPanelTitle}>
                          <KeyRound size={14} /> Existing password
                        </p>
                        {unlockBatchMode === "individual" ? (
                          <PasswordField
                            id={`unlock-${entry.id}`}
                            label="Password for this PDF"
                            onChange={(value) =>
                              updateEntry(entry.id, { customPassword: value })
                            }
                            placeholder="Correct existing password"
                            value={entry.customPassword ?? ""}
                          />
                        ) : (
                          <p className={styles.helpText}>
                            Using the shared password from the unlock panel.
                          </p>
                        )}
                        <button
                          className={styles.smallButton}
                          disabled={
                            isProcessing ||
                            (unlockBatchMode === "individual"
                              ? !entry.customPassword
                              : !unlockPassword)
                          }
                          onClick={() => void verifyEntry(entry)}
                          type="button"
                        >
                          <ShieldCheck size={13} /> Verify password
                        </button>
                      </div>
                    ) : null}

                    <div className={styles.renameRow}>
                      <div className={styles.field} style={{ marginBottom: 0 }}>
                        <label
                          className={styles.label}
                          htmlFor={`output-${entry.id}`}
                        >
                          Output filename
                        </label>
                        <input
                          className={styles.input}
                          id={`output-${entry.id}`}
                          onChange={(event) =>
                            updateEntry(entry.id, {
                              outputName: event.target.value,
                            })
                          }
                          value={entry.outputName}
                        />
                      </div>
                      {entry.result ? (
                        <button
                          className="secondary"
                          onClick={() => downloadEntry(entry)}
                          type="button"
                        >
                          <Download size={15} /> Download PDF
                        </button>
                      ) : null}
                    </div>

                    {entry.result ? (
                      <div className={styles.resultPanel}>
                        <div className={styles.resultHeader}>
                          <p className={styles.resultTitle}>
                            <CheckCircle2 size={15} />
                            {mode === "lock"
                              ? "Locked and verified"
                              : "Unlocked and verified"}
                          </p>
                          <span className={styles.entryMeta}>
                            {formatBytes(entry.result.outputBytes)} ·{" "}
                            {entry.result.verification.pageCount.toLocaleString()}{" "}
                            pages
                          </span>
                        </div>
                        <p className={styles.resultMeta}>
                          Reopened successfully · page dimensions preserved
                          {entry.result.verification.permissionsVerified
                            ? " · permissions verified"
                            : ""}
                          {entry.result.verification.openPasswordVerified
                            ? " · password protection verified"
                            : ""}
                        </p>
                        {entry.result.notices.length ? (
                          <details>
                            <summary className={styles.helpText}>
                              Security notes
                            </summary>
                            <ul className={styles.notices}>
                              {entry.result.notices.map((notice) => (
                                <li key={notice}>{notice}</li>
                              ))}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className={styles.actionBar}>
            {runProgress ? (
              <>
                <div
                  aria-label="Overall processing progress"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={runProgress.percent}
                  className={styles.progressBar}
                  role="progressbar"
                >
                  <div
                    className={styles.progressFill}
                    style={{ width: `${runProgress.percent}%` }}
                  />
                </div>
                <p className={styles.actionSummary} aria-live="polite">
                  {runProgress.completed}/{runProgress.total} complete ·{" "}
                  {runProgress.fileName} · {runProgress.stage}
                </p>
              </>
            ) : (
              <p className={styles.actionSummary}>
                {processCount} file{processCount === 1 ? "" : "s"} ready to{" "}
                {mode}
                {failedCount ? ` · ${failedCount} need retry` : ""}
                {successCount
                  ? ` · ${successCount} verified download${successCount === 1 ? "" : "s"}`
                  : ""}
              </p>
            )}
            <div className={styles.actionButtons}>
              <button
                className="primary"
                disabled={processDisabled}
                onClick={() => void processQueue()}
                type="button"
              >
                {isProcessing ? (
                  <LoaderCircle size={16} className="spin" />
                ) : mode === "lock" ? (
                  <LockKeyhole size={16} />
                ) : (
                  <LockOpen size={16} />
                )}
                {isProcessing
                  ? "Processing…"
                  : `${mode === "lock" ? "Lock" : "Unlock"} ${processCount} PDF${processCount === 1 ? "" : "s"}`}
              </button>
              {isProcessing ? (
                <button
                  className="secondary"
                  onClick={cancelProcessing}
                  type="button"
                >
                  <Ban size={15} /> Cancel
                </button>
              ) : null}
              {failedCount && !isProcessing ? (
                <button
                  className="secondary"
                  onClick={() => {
                    entries
                      .filter(
                        (entry) =>
                          entry.status === "error" ||
                          entry.status === "cancelled",
                      )
                      .forEach(retryEntry);
                  }}
                  type="button"
                >
                  <RotateCcw size={15} /> Retry failed
                </button>
              ) : null}
              {successCount && !isProcessing ? (
                <button
                  className="secondary"
                  onClick={() => void downloadZip()}
                  type="button"
                >
                  <FileArchive size={15} /> Download all as ZIP
                </button>
              ) : null}
            </div>
          </div>

          {toast ? (
            <div
              className={`${styles.toast} ${
                toast.type === "success"
                  ? styles.toastSuccess
                  : toast.type === "error"
                    ? styles.toastError
                    : styles.toastInfo
              }`}
              role="status"
            >
              {toast.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : toast.type === "error" ? (
                <TriangleAlert size={16} />
              ) : (
                <Info size={16} />
              )}
              {toast.message}
            </div>
          ) : null}
        </div>
      </div>

      <section
        className={styles.educational}
        aria-labelledby="pdf-security-learn-title"
      >
        <div className={styles.queueHeader}>
          <div>
            <h2 className={styles.queueTitle} id="pdf-security-learn-title">
              Security & privacy notes
            </h2>
            <p className={styles.queueMeta}>
              What this tool can and cannot do.
            </p>
          </div>
        </div>
        <div className={styles.educationalGrid}>
          <article className={styles.educationalCard}>
            <h3>
              <ShieldCheck size={16} /> Local by design
            </h3>
            <p>
              PDFs are processed in a dedicated browser worker with QPDF
              WebAssembly. No external PDF upload service is used. Passwords
              live only in current page/worker memory and are cleared after
              processing.
            </p>
          </article>
          <article className={styles.educationalCard}>
            <h3>
              <LockKeyhole size={16} /> Encryption vs permissions
            </h3>
            <p>
              AES encryption protects the document bytes. Permission flags ask
              compliant readers to restrict printing, copying or editing, but
              they are not a security boundary and may be ignored by some
              software.
            </p>
          </article>
          <article className={styles.educationalCard}>
            <h3>
              <KeyRound size={16} /> No password recovery
            </h3>
            <p>
              If you lose the open password, QUICKKIT cannot recover it.
              Unlocking requires the correct existing password and your
              authorization. There is no cracking, guessing or bypass.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
