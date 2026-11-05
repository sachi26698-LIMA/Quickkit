import { spawn, execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  privateWorkerAvailable,
  renderWithPrivateWorker,
  workerConfig,
  workerConfigured,
} from "./private-worker";
import { processPdf } from "./process-pdf";
import { prepareDocx } from "./docx";
import { convertDocxWithBuiltinEngine } from "./render";
import { FONT_DIRECTORY } from "./render/fonts";
import { type Settings } from "./settings";

const execFileAsync = promisify(execFile);

export const MAX_PAGES = Math.max(
  1,
  Number(process.env.WORD_TO_PDF_MAX_PAGES) || 1000,
);

export type EngineKind = "worker" | "libreoffice" | "builtin";

export type EngineStatus = {
  available: boolean;
  engine: EngineKind | null;
  label: string;
  native: boolean;
  maxPages: number;
  fidelity: "office-grade" | "quickkit-renderer" | "unavailable";
  notes: string[];
};

export type StageEvent = {
  stage: string;
  done?: number;
  total?: number;
};

export const enginePath = () =>
  process.env.WORD_TO_PDF_SOFFICE || "/usr/bin/libreoffice";

const nativeEnv = (home: string, temp: string) => ({
  NODE_ENV: "production" as const,
  PATH: "/usr/bin:/bin",
  HOME: home,
  TMPDIR: temp,
  LANG: "C.UTF-8",
  LC_ALL: "C.UTF-8",
  SAL_USE_VCLPLUGIN: "svp",
});

async function libreOfficeAvailable() {
  if (process.env.WORD_TO_PDF_ENABLED !== "true") return false;
  let directory: string | undefined;
  try {
    await access(enginePath(), constants.X_OK);
    directory = await mkdtemp(join(tmpdir(), "quickkit-word-health-"));
    const { stdout } = await execFileAsync(
      enginePath(),
      [
        `-env:UserInstallation=${pathToFileURL(join(directory, "profile")).href}`,
        "--headless",
        "--version",
      ],
      {
        cwd: directory,
        env: nativeEnv(directory, directory),
        timeout: 5000,
        maxBuffer: 4096,
      },
    );
    return /^LibreOffice\s+[0-9]/.test(stdout.trim());
  } catch {
    return false;
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
  }
}

let builtinCheck: Promise<boolean> | null = null;

/** The bundled renderer needs its OFL fonts; verify them once per process. */
async function builtinAvailable() {
  if (process.env.WORD_TO_PDF_BUILTIN === "false") return false;
  builtinCheck ??= readFile(join(FONT_DIRECTORY, "NotoSans-Regular.ttf"))
    .then((data) => data.length > 1000)
    .catch(() => false);
  return builtinCheck;
}

const requested = () =>
  (process.env.WORD_TO_PDF_ENGINE || "auto").toLowerCase();

export async function engineStatus(): Promise<EngineStatus> {
  const mode = requested();
  if (mode === "builtin" || mode === "renderer" || mode === "quickkit") {
    const ok = await builtinAvailable();
    return {
      available: ok,
      engine: ok ? "builtin" : null,
      label: ok
        ? "QUICKKIT DOCX renderer (built-in)"
        : "Built-in renderer unavailable",
      native: false,
      maxPages: MAX_PAGES,
      fidelity: ok ? "quickkit-renderer" : "unavailable",
      notes: ok
        ? [
            "Pure-JS conversion on this server with embedded Noto fonts.",
            "Fidelity differs from Word for advanced layout, fields and floating objects.",
          ]
        : [`Bundled fonts are missing from ${FONT_DIRECTORY}.`],
    };
  }
  if (mode === "worker" || (mode === "auto" && workerConfigured())) {
    let configError = "";
    try {
      workerConfig();
    } catch (error) {
      configError =
        error instanceof Error
          ? error.message
          : "Invalid worker configuration.";
    }
    const ok = configError ? false : await privateWorkerAvailable();
    return {
      available: ok,
      engine: ok ? "worker" : null,
      label: ok
        ? "LibreOffice private worker"
        : "Private conversion worker unavailable",
      native: ok,
      maxPages: MAX_PAGES,
      fidelity: ok ? "office-grade" : "unavailable",
      notes: ok
        ? ["Native Office layout rendered by an isolated LibreOffice worker."]
        : [
            configError ||
              "The configured private worker did not pass its health check. No fallback was used.",
          ],
    };
  }
  if (mode === "worker") {
    return {
      available: false,
      engine: null,
      label: "Private conversion worker unavailable",
      native: false,
      maxPages: MAX_PAGES,
      fidelity: "unavailable",
      notes: [
        "WORD_TO_PDF_ENGINE=worker requires WORD_TO_PDF_WORKER_URL and WORD_TO_PDF_WORKER_TOKEN.",
      ],
    };
  }
  if (mode === "native" || mode === "libreoffice" || mode === "auto") {
    if (await libreOfficeAvailable())
      return {
        available: true,
        engine: "libreoffice",
        label: "Self-hosted LibreOffice",
        native: true,
        maxPages: MAX_PAGES,
        fidelity: "office-grade",
        notes: ["Native Office layout rendered by LibreOffice."],
      };
    if (mode === "auto" && (await builtinAvailable()))
      return {
        available: true,
        engine: "builtin",
        label: "QUICKKIT DOCX renderer (built-in)",
        native: false,
        maxPages: MAX_PAGES,
        fidelity: "quickkit-renderer",
        notes: [
          "No LibreOffice binary is enabled on this host, so QUICKKIT's bundled renderer converts the document.",
          "Pure-JS conversion with embedded Noto fonts.",
          "Fidelity differs from Word for advanced layout, fields and floating objects.",
        ],
      };
    return {
      available: false,
      engine: null,
      label:
        mode === "native"
          ? "LibreOffice conversion is not enabled on this installation"
          : "No conversion engine is available",
      native: false,
      maxPages: MAX_PAGES,
      fidelity: "unavailable",
      notes: [
        mode === "native"
          ? "WORD_TO_PDF_ENGINE=native requires WORD_TO_PDF_ENABLED=true and a working LibreOffice binary."
          : "Install LibreOffice (`WORD_TO_PDF_ENABLED=true`) or a private worker, or stop disabling the built-in renderer.",
      ],
    };
  }
  return {
    available: false,
    engine: null,
    label: "No conversion engine is available",
    native: false,
    maxPages: MAX_PAGES,
    fidelity: "unavailable",
    notes: [`Unknown WORD_TO_PDF_ENGINE value: ${mode}.`],
  };
}

/** Backwards-compatible boolean used by existing callers and tests. */
export async function engineAvailable() {
  return (await engineStatus()).available;
}

// One process-local slot. Refuse, rather than buffering an unbounded request queue.
let busy = false;
export function acquire() {
  if (busy) return false;
  busy = true;
  return true;
}
export function release() {
  busy = false;
}

async function convertWithLibreOffice(
  prepared: Uint8Array,
  s: Settings,
  signal: AbortSignal,
  stage: (event: StageEvent) => void,
) {
  const dir = await mkdtemp(join(tmpdir(), "quickkit-word-"));
  try {
    await mkdir(join(dir, "home"), { mode: 0o700 });
    await writeFile(join(dir, "input.docx"), prepared, { mode: 0o600 });
    signal.throwIfAborted();
    stage({ stage: "Rendering with LibreOffice — page progress unavailable" });
    const filter = JSON.stringify({
      UseLosslessCompression: {
        type: "boolean",
        value:
          s.compression === "lossless" ||
          (s.compression === "auto" && s.quality !== "standard")
            ? "true"
            : "false",
      },
      Quality: { type: "long", value: String(s.jpegQuality) },
      ReduceImageResolution: {
        type: "boolean",
        value: s.preserveResolution ? "false" : "true",
      },
      MaxImageResolution: { type: "long", value: String(s.imageDpi) },
      UseTaggedPDF: { type: "boolean", value: s.tagged ? "true" : "false" },
      EmbedStandardFonts: { type: "boolean", value: "true" },
      ExportBookmarks: { type: "boolean", value: "true" },
      ExportFormFields: { type: "boolean", value: "false" },
    });
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        /* turbopackIgnore: true */ enginePath(),
        [
          `-env:UserInstallation=${pathToFileURL(join(dir, "profile")).href}`,
          "--headless",
          "--nologo",
          "--nodefault",
          "--norestore",
          "--convert-to",
          `pdf:writer_pdf_Export:${filter}`,
          "--outdir",
          dir,
          join(dir, "input.docx"),
        ],
        {
          detached: true,
          stdio: "ignore",
          cwd: dir,
          env: nativeEnv(join(dir, "home"), dir),
        },
      );
      let killed = false;
      const kill = () => {
        killed = true;
        if (child.pid) {
          try {
            process.kill(-child.pid, "SIGKILL");
          } catch {
            /* already exited */
          }
        }
      };
      const timer = setTimeout(kill, 120_000);
      signal.addEventListener("abort", kill, { once: true });
      if (signal.aborted) kill();
      child.once("error", () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", kill);
        reject(new Error("Native conversion engine could not start."));
      });
      child.once("close", (code) => {
        clearTimeout(timer);
        signal.removeEventListener("abort", kill);
        if (signal.aborted) reject(new Error("Conversion cancelled."));
        else if (killed)
          reject(new Error("Conversion exceeded the 120-second time limit."));
        else if (code !== 0)
          reject(new Error("LibreOffice could not convert this document."));
        else resolve();
      });
    });
    const path = join(dir, "input.pdf");
    const info = await stat(path).catch(() => {
      throw new Error(
        "No PDF was produced. The DOCX may be damaged or unsupported.",
      );
    });
    if (info.size > 50 * 1024 * 1024)
      throw new Error("Converted PDF exceeds the 50 MiB output limit.");
    signal.throwIfAborted();
    return new Uint8Array(await readFile(path));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Chooses the engine to use for an actual conversion. Unlike `engineStatus()`
 * this does not require the worker's health probe to succeed first: a transient
 * probe failure must surface the real conversion error, not silently fall back.
 */
export async function resolveEngine(): Promise<{
  engine: EngineKind | null;
  error: string;
}> {
  const mode = requested();
  if (mode === "builtin" || mode === "renderer" || mode === "quickkit")
    return (await builtinAvailable())
      ? { engine: "builtin", error: "" }
      : {
          engine: null,
          error: "The built-in renderer is unavailable on this server.",
        };
  if (mode === "worker") return { engine: "worker", error: "" };
  if (mode === "auto" && workerConfigured())
    return { engine: "worker", error: "" };
  if (mode === "auto" || mode === "native" || mode === "libreoffice") {
    if (await libreOfficeAvailable())
      return { engine: "libreoffice", error: "" };
    if (mode === "auto" && (await builtinAvailable()))
      return { engine: "builtin", error: "" };
    return {
      engine: null,
      error:
        mode === "auto"
          ? "No conversion engine is available on this server."
          : "LibreOffice is required but not enabled or not installed. Set WORD_TO_PDF_ENABLED=true and install LibreOffice.",
    };
  }
  return { engine: null, error: "No conversion engine is configured." };
}

export async function convert(
  bytes: Uint8Array,
  s: Settings,
  signal: AbortSignal,
  stage: (event: StageEvent) => void,
) {
  signal.throwIfAborted();
  stage({ stage: "Validating DOCX package" });
  // Structural validation, safety limits and page-geometry rewrites happen once,
  // before any renderer sees the bytes.
  const prepared = prepareDocx(bytes, s);
  const { engine, error } = await resolveEngine();
  if (!engine) throw new Error(`${error} No document was converted.`);

  let source: Uint8Array;
  let warnings: string[] = [];
  if (engine === "worker") {
    stage({ stage: "Rendering with isolated LibreOffice worker" });
    source = await renderWithPrivateWorker(prepared, s, signal);
  } else if (engine === "libreoffice") {
    source = await convertWithLibreOffice(prepared, s, signal, stage);
  } else {
    const result = await convertDocxWithBuiltinEngine(prepared, {
      signal,
      maxPages: MAX_PAGES,
      onStage: (progress) =>
        stage({
          stage: progress.stage,
          done: progress.done,
          total: progress.total,
        }),
      metadata: {
        title: s.title || undefined,
        author: s.author || undefined,
        subject: s.subject || undefined,
        keywords: s.keywords || undefined,
      },
    });
    source = result.bytes;
    warnings = result.warnings;
  }
  signal.throwIfAborted();
  stage({ stage: "Applying export settings" });
  const result = await processPdf(source, s, signal, (completed, total) =>
    stage({
      stage: "Applying page settings",
      done: completed,
      total,
    }),
  );
  return {
    ...result,
    source,
    sourcePages: result.sourcePages,
    engine,
    native: engine !== "builtin",
    warnings,
  };
}
