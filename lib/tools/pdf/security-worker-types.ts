import type {
  PdfLockSettings,
  PdfSecurityInspection,
  PdfSecurityIssueCode,
  PdfSecurityProgress,
  PdfSecurityVerification,
} from "./security-logic";

export type PdfSecurityWorkerRequest =
  | {
      data: ArrayBuffer;
      entryId: string;
      password?: string;
      requestId: string;
      type: "inspect";
    }
  | {
      data: ArrayBuffer;
      entryId: string;
      password: string;
      requestId: string;
      type: "verify";
    }
  | {
      currentPassword?: string;
      data: ArrayBuffer;
      entryId: string;
      requestId: string;
      settings: PdfLockSettings;
      type: "lock";
    }
  | {
      authorized: boolean;
      data: ArrayBuffer;
      entryId: string;
      password?: string;
      requestId: string;
      type: "unlock";
    };

export interface PdfSecurityWorkerSuccess {
  data: ArrayBuffer;
  inspection: PdfSecurityInspection;
  notices: string[];
  verification: PdfSecurityVerification;
}

export type PdfSecurityWorkerResponse =
  | {
      entryId: string;
      inspection: PdfSecurityInspection;
      requestId: string;
      type: "inspect-success";
    }
  | {
      entryId: string;
      inspection: PdfSecurityInspection;
      requestId: string;
      type: "verify-success";
      valid: boolean;
    }
  | {
      entryId: string;
      requestId: string;
      result: PdfSecurityWorkerSuccess;
      type: "lock-success" | "unlock-success";
    }
  | {
      entryId: string;
      progress: PdfSecurityProgress;
      requestId: string;
      type: "progress";
    }
  | {
      code: PdfSecurityIssueCode;
      entryId?: string;
      message: string;
      requestId: string;
      type: "error";
    };
