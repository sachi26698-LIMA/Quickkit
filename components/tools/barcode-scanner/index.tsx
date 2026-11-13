"use client";
/**
 * Stand-alone barcode scanner.
 *
 * This page decodes printed symbols. It is not a batch-code reader, and the
 * panel at the top says so before anything else: a GS1 product barcode carries
 * a GTIN, not a lot number, a manufacture date, an expiry date or a proof of
 * authenticity.
 *
 * Camera frames and uploaded images are decoded on this device. The only
 * network request the page can make is the optional product lookup, which sends
 * one GTIN to this site's own endpoint.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  CameraOff,
  Copy,
  ImageUp,
  Loader2,
  PackageSearch,
  ScanBarcode,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  cameraSupport,
  captureFrame,
  describeCameraError,
  listCameras,
  preferDevice,
  readCapabilities,
  type CameraCapabilities,
  type CameraError,
} from "@/lib/tools/qr-scanner/camera";
import {
  ACCEPT_ATTRIBUTE,
  fileToRaster,
  validateScanFile,
} from "@/lib/tools/qr-scanner/image-source";
import { scanRaster } from "@/lib/tools/barcode/scan-client";
import { FORMAT_LABELS, READABLE_FORMATS } from "@/lib/tools/barcode/decode";
import type { DecodedBarcode } from "@/lib/tools/barcode/types";
import {
  SCANNER_HISTORY_KEY,
  addScanRecord,
  clearScanHistory,
  loadScanHistory,
  removeScanRecord,
  saveScanHistory,
  type ScanRecord,
} from "@/lib/tools/barcode-scanner/history";
import {
  LOOKUP_DISCLOSURE,
  PRODUCT_DATABASE,
  normalizeGtin,
  type LookupResult,
} from "@/lib/tools/barcode-scanner/product-lookup";
import styles from "./scanner.module.css";

type Mode = "camera" | "image";

type ScanItem = {
  id: string;
  value: string;
  format: string;
  label: string;
  source: "camera" | "image";
  at: string;
};

type LookupState =
  { status: "loading" } | { status: "done"; result: LookupResult };

const FORMAT_LIST = READABLE_FORMATS.map((id) => FORMAT_LABELS[id] ?? id).join(
  ", ",
);

function keyOf(value: string, format: string) {
  return `${format}::${value}`;
}

export default function BarcodeScanner() {
  const [mode, setMode] = useState<Mode>("camera");
  const [status, setStatus] = useState<
    "idle" | "starting" | "live" | "decoding"
  >("idle");
  const [error, setError] = useState<
    CameraError | { title: string; message: string } | null
  >(null);
  const [devices, setDevices] = useState<{ deviceId: string; label: string }[]>(
    [],
  );
  const [deviceId, setDeviceId] = useState("");
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(
    null,
  );
  const [torch, setTorch] = useState(false);
  const [results, setResults] = useState<ScanItem[]>([]);
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [keepHistory, setKeepHistory] = useState(true);
  const [lookups, setLookups] = useState<Record<string, LookupState>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [fileNote, setFileNote] = useState("");
  const [suppressed, setSuppressed] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const running = useRef(false);
  const timer = useRef<number | null>(null);
  const seen = useRef(new Set<string>());
  const mounted = useRef(true);
  const tickRef = useRef<() => void>(() => {});

  /* --------------------------------- history -------------------------------- */
  useEffect(() => {
    mounted.current = true;
    // Client-only load, deferred like the QR scanner's: the first paint keeps
    // the server HTML and the stored list arrives one tick later.
    const stored =
      typeof window === "undefined" ? [] : loadScanHistory(window.localStorage);
    const preference =
      typeof window === "undefined"
        ? null
        : window.localStorage.getItem(`${SCANNER_HISTORY_KEY}:enabled`);
    const timer = window.setTimeout(() => {
      setHistory(stored);
      if (preference === "false") setKeepHistory(false);
    }, 0);
    return () => {
      mounted.current = false;
      window.clearTimeout(timer);
    };
  }, []);

  const remember = useCallback(
    (
      value: string,
      format: string,
      label: string,
      source: "camera" | "image",
    ) => {
      if (!keepHistory) return;
      setHistory((current) => {
        const next = addScanRecord(current, { value, format, label, source });
        if (typeof window !== "undefined")
          saveScanHistory(window.localStorage, next);
        return next;
      });
    },
    [keepHistory],
  );

  const toggleHistory = useCallback((next: boolean) => {
    setKeepHistory(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        `${SCANNER_HISTORY_KEY}:enabled`,
        String(next),
      );
    } catch {
      /* ignore quota */
    }
  }, []);

  /* --------------------------------- results -------------------------------- */
  const record = useCallback(
    (found: DecodedBarcode[], source: "camera" | "image") => {
      if (!found.length) return;
      const fresh: ScanItem[] = [];
      let duplicates = 0;
      for (const entry of found) {
        const key = keyOf(entry.text, entry.format);
        if (seen.current.has(key)) {
          duplicates += 1;
          continue;
        }
        seen.current.add(key);
        fresh.push({
          id: `${key}-${Date.now()}`,
          value: entry.text,
          format: entry.format,
          label: entry.label || FORMAT_LABELS[entry.format] || entry.rawFormat,
          source,
          at: new Date().toISOString(),
        });
      }
      if (duplicates) setSuppressed((current) => current + duplicates);
      if (!fresh.length) return;
      setResults((current) => [...fresh, ...current].slice(0, 50));
      for (const item of fresh)
        remember(item.value, item.format, item.label, source);
    },
    [remember],
  );

  /* --------------------------------- camera --------------------------------- */
  const stopCamera = useCallback(() => {
    running.current = false;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorch(false);
    setCapabilities(null);
    setStatus("idle");
  }, []);

  const tick = useCallback(() => {
    if (!running.current) return;
    const video = videoRef.current;
    if (video && video.readyState >= 2 && video.videoWidth) {
      const raster = captureFrame(video, {
        maxSide: 1280,
        canvas: canvasRef.current ?? undefined,
      });
      if (raster) {
        void scanRaster(raster, "frame")
          .then((outcome) => {
            if (mounted.current) record(outcome.barcodes, "camera");
          })
          .catch(() => {
            /* a dropped frame is not an error worth a banner */
          })
          .finally(() => {
            if (running.current)
              timer.current = window.setTimeout(() => tickRef.current(), 240);
          });
        return;
      }
    }
    timer.current = window.setTimeout(() => tickRef.current(), 240);
  }, [record]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const startCamera = useCallback(
    async (requestedDevice?: string) => {
      const support = cameraSupport();
      if (!support.ok) {
        setError(support.error);
        return;
      }
      setError(null);
      setStatus("starting");
      try {
        const known = await listCameras().catch(() => []);
        // Rear camera first on a phone: that is the one pointed at the pack.
        const chosen =
          requestedDevice || deviceId || preferDevice(known) || undefined;
        const stream = await navigator.mediaDevices.getUserMedia({
          video: chosen
            ? { deviceId: { exact: chosen } }
            : { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!mounted.current) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) throw new Error("The video element is not ready yet.");
        video.srcObject = stream;
        await video.play().catch(() => {
          /* muted playback covers the usual autoplay policy */
        });
        const track = stream.getVideoTracks()[0];
        setCapabilities(track ? readCapabilities(track) : null);
        const now = await listCameras().catch(() => []);
        setDevices(now);
        setDeviceId(chosen ?? now[0]?.deviceId ?? "");
        setStatus("live");
        running.current = true;
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(tick, 260);
      } catch (streamError) {
        setError(describeCameraError(streamError));
        setStatus("idle");
      }
    },
    [deviceId, tick],
  );

  useEffect(() => () => stopCamera(), [stopCamera]);

  const switchDevice = useCallback(
    (next: string) => {
      stopCamera();
      setDeviceId(next);
      void startCamera(next);
    },
    [startCamera, stopCamera],
  );

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torch;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorch(next);
    } catch {
      setError({
        title: "This camera has no torch control",
        message:
          "The track refused the torch constraint — common on desktop webcams and some Android builds. Lighting the label from another angle works better anyway.",
      });
    }
  }, [torch]);

  /* --------------------------------- images --------------------------------- */
  const scanFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setError(null);
      setStatus("decoding");
      setFileNote("");
      let scanned = 0;
      let empty = 0;
      let rejected = 0;
      for (const file of list) {
        try {
          validateScanFile(file);
          const raster = await fileToRaster(file, { maxSide: 2400 });
          const outcome = await scanRaster(raster, "image");
          scanned += 1;
          if (outcome.barcodes.length) record(outcome.barcodes, "image");
          else empty += 1;
        } catch {
          rejected += 1;
        }
        if (!mounted.current) return;
      }
      setFileNote(
        [
          `${scanned} image${scanned === 1 ? "" : "s"} read`,
          empty ? `${empty} with no readable barcode` : null,
          rejected ? `${rejected} rejected (type or size)` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      );
      setStatus("idle");
    },
    [record],
  );

  /* -------------------------------- clipboard ------------------------------- */
  const copy = useCallback(async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(
        () => setCopied((current) => (current === value ? null : current)),
        1600,
      );
    } catch {
      setCopied(null);
    }
  }, []);

  /* --------------------------------- lookup --------------------------------- */
  const lookup = useCallback(async (gtin: string) => {
    setLookups((current) => ({ ...current, [gtin]: { status: "loading" } }));
    try {
      const response = await fetch(
        `/api/product-lookup?gtin=${encodeURIComponent(gtin)}`,
        {
          headers: { Accept: "application/json" },
        },
      );
      const result = (await response.json()) as LookupResult;
      setLookups((current) => ({
        ...current,
        [gtin]: { status: "done", result },
      }));
    } catch {
      setLookups((current) => ({
        ...current,
        [gtin]: {
          status: "done",
          result: {
            status: "error",
            message:
              "The lookup request did not complete. The barcode you scanned is unaffected — only the optional product lookup failed.",
          },
        },
      }));
    }
  }, []);

  const live = status === "live";

  return (
    <div className={styles.workspace}>
      <section className={styles.factPanel} aria-labelledby="scanner-fact">
        <strong id="scanner-fact">A barcode is not an expiry date</strong>
        <p>
          A retail barcode carries a product number (GTIN) — sometimes a weight
          or a price. It does not contain the batch, the manufacture date, the
          expiry date or a proof of authenticity. Reading the bars tells you{" "}
          <em>which product</em> it is, never <em>which pack</em>. For a lot
          code, use the{" "}
          <Link href="/tools/batch-code-checker">batch code checker</Link>,
          which states plainly what it can and cannot decode.
        </p>
      </section>

      <div className={styles.tabs} role="tablist" aria-label="Scan source">
        {[
          {
            id: "camera" as Mode,
            label: "Camera",
            icon: <Camera size={16} aria-hidden />,
          },
          {
            id: "image" as Mode,
            label: "Image upload",
            icon: <ImageUp size={16} aria-hidden />,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={mode === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={styles.tab}
            onClick={() => setMode(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {mode === "camera" ? (
        <section
          id="panel-camera"
          role="tabpanel"
          aria-labelledby="tab-camera"
          className={styles.panel}
        >
          <div className={styles.viewport}>
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="Camera preview"
              style={{
                display: live || status === "starting" ? "block" : "none",
              }}
            />
            {!live && status !== "starting" ? (
              <div className={styles.viewportIdle}>
                <ScanBarcode size={34} aria-hidden />
                <span>
                  The camera opens only when you press Start, and the frames
                  stay on this device.
                </span>
                <span>Formats read: {FORMAT_LIST}.</span>
              </div>
            ) : null}
            {status === "starting" ? (
              <div className={styles.viewportIdle}>
                <Loader2 size={28} aria-hidden className="spin" />
                <span>Waiting for the camera permission…</span>
              </div>
            ) : null}
          </div>
          <canvas ref={canvasRef} hidden />

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.button}
              onClick={() => (live ? stopCamera() : void startCamera())}
              disabled={status === "starting"}
            >
              {live ? (
                <CameraOff size={16} aria-hidden />
              ) : (
                <Camera size={16} aria-hidden />
              )}
              {live ? "Stop camera" : "Start camera"}
            </button>
            {capabilities?.torch ? (
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => void toggleTorch()}
                aria-pressed={torch}
              >
                Torch: {torch ? "on" : "off"}
              </button>
            ) : null}
            {devices.length > 1 ? (
              <label className={styles.field}>
                Camera
                <select
                  className={styles.select}
                  value={deviceId}
                  onChange={(event) => switchDevice(event.target.value)}
                >
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <span className={styles.status}>
              <span
                className={`${styles.dot} ${live ? styles.dotLive : ""}`}
                aria-hidden
              />
              {live
                ? "Scanning continuously"
                : status === "starting"
                  ? "Starting"
                  : "Camera off"}
            </span>
          </div>

          <p className={styles.notice}>
            Hold the symbol straight, fill about half the frame and keep the
            light even. The rear camera is chosen by default on a phone; the
            device list appears once permission is granted, because browsers
            hide camera names until then.
          </p>

          {error ? (
            <div className={styles.alert} role="alert">
              <strong>{error.title}</strong>
              <p>{error.message}</p>
            </div>
          ) : null}
        </section>
      ) : (
        <section
          id="panel-image"
          role="tabpanel"
          aria-labelledby="tab-image"
          className={styles.panel}
        >
          <label className={styles.dropzone} htmlFor="barcode-image-input">
            <ImageUp size={30} aria-hidden />
            <strong>Choose images or drop them here</strong>
            <span>
              PNG, JPEG, WebP, GIF or BMP · up to 25 MB and 40 megapixels each ·
              several barcodes in one photo are read where the decoder can
              separate them
            </span>
            <input
              id="barcode-image-input"
              className={styles.hiddenInput}
              type="file"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              onChange={(event) => {
                const files = event.target.files;
                if (files?.length) void scanFiles(files);
                event.target.value = "";
              }}
            />
          </label>
          {status === "decoding" ? (
            <span className={styles.status} role="status">
              <Loader2 size={15} aria-hidden className="spin" /> Decoding on
              this device…
            </span>
          ) : null}
          {fileNote ? <p className={styles.notice}>{fileNote}</p> : null}
          {error ? (
            <div className={styles.alert} role="alert">
              <strong>{error.title}</strong>
              <p>{error.message}</p>
            </div>
          ) : null}
        </section>
      )}

      <section className={styles.panel} aria-labelledby="scan-results-heading">
        <div className={styles.resultsHead}>
          <h2 id="scan-results-heading">Results</h2>
          <span className={styles.meta} aria-live="polite">
            {results.length} value{results.length === 1 ? "" : "s"}
            {suppressed
              ? ` · ${suppressed} duplicate repeat${suppressed === 1 ? "" : "s"} suppressed`
              : ""}
          </span>
        </div>
        {results.length === 0 ? (
          <p className={styles.empty}>
            Nothing scanned yet. A decode appears here the moment a symbol is
            read — including the symbology that was recognised, because EAN-13,
            UPC-A and Code 128 are not interchangeable labels for the same
            number.
          </p>
        ) : (
          <ul className={styles.resultList}>
            {results.map((item) => {
              const gtin = normalizeGtin(item.value);
              const lookupState = gtin ? lookups[gtin] : undefined;
              return (
                <li key={item.id} className={styles.resultCard}>
                  <div className={styles.resultTop}>
                    <span className={styles.badge}>{item.label}</span>
                    <span className={`${styles.badge} ${styles.badgeQuiet}`}>
                      {item.source === "camera" ? "Camera" : "Image"}
                    </span>
                    {gtin ? (
                      <span className={`${styles.badge} ${styles.badgeQuiet}`}>
                        GTIN {gtin}
                      </span>
                    ) : null}
                  </div>
                  <p className={styles.value}>{item.value}</p>
                  <div className={styles.rowButtons}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => void copy(item.value)}
                    >
                      <Copy size={14} aria-hidden />
                      {copied === item.value ? "Copied" : "Copy value"}
                    </button>
                    {gtin ? (
                      <button
                        type="button"
                        className={styles.smallButton}
                        onClick={() => void lookup(gtin)}
                        disabled={lookupState?.status === "loading"}
                      >
                        <PackageSearch size={14} aria-hidden />
                        {lookupState?.status === "loading"
                          ? "Looking up…"
                          : "Look up product"}
                      </button>
                    ) : null}
                  </div>
                  {gtin && lookupState?.status === "done" ? (
                    <LookupPanel result={lookupState.result} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {results.length ? (
          <div className={styles.rowButtons}>
            <button
              type="button"
              className={`${styles.smallButton} ${styles.buttonDanger}`}
              onClick={() => {
                setResults([]);
                seen.current.clear();
                setSuppressed(0);
                setLookups({});
              }}
            >
              <Trash2 size={14} aria-hidden /> Clear results
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.panel} aria-labelledby="history-heading">
        <div className={styles.resultsHead}>
          <h2 id="history-heading">History on this device</h2>
          <label className={styles.status}>
            <input
              type="checkbox"
              checked={keepHistory}
              onChange={(event) => toggleHistory(event.target.checked)}
            />
            Remember scans
          </label>
        </div>
        <p className={styles.notice}>
          History is stored in this browser&apos;s local storage — never on a
          server, never in an account, and it stops recording the moment you
          untick the box. {history.length} record
          {history.length === 1 ? "" : "s"} kept.
        </p>
        {history.length === 0 ? (
          <p className={styles.empty}>No stored scans.</p>
        ) : (
          <>
            <ul className={styles.historyList}>
              {history.slice(0, 8).map((recordItem) => (
                <li key={recordItem.id} className={styles.resultCard}>
                  <div className={styles.resultTop}>
                    <span className={`${styles.badge} ${styles.badgeQuiet}`}>
                      {recordItem.label || recordItem.format}
                    </span>
                    <span className={styles.meta}>
                      {new Date(recordItem.at).toLocaleString()} · seen{" "}
                      {recordItem.count}×
                    </span>
                  </div>
                  <p className={styles.value}>{recordItem.value}</p>
                  <div className={styles.rowButtons}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => void copy(recordItem.value)}
                    >
                      <Copy size={14} aria-hidden />
                      {copied === recordItem.value ? "Copied" : "Copy"}
                    </button>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() =>
                        setHistory((current) => {
                          const next = removeScanRecord(current, recordItem.id);
                          if (typeof window !== "undefined")
                            saveScanHistory(window.localStorage, next);
                          return next;
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className={styles.rowButtons}>
              <button
                type="button"
                className={`${styles.smallButton} ${styles.buttonDanger}`}
                onClick={() => {
                  setHistory([]);
                  if (typeof window !== "undefined")
                    clearScanHistory(window.localStorage);
                }}
              >
                <Trash2 size={14} aria-hidden /> Clear history
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function LookupPanel({ result }: { result: LookupResult }) {
  if (result.status === "found") {
    const { product } = result;
    return (
      <div className={styles.lookup}>
        <h4>{product.name}</h4>
        <dl>
          {product.brands.length ? (
            <>
              <dt>Brand</dt>
              <dd>{product.brands.join(", ")}</dd>
            </>
          ) : null}
          {product.quantity ? (
            <>
              <dt>Quantity</dt>
              <dd>{product.quantity}</dd>
            </>
          ) : null}
          {product.categories.length ? (
            <>
              <dt>Categories</dt>
              <dd>{product.categories.join(", ")}</dd>
            </>
          ) : null}
          <dt>Record</dt>
          <dd>
            <a
              href={product.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {product.sourceName}
            </a>{" "}
            ({product.licence}
            {product.lastModified
              ? `, last edited ${product.lastModified}`
              : ""}
            )
          </dd>
          <dt>Verified by</dt>
          <dd>Volunteers — not the manufacturer</dd>
        </dl>
        <p className={styles.meta}>{product.disclosure}</p>
      </div>
    );
  }
  return (
    <div className={styles.lookup}>
      <h4>
        {result.status === "error" ? (
          <TriangleAlert size={15} aria-hidden />
        ) : null}{" "}
        {result.status === "not-found" ? "No record" : "Lookup unavailable"}
      </h4>
      <p className={styles.meta}>{result.message}</p>
      <p className={styles.meta}>
        Source: {PRODUCT_DATABASE.name} — a {PRODUCT_DATABASE.kind} database.{" "}
        {LOOKUP_DISCLOSURE}
      </p>
    </div>
  );
}
