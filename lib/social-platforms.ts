/**
 * The fixed set of platform marks the footer can draw.
 *
 * The operator never types an SVG or an icon name into the admin panel — they
 * pick from this list. Two reasons, both deliberate:
 *
 *  1. **No remote assets.** Every mark is inline SVG in
 *     `components/social-icons.tsx`, so adding a social link cannot introduce a
 *     third-party image request, a tracking pixel or a CSP exception. The
 *     Content-Security-Policy stays exactly as strict as it is.
 *  2. **No markup injection.** `icon` is validated against this allowlist on
 *     write (Admin API) *and* on read (public catalog). A value that is not in
 *     this list is dropped rather than rendered, so a compromised or mistaken
 *     setting row degrades to a text label instead of unexpected markup.
 */

export const socialPlatforms = [
  { id: "instagram", label: "Instagram", hint: "https://instagram.com/…" },
  { id: "facebook", label: "Facebook", hint: "https://facebook.com/…" },
  { id: "x", label: "X (Twitter)", hint: "https://x.com/…" },
  { id: "youtube", label: "YouTube", hint: "https://youtube.com/@…" },
  { id: "github", label: "GitHub", hint: "https://github.com/…" },
  { id: "linkedin", label: "LinkedIn", hint: "https://linkedin.com/…" },
  { id: "whatsapp", label: "WhatsApp", hint: "https://wa.me/…" },
  { id: "telegram", label: "Telegram", hint: "https://t.me/…" },
  { id: "threads", label: "Threads", hint: "https://threads.net/@…" },
  { id: "pinterest", label: "Pinterest", hint: "https://pinterest.com/…" },
  { id: "reddit", label: "Reddit", hint: "https://reddit.com/r/…" },
  { id: "link", label: "Website / other", hint: "https://example.com" },
] as const;

export type SocialPlatformId = (typeof socialPlatforms)[number]["id"];

export const socialPlatformIds: readonly string[] = socialPlatforms.map(
  (platform) => platform.id,
);

/** True only for an exact, known platform slug. */
export function isSocialIconId(value: string): value is SocialPlatformId {
  return socialPlatformIds.includes(value);
}

/** Human label for a platform slug, falling back to the stored label. */
export function socialPlatformLabel(
  id: string | undefined,
  fallback: string,
): string {
  if (!id) return fallback;
  return (
    socialPlatforms.find((platform) => platform.id === id)?.label ?? fallback
  );
}
