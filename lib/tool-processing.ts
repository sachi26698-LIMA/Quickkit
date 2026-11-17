/**
 * Per-tool data-processing disclosure — the source for privacy claims.
 *
 * The Privacy Policy, File Handling Policy and Admin inventory state how many
 * tools stay on the device. Typing that number into prose is how a site ends
 * up claiming "every tool is local" while a tool talks to a server, so the
 * claim is computed from this table instead.
 *
 * `local`          — bytes never leave the tab. No network request at all.
 * `consented-upload` — the operator's own server receives the file, only after
 *                    an explicit on-screen consent step (currently Word to PDF).
 * `third-party`    — an optional, click-only request leaves for a named third
 *                    party, never carrying file contents (DNS/IP and GTIN
 *                    lookups). Proxied through this origin where possible.
 *
 * Keep this in step with the tool's own on-screen disclosure; a test
 * (`tests/privacy-disclosure.test.ts`) fails if a catalogue tool has no entry.
 */
export type ToolProcessing = "local" | "consented-upload" | "third-party";

export type ToolProcessingNote = {
  kind: ToolProcessing;
  /** Shown in Admin and in the generated privacy counts. */
  summary: string;
  /** What leaves the device, when, and to whom. Empty for local tools. */
  leaves: string;
};

export const toolProcessing: Readonly<Record<string, ToolProcessingNote>> = {
  // ── Consented server upload ───────────────────────────────────────────────
  "word-to-pdf": {
    kind: "consented-upload",
    summary: "Operator-controlled LibreOffice/worker conversion after consent",
    leaves:
      "DOCX bytes, only after you press Convert or Refresh on the consent step, to this site's /api/word-to-pdf engine. No upload on file selection.",
  },

  // ── Optional third-party lookups (never file contents) ────────────────────
  "dns-email-security": {
    kind: "third-party",
    summary: "Consented DNS lookups via Cloudflare DNS-over-HTTPS",
    leaves:
      "The domain name you type, after consent, to cloudflare-dns.com. Pasted records and headers stay in the tab.",
  },
  "url-network-privacy": {
    kind: "third-party",
    summary: "Consented public IP lookup via ipify",
    leaves:
      "Nothing but the request itself, after consent, to api.ipify.org / api64.ipify.org — which see your IP address. All local reviews stay in the tab.",
  },
  "product-lookup": {
    kind: "third-party",
    summary: "Consented GTIN lookup proxied through /api/product-lookup",
    leaves:
      "One 8–14 digit GTIN, click-only, to this site's endpoint, which reads Open Food Facts. No batch code, image or scan history is sent.",
  },
  "barcode-scanner": {
    kind: "third-party",
    summary:
      "Scans are local; the optional GTIN lookup proxies through this site",
    leaves:
      "Only when you press the lookup button: one GTIN goes to /api/product-lookup, which reads Open Food Facts. Camera frames never leave the tab.",
  },
};

/**
 * Tools whose *engine* is bundled and served from this origin, so they need no
 * entry above, are `local` by default. Instead of listing all of them, every
 * catalogue tool without an entry is treated as local — and the test asserts
 * that the exemptions below are the only ones, so nothing can silently opt out.
 */
export const nonLocalToolSlugs = Object.keys(toolProcessing);

export function processingFor(slug: string): ToolProcessingNote {
  return (
    toolProcessing[slug] ?? {
      kind: "local",
      summary: "Processed in the browser tab; nothing is uploaded",
      leaves: "",
    }
  );
}
