"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import {
  FileText,
  ImageIcon,
  Layers,
  Maximize2,
  Table2,
  Tag,
} from "lucide-react";
import type { OcrDocumentSection } from "@/lib/tools/image-to-text/types";
import { formatSeconds } from "./shared";

/**
 * Page preview shown beside the editor: the source image and the region OCR
 * actually read, plus the structured findings (tables, key/value fields) so
 * the user can check the reading against the page.
 */
export default function PreviewPane({
  section,
  sourceUrl,
  busy,
}: {
  section: OcrDocumentSection | null;
  sourceUrl: string | null;
  busy: boolean;
}) {
  const [zoom, setZoom] = useState(1);

  if (!section) {
    return (
      <div className="i2t-preview is-empty">
        <ImageIcon size={26} aria-hidden="true" />
        <p>
          The page you are reading appears here, side by side with its text.
        </p>
        {busy && (
          <span className="i2t-preview-busy">Reading on this device…</span>
        )}
      </div>
    );
  }

  const { page, extraction } = section;

  return (
    <div className="i2t-preview">
      <div className="i2t-preview-stage">
        {sourceUrl ? (
          <img
            src={sourceUrl}
            alt={`Source page: ${section.title}`}
            style={{
              transform: zoom === 1 ? undefined : `scale(${zoom})`,
            }}
          />
        ) : (
          <div className="i2t-preview-missing">
            <FileText size={22} aria-hidden="true" />
            <span>Source not available</span>
          </div>
        )}
        <button
          type="button"
          className="i2t-preview-zoom"
          onClick={() => setZoom((value) => (value >= 2 ? 1 : value + 0.5))}
          aria-label={zoom >= 2 ? "Reset zoom" : "Zoom in"}
          title="Zoom"
        >
          <Maximize2 size={14} aria-hidden="true" />
          {Math.round(zoom * 100)}%
        </button>
      </div>

      <dl className="i2t-preview-facts">
        <div>
          <dt>Read size</dt>
          <dd>
            {page.width} × {page.height} px
          </dd>
        </div>
        <div>
          <dt>Time</dt>
          <dd>{formatSeconds(page.durationMs)}</dd>
        </div>
        <div>
          <dt>Lines</dt>
          <dd>{page.lines.length}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{extraction.resolvedMode}</dd>
        </div>
      </dl>

      {extraction.fields.length > 0 && (
        <details className="i2t-preview-block" open>
          <summary>
            <Tag size={14} aria-hidden="true" /> {extraction.fields.length}{" "}
            field
            {extraction.fields.length === 1 ? "" : "s"} found
          </summary>
          <ul className="i2t-field-list">
            {extraction.fields.slice(0, 12).map((field, index) => (
              <li key={`${field.label}-${index}`}>
                <span>{field.label}</span>
                <strong>{field.value}</strong>
              </li>
            ))}
          </ul>
        </details>
      )}

      {extraction.tables.length > 0 && (
        <details className="i2t-preview-block" open>
          <summary>
            <Table2 size={14} aria-hidden="true" /> {extraction.tables.length}{" "}
            table
            {extraction.tables.length === 1 ? "" : "s"} found
          </summary>
          <div className="i2t-table-preview">
            {extraction.tables.slice(0, 2).map((table) => (
              <table key={table.index}>
                {table.headers.length > 0 && (
                  <thead>
                    <tr>
                      {table.headers.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {table.rows.slice(0, 6).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}
          </div>
        </details>
      )}

      <p className="i2t-preview-foot">
        <Layers size={13} aria-hidden="true" />
        {page.languages.join(" + ")} · confidence {Math.round(page.confidence)}%
        {page.rtl ? " · right to left" : ""}
      </p>
    </div>
  );
}
