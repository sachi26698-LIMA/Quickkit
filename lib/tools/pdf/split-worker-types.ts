import type { PdfMergeProgress } from "./merge-engine";
import type { PdfInspection, PdfMergeIssueCode } from "./merge-pdf-logic";

export interface PdfSplitWorkerSegment {
  filename: string;
  pageIndices: number[];
  pagesLabel: string;
  title: string;
}

export type PdfSplitWorkerRequest =
  | {
      data: ArrayBuffer;
      password?: string;
      requestId: string;
      type: "inspect";
    }
  | {
      data: ArrayBuffer;
      password?: string;
      requestId: string;
      segments: PdfSplitWorkerSegment[];
      sourceName: string;
      type: "split";
      zipFilename: string;
    };

export interface PdfSplitWorkerOutput {
  data: ArrayBuffer;
  filename: string;
  pageCount: number;
  pagesLabel: string;
  title: string;
}

export interface PdfSplitWorkerSuccess {
  notices: string[];
  outputs: PdfSplitWorkerOutput[];
  removedActions: number;
  removedDestinations: number;
  removedLinkAnnotations: number;
  totalBytes: number;
  zipData?: ArrayBuffer;
  zipFilename?: string;
}

export type PdfSplitWorkerResponse =
  | {
      inspection: PdfInspection;
      requestId: string;
      type: "inspect-success";
    }
  | {
      requestId: string;
      result: PdfSplitWorkerSuccess;
      type: "split-success";
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
