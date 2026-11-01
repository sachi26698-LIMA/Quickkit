// ─────────────────────────────────────────────────────────────────────────────
// QUICKKIT site configuration — replace these demo values with the real ones
// when they are ready. Everything user-facing reads from this single file.
// ─────────────────────────────────────────────────────────────────────────────

/** Demo contact inbox shown across the site. Not a verified inbox yet —
 *  swap for the real support address before public launch. */
export const contactEmail = "hello@quickkit.in";

/**
 * Optional contact-form endpoint (e.g. Formspree, Resend, or your own API).
 * Leave empty to use the built-in fallback, which opens the visitor's email
 * app with a pre-filled message (mailto:) — no data touches a server.
 * When set, the form POSTs JSON: { name, email, subject, message }.
 */
export const contactFormEndpoint = "";

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
