"use client";
/**
 * Smart Link page builder (Phase E).
 *
 * Shown for the "landing" and "socials" content types. Lets the user compose a
 * small link-in-bio page (title, bio, accent, up to 8 links), preview it live,
 * and download a single self-contained HTML file. The page is STATIC: the user
 * hosts it themselves and then encodes its public URL. QUICKKIT hosts nothing,
 * tracks nothing, and the printed QR can never be edited afterwards — the notice
 * below states this plainly so no one mistakes it for a dynamic link service.
 */
import { Download, ExternalLink, Info, Plus, Trash2 } from "lucide-react";
import {
  MAX_LANDING_LINKS,
  validateLanding,
  type LandingConfig,
} from "@/lib/tools/qr/landing";
import { QrColorInput, QrDisclosure } from "./shared";
import type { QrStudio } from "./use-qr-studio";

export default function LandingBuilder({ studio }: { studio: QrStudio }) {
  const { landing, setLanding, downloadLanding } = studio;
  const validation = validateLanding(landing);

  const patch = (next: Partial<LandingConfig>) =>
    setLanding({ ...landing, ...next });

  const setLink = (index: number, key: "label" | "url", value: string) => {
    const links = landing.links.map((link, i) =>
      i === index ? { ...link, [key]: value } : link,
    );
    patch({ links });
  };

  const addLink = () => {
    if (landing.links.length >= MAX_LANDING_LINKS) return;
    patch({ links: [...landing.links, { label: "", url: "" }] });
  };

  const removeLink = (index: number) => {
    const links = landing.links.filter((_, i) => i !== index);
    patch({ links: links.length ? links : [{ label: "", url: "" }] });
  };

  const previewLinks = landing.links.filter(
    (link) => link.label.trim() || link.url.trim(),
  );

  return (
    <QrDisclosure
      id="qr-landing-builder"
      level="sub"
      title="Build a Smart Link page"
      hint="Compose a link-in-bio page, download it, host it, then encode its URL."
      icon={<ExternalLink size={14} />}
    >
      <div className="qr-landing-notice" role="note">
        <Info size={15} aria-hidden="true" />
        <p>
          This produces a <strong>static HTML page you host yourself</strong>{" "}
          (GitHub Pages, Netlify, your own server). QUICKKIT does not host it
          and collects no analytics. Once you print the QR for its URL, the
          links cannot be changed without reprinting — there is no dynamic
          redirect.
        </p>
      </div>

      <div className="qr-landing-grid">
        <label className="qr-field">
          <span>Page title</span>
          <input
            type="text"
            value={landing.title}
            maxLength={80}
            placeholder="My links"
            onChange={(event) => patch({ title: event.target.value })}
          />
        </label>
        <label className="qr-field">
          <span>Short bio (optional)</span>
          <input
            type="text"
            value={landing.bio}
            maxLength={200}
            placeholder="A line about you or your business"
            onChange={(event) => patch({ bio: event.target.value })}
          />
        </label>
      </div>

      <QrColorInput
        id="qr-landing-accent"
        label="Button accent colour"
        value={landing.accent}
        onChange={(accent) => patch({ accent })}
      />

      <span className="qr-block-label">
        Links ({landing.links.length} / {MAX_LANDING_LINKS})
      </span>
      <div className="qr-landing-links">
        {landing.links.map((link, index) => (
          <div className="qr-landing-link" key={index}>
            <input
              type="text"
              value={link.label}
              maxLength={60}
              placeholder="Label (e.g. Menu)"
              aria-label={`Link ${index + 1} label`}
              onChange={(event) => setLink(index, "label", event.target.value)}
            />
            <input
              type="text"
              value={link.url}
              maxLength={2000}
              placeholder="https://…"
              aria-label={`Link ${index + 1} URL`}
              spellCheck={false}
              onChange={(event) => setLink(index, "url", event.target.value)}
            />
            <button
              type="button"
              className="qr-icon-button"
              aria-label={`Remove link ${index + 1}`}
              onClick={() => removeLink(index)}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="secondary qr-mini-button"
        onClick={addLink}
        disabled={landing.links.length >= MAX_LANDING_LINKS}
      >
        <Plus size={14} /> Add link
      </button>

      {/* Live structural preview (the downloaded HTML is the real artifact). */}
      <div className="qr-landing-preview" aria-label="Landing page preview">
        <div className="qr-landing-card" style={{ borderColor: "#f0e2e6" }}>
          <strong style={{ color: "#3b1b4f" }}>
            {landing.title.trim() || "My links"}
          </strong>
          {landing.bio.trim() ? <p>{landing.bio.trim()}</p> : null}
          <div className="qr-landing-preview-links">
            {previewLinks.length ? (
              previewLinks.map((link, index) => (
                <span
                  key={index}
                  className="qr-landing-preview-link"
                  style={{ background: landing.accent }}
                >
                  {link.label.trim() || link.url.trim() || "Link"}
                </span>
              ))
            ) : (
              <span className="qr-landing-preview-empty">
                Your links will appear here.
              </span>
            )}
          </div>
        </div>
      </div>

      {!validation.ok && validation.errors.length ? (
        <ul className="qr-landing-errors" role="alert">
          {validation.errors.slice(0, 4).map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        className="primary qr-mini-button"
        onClick={downloadLanding}
        disabled={!validation.ok}
      >
        <Download size={15} /> Download HTML page
      </button>
      <p className="help">
        After hosting, paste the page&apos;s public URL into the field above to
        generate the QR. The download is one file with no external requests.
      </p>
    </QrDisclosure>
  );
}
