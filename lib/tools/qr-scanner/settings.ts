/**
 * Scanner settings: defaults, validation and local persistence.
 *
 * Every value is clamped on read *and* on write. A stored settings blob is user
 * -editable in devtools, and a tampered value must never be able to put the
 * scanner into a state it has no behaviour for (a 0-second auto-clear timer, a
 * negative concurrency, an unknown camera resolution).
 */
export type ScanMode = "camera" | "upload" | "batch" | "history";
export type CameraResolution = "auto" | "720" | "1080" | "1440";
export type Preprocessing = "off" | "light" | "strong";
export type Sensitivity = "strict" | "balanced" | "aggressive";

export type ScannerSettings = {
  continuous: boolean;
  duplicateDetection: boolean;
  /** Copy a freshly decoded payload to the clipboard automatically. */
  autoCopy: boolean;
  /** Open the scan details & redirect popup automatically when a code is scanned. */
  popupOnScan: boolean;
  sound: boolean;
  vibration: boolean;
  /** Seconds before the results clear themselves; 0 disables auto-clear. */
  autoClearSeconds: number;
  cameraResolution: CameraResolution;
  preprocessing: Preprocessing;
  sensitivity: Sensitivity;
  history: boolean;
  /**
   * Store payloads that carry secrets (Wi-Fi passwords, credentials). Off by
   * default: a history entry keeps the *type* and a redacted summary instead.
   */
  storeSensitive: boolean;
  defaultMode: ScanMode;
  exportTimestamps: boolean;
  exportTypes: boolean;
  exportFilenames: boolean;
  exportStatus: boolean;
};

export const SETTINGS_KEY = "qk:qr-scanner-settings:v1";

export const defaultSettings: ScannerSettings = {
  continuous: false,
  duplicateDetection: true,
  autoCopy: false,
  popupOnScan: true,
  sound: true,
  vibration: true,
  autoClearSeconds: 0,
  cameraResolution: "auto",
  preprocessing: "light",
  sensitivity: "balanced",
  history: true,
  storeSensitive: false,
  defaultMode: "camera",
  exportTimestamps: true,
  exportTypes: true,
  exportFilenames: true,
  exportStatus: true,
};

const MODES: ScanMode[] = ["camera", "upload", "batch", "history"];
const RESOLUTIONS: CameraResolution[] = ["auto", "720", "1080", "1440"];
const PREPROCESSING: Preprocessing[] = ["off", "light", "strong"];
const SENSITIVITY: Sensitivity[] = ["strict", "balanced", "aggressive"];

const bool = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const oneOf = <T extends string>(
  value: unknown,
  allowed: T[],
  fallback: T,
): T =>
  typeof value === "string" && (allowed as string[]).includes(value)
    ? (value as T)
    : fallback;

/** Coerce any input — stored JSON, props, a partial patch — into valid settings. */
export function sanitizeSettings(input: unknown): ScannerSettings {
  const raw = (input && typeof input === "object" ? input : {}) as Record<
    string,
    unknown
  >;
  const seconds = Number(raw.autoClearSeconds);
  return {
    continuous: bool(raw.continuous, defaultSettings.continuous),
    duplicateDetection: bool(
      raw.duplicateDetection,
      defaultSettings.duplicateDetection,
    ),
    autoCopy: bool(raw.autoCopy, defaultSettings.autoCopy),
    popupOnScan: bool(raw.popupOnScan, defaultSettings.popupOnScan),
    sound: bool(raw.sound, defaultSettings.sound),
    vibration: bool(raw.vibration, defaultSettings.vibration),
    autoClearSeconds: Number.isFinite(seconds)
      ? Math.min(120, Math.max(0, Math.round(seconds)))
      : defaultSettings.autoClearSeconds,
    cameraResolution: oneOf(
      raw.cameraResolution,
      RESOLUTIONS,
      defaultSettings.cameraResolution,
    ),
    preprocessing: oneOf(
      raw.preprocessing,
      PREPROCESSING,
      defaultSettings.preprocessing,
    ),
    sensitivity: oneOf(
      raw.sensitivity,
      SENSITIVITY,
      defaultSettings.sensitivity,
    ),
    history: bool(raw.history, defaultSettings.history),
    storeSensitive: bool(raw.storeSensitive, defaultSettings.storeSensitive),
    defaultMode: oneOf(raw.defaultMode, MODES, defaultSettings.defaultMode),
    exportTimestamps: bool(
      raw.exportTimestamps,
      defaultSettings.exportTimestamps,
    ),
    exportTypes: bool(raw.exportTypes, defaultSettings.exportTypes),
    exportFilenames: bool(raw.exportFilenames, defaultSettings.exportFilenames),
    exportStatus: bool(raw.exportStatus, defaultSettings.exportStatus),
  };
}

export function loadSettings(
  storage: Pick<Storage, "getItem"> | null,
): ScannerSettings {
  if (!storage) return defaultSettings;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(
  storage: Pick<Storage, "setItem"> | null,
  settings: ScannerSettings,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
    return true;
  } catch {
    // Private mode or a full quota: the scanner keeps working, it just forgets.
    return false;
  }
}

/** Decode-profile knobs derived from the user-facing preprocessing choice. */
export function decodeProfileFor(settings: ScannerSettings): {
  profile: "image" | "frame" | "precise";
  contrast: number;
  sharpen: number;
} {
  const base = { contrast: 1, sharpen: 0 };
  if (settings.preprocessing === "off") return { profile: "image", ...base };
  if (settings.preprocessing === "strong")
    return { profile: "precise", contrast: 1.6, sharpen: 1.1 };
  return { profile: "precise", contrast: 1.25, sharpen: 0.6 };
}

/** Minimum frames between identical results, by sensitivity. */
export function duplicateWindowMs(sensitivity: Sensitivity): number {
  return sensitivity === "aggressive"
    ? 1200
    : sensitivity === "strict"
      ? 6000
      : 3000;
}

/**
 * Ideal camera constraints for the chosen resolution. `auto` asks for 1080p,
 * which every current phone and laptop camera can satisfy or ignore safely.
 */
export function cameraConstraints(
  resolution: CameraResolution,
  deviceId?: string,
): MediaTrackConstraints {
  const height =
    resolution === "720"
      ? 720
      : resolution === "1440"
        ? 1440
        : resolution === "1080"
          ? 1080
          : 1080;
  return {
    ...(deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: { ideal: "environment" } }),
    width: { ideal: Math.round((height * 16) / 9) },
    height: { ideal: height },
  };
}
