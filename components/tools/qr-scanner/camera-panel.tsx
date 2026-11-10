"use client";
/**
 * Live camera scanner.
 *
 * The loop is deliberately conservative: one frame is decoded at a time, on a
 * timer, and a new frame is not captured until the previous decode has settled.
 * A faster loop would queue frames and grow memory without finding codes any
 * sooner. When a symbol is read the loop pauses for a moment so the UI can show
 * the result instead of re-reading the same code sixty times a second.
 *
 * Every stream this component opens is closed on stop, on unmount and on
 * `visibilitychange` to hidden — a background tab must not hold the camera LED
 * on.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera as CameraIcon,
  CameraOff,
  Flashlight,
  Focus,
  Pause,
  Play,
  RefreshCw,
  TriangleAlert,
  ZoomIn,
} from "lucide-react";
import {
  applyAdvanced,
  cameraSupport,
  captureFrame,
  captureMaxSide,
  describeCameraError,
  listCameras,
  readCapabilities,
  type CameraCapabilities,
  type CameraDevice,
  type CameraError,
} from "@/lib/tools/qr-scanner/camera";
import {
  cameraConstraints,
  type CameraResolution,
} from "@/lib/tools/qr-scanner/settings";
import type { ScannerApi } from "./use-scanner";

const RESOLUTIONS: { id: CameraResolution; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "720", label: "720p" },
  { id: "1080", label: "1080p" },
  { id: "1440", label: "1440p" },
];

export default function CameraPanel({ api }: { api: ScannerApi }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const decodeBusy = useRef(false);
  const cooldownUntil = useRef(0);
  const mounted = useRef(true);

  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(
    null,
  );
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [continuous, setContinuous] = useState(api.settings.continuous);
  const [status, setStatus] = useState("Camera is off.");

  /**
   * Capability is resolved after mount, never during render: the server has no
   * `navigator`, so deciding here would make the first client render disagree
   * with the HTML that was sent.
   */
  const [support, setSupport] = useState<
    { ok: true } | { ok: false; error: CameraError } | null
  >(null);

  useEffect(() => {
    // Deferred by a tick so the first paint is untouched and the effect does not
    // cascade a render straight back into itself.
    const timer = setTimeout(() => setSupport(cameraSupport()), 0);
    return () => clearTimeout(timer);
  }, []);

  const stop = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
    setTorchOn(false);
    setCapabilities(null);
    setStatus("Camera is off.");
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const stream = streamRef.current;
      if (stream) for (const track of stream.getTracks()) track.stop();
      streamRef.current = null;
    };
  }, []);

  // Release the camera when the tab is hidden; nothing should film a pocket.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        stop();
        setStatus("Camera stopped because this tab went to the background.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stop]);

  const findCode = useCallback(async () => {
    const video = videoRef.current;
    if (!video || decodeBusy.current || api.popupItem) return;
    if (Date.now() < cooldownUntil.current) return;
    decodeBusy.current = true;
    try {
      const raster = captureFrame(video, {
        maxSide: captureMaxSide(api.settings.cameraResolution),
        canvas: canvasRef.current ?? undefined,
      });
      if (!raster) return;
      // One decode per frame: probe, decide, commit. Never two.
      const decoded = await api.decodeOnly(raster, { profile: "frame" });
      const first = decoded.symbols[0];
      if (!first) {
        setStatus("Scanning… no code in this frame yet.");
        return;
      }
      const verdict = api.checkDuplicate(first.data);
      if (verdict.suppress) {
        setStatus(
          verdict.reason === "listed"
            ? "That code is already in the results — clear the results to scan it again as a new entry."
            : "The same code was just read — waiting so it does not repeat. Point at a different code.",
        );
        // Back off briefly so the same frame is not re-scanned immediately.
        cooldownUntil.current = Date.now() + 1200;
        return;
      }
      const committed = api.commitDecoded(raster, decoded, {
        sourceName: "Camera capture",
        openPopup: true,
      });
      if (api.settings.sound) beep();
      if (api.settings.vibration && "vibrate" in navigator)
        navigator.vibrate?.(60);
      if (api.settings.autoCopy) void copy(first.data);
      setStatus(
        `Decoded a ${committed.symbols.length > 1 ? `${committed.symbols.length} codes` : "code"} — ${first.data.slice(0, 60)}`,
      );
      // Let the result land before scanning again.
      cooldownUntil.current = Date.now() + (continuous ? 1500 : 4000);
      if (!continuous) setPaused(true);
    } finally {
      decodeBusy.current = false;
    }
  }, [api, continuous]);

  // The scanning loop: a timeout chain, never an interval, so a slow decode
  // cannot stack up behind a fast camera.
  useEffect(() => {
    if (!active || paused) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      if (cancelled) return;
      await findCode();
      if (cancelled) return;
      timer = setTimeout(tick, 220);
    };
    timer = setTimeout(tick, 320);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, paused, findCode]);

  const start = useCallback(
    async (nextDeviceId?: string) => {
      const current = cameraSupport();
      setSupport(current);
      if (!current.ok) {
        setError(current.error);
        return;
      }
      setStarting(true);
      setError(null);
      stop();
      try {
        const constraints = cameraConstraints(
          api.settings.cameraResolution,
          nextDeviceId ?? undefined,
        );
        const stream = await navigator.mediaDevices.getUserMedia({
          video: constraints,
          audio: false,
        });
        if (!mounted.current) {
          for (const track of stream.getTracks()) track.stop();
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => {
            /* autoplay can be refused; the frame grab still works once playing */
          });
        }
        const track = stream.getVideoTracks()[0];
        if (track) {
          setCapabilities(readCapabilities(track));
          const settings = track.getSettings();
          setZoom(
            (settings as MediaTrackSettings & { zoom?: number }).zoom ?? 1,
          );
          if (!nextDeviceId && settings.deviceId)
            setDeviceId(settings.deviceId);
        }
        setCameras(await listCameras());
        setActive(true);
        setPaused(false);
        setStatus("Camera is on. Point it at a QR code.");
      } catch (caught) {
        setError(describeCameraError(caught));
        stop();
      } finally {
        setStarting(false);
      }
    },
    [api.settings.cameraResolution, stop],
  );

  // Device labels only appear after permission, so refresh the list on start.
  useEffect(() => {
    if (!active) return;
    void listCameras().then(setCameras);
  }, [active]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    const ok = await applyAdvanced(track, { torch: next });
    if (ok) setTorchOn(next);
    else setStatus("This camera refused the torch setting.");
  };

  const changeZoom = async (value: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const ok = await applyAdvanced(track, { zoom: value });
    if (ok) setZoom(value);
    else setStatus("This camera does not accept zoom changes.");
  };

  return (
    <div className="scanner-camera">
      <div className={active ? "scanner-stage is-live" : "scanner-stage"}>
        <video
          ref={videoRef}
          className="scanner-video"
          playsInline
          muted
          aria-label="Camera preview"
        />
        <canvas ref={canvasRef} className="sr-only" aria-hidden="true" />
        {!active && (
          <div className="scanner-stage-empty">
            <CameraIcon size={38} aria-hidden="true" />
            <p>
              {error
                ? error.title
                : support?.ok === false
                  ? support.error.title
                  : "The camera is off"}
            </p>
            <small>
              {error
                ? error.message
                : support?.ok === false
                  ? support.error.message
                  : "Press Start camera, or switch to Upload Image to scan a photo or screenshot."}
            </small>
          </div>
        )}
        {active && (
          <>
            <div className="scanner-reticle" aria-hidden="true">
              <span className="scanner-corner tl" />
              <span className="scanner-corner tr" />
              <span className="scanner-corner bl" />
              <span className="scanner-corner br" />
              {!paused && <span className="scanner-sweep" />}
            </div>
            {paused && (
              <div className="scanner-paused" role="status">
                <Pause size={16} aria-hidden="true" /> Scanner paused
              </div>
            )}
          </>
        )}
      </div>

      <p className="scanner-status" role="status" aria-live="polite">
        {error ? (
          <>
            <TriangleAlert size={14} aria-hidden="true" /> {error.title}
          </>
        ) : (
          status
        )}
      </p>

      <div className="scanner-controls">
        {!active ? (
          <button
            type="button"
            className="primary"
            onClick={() => void start(deviceId ?? undefined)}
            disabled={starting || support?.ok === false}
          >
            <CameraIcon size={16} /> {starting ? "Starting…" : "Start camera"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="primary"
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button type="button" className="secondary" onClick={stop}>
              <CameraOff size={16} /> Stop
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void start(deviceId ?? undefined)}
            >
              <RefreshCw size={16} /> Restart
            </button>
          </>
        )}
        {active && (
          <label className="scanner-inline-toggle">
            <input
              type="checkbox"
              checked={continuous}
              onChange={(event) => {
                setContinuous(event.target.checked);
                api.updateSettings({ continuous: event.target.checked });
              }}
            />
            Continuous scanning
          </label>
        )}
      </div>

      {active && (
        <div className="scanner-camera-options">
          {cameras.length > 1 && (
            <label>
              Camera
              <select
                value={deviceId ?? ""}
                onChange={(event) => {
                  const next = event.target.value || null;
                  setDeviceId(next);
                  void start(next ?? undefined);
                }}
              >
                {cameras.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Resolution
            <select
              value={api.settings.cameraResolution}
              onChange={(event) => {
                api.updateSettings({
                  cameraResolution: event.target.value as CameraResolution,
                });
                void start(deviceId ?? undefined);
              }}
            >
              {RESOLUTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {capabilities?.torch && (
            <button
              type="button"
              className={torchOn ? "scanner-chip active" : "scanner-chip"}
              onClick={() => void toggleTorch()}
              aria-pressed={torchOn}
            >
              <Flashlight size={15} /> Torch
            </button>
          )}
          {capabilities?.zoom && (
            <label className="scanner-zoom">
              <ZoomIn size={15} aria-hidden="true" />
              <input
                type="range"
                min={capabilities.zoom.min}
                max={capabilities.zoom.max}
                step={capabilities.zoom.step}
                value={zoom}
                onChange={(event) =>
                  void changeZoom(Number(event.target.value))
                }
                aria-label="Camera zoom"
              />
              <span>{zoom.toFixed(1)}×</span>
            </label>
          )}
          {capabilities?.focusMode?.includes("continuous") && (
            <span className="scanner-capability">
              <Focus size={14} aria-hidden="true" /> Continuous autofocus
            </span>
          )}
        </div>
      )}

      {active && (
        <p className="scanner-hint">
          Only the camera stream is used — frames are decoded in this tab and
          discarded. Nothing is recorded, uploaded or sent anywhere.
        </p>
      )}
    </div>
  );
}

/** A short, quiet confirmation tone: 18 ms of a 1.4 kHz sine. */
function beep() {
  try {
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 1400;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.05);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // A blocked AudioContext is not worth a message.
  }
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* clipboard permission is optional */
  }
}
