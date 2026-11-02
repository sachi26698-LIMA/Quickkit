import type { PdfMergeProgress } from "./merge-engine";
import type { PdfInspection, PdfMergeIssueCode } from "./merge-pdf-logic";

export interface PdfWorkerSource {
  data: ArrayBuffer;
  id: string;
  name: string;
  pageIndices: number[];
  password?: string;
}

export type PdfWorkerRequest =
  | {
      data: ArrayBuffer;
      entryId: string;
      password?: string;
      requestId: string;
      type: "inspect";
    }
  | {
      createBookmarks: boolean;
      requestId: string;
      sources: PdfWorkerSource[];
      title: string;
      type: "merge";
    };

export interface PdfWorkerMergeSuccess {
  bookmarkTitles: string[];
  data: ArrayBuffer;
  notices: string[];
  pageCount: number;
  removedActions: number;
  removedDestinations: number;
  removedLinkAnnotations: number;
}

export type PdfWorkerResponse =
  | {
      inspection: PdfInspection;
      requestId: string;
      type: "inspect-success";
    }
  | {
      requestId: string;
      result: PdfWorkerMergeSuccess;
      type: "merge-success";
    }
  | {
      progress: PdfMergeProgress;
      requestId: string;
      type: "progress";
    }
  | {
      code: PdfMergeIssueCode;
      entryId?: string;
      message: string;
      requestId: string;
      type: "error";
    };
