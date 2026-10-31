"use client";
/* Local blob previews must remain in-browser; they are not image-service URLs. */
/* eslint-disable @next/next/no-img-element */
import { useHydrated } from "@/lib/use-hydrated";
import { useEffect, useRef, useState } from "react";
import { preflightImage } from "@/lib/tools/image-header";
import {
  ClipboardPaste,
  Download,
  ImageIcon,
  RotateCcw,
  UploadCloud,
  Wand2,
} from "lucide-react";
import {
  compressImage,
  formatBytes,
  type ImageFormat,
} from "@/lib/tools/image";
import { EmptyState, WorkspaceHeading } from "./tool-ui";

function useObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!blob) return;
    const next = URL.createObjectURL(blob);
    // This state represents an external browser resource; allocation must wait until mount and cleanup revokes it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return blob ? url : "";
}

type Result = { blob: Blob; width: number; height: number; resized: boolean };

export default function ImageCompressor() {
  const ready = useHydrated();
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<ImageFormat>("image/webp");
  const [maxDimension, setMaxDimension] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  const originalUrl = useObjectUrl(file);
  const outputUrl = useObjectUrl(result?.blob || null);

  function invalidate() {
    version.current++;
    setResult(null);
    setError("");
    setBusy(false);
  }

  async function acceptFile(next: File | undefined | null) {
    invalidate();
    setFile(null);
    setOriginalSize(null);
    if (!next) return;
    const id = version.current;
    setBusy(true);
    try {
      const dims = await preflightImage(next);
      if (id === version.current) {
        setFile(next);
        setOriginalSize(dims);
      }
    } catch (err) {
      if (id === version.current) {
        setError(err instanceof Error ? err.message : "Invalid file.");
        if (inputRef.current) inputRef.current.value = "";
      }
    } finally {
      if (id === version.current) setBusy(false);
    }
  }

  async function pasteImage() {
    try {
      if (!navigator.clipboard?.read) throw new Error("unsupported");
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        const ext = type === "image/jpeg" ? "jpg" : type.split("/")[1];
        await acceptFile(new File([blob], `pasted-image.${ext}`, { type }));
        return;
      }
      setError("No image found on the clipboard. Copy an image and try again.");
    } catch {
      setError(
        "Pasting from the clipboard is not available here. Choose or drop a file instead.",
      );
    }
  }

  async function compress() {
    if (!file) {
      setError("Choose an image before compressing.");
      return;
    }
    const id = ++version.current;
    setResult(null);
    setError("");
    setBusy(true);
    try {
      const next = await compressImage(
        file,
        format,
        quality / 100,
        maxDimension || undefined,
      );
      if (id === version.current) setResult(next);
    } catch (e) {
      if (id === version.current)
        setError(
          e instanceof Error
            ? e.message
            : "Image processing failed. Try another image.",
        );
    } finally {
      if (id === version.current) setBusy(false);
    }
  }

  const extension =
    format === "image/jpeg" ? "jpg" : format === "image/png" ? "png" : "webp";
  const saving = file && result ? (1 - result.blob.size / file.size) * 100 : 0;

  return (
    <fieldset
      className="workspace"
      disabled={!ready}
      aria-label="Tool workspace"
    >
      <WorkspaceHeading
        title="Lighten the file. Keep the moment."
        description="Drop, paste or choose an image — then re-encode it locally. Your file never uploads."
      />
      <label htmlFor="image-input">Choose an image</label>
      <div
        className={`dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void acceptFile(e.dataTransfer.files?.[0]);
        }}
      >
        <UploadCloud size={26} aria-hidden="true" />
        <p>
          <strong>Drop an image here</strong> or use the file picker below.
        </p>
        <input
          ref={inputRef}
          id="image-input"
          className="file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby="image-help"
          onChange={(e) => void acceptFile(e.currentTarget.files?.[0])}
        />
        <button type="button" className="toolbar-button" onClick={pasteImage}>
          <ClipboardPaste size={14} /> Paste from clipboard
        </button>
      </div>
      <p id="image-help" className="help">
        JPEG, PNG or WebP · up to 15 MB · up to 24 megapixels / 8,192 px per
        side. Animated images become a single frame. No upload.
      </p>
      {file && originalSize && (
        <div className="meta-chips" aria-label="Selected image">
          <span>{file.name}</span>
          <span>{formatBytes(file.size)}</span>
          <span>
            {originalSize.width} × {originalSize.height} px
          </span>
          <span>{file.type.replace("image/", "").toUpperCase()}</span>
        </div>
      )}
      <div className="settings-grid image-settings">
        <div>
          <label htmlFor="image-format">Output format</label>
          <select
            id="image-format"
            value={format}
            onChange={(e) => {
              invalidate();
              setFormat(e.target.value as ImageFormat);
            }}
          >
            <option value="image/webp">WebP · transparency supported</option>
            <option value="image/jpeg">JPEG · white background</option>
            <option value="image/png">
              PNG · lossless, transparency supported
            </option>
          </select>
        </div>
        <div>
          <label htmlFor="image-size">Max size</label>
          <select
            id="image-size"
            value={maxDimension}
            onChange={(e) => {
              invalidate();
              setMaxDimension(Number(e.target.value));
            }}
          >
            <option value={0}>Original size</option>
            <option value={2048}>Up to 2048 px</option>
            <option value={1280}>Up to 1280 px</option>
            <option value={800}>Up to 800 px</option>
          </select>
        </div>
        <div className="settings-wide">
          <label htmlFor="image-quality">
            Quality {format === "image/png" ? "(not used for PNG)" : ""}
          </label>
          <div className="range-row">
            <input
              id="image-quality"
              type="range"
              min={10}
              max={100}
              disabled={format === "image/png"}
              value={quality}
              onChange={(e) => {
                invalidate();
                setQuality(Number(e.target.value));
              }}
            />
            <output htmlFor="image-quality">{quality}%</output>
          </div>
        </div>
      </div>
      <p className="help">
        JPEG replaces transparency with white; use WebP or PNG to retain it. PNG
        is lossless and may not get smaller. Encoding can remove metadata and
        change color profiles.
      </p>
      <div className="action-row">
        <button className="primary" onClick={compress} disabled={busy}>
          <Wand2 size={16} /> {busy ? "Compressing…" : "Compress image"}
        </button>
        <button
          className="secondary"
          onClick={() => {
            invalidate();
            setFile(null);
            setOriginalSize(null);
            setQuality(80);
            setFormat("image/webp");
            setMaxDimension(0);
            if (inputRef.current) inputRef.current.value = "";
          }}
        >
          <RotateCcw size={15} /> Reset
        </button>
      </div>
      {error && (
        <p className="status error" role="alert">
          Error: {error}
        </p>
      )}
      <div aria-busy={busy}>
        {file ? (
          <div className="preview-grid">
            <div className="preview-box">
              <strong>Original</strong>
              {originalUrl && (
                <img src={originalUrl} alt="Original image preview" />
              )}
              <p>
                {formatBytes(file.size)} ·{" "}
                {file.type.replace("image/", "").toUpperCase()}
                {originalSize
                  ? ` · ${originalSize.width} × ${originalSize.height} px`
                  : ""}
              </p>
            </div>
            <div className="preview-box">
              <strong>Compressed output</strong>
              {result && outputUrl ? (
                <>
                  <img src={outputUrl} alt="Compressed image preview" />
                  <p>
                    {formatBytes(result.blob.size)} · {extension.toUpperCase()}
                    <br />
                    {result.width} × {result.height} pixels ·{" "}
                    {result.resized ? "resized" : "unchanged"}
                  </p>
                  <p className={`status ${saving >= 0 ? "success" : ""}`}>
                    {saving >= 0
                      ? `${saving.toFixed(1)}% smaller — saved ${formatBytes(file.size - result.blob.size)}`
                      : `${Math.abs(saving).toFixed(1)}% larger — try lower quality or a different format.`}
                  </p>
                  <a
                    href={outputUrl}
                    download={`quickkit-compressed.${extension}`}
                    className="primary"
                  >
                    <Download size={16} /> Download image
                  </a>
                </>
              ) : (
                <EmptyState icon={<ImageIcon size={32} />}>
                  {busy
                    ? "Processing on your device…"
                    : "Your compressed preview will appear here."}
                </EmptyState>
              )}
            </div>
          </div>
        ) : (
          <div className="result-panel">
            <EmptyState icon={<ImageIcon size={35} />}>
              Choose a photo to get started.
            </EmptyState>
          </div>
        )}
      </div>
      <p className="sr-only" role="status">
        {busy
          ? "Compressing image."
          : result
            ? "Compression finished. Download is ready."
            : ""}
      </p>
    </fieldset>
  );
}
