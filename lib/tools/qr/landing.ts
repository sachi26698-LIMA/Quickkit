/**
 * Static "Smart Link" landing page (Phase E).
 *
 * Builds a single self-contained HTML file — inline CSS, system fonts, no
 * JavaScript, no external requests, no tracking — that the user downloads and
 * hosts themselves (GitHub Pages, Netlify, their own server). The QR then
 * encodes the *public URL where they hosted it*. QUICKKIT hosts nothing and the
 * printed QR can never be edited afterwards: this is deliberately static, and
 * the UI says so plainly. Every piece of user text is HTML-escaped and every
 * link is run through the same http(s)-only validator the QR payloads use.
 */
import { normalizeUrl } from "./payload";
import { isHexColor, normalizeHex } from "./colour";
import { QrUserError } from "./types";

export const MAX_LANDING_LINKS = 8;

export type LandingLink = { label: string; url: string };

export type LandingConfig = {
  title: string;
  bio: string;
  /** Accent colour for the link buttons (hex). */
  accent: string;
  links: LandingLink[];
};

export const DEFAULT_LANDING: LandingConfig = {
  title: "My links",
  bio: "",
  accent: "#d6598f",
  links: [{ label: "", url: "" }],
};

/** Escape text for safe insertion into HTML body or attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Clamp untrusted input into a safe config (does not validate URLs). */
export function sanitizeLandingConfig(
  input: Partial<LandingConfig>,
): LandingConfig {
  const links = Array.isArray(input.links) ? input.links : [];
  return {
    title: String(input.title ?? "").slice(0, 80),
    bio: String(input.bio ?? "").slice(0, 200),
    accent: isHexColor(String(input.accent ?? ""))
      ? normalizeHex(String(input.accent))
      : DEFAULT_LANDING.accent,
    links: links.slice(0, MAX_LANDING_LINKS).map((link) => ({
      label: String(link?.label ?? "").slice(0, 60),
      url: String(link?.url ?? "").slice(0, 2000),
    })),
  };
}

export type LandingValidation = {
  ok: boolean;
  errors: string[];
  /** Normalized, safe links (only present when ok). */
  links: LandingLink[];
};

/** Validate a config: a title and 1–8 links, each a real http(s) URL. */
export function validateLanding(input: LandingConfig): LandingValidation {
  const config = sanitizeLandingConfig(input);
  const errors: string[] = [];
  if (!config.title.trim()) errors.push("Give the page a title.");
  const filled = config.links.filter(
    (link) => link.label.trim() || link.url.trim(),
  );
  if (!filled.length) errors.push("Add at least one link.");
  const links: LandingLink[] = [];
  filled.forEach((link, index) => {
    if (!link.label.trim()) {
      errors.push(`Link ${index + 1} needs a label.`);
      return;
    }
    try {
      links.push({ label: link.label.trim(), url: normalizeUrl(link.url) });
    } catch (error) {
      errors.push(
        `Link ${index + 1}: ${error instanceof Error ? error.message : "invalid URL."}`,
      );
    }
  });
  return { ok: errors.length === 0, errors, links };
}

/**
 * Build the downloadable HTML. Throws QrUserError if the config is invalid, so
 * a broken page can never be produced. The result is fully self-contained.
 */
export function buildLandingHtml(input: LandingConfig): string {
  const config = sanitizeLandingConfig(input);
  const validation = validateLanding(config);
  if (!validation.ok) throw new QrUserError(validation.errors[0], "links");
  const accent = config.accent;
  const title = escapeHtml(config.title.trim());
  const bio = config.bio.trim()
    ? `<p class="bio">${escapeHtml(config.bio.trim())}</p>`
    : "";
  const links = validation.links
    .map(
      (link) =>
        `      <a class="link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`,
    )
    .join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${title}</title>
  <style>
    :root { --accent: ${accent}; --plum: #3b1b4f; --ink: #1a0f2e; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 18px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: var(--ink);
      background: linear-gradient(160deg, #fdf3f6 0%, #f4d7d4 100%);
    }
    .card {
      width: 100%;
      max-width: 460px;
      background: #ffffff;
      border: 1px solid #f0e2e6;
      border-radius: 22px;
      padding: 34px 26px 26px;
      box-shadow: 0 18px 50px rgba(59, 27, 79, 0.12);
      text-align: center;
    }
    h1 { margin: 0 0 6px; font-size: 24px; color: var(--plum); letter-spacing: -0.01em; }
    .bio { margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #6f6787; }
    .links { display: grid; gap: 12px; margin-top: 18px; }
    .link {
      display: block;
      padding: 14px 18px;
      border-radius: 14px;
      background: var(--accent);
      color: #ffffff;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: transform 0.12s ease, filter 0.12s ease;
    }
    .link:hover { transform: translateY(-1px); filter: brightness(1.05); }
    .link:focus-visible { outline: 3px solid var(--plum); outline-offset: 2px; }
    footer { margin-top: 24px; font-size: 11px; color: #a99fb8; }
  </style>
</head>
<body>
  <main class="card">
    <h1>${title}</h1>
    ${bio}
    <nav class="links" aria-label="Links">
${links}
    </nav>
    <footer>Made with QUICKKIT QR Studio · a static page you host yourself</footer>
  </main>
</body>
</html>
`;
}
