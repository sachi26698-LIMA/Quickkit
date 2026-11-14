"use client";
/**
 * Developer utilities for barcode work: compare two values, screen a photo for
 * the defects that make it undecodable, and read the exact contract of the one
 * barcode-related endpoint this site exposes.
 *
 * The image check is a screening heuristic. It reports pixels per module,
 * contrast, quiet zone and cropping, and it says in the result itself that those
 * numbers are not an ISO/IEC 15416 or 15415 grade.
 */
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  GitCompareArrows,
  ImageUp,
  Info,
  Loader2,
  ScanSearch,
} from "lucide-react";
import { compareCodes } from "@/lib/tools/barcode/compare";
import { analyzeRaster, type ImageAnalysis } from "@/lib/tools/barcode/analyze";
import styles from "@/components/tools/barcode-suite/suite.module.css";

const VERDICT_TEXT = {
  identical: "Identical after normalisation",
  "same-gtin": "Same GTIN, different notation",
  "different-length": "Different values, one is a prefix of the other",
  different: "Different values",
  empty: "One or both inputs are empty",
} as const;

export default function BarcodeDeveloper() {
  const [left, setLeft] = useState("(01)09506000134352(10)LOT-42");
  const [right, setRight] = useState("09506000134352");
  const comparison = useMemo(
    () => (left.trim() || right.trim() ? compareCodes(left, right) : null),
    [left, right],
  );

  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [imageName, setImageName] = useState("");
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analyseFile = async (file: File) => {
    setImageError("");
    setAnalysis(null);
    if (!file.type.startsWith("image/")) {
      setImageError(
        `That file is "${file.type || "unrecognised"}", which is not an image this tool can read.`,
      );
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setImageError(
        "Images above 12 MB are not read here; downscale the photo first.",
      );
      return;
    }
    setImageBusy(true);
    setImageName(file.name);
    try {
      const bitmap = await createImageBitmap(file);
      // Cap the working size: the analysis is about module width in pixels, and
      // a 4000 px photo would only make the loop slower without changing the
      // verdict at print scale.
      const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("no 2d context");
      context.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();
      const data = context.getImageData(0, 0, width, height);
      setAnalysis(analyzeRaster({ width, height, rgba: data.data }));
    } catch {
      setImageError(
        "This browser could not decode that image. Try a JPEG or PNG, and avoid HEIC photos.",
      );
    } finally {
      setImageBusy(false);
    }
  };

  return (
    <div className={styles.workspace}>
      <div className={styles.heading}>
        <h2>Barcode developer tools</h2>
        <p>
          Compare two values, screen a photo for the defects that break
          decoding, and read the exact contract of the product-lookup endpoint.
          Everything runs in the tab except the endpoint example, which is
          documented — not called — on this page.
        </p>
      </div>

      <section className={styles.card} aria-labelledby="compare-heading">
        <div className={styles.cardHead}>
          <GitCompareArrows size={16} aria-hidden="true" />
          <h3 id="compare-heading">Compare two barcode values</h3>
          <p>
            HRI strings are reduced to their element string before comparing, so
            a parenthesised label and a scanner&rsquo;s raw output can be
            compared fairly.
          </p>
        </div>
        <div className={styles.grid}>
          <label className={styles.field}>
            Value A
            <input
              className={styles.input}
              value={left}
              onChange={(event) => setLeft(event.target.value)}
              spellCheck={false}
            />
          </label>
          <label className={styles.field}>
            Value B
            <input
              className={styles.input}
              value={right}
              onChange={(event) => setRight(event.target.value)}
              spellCheck={false}
            />
          </label>
        </div>

        {comparison && (
          <div style={{ marginTop: 14 }}>
            <p
              className={
                comparison.verdict === "identical" ||
                comparison.verdict === "same-gtin"
                  ? styles.ok
                  : styles.bad
              }
            >
              <strong>
                {comparison.verdict === "identical" ||
                comparison.verdict === "same-gtin" ? (
                  <CheckCircle2 size={14} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={14} aria-hidden="true" />
                )}{" "}
                {VERDICT_TEXT[comparison.verdict]}
              </strong>
            </p>
            <dl className={styles.kv}>
              <dt>GTIN-14 A</dt>
              <dd className={styles.mono}>
                {comparison.left.gtin14 ?? "—"}{" "}
                {comparison.left.gtinValid === false
                  ? "(check digit fails)"
                  : ""}
              </dd>
              <dt>GTIN-14 B</dt>
              <dd className={styles.mono}>
                {comparison.right.gtin14 ?? "—"}{" "}
                {comparison.right.gtinValid === false
                  ? "(check digit fails)"
                  : ""}
              </dd>
              <dt>Common prefix</dt>
              <dd>
                {comparison.commonPrefix} character
                {comparison.commonPrefix === 1 ? "" : "s"}
              </dd>
              <dt>Common suffix</dt>
              <dd>
                {comparison.commonSuffix} character
                {comparison.commonSuffix === 1 ? "" : "s"}
              </dd>
            </dl>
            {comparison.diffs.length > 0 && (
              <div className={styles.scroll} style={{ marginTop: 10 }}>
                <table className={styles.table}>
                  <caption className={styles.srOnly}>
                    Character differences
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Index</th>
                      <th scope="col">A</th>
                      <th scope="col">B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.diffs.map((diff) => (
                      <tr key={diff.index}>
                        <td>{diff.index}</td>
                        <td className={styles.mono}>{diff.left || "∅"}</td>
                        <td className={styles.mono}>{diff.right || "∅"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {comparison.notes.length > 0 && (
              <ul className={styles.chips} style={{ marginTop: 10 }}>
                {comparison.notes.map((note) => (
                  <li key={note} className={styles.chip}>
                    {note}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="analyzer-heading">
        <div className={styles.cardHead}>
          <ScanSearch size={16} aria-hidden="true" />
          <h3 id="analyzer-heading">Why will this photo not scan?</h3>
          <p>
            Upload a photo of a printed symbol. The analyser measures module
            width, contrast, quiet zone and cropping, and explains which one is
            the problem.
          </p>
        </div>
        <div className={styles.actions} style={{ marginTop: 0 }}>
          <label
            className={styles.buttonSecondary}
            style={{ cursor: "pointer" }}
          >
            <ImageUp size={14} aria-hidden="true" /> Choose an image
            <input
              type="file"
              accept="image/*"
              className={styles.srOnly}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void analyseFile(file);
                event.target.value = "";
              }}
            />
          </label>
          {imageBusy && (
            <span className={styles.hint}>
              <Loader2 size={13} aria-hidden="true" /> Reading the image…
            </span>
          )}
          {imageName && !imageBusy && (
            <span className={styles.hint}>{imageName}</span>
          )}
        </div>
        <canvas ref={canvasRef} className={styles.srOnly} aria-hidden="true" />

        {imageError && (
          <p className={styles.error} role="alert">
            {imageError}
          </p>
        )}

        {analysis && (
          <div style={{ marginTop: 14 }}>
            <dl className={styles.kv}>
              <dt>Image</dt>
              <dd>
                {analysis.width} × {analysis.height} px
              </dd>
              <dt>Dark ink</dt>
              <dd>{(analysis.darkRatio * 100).toFixed(1)}% of pixels</dd>
              <dt>Contrast ratio</dt>
              <dd>{analysis.contrast.ratio.toFixed(1)} : 1</dd>
              <dt>Module width</dt>
              <dd>≈ {analysis.modulePixels.toFixed(2)} px</dd>
              <dt>Quiet zone</dt>
              <dd>
                left {analysis.quietZone.left.toFixed(0)} · right{" "}
                {analysis.quietZone.right.toFixed(0)} · top{" "}
                {analysis.quietZone.top.toFixed(0)} · bottom{" "}
                {analysis.quietZone.bottom.toFixed(0)} px
              </dd>
              <dt>Edges touched</dt>
              <dd>
                {analysis.edgesTouched.length
                  ? analysis.edgesTouched.join(", ")
                  : "none"}
              </dd>
            </dl>
            <p className={analysis.issues.length ? styles.warning : styles.ok}>
              {analysis.summary}
            </p>
            {analysis.issues.length > 0 && (
              <ul className={styles.chips}>
                {analysis.issues.map((issue) => (
                  <li key={issue.code} className={styles.chip}>
                    <AlertTriangle size={12} aria-hidden="true" />{" "}
                    {issue.severity}: {issue.message}
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.hint}>
              <Info size={12} aria-hidden="true" /> These measurements are a
              screening heuristic, not an ISO/IEC 15416 (linear) or ISO/IEC
              15415 (2D) grade. A grade needs a calibrated verifier with a
              defined aperture and lighting geometry, which a browser cannot
              supply.
            </p>
          </div>
        )}
      </section>

      <section className={styles.card} aria-labelledby="api-heading">
        <div className={styles.cardHead}>
          <h3 id="api-heading">Product lookup endpoint</h3>
          <p>
            The only barcode-related JSON endpoint this site exposes. It is a
            proxy, not an open API.
          </p>
        </div>
        <pre
          className={styles.mono}
          style={{
            margin: 0,
            padding: 12,
            background: "#fbf9ff",
            border: "1px solid var(--border)",
            borderRadius: 10,
            whiteSpace: "pre-wrap",
          }}
        >{`GET /api/product-lookup?gtin=3017620422003

200  { status: "found", product: { ... }, disclosure: "..." }
400  { status: "invalid", message }        // not a GTIN with a valid check digit
404  { status: "not-found", message }
429  { status: "rate-limited", message, retryAfterSeconds }   // + Retry-After
502  { status: "error", reason: "upstream" | "network" | "response", message, upstreamStatus? }
504  { status: "error", reason: "timeout", message }`}</pre>
        <p className={styles.hint}>
          The endpoint accepts only a GTIN: batch codes, images and arbitrary
          text are rejected so it cannot be used as a general-purpose fetch
          proxy. Responses are cached for a short time and every visitor is
          rate-limited. Data is Open Food Facts under ODbL; images are CC-BY-SA.
        </p>
      </section>
    </div>
  );
}
