"use client";
/**
 * Barcode scanner: camera and image, both decoded on this device.
 *
 * The camera is only requested after a click (browsers require a user gesture
 * for a good reason), the rear camera is preferred on phones, and every
 * failure is translated into something the person can act on. Frames and images
 * never leave the tab: the decode runs in a Web Worker over transferred pixels.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Copy,
  Download,
  Flashlight,
  ImageUp,
  Loader2,
  ScanBarcode,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { downloadText } from "@/lib/tools/download";
import { csvDocument } from "@/lib/tools/csv";
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
} from "@/lib/tools/qr-scanner/image-source";
import { scanRaster } from "@/lib/tools/barcode/scan-client";
import { READABLE_FORMATS } from "@/lib/tools/barcode/decode";
import { WorkspaceHeading } from "../tool-ui";

type ScanItem = {
  id: string;
  text: string;
  format: string;
  label: string;
  source: "camera" | "image";
  at: string;
};

const FORMAT_NAMES = READABLE_FORMATS.map((id) => id.toUpperCase()).join(", ");

function resultKey(text: string, format: string) {
  return `${format}::${text}`;
}

export default function ScannerPanel() {
  const [mode, setMode] = useState<"camera" | "image">("camera");
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "decoding">("idle");
  const [error, setError] = useState<CameraError | { title: string; message: string } | null>(null);
  const [devices, setDevices] = useState<{ deviceId: string; label: string }[]>([]);
  const [deviceId, setDeviceId] = useState<string>("");
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [torch, setTorch] = useState(false);
  const [items, setItems] = useState<ScanItem[]>([]);
  const [attempts, setAttempts] = useState<string[]>([]);
  const [suppressed, setSuppressed] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const running = useRef(false);
  const timer = useRef<number | null>(null);
  const seen = useRef(new Set<string>());
  const mounted = useRef(true);

  const record = useCallback((found: { text: string; format: string; label: string }[], source: "camera" | "image") => {
    if (!found.length) return;
    setItems((current) => {
      const next = [...current];
      let duplicates = 0;
      for (const entry of found) {
        const key = resultKey(entry.text, entry.format);
        if (seen.current.has(key)) {
          duplicates += 1;
          continue;
        }
        seen.current.add(key);
        next.unshift({
          id: `${key}-${next.length}-${Date.now()}`,
          text: entry.text,
          format: entry.format,
          label: entry.label,
          source,
          at: new Date().toLocaleTimeString(),
        });
      }
      if (duplicates) setSuppressed((value) => value + duplicates);
      return next;
    });
  }, []);

  const stopCamera = useCallback(() => {
    running.current = false;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) video.srcObject = null;
    setTorch(false);
    setCapabilities(null);
    setStatus("idle");
  }, []);

  const tickRef = useRef<() => void>(() => {});

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
            if (!mounted.current) return;
            setAttempts(outcome.attempts);
            record(outcome.barcodes, "camera");
          })
          .catch(() => {
            /* a failed frame is not an error worth a banner */
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
        setStatus("idle");
        return;
      }
      setError(null);
      setStatus("starting");
      try {
        const known = await listCameras().catch(() => []);
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
          /* autoplay policies: the muted attribute covers the common case */
        });
        const track = stream.getVideoTracks()[0];
        setCapabilities(track ? readCapabilities(track) : null);
        const devicesNow = await listCameras().catch(() => []);
        setDevices(devicesNow);
        setDeviceId(chosen ?? devicesNow[0]?.deviceId ?? "");
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
        title: "The torch is not available",
        message:
          "This camera exposes no torch control in this browser — often the case on desktop webcams and some Android builds.",
      });
    }
  }, [torch]);

  const scanImage = useCallback(
    async (file: File) => {
      setError(null);
      setFileName(file.name);
      setStatus("decoding");
      setAttempts([]);
      try {
        const raster = await fileToRaster(file, { maxSide: 2400 });
        const outcome = await scanRaster(raster, "image");
        if (!mounted.current) return;
        setAttempts(outcome.attempts);
        record(outcome.barcodes, "image");
        if (!outcome.barcodes.length)
          setError({
            title: "No barcode found in that image",
            message:
              "We rotated the image four ways and swept it in overlapping tiles. Try a sharper, straighter crop with the whole symbol and its quiet zone visible — or generate the barcode here first to compare.",
          });
      } catch (scanError) {
        setError({
          title: "That image could not be read",
          message:
            scanError instanceof Error
              ? scanError.message
              : "The file could not be decoded. JPEG, PNG, WebP and GIF are supported.",
        });
      } finally {
        setStatus("idle");
      }
    },
    [record],
  );

  // Tear the stream down on unmount and when the tab is hidden: a phone that
  // keeps the camera light on after switching apps is a real privacy problem.
  useEffect(() => {
    mounted.current = true;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopCamera();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
      stopCamera();
    };
  }, [stopCamera]);

  // Switching mode from an event handler, not an effect: the camera is an
  // external resource, and leaving it running behind the upload panel would
  // keep the recording light on with nothing on screen to explain it.
  const switchMode = useCallback(
    (next: "camera" | "image") => {
      if (next === mode) return;
      stopCamera();
      setError(null);
      setMode(next);
    },
    [mode, stopCamera],
  );

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    seen.current.clear();
    setSuppressed(0);
    setAttempts([]);
    setError(null);
  }, []);

  const exportResults = useCallback(() => {
    if (!items.length) return;
    const rows = [
      ["scanned_at", "format", "source", "text"],
      ...items.map((item) => [item.at, item.label, item.source, item.text]),
    ];
    downloadText(
      csvDocument(rows),
      "quickkit-barcode-scan-results.csv",
      "text/csv;charset=utf-8",
    );
  }, [items]);

  return (
    <fieldset className="workspace bc-scanner" aria-label="Barcode scanner">
      <WorkspaceHeading
        title="Barcode scanner"
        description={`Read Code 128, GS1-128, Code 39, EAN-13, EAN-8, UPC-A, UPC-E, ITF-14 and Codabar from your camera or an image — decoded here, never uploaded.`}
      />

      <div className="qr-tabs" role="tablist" aria-label="Scanner mode">
        {[
          { id: "camera" as const, label: "Camera", icon: Camera },
          { id: "image" as const, label: "Image upload", icon: ImageUp },
        ].map((entry) => {
          const Icon = entry.icon;
          const active = mode === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={active ? "qr-tab active" : "qr-tab"}
              onClick={() => switchMode(entry.id)}
            >
              <Icon size={15} aria-hidden="true" /> {entry.label}
            </button>
          );
        })}
      </div>

      <div className={mode === "camera" ? "bc-scan-grid" : "bc-scan-grid single"}>
        <section className="qr-card" aria-labelledby="bc-camera-heading">
          <div className="qr-card-head">
            <div>
              <h3 id="bc-camera-heading">
                {mode === "camera" ? "Live camera" : "Decode an image"}
              </h3>
              <p>
                {mode === "camera"
                  ? "Point the camera at a barcode. Frames are decoded on this device and duplicates are folded away."
                  : "Drop a photo or screenshot. Every symbol in the picture is detected, locally."}
              </p>
            </div>
            <span className="qr-badge">{mode === "camera" ? "Rear camera" : "Local decode"}</span>
          </div>

          {mode === "camera" ? (
            <div className="bc-camera">
              <div className="bc-video-wrap">
                <video
                  ref={videoRef}
                  className="bc-video"
                  playsInline
                  muted
                  autoPlay
                  aria-label="Camera preview"
                />
                {status !== "live" ? (
                  <div className="bc-video-placeholder">
                    {status === "starting" ? (
                      <Loader2 size={24} className="qr-spin" aria-hidden="true" />
                    ) : (
                      <Camera size={24} aria-hidden="true" />
                    )}
                    <p>
                      {status === "starting"
                        ? "Asking the browser for the camera…"
                        : "The camera stays off until you press Start."}
                    </p>
                  </div>
                ) : null}
                <canvas ref={canvasRef} className="bc-capture" aria-hidden="true" />
              </div>

              <div className="bc-actions">
                {status === "live" ? (
                  <button type="button" className="secondary" onClick={stopCamera}>
                    <CameraOff size={15} aria-hidden="true" /> Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    className="primary"
                    onClick={() => void startCamera()}
                    disabled={status === "starting"}
                  >
                    {status === "starting" ? (
                      <Loader2 size={15} className="qr-spin" aria-hidden="true" />
                    ) : (
                      <Camera size={15} aria-hidden="true" />
                    )}
                    Start camera
                  </button>
                )}
                {devices.length > 1 ? (
                  <select
                    className="bc-device-select"
                    value={deviceId}
                    aria-label="Choose a camera"
                    onChange={(event) => {
                      setDeviceId(event.target.value);
                      stopCamera();
                      void startCamera(event.target.value);
                    }}
                  >
                    {devices.map((device, index) => (
                      <option key={device.deviceId || index} value={device.deviceId}>
                        {device.label || `Camera ${index + 1}`}
                      </option>
                    ))}
                  </select>
                ) : null}
                {capabilities?.torch ? (
                  <button
                    type="button"
                    className={torch ? "secondary active" : "secondary"}
                    onClick={() => void toggleTorch()}
                    aria-pressed={torch}
                  >
                    <Flashlight size={15} aria-hidden="true" /> Torch
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="bc-upload">
              <label
                className="qr-dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const dropped = event.dataTransfer?.files?.[0];
                  if (dropped) void scanImage(dropped);
                }}
              >
                {status === "decoding" ? (
                  <Loader2 size={22} className="qr-spin" aria-hidden="true" />
                ) : (
                  <ImageUp size={22} aria-hidden="true" />
                )}
                <span>
                  {fileName || "Choose a photo or drop it here"}
                  <small>JPEG, PNG, WebP, GIF, BMP or AVIF up to 25 MB / 40 MP.</small>
                </span>
                <input
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void scanImage(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <p className="help">
                Supported formats: {FORMAT_NAMES}. MSI and Pharmacode have no
                bundled reader, so they cannot be scanned here.
              </p>
            </div>
          )}

          {error ? (
            <div className="qr-verdict warn" role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              <div>
                <strong>{error.title}</strong>
                <p>{error.message}</p>
              </div>
            </div>
          ) : null}

          <p className="bc-progress" role="status">
            {status === "starting"
              ? "Waiting for camera permission…"
              : status === "decoding"
                ? "Decoding the image in this tab…"
                : status === "live"
                  ? "Camera live. Hold the barcode inside the frame."
                  : ""}
          </p>

          <p className="qr-privacy-foot">
            <ShieldCheck size={15} aria-hidden="true" /> Camera frames and images
            are read into a canvas, decoded in a worker and discarded. Nothing is
            recorded, stored or sent anywhere.
          </p>
        </section>

        <section className="qr-card" aria-labelledby="bc-results-heading">
          <div className="qr-card-head">
            <div>
              <h3 id="bc-results-heading">Results ({items.length})</h3>
              <p>
                {suppressed
                  ? `${suppressed} repeat scan${suppressed === 1 ? "" : "s"} suppressed.`
                  : "Duplicates of a scan already in this list are ignored."}
              </p>
            </div>
            <div className="qr-card-action">
              <button
                type="button"
                className="qr-mini-button"
                onClick={exportResults}
                disabled={!items.length}
              >
                <Download size={13} aria-hidden="true" /> CSV
              </button>
              <button
                type="button"
                className="qr-mini-button"
                onClick={clear}
                disabled={!items.length}
              >
                <Trash2 size={13} aria-hidden="true" /> Clear
              </button>
            </div>
          </div>

          {items.length ? (
            <ul className="bc-results" aria-live="polite" aria-relevant="additions text">
              {items.map((item) => (
                <li key={item.id}>
                  <div className="bc-result-head">
                    <span className="qr-badge">{item.label}</span>
                    <span className="bc-dim">
                      {item.source === "camera" ? "Camera" : "Image"} · {item.at}
                    </span>
                    <button
                      type="button"
                      className="qr-icon-button"
                      onClick={() => void copy(item.text)}
                      aria-label={`Copy ${item.label} result`}
                    >
                      {copied === item.text ? <X size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p className="bc-result-text">{item.text}</p>
                  {copied === item.text ? <p className="bc-dim">Copied.</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">
              <ScanBarcode size={26} aria-hidden="true" />
              <p>
                {mode === "camera"
                  ? "Start the camera and hold a barcode in frame — results appear here."
                  : "Upload an image with one or more barcodes to see decoded values."}
              </p>
            </div>
          )}

          {attempts.length ? (
            <details className="bc-rules">
              <summary>What the decoder tried</summary>
              <p className="help">{attempts.join(" · ")}</p>
            </details>
          ) : null}
        </section>
      </div>
    </fieldset>
  );
}
