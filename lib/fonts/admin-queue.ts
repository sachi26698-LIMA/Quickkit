import "server-only";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  IMPORT_QUEUE_FILE,
  FONT_DATA_DIR,
  readJsonFile,
  writeJsonFile,
} from "./store";
import type { FontInspectionReport } from "./types";

export type StagedImport = {
  id: string;
  fileName: string;
  family: string;
  sha256: string;
  bytes: number;
  addedAt: string;
  status: "pending" | "approved" | "rejected";
  report: FontInspectionReport;
  storedFile: string | null;
};

export type ImportQueueFile = {
  updatedAt: string | null;
  items: StagedImport[];
};

const EMPTY: ImportQueueFile = { updatedAt: null, items: [] };
const IMPORTS_DIR = path.join(FONT_DATA_DIR, "imports");

export async function readImportQueue(): Promise<ImportQueueFile> {
  return readJsonFile<ImportQueueFile>(IMPORT_QUEUE_FILE, EMPTY);
}

export async function stageImport(
  file: Buffer,
  fileName: string,
  report: FontInspectionReport,
): Promise<StagedImport> {
  const id = `${report.sha256.slice(0, 16)}`;
  const extension = /\.(woff2|woff|ttf|otf)$/i.exec(fileName)?.[0] ?? ".woff2";
  let storedFile: string | null = null;
  try {
    await mkdir(IMPORTS_DIR, { recursive: true });
    await writeFile(path.join(IMPORTS_DIR, `${id}${extension}`), file);
    storedFile = path.join(IMPORTS_DIR, `${id}${extension}`);
  } catch {
    // Read-only deployment: the verification report is still returned, but the
    // binary cannot be staged. The admin UI explains this.
  }

  const item: StagedImport = {
    id,
    fileName,
    family: report.family,
    sha256: report.sha256,
    bytes: report.bytes,
    addedAt: new Date().toISOString(),
    status: "pending",
    report,
    storedFile,
  };

  const queue = await readImportQueue();
  const items = [
    item,
    ...queue.items.filter((entry) => entry.id !== item.id),
  ].slice(0, 100);
  await writeJsonFile(IMPORT_QUEUE_FILE, {
    updatedAt: new Date().toISOString(),
    items,
  });
  return item;
}

export async function setStagedStatus(
  id: string,
  status: StagedImport["status"],
): Promise<StagedImport | null> {
  const queue = await readImportQueue();
  const item = queue.items.find((entry) => entry.id === id);
  if (!item) return null;
  const updated = queue.items.map((entry) =>
    entry.id === id ? { ...entry, status } : entry,
  );
  await writeJsonFile(IMPORT_QUEUE_FILE, {
    updatedAt: new Date().toISOString(),
    items: updated,
  });
  return { ...item, status };
}

export async function removeStagedImport(id: string): Promise<boolean> {
  const queue = await readImportQueue();
  const item = queue.items.find((entry) => entry.id === id);
  if (!item) return false;
  await writeJsonFile(IMPORT_QUEUE_FILE, {
    updatedAt: new Date().toISOString(),
    items: queue.items.filter((entry) => entry.id !== id),
  });
  if (item.storedFile) {
    await rm(item.storedFile, { force: true }).catch(() => undefined);
  }
  return true;
}
