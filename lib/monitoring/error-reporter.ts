/**
 * Opt-in, privacy-preserving error-monitoring boundary for QUICKKIT.
 *
 * Design guarantees:
 * - Remains strictly OFF ("Not configured") unless the owner explicitly enables
 *   monitoring AND configures a valid DSN through environment variables.
 * - Never exposes, logs, or returns DSN credentials or secret values.
 * - Scrubs tokens, cookies, email addresses, query strings, and user payloads
 *   before forwarding any sanitized event to an optionally registered adapter.
 * - Fails silently (never breaks rendering or request handling).
 */

export type ErrorMonitoringStatus = {
  configured: boolean;
  enabled: boolean;
  dsnPresent: boolean;
  statusLabel: string;
};

export type SanitizedErrorEvent = {
  name: string;
  message: string;
  scope: string;
  digest?: string;
  timestamp: string;
};

export type ErrorReporterAdapter = (event: SanitizedErrorEvent) => void;

let registeredAdapter: ErrorReporterAdapter | null = null;

function isTruthyFlag(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function isValidMonitoringDsn(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 512) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Reports strictly boolean readiness and a safe label.
 * Never returns the DSN, host, project ID, or credentials.
 */
export function getErrorMonitoringStatus(): ErrorMonitoringStatus {
  const enabled = isTruthyFlag(
    process.env.ERROR_MONITORING_ENABLED ??
      process.env.NEXT_PUBLIC_ERROR_MONITORING_ENABLED,
  );
  const dsnPresent = isValidMonitoringDsn(
    process.env.ERROR_MONITORING_DSN ??
      process.env.NEXT_PUBLIC_ERROR_MONITORING_DSN,
  );
  const configured = enabled && dsnPresent;

  return {
    configured,
    enabled,
    dsnPresent,
    statusLabel: configured
      ? "Configured (opt-in adapter ready)"
      : dsnPresent && !enabled
        ? "DSN present · disabled by flag"
        : "Not configured",
  };
}

const SENSITIVE_PATTERNS: [RegExp, string][] = [
  [/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]"],
  [
    /\b(?:eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g,
    "[redacted-jwt]",
  ],
  [
    /\b(?:sb_secret_|sbp_|sk_live_|sk_test_|re_|ghp_|gho_)[A-Za-z0-9_-]{6,}\b/gi,
    "[redacted-secret]",
  ],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[redacted-email]"],
  [
    /([?&](?:token|key|secret|password|auth|code|session|email)=)[^&\s]+/gi,
    "$1[redacted]",
  ],
  [/https?:\/\/[^/\s:@]+:[^/\s@]+@/gi, "https://[redacted]@"],
];

export function scrubSensitiveText(input: string, maxLength = 240): string {
  let clean = input.replace(/[\r\n\t]+/g, " ").trim();
  for (const [pattern, replacement] of SENSITIVE_PATTERNS) {
    clean = clean.replace(pattern, replacement);
  }
  if (clean.length > maxLength) {
    return `${clean.slice(0, maxLength - 1)}…`;
  }
  return clean;
}

export function sanitizeErrorForMonitoring(
  error: unknown,
  scope: string,
): SanitizedErrorEvent {
  const errObj =
    error && typeof error === "object"
      ? (error as { name?: unknown; message?: unknown; digest?: unknown })
      : null;

  const rawName =
    errObj && typeof errObj.name === "string" && errObj.name.trim()
      ? errObj.name
      : "ApplicationError";
  const rawMessage =
    errObj && typeof errObj.message === "string" && errObj.message.trim()
      ? errObj.message
      : typeof error === "string" && error.trim()
        ? error
        : "An unexpected application error occurred.";
  const digest =
    errObj && typeof errObj.digest === "string" && errObj.digest.trim()
      ? scrubSensitiveText(errObj.digest, 64)
      : undefined;

  return {
    name: scrubSensitiveText(rawName, 64),
    message: scrubSensitiveText(rawMessage, 240),
    scope: scrubSensitiveText(scope || "app", 64),
    ...(digest ? { digest } : {}),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Registers a concrete SDK adapter (e.g., Sentry) only when the owner elects
 * to connect an external provider. Pass `null` to clear.
 */
export function registerErrorReporterAdapter(
  adapter: ErrorReporterAdapter | null,
): void {
  registeredAdapter = adapter;
}

/**
 * Safe error-capture hook for React error boundaries and server handlers.
 * Strictly no-ops when error monitoring is not configured or no adapter is
 * registered. Never throws and never leaks sensitive details.
 */
export function captureHandledError(
  error: unknown,
  scope: string,
): SanitizedErrorEvent | null {
  const status = getErrorMonitoringStatus();
  if (!status.configured || !registeredAdapter) {
    return null;
  }
  const event = sanitizeErrorForMonitoring(error, scope);
  try {
    registeredAdapter(event);
    return event;
  } catch {
    return null;
  }
}
