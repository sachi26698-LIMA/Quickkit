/**
 * Camera support: capability detection, constraint building, error translation
 * and frame capture.
 *
 * The honest parts of this file are the boring ones. `canUseCamera()` checks
 * the secure-context requirement *before* asking for a permission, because on a
 * plain-http origin `getUserMedia` does not exist and a "permission denied"
 * message would be a lie. Every browser error is translated into something the
 * user can act on, and anything unknown keeps its original message rather than
 * being flattened into "something went wrong".
 */
import type { CameraResolution } from "./settings";
import { cameraConstraints } from "./settings";
import type { Raster } from "./types";

export type CameraError = {
  /** Machine-readable reason, used to pick the guidance copy. */
  code:
    | "insecure-context"
    | "unsupported"
    | "permission-denied"
    | "no-camera"
    | "in-use"
    | "constraints"
    | "unknown";
  title: string;
  message: string;
};

export type CameraCapabilities = {
  torch: boolean;
  zoom: { min: number; max: number; step: number } | null;
  focusMode: string[] | null;
};

/**
 * Whether the current document may even attempt camera access. A preview
 * iframe, a plain-http page or an older browser all fail differently, and each
 * gets its own explanation.
 */
export function cameraSupport():
  { ok: true } | { ok: false; error: CameraError } {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    return {
      ok: false,
      error: {
        code:
          typeof window !== "undefined" && !window.isSecureContext
            ? "insecure-context"
            : "unsupported",
        title:
          typeof window !== "undefined" && !window.isSecureContext
            ? "Camera needs a secure connection"
            : "This browser cannot open a camera",
        message:
          typeof window !== "undefined" && !window.isSecureContext
            ? "Browsers only allow camera access on HTTPS (or localhost). This page is served over HTTP, so the camera API is disabled. Upload an image or use another device with a secure connection for live scanning."
            : "navigator.mediaDevices.getUserMedia is unavailable here — this is usually an embedded browser or an older version. Uploading an image works everywhere.",
      },
    };
  if (typeof window !== "undefined" && !window.isSecureContext)
    return {
      ok: false,
      error: {
        code: "insecure-context",
        title: "Camera needs a secure connection",
        message:
          "Browsers only allow camera access on HTTPS (or localhost). Open this page over HTTPS, or upload an image instead — upload and batch scanning are not affected.",
      },
    };
  return { ok: true };
}

/** Translate a getUserMedia rejection into actionable copy. */
export function describeCameraError(error: unknown): CameraError {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return {
        code: "permission-denied",
        title: "Camera permission was blocked",
        message:
          "Your browser or this site's settings are blocking the camera. Allow camera access for this page in the address-bar permissions, then press Start again. Nothing is recorded or uploaded — the video stream is read frame by frame on this device only.",
      };
    case "NotFoundError":
    case "OverconstrainedError":
      return {
        code: "no-camera",
        title: "No matching camera found",
        message:
          "No camera matched the requested settings. Pick a different camera, or switch the resolution back to Auto.",
      };
    case "NotReadableError":
    case "AbortError":
      return {
        code: "in-use",
        title: "The camera is busy",
        message:
          "Another app or tab is already using this camera. Close the other video app or tab, then try again.",
      };
    case "TypeError":
      return {
        code: "constraints",
        title: "Camera settings not supported",
        message:
          "The browser rejected the requested camera settings. Trying Auto resolution usually fixes this.",
      };
    default:
      return {
        code: "unknown",
        title: "The camera could not start",
        message:
          error instanceof Error && error.message
            ? `${error.message} — try Auto resolution, another camera, or upload an image instead.`
            : "An unexpected error stopped the camera. Try Auto resolution, another camera, or upload an image instead.",
      };
  }
}

/** Extended capabilities that exist on the wire but not in lib.dom. */
type ExtendedCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
  zoom?: { min: number; max: number; step: number };
  focusMode?: string[];
};

const capabilitiesOf = (track: MediaStreamTrack): ExtendedCapabilities => {
  const withCapabilities = track as MediaStreamTrack & {
    getCapabilities?: () => ExtendedCapabilities;
  };
  return withCapabilities.getCapabilities?.() ?? {};
};

/** What this specific track can actually do — sometimes nothing beyond video. */
export function readCapabilities(track: MediaStreamTrack): CameraCapabilities {
  const caps = capabilitiesOf(track);
  return {
    torch: Boolean(caps.torch),
    zoom:
      caps.zoom &&
      Number.isFinite(caps.zoom.max) &&
      caps.zoom.max > caps.zoom.min
        ? {
            min: caps.zoom.min,
            max: caps.zoom.max,
            step: caps.zoom.step || 0.1,
          }
        : null,
    focusMode: Array.isArray(caps.focusMode) ? caps.focusMode : null,
  };
}

/** Apply an advanced constraint, reporting whether the device accepted it. */
export async function applyAdvanced(
  track: MediaStreamTrack,
  constraints: Record<string, unknown>,
): Promise<boolean> {
  try {
    await track.applyConstraints({
      advanced: [constraints],
    } as MediaTrackConstraints);
    return true;
  } catch {
    return false;
  }
}

/** A camera list entry that is safe to render even before labels are exposed. */
export type CameraDevice = { deviceId: string; label: string; facing: string };

export async function listCameras(): Promise<CameraDevice[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      // Labels are empty until permission is granted; number them honestly
      // rather than inventing "Front"/"Rear" for hardware we cannot identify.
      label: device.label || `Camera ${index + 1}`,
      // `facingMode` is a per-track capability; MediaDeviceInfo does not expose
      // it, so it is read best-effort and left blank when unavailable.
      facing:
        (
          device as MediaDeviceInfo & {
            getCapabilities?: () => { facingMode?: string[] };
          }
        ).getCapabilities?.().facingMode?.[0] ?? "",
    }));
}

/**
 * Choose the first device that can satisfy the request, preferring the
 * environment-facing camera on phones. Returns null to mean "let the browser
 * decide", which is the most compatible option.
 */
export function preferDevice(devices: CameraDevice[]): string | null {
  if (!devices.length) return null;
  const rear = devices.find((device) => device.facing === "environment");
  return (rear ?? devices[0]).deviceId || null;
}

/**
 * Grab one frame from a playing video element.
 *
 * The frame is downscaled to at most 1080 px on its long edge before decoding:
 * a 4K camera frame carries no extra decodable information but costs four times
 * the memory and time per pass.
 */
export function captureFrame(
  video: HTMLVideoElement,
  options: { maxSide?: number; canvas?: HTMLCanvasElement } = {},
): Raster | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;
  const maxSide = options.maxSide ?? 1080;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = options.canvas ?? document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, targetWidth, targetHeight);
  const data = context.getImageData(0, 0, targetWidth, targetHeight);
  return {
    width: targetWidth,
    height: targetHeight,
    rgba: new Uint8ClampedArray(data.data),
  };
}

/** Should the capture loop keep running at the requested resolution? */
export function captureMaxSide(resolution: CameraResolution): number {
  return resolution === "720" ? 720 : resolution === "1440" ? 1440 : 1080;
}

export { cameraConstraints };
