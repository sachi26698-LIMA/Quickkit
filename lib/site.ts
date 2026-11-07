// ─────────────────────────────────────────────────────────────────────────────
// QUICKKIT site configuration — replace these demo values with the real ones
// when they are ready. Everything user-facing reads from this single file.
//
// Nothing in this file invents a legal identity. Values left empty in
// `ownerDetails` are shown on the legal pages as an explicitly marked
// placeholder ("Owner to supply") rather than being guessed.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Owner-supplied legal and organisational details.
 *
 * Every empty string below renders as the shared "Owner to supply" marker with
 * the reason attached, so a reader is never shown a fake registration number,
 * a fake address or an unverified jurisdiction. Fill a field in and the marker
 * disappears from every page at once — no page edits needed.
 *
 * QUICKKIT is a brand name, not a registered entity claim. See
 * `docs/LEGAL_PAGES.md` for the full checklist behind these fields.
 */
export const ownerDetails = {
  /** Verified, monitored public contact inbox shown on every page. */
  publicEmail: "",
  /** Registered / trading legal name of the person or company operating QUICKKIT. */
  legalName: "",
  /** Country (and region, if relevant) whose law governs the terms. */
  jurisdiction: "India",
  /** Postal address, only if your jurisdiction requires it to be published. */
  postalAddress: "",
  /** Company registration / tax identifier, only if publication is required. */
  registrationNumber: "",
  /** Verified, monitored privacy-request inbox. Falls back to contactEmail. */
  privacyEmail: "",
  /** Verified security-report inbox. Falls back to contactEmail. */
  securityEmail: "",
  /** Copyright/DMCA agent contact. Falls back to contactEmail. */
  copyrightEmail: "",
  /** Business, licensing and partnership inbox. Falls back to contactEmail. */
  businessEmail: "",
  /** Optional: named data-protection contact or representative, if appointed. */
  dataProtectionContact: "",
  /** Minimum age the operator has decided the service is intended for. */
  minimumAge: "",
} as const;

export type OwnerDetailKey = keyof typeof ownerDetails;

/** True when the operator has supplied a real value for this field. */
export function hasOwnerDetail(key: OwnerDetailKey): boolean {
  return ownerDetails[key].trim().length > 0;
}

/** The operator-provided value, or `undefined` when still missing. */
export function ownerDetail(key: OwnerDetailKey): string | undefined {
  const value = ownerDetails[key].trim();
  return value.length ? value : undefined;
}

/**
 * Public contact inbox.
 *
 * `hello@quickkit.in` is a *demo* address that was placed in this repository
 * during development. It has never been confirmed as a real, monitored inbox,
 * so it is deliberately NOT published: every contact surface renders the
 * shared "Owner to supply" marker instead of an address that might silently
 * drop a visitor's message.
 *
 * Set `ownerDetails.publicEmail` (below) to a verified address and it replaces
 * the marker everywhere at once — pages, footer-side links, contact form and
 * the per-channel routing.
 */
export const contactEmail: string | null =
  ownerDetails.publicEmail.trim() || null;

/**
 * True only when a verified public inbox has been configured. UI that would
 * otherwise print an address must branch on this and show the owner-input
 * placeholder when it is false.
 */
export const contactEmailVerified = contactEmail !== null;

/**
 * Optional contact-form endpoint (e.g. Formspree, Resend, or your own API).
 * Leave empty to use the built-in fallback, which opens the visitor's email
 * app with a pre-filled message (mailto:) — no data touches a server.
 * When set, the form POSTs JSON: { name, email, subject, message }.
 */
export const contactFormEndpoint = "";

/**
 * Whether the social row is shown at all.
 *
 * The URLs below are *demo* links to guessable `/quickkit` handles that were
 * never confirmed to belong to the operator. Publishing unverified profiles is a
 * trust signal against the site (and can point visitors at a stranger's account),
 * so the row is hidden until real profiles exist: set this to `true` after
 * replacing every URL below with a verified one.
 */
export const socialsVisible = false;

/** Demo social profiles — replace each URL with the real QUICKKIT account. */
export const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/quickkit",
    icon: "instagram",
  },
  {
    label: "Facebook",
    href: "https://facebook.com/quickkit",
    icon: "facebook",
  },
  { label: "X (Twitter)", href: "https://x.com/quickkit", icon: "x" },
  { label: "YouTube", href: "https://youtube.com/@quickkit", icon: "youtube" },
  { label: "GitHub", href: "https://github.com/quickkit", icon: "github" },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/company/quickkit",
    icon: "linkedin",
  },
] as const;
export type SocialIcon = (typeof socials)[number]["icon"];

/**
 * Resolved inbound channel for a kind of request. Each channel prefers the
 * dedicated specialist inbox and falls back to the general contact address,
 * so no page can render an empty or invented address.
 */
export const contactChannels = {
  general: () => contactEmail,
  support: () => contactEmail,
  privacy: () => ownerDetail("privacyEmail") ?? contactEmail,
  security: () => ownerDetail("securityEmail") ?? contactEmail,
  copyright: () => ownerDetail("copyrightEmail") ?? contactEmail,
  business: () => ownerDetail("businessEmail") ?? contactEmail,
} as const;

export type ContactChannel = keyof typeof contactChannels;

export const contactChannelLabels: Record<ContactChannel, string> = {
  general: "General enquiries",
  support: "Technical support & bug reports",
  privacy: "Privacy requests",
  security: "Security reports",
  copyright: "Copyright complaints",
  business: "Business enquiries",
};
