import { spawn } from "node:child_process";
import { constants } from "node:fs";
import {
  access,
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
import {
  workerConfigured,
  privateWorkerAvailable,
  renderWithPrivateWorker,
} from "./private-worker";
import { processPdf } from "./process-pdf";
import { prepareDocx } from "./docx";
import { type Settings } from "./settings";

export const enginePath = () =>
  process.env.WORD_TO_PDF_SOFFICE || "/usr/bin/libreoffice";
export async function engineAvailable() {
  if (process.env.WORD_TO_PDF_ENABLED !== "true") return false;
  if (workerConfigured()) return privateWorkerAvailable();
  try {
    await access(enginePath(), constants.X_OK);
    return true;
  } catch {
    return false;
  }
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

export async function convert(
  bytes: Uint8Array,
  s: Settings,
  signal: AbortSignal,
  stage: (stage: string) => void,
) {
  signal.throwIfAborted();
  stage("Validating DOCX");
  const prepared = prepareDocx(bytes, s);
  if (workerConfigured()) {
    stage(
      "Rendering with isolated private LibreOffice worker — page progress unavailable",
    );
    const source = await renderWithPrivateWorker(prepared, s, signal);
    stage("Checking pages and applying export settings");
    const result = await processPdf(source, s, signal);
    return { ...result, source };
  }
  const dir = await mkdtemp(join(tmpdir(), "quickkit-word-"));
  try {
    await mkdir(join(dir, "home"), { mode: 0o700 });
    await writeFile(join(dir, "input.docx"), prepared, { mode: 0o600 });
    signal.throwIfAborted();
    stage("Rendering with LibreOffice — page progress unavailable");
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
          env: {
            NODE_ENV: "production",
            PATH: "/usr/bin:/bin",
            HOME: join(dir, "home"),
            TMPDIR: dir,
            LANG: "C.UTF-8",
            LC_ALL: "C.UTF-8",
            SAL_USE_VCLPLUGIN: "svp",
          },
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
    stage("Checking pages and applying export settings");
    const source = new Uint8Array(await readFile(path));
    const result = await processPdf(source, s, signal);
    return { ...result, source };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
