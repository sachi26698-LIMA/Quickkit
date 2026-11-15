import "server-only";

/**
 * Safeguard contract for any future owner-triggered SMTP / delivery test email.
 *
 * Policy enforced by QUICKKIT release readiness:
 * 1. Test emails are NEVER sent automatically (never in builds, health checks,
 *    page loads, or background jobs).
 * 2. Every test email requires an explicit, authenticated owner trigger.
 * 3. Every test email requires explicit typed recipient confirmation matching
 *    the target address (`confirmedRecipient === recipient`).
 * 4. Arbitrary third-party recipients, email lists, and header-injection
 *    characters (CR/LF) are rejected.
 * 5. SMTP credentials are managed externally in Supabase Auth and are never
 *    read, returned, or logged by this module.
 */

export type TestEmailGuardInput = {
  actorEmail: string;
  allowlist: ReadonlySet<string>;
  recipient: string;
  confirmedRecipient: string;
  explicitOwnerApproval: boolean;
};

export type TestEmailGuardResult =
  | { ok: true; recipient: string; actorEmail: string }
  | {
      ok: false;
      code:
        | "approval_required"
        | "actor_not_allowlisted"
        | "invalid_recipient"
        | "confirmation_mismatch"
        | "recipient_not_allowlisted";
      error: string;
    };

const SINGLE_EMAIL_PATTERN =
  /^[^\s@,;<>()[\]\\]+@[^\s@,;<>()[\]\\]+\.[^\s@,;<>()[\]\\]{2,}$/;

function normalizeSingleEmail(value: string): string | null {
  if (typeof value !== "string") return null;
  if (/[\r\n\0]/.test(value)) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized.length > 254) return null;
  if (!SINGLE_EMAIL_PATTERN.test(normalized)) return null;
  return normalized;
}

export function validateOwnerTestEmailRequest(
  input: TestEmailGuardInput,
): TestEmailGuardResult {
  if (input.explicitOwnerApproval !== true) {
    return {
      ok: false,
      code: "approval_required",
      error:
        "Explicit owner approval is required before triggering a test email.",
    };
  }

  const actor = normalizeSingleEmail(input.actorEmail);
  if (!actor || !input.allowlist.has(actor)) {
    return {
      ok: false,
      code: "actor_not_allowlisted",
      error: "Only an allowlisted administrator may trigger a test email.",
    };
  }

  const recipient = normalizeSingleEmail(input.recipient);
  if (!recipient) {
    return {
      ok: false,
      code: "invalid_recipient",
      error: "Enter a single valid recipient email address.",
    };
  }

  const confirmed = normalizeSingleEmail(input.confirmedRecipient);
  if (!confirmed || confirmed !== recipient) {
    return {
      ok: false,
      code: "confirmation_mismatch",
      error:
        "Recipient confirmation must exactly match the target email address.",
    };
  }

  if (!input.allowlist.has(recipient)) {
    return {
      ok: false,
      code: "recipient_not_allowlisted",
      error:
        "Test emails may only be sent to an explicitly allowlisted owner address.",
    };
  }

  return { ok: true, recipient, actorEmail: actor };
}
