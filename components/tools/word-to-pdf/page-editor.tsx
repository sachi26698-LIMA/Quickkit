"use client";
import { useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  RotateCw,
  Trash2,
  Plus,
  Download,
  GripVertical,
} from "lucide-react";
import {
  deletePages,
  duplicatePages,
  insertBlank,
  movePages,
  moveSection,
  rotatePages,
  type VisualPlan,
} from "@/lib/tools/word-to-pdf/page-plan";
import { selectedPages } from "@/lib/tools/word-to-pdf/settings";
import { usePdf, Thumb, WindowedPages } from "./preview-resources";
import styles from "./word-to-pdf.module.css";
export default function PageEditor({
  plan,
  bytes,
  synchronized,
  selection,
  onSelect,
  onChange,
  onGoTo,
  onExtract,
  onCancelExtract,
  onReset,
  disabled,
}: {
  plan: VisualPlan;
  bytes?: Uint8Array;
  synchronized: boolean;
  selection: string[];
  onSelect: (ids: string[]) => void;
  onChange: (plan: VisualPlan) => void;
  onGoTo: (page: number) => void;
  onExtract: () => Promise<void>;
  onCancelExtract: () => void;
  onReset: () => void;
  disabled: boolean;
}) {
  const { handle, error: previewError } = usePdf(
    synchronized ? bytes : undefined,
  );
  const [range, setRange] = useState(""),
    [section, setSection] = useState(""),
    [error, setError] = useState(""),
    [extracting, setExtracting] = useState(false),
    [dragged, setDragged] = useState("");
  const ids = selection.filter((id) => plan.pages.some((p) => p.id === id)),
    has = !!ids.length;
  const apply = (fn: (p: VisualPlan) => VisualPlan) => {
    try {
      const next = fn(plan);
      onChange(next);
      const inserted = next.pages
        .filter((p) => !plan.pages.some((old) => old.id === p.id))
        .map((p) => p.id);
      onSelect(
        inserted.length
          ? inserted
          : ids.filter((id) => next.pages.some((p) => p.id === id)),
      );
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Page edit failed.");
    }
  };
  function move(id: string, direction: number) {
    const from = plan.pages.findIndex((p) => p.id === id),
      to = from + direction;
    if (to < 0 || to >= plan.pages.length) return;
    apply((p) =>
      movePages(
        p,
        [id],
        direction < 0 ? p.pages[to].id : p.pages[to + 1]?.id || null,
      ),
    );
  }
  return (
    <section className={styles.pageEditor} aria-label="Visual page editor">
      <div className={styles.panelHeading}>
        <span className={styles.eyebrow}>VISUAL PAGE EDITOR</span>
        <h2>
          Shape your document <span>{plan.pages.length}/100</span>
        </h2>
        <p className={styles.note}>
          Edits change the actual PDF. Drag a page or use the touch-friendly
          move buttons.
        </p>
      </div>
      <fieldset disabled={disabled || extracting} className={styles.fieldset}>
        <div className={styles.pageActions}>
          <button onClick={() => onSelect(plan.pages.map((p) => p.id))}>
            Select all pages
          </button>
          <button onClick={() => onSelect([])}>Deselect all pages</button>
          <label>
            Page range selection
            <input
              aria-label="Page range selection"
              value={range}
              placeholder="1-3, 5"
              maxLength={400}
              onChange={(e) => setRange(e.target.value)}
            />
          </label>
          <button
            onClick={() => {
              try {
                onSelect(
                  selectedPages(range, plan.pages.length).map(
                    (i) => plan.pages[i].id,
                  ),
                );
                setError("");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Invalid selection.");
              }
            }}
          >
            Select range
          </button>
          <p className={styles.selectionCount} role="status">
            {ids.length} of {plan.pages.length} pages selected
          </p>
          <button
            disabled={!has}
            onClick={() => apply((p) => duplicatePages(p, ids))}
          >
            <Copy size={14} />
            Duplicate pages
          </button>
          <button
            disabled={!has}
            onClick={() => apply((p) => rotatePages(p, ids))}
          >
            <RotateCw size={14} />
            Rotate selected
          </button>
          <button
            disabled={!has}
            onClick={() => apply((p) => deletePages(p, ids))}
          >
            <Trash2 size={14} />
            Delete selected
          </button>
          <button
            onClick={() => apply((p) => insertBlank(p, ids.at(-1) || null))}
          >
            <Plus size={14} />
            Insert blank page
          </button>
          <label>
            Editor section
            <input
              value={section}
              list="word-pdf-sections"
              maxLength={40}
              placeholder="e.g. Appendix"
              onChange={(e) => setSection(e.target.value)}
            />
          </label>
          <datalist id="word-pdf-sections">
            {[...new Set(plan.pages.map((p) => p.section))].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <button
            disabled={!has || !section.trim()}
            onClick={() => apply((p) => moveSection(p, ids, section))}
          >
            Move to section
          </button>
          <button
            disabled={!has || !synchronized}
            onClick={async () => {
              setExtracting(true);
              setError("");
              try {
                await onExtract();
              } catch (e) {
                setError(e instanceof Error ? e.message : "Extraction failed.");
              } finally {
                setExtracting(false);
              }
            }}
          >
            <Download size={14} />
            Extract selected PDF
          </button>
          <button onClick={onReset}>Reset visual page edits</button>
        </div>
      </fieldset>
      {extracting && (
        <p role="status" className={styles.note}>
          Copying selected final PDF pages…{" "}
          <button onClick={onCancelExtract}>Cancel extraction</button>
        </p>
      )}
      {(error || previewError) && (
        <p role="alert" className={styles.error}>
          {error || previewError}
        </p>
      )}
      {!synchronized && (
        <p className={styles.staleNote}>
          Thumbnails refresh when edits finish. Export stays locked until
          synchronized.
        </p>
      )}
      <WindowedPages
        count={plan.pages.length}
        rowHeight={174}
        pinned={plan.pages.findIndex((p) => p.id === dragged)}
        className={styles.editorPages}
      >
        {(i) => {
          const p = plan.pages[i];
          return (
            <div
              key={p.id}
              data-page-id={p.id}
              className={`${styles.pageCard} ${ids.includes(p.id) ? styles.pageCardSelected : ""}`}
              draggable={!disabled && !extracting}
              onDragStart={(e) => {
                setDragged(p.id);
                e.dataTransfer.setData("text/plain", p.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragged("")}
              onDragOver={(e) => {
                if (dragged) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const source = e.dataTransfer.getData("text/plain");
                if (
                  source &&
                  plan.pages.some((p) => p.id === source) &&
                  !disabled &&
                  !extracting
                )
                  apply((p) =>
                    movePages(
                      p,
                      ids.includes(source) ? ids : [source],
                      p.pages[i].id,
                    ),
                  );
                setDragged("");
              }}
            >
              <div className={styles.pageCardHead}>
                <GripVertical size={14} aria-hidden="true" />
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Select output page ${i + 1}`}
                    checked={ids.includes(p.id)}
                    disabled={disabled || extracting}
                    onChange={(e) =>
                      onSelect(
                        e.target.checked
                          ? [...ids, p.id]
                          : ids.filter((id) => id !== p.id),
                      )
                    }
                  />
                  Page {i + 1}
                </label>
                <span>{p.rotation}°</span>
              </div>
              <div className={styles.pageCardBody}>
                {handle ? (
                  <Thumb
                    key={p.id}
                    handle={handle}
                    page={i + 1}
                    selected={ids.includes(p.id)}
                    onSelect={() => onGoTo(i + 1)}
                  />
                ) : (
                  <span className={styles.editorPending}>
                    {synchronized ? "Loading actual PDF…" : "Update pending"}
                  </span>
                )}
                <div>
                  <strong>
                    {p.source === null
                      ? "Inserted blank"
                      : `Source page ${p.source + 1}`}
                  </strong>
                  <span>{p.section}</span>
                  <button
                    aria-label={`View output page ${i + 1}`}
                    onClick={() => onGoTo(i + 1)}
                  >
                    Preview page
                  </button>
                  <div className={styles.pageMoves}>
                    <button
                      aria-label={`Move page ${i + 1} up`}
                      disabled={disabled || extracting || i === 0}
                      onClick={() => move(p.id, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      aria-label={`Move page ${i + 1} down`}
                      disabled={
                        disabled || extracting || i === plan.pages.length - 1
                      }
                      onClick={() => move(p.id, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </WindowedPages>
      <p className={styles.note}>
        Editor sections group output pages; they are not Word section reflow or
        PDF bookmarks. Extracted pages retain their final numbering.
        Reordering/subsets may lose outlines and document structure.
      </p>
    </section>
  );
}
