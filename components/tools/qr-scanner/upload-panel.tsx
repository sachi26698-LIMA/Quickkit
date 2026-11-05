"use client";
/**
 * Image and screenshot scanner.
 *
 * One dropzone serves both: a screenshot is just an image, and pretending
 * otherwise would add a tab whose only difference is a paragraph of copy. What
 * the panel does add is the adjustment strip — rotate, crop by dragging a box on
 * the preview, contrast and sharpen — and a Retry button that re-decodes the
 * *same* pixels with those adjustments, which is what rescues a photo taken at
 * an angle.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ClipboardPaste,
  Crop,
  ImagePlus,
  RotateCw,
  ScanLine,
  SlidersHorizontal,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  ACCEPT_ATTRIBUTE,
  blobToRaster,
  fileToRaster,
  ImageLoadError,
} from "@/lib/tools/qr-scanner/image-source";
import type {
  CropRect,
  ImageRotation,
  Raster,
} from "@/lib/tools/qr-scanner/types";
import type { ScannerApi } from "./use-scanner";

type Loaded = {
  name: string;
  bytes: number;
  url: string;
  raster: Raster;
};

export default function UploadPanel({ api }: { api: ScannerApi }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<ImageRotation>(0);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [contrast, setContrast] = useState(1.25);
  const [sharpen, setSharpen] = useState(0.6);
  const [scanning, setScanning] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const release = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => release, [release]);

  const runScan = useCallback(
    async (raster: Raster, name: string, bytes: number, url: string | null) => {
      setScanning(true);
      setError(null);
      try {
        await api.scanRasterAndCommit(raster, {
          sourceName: name,
          sourceBytes: bytes,
          imageUrl: url,
          adjustments: { rotation, crop, contrast, sharpen },
        });
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "The decode step failed.",
        );
      } finally {
        setScanning(false);
      }
    },
    [api, rotation, crop, contrast, sharpen],
  );

  const load = useCallback(
    async (file: File) => {
      setError(null);
      release();
      try {
        const raster = await fileToRaster(file);
        const url = URL.createObjectURL(file);
        urlRef.current = url;
        setLoaded({ name: file.name, bytes: file.size, url, raster });
        setRotation(0);
        setCrop(null);
        await runScan(raster, file.name, file.size, url);
      } catch (caught) {
        release();
        setLoaded(null);
        setError(
          caught instanceof ImageLoadError
            ? caught.message
            : caught instanceof Error
              ? caught.message
              : "This image could not be read.",
        );
      }
    },
    [release, runScan],
  );

  // Paste an image straight from the clipboard — the fastest path for a
  // screenshot, which is usually already copied.
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      const item = Array.from(event.clipboardData?.items ?? []).find((entry) =>
        entry.type.startsWith("image/"),
      );
      const file = item?.getAsFile();
      if (!file) return;
      event.preventDefault();
      void blobToRaster(file, "Pasted image").then(
        (raster) => {
          release();
          const url = URL.createObjectURL(file);
          urlRef.current = url;
          setLoaded({ name: "Pasted image", bytes: file.size, url, raster });
          setRotation(0);
          setCrop(null);
          void runScan(raster, "Pasted image", file.size, url);
        },
        (caught: unknown) =>
          setError(
            caught instanceof Error
              ? caught.message
              : "The pasted image failed to load.",
          ),
      );
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [release, runScan]);

  const retry = () => {
    if (!loaded) return;
    void runScan(loaded.raster, loaded.name, loaded.bytes, loaded.url);
  };

  const clear = () => {
    release();
    setLoaded(null);
    setCrop(null);
    setRotation(0);
    setError(null);
  };

  return (
    <div className="scanner-upload">
      <div
        className={dragging ? "scanner-dropzone dragging" : "scanner-dropzone"}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void load(file);
        }}
      >
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void load(file);
            event.target.value = "";
          }}
          aria-label="Choose an image to scan"
        />
        <ImagePlus size={34} aria-hidden="true" />
        <p>
          <strong>Drop an image or screenshot here</strong>
        </p>
        <small>
          JPG, PNG, WebP, GIF (first frame), BMP and AVIF. HEIC works only where
          your browser can decode it — Safari, today. Up to 25 MB and 40 MP.
        </small>
        <div className="scanner-dropzone-actions">
          <button
            type="button"
            className="primary"
            onClick={() => inputRef.current?.click()}
            disabled={scanning}
          >
            <ImagePlus size={16} /> Browse files
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              setError(
                "Press Ctrl+V (⌘V on a Mac) to paste a screenshot from the clipboard.",
              )
            }
          >
            <ClipboardPaste size={16} /> Paste
          </button>
        </div>
        <small className="scanner-dropzone-note">
          On a phone, “Browse files” opens the gallery or the camera roll.
        </small>
      </div>

      {error && (
        <p className="status error" role="alert">
          <TriangleAlert size={14} aria-hidden="true" /> {error}
        </p>
      )}

      {loaded && (
        <div className="scanner-adjust">
          <div className="scanner-adjust-head">
            <span className="scanner-adjust-file" title={loaded.name}>
              {loaded.name}
            </span>
            <span className="scanner-adjust-meta">
              {loaded.raster.width} × {loaded.raster.height} px
            </span>
          </div>
          <div className="scanner-adjust-tools">
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setRotation(((rotation + 90) % 360) as ImageRotation)
              }
            >
              <RotateCw size={15} /> Rotate 90°
            </button>
            <button
              type="button"
              className={showAdjust ? "secondary active" : "secondary"}
              onClick={() => setShowAdjust((value) => !value)}
              aria-expanded={showAdjust}
            >
              <SlidersHorizontal size={15} /> Adjust
            </button>
            <button type="button" className="secondary" onClick={clear}>
              <Trash2 size={15} /> Remove
            </button>
          </div>

          {showAdjust && (
            <div className="scanner-adjust-panel">
              <label>
                Contrast <span>{contrast.toFixed(2)}×</span>
                <input
                  type="range"
                  min={0.6}
                  max={2.4}
                  step={0.05}
                  value={contrast}
                  onChange={(event) => setContrast(Number(event.target.value))}
                />
              </label>
              <label>
                Sharpen <span>{sharpen.toFixed(1)}×</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={sharpen}
                  onChange={(event) => setSharpen(Number(event.target.value))}
                />
              </label>
              <div className="scanner-adjust-crop">
                <span>
                  <Crop size={14} aria-hidden="true" /> Crop before scanning
                </span>
                <p>
                  Drag a box over the preview to scan only that region — useful
                  for a screenshot with one small code among other content.
                </p>
                <CropEditor
                  image={loaded.url}
                  raster={loaded.raster}
                  rotation={rotation}
                  crop={crop}
                  onCrop={setCrop}
                />
                {crop && (
                  <button
                    type="button"
                    className="scanner-link-button"
                    onClick={() => setCrop(null)}
                  >
                    Clear crop
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="scanner-adjust-preview">
            <img
              src={loaded.url}
              alt={`Preview of ${loaded.name}`}
              style={{
                transform: `rotate(${rotation}deg)`,
                maxHeight: 260,
              }}
            />
          </div>

          <div className="scanner-adjust-actions">
            <button
              type="button"
              className="primary"
              onClick={retry}
              disabled={scanning}
            >
              <ScanLine size={16} /> {scanning ? "Scanning…" : "Scan again"}
            </button>
            <span className="scanner-hint-inline">
              Retry after rotating or cropping if the first pass found nothing.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A drag-a-box crop editor.
 *
 * The crop is stored as fractions of the image, so the same rectangle applies to
 * the full-resolution raster as to the preview thumbnail. Pointer events are
 * used rather than mouse events so a finger works on a phone.
 */
function CropEditor({
  image,
  raster,
  rotation,
  crop,
  onCrop,
}: {
  image: string;
  raster: Raster;
  rotation: ImageRotation;
  crop: CropRect | null;
  onCrop: (crop: CropRect | null) => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  const rotated = rotation === 90 || rotation === 270;
  const width = rotated ? raster.height : raster.width;
  const height = rotated ? raster.width : raster.height;

  const fraction = (event: React.PointerEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
  };

  return (
    <div
      ref={boxRef}
      className="scanner-crop"
      style={{ aspectRatio: `${width} / ${height}` }}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = fraction(event);
        setDrag(point);
        onCrop({ x: point.x, y: point.y, width: 0, height: 0 });
      }}
      onPointerMove={(event) => {
        if (!drag) return;
        const point = fraction(event);
        onCrop({
          x: Math.min(drag.x, point.x),
          y: Math.min(drag.y, point.y),
          width: Math.abs(point.x - drag.x),
          height: Math.abs(point.y - drag.y),
        });
      }}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
      role="presentation"
    >
      <img src={image} alt="" style={{ transform: `rotate(${rotation}deg)` }} />
      {crop && crop.width > 0.01 && crop.height > 0.01 && (
        <span
          className="scanner-crop-box"
          style={{
            left: `${crop.x * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${crop.width * 100}%`,
            height: `${crop.height * 100}%`,
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
