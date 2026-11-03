import type {
  PdfCompressionInspectionResult,
  PdfCompressionResult,
} from "./compress-engine";
import type {
  PdfCompressionProgress,
  PdfCompressionSettings,
} from "./compress-pdf-logic";
import type { PdfMergeIssueCode } from "./merge-pdf-logic";

export type PdfCompressWorkerRequest =
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
      settings: PdfCompressionSettings;
      sourceName: string;
      type: "compress";
    };

export interface PdfCompressWorkerSuccess extends Omit<
  PdfCompressionResult,
  "bytes"
> {
  data: ArrayBuffer;
}

export type PdfCompressWorkerResponse =
  | {
      requestId: string;
      result: PdfCompressionInspectionResult;
      type: "inspect-success";
    }
  | {
      requestId: string;
      result: PdfCompressWorkerSuccess;
      type: "compress-success";
    }
  | {
      progress: PdfCompressionProgress;
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
