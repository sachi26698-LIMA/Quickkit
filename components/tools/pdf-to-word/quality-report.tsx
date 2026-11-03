"use client";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type {
  ConversionMode,
  ConversionReport,
} from "@/lib/tools/pdf-to-word/types";

/**
 * Per-file quality report. Deliberately contains NO accuracy percentage —
 * conversion fidelity cannot be measured honestly, so the report states
 * exactly what was extracted, what was skipped and what was approximated.
 */

function textStatus(report: ConversionReport): string {
  const partial = report.scannedPagesSkipped > 0;
  if (report.textPages > 0 && report.ocrPages > 0)
    return `Text layer + OCR${partial ? " (partial)" : ""}`;
  if (report.ocrPages > 0) return `Read with OCR${partial ? " (partial)" : ""}`;
  if (report.textPages > 0)
    return `Extracted from the PDF text layer${partial ? " (partial)" : ""}`;
  return "No readable text (images only)";
}

export default function QualityReport({
  report,
  mode,
}: {
  report: ConversionReport;
  mode: ConversionMode | null;
}) {
  const mayBeMissing =
    report.scannedPagesSkipped > 0 || report.imagesSkipped > 0;
  const stats: { label: string; value: string }[] = [
    { label: "Source pages", value: String(report.sourcePages) },
    {
      label: "Pages converted",
      value: report.pageSelection
        ? `${report.convertedPages} (pages ${report.pageSelection})`
        : String(report.convertedPages),
    },
    { label: "Text extraction", value: textStatus(report) },
    {
      label: "Images retained",
      value:
        report.imagesSkipped > 0
          ? `${report.imagesExtracted} (${report.imagesSkipped} could not be extracted)`
          : String(report.imagesExtracted),
    },
    { label: "Tables detected", value: String(report.tablesDetected) },
    { label: "Hyperlinks preserved", value: String(report.linksExtracted) },
    {
      label: "OCR",
      value:
        report.ocrPages > 0
          ? `Used on ${report.ocrPages} page(s)`
          : report.scannedPagesSkipped > 0
            ? "Off — scanned pages were skipped"
            : "Not needed",
    },
    {
      label: "Conversion mode",
      value: mode === "layout" ? "Original Layout" : "Clean Editable",
    },
  ];

  return (
    <div className="p2w-quality">
      <dl className="p2w-quality-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="p2w-quality-cell">
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
      {mayBeMissing ? (
        <p className="p2w-quality-verdict warn">
          <AlertTriangle size={14} aria-hidden="true" />
          Some content may be missing from the Word file — see the notes below.
        </p>
      ) : (
        <p className="p2w-quality-verdict ok">
          <CheckCircle2 size={14} aria-hidden="true" />
          No known content loss. Positioning and fonts are still approximated —
          the Word file will not match the PDF pixel-for-pixel.
        </p>
      )}
      {report.warnings.length > 0 && (
        <>
          <p className="p2w-quality-notes-title">
            Formatting &amp; conversion notes
          </p>
          <ul className="p2w-quality-notes">
            {report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
