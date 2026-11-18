"use client";

import { useRouter } from "next/navigation";
import {
  CalendarClock,
  ExternalLink,
  Globe,
  Home,
  Link2,
  Megaphone,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import styles from "./admin.module.css";
import { AdminNotice } from "./admin-page";
import { useAdminLive } from "./admin-live-context";
import { socialPlatforms } from "@/lib/social-platforms";

type PublicLink = { label: string; href: string; icon?: string };

/** "2026-11-16" -> "16 November 2026". Blank input stays blank. */
function formatLegalDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
type Settings = {
  website_name: string;
  tagline: string;
  contact_email: string;
  announcement: { enabled: boolean; message: string };
  maintenance: { enabled: boolean; message: string };
  homepage_content: { announcement_title: string; announcement_body: string };
  social_links: PublicLink[];
  footer_links: PublicLink[];
  legal_meta: { last_updated: string; last_updated_iso: string };
};
const defaults: Settings = {
  website_name: "QUICKKIT",
  tagline: "Small tasks. Quick solutions.",
  contact_email: "",
  announcement: { enabled: false, message: "" },
  maintenance: { enabled: false, message: "" },
  homepage_content: { announcement_title: "", announcement_body: "" },
  social_links: [],
  footer_links: [],
  legal_meta: { last_updated: "", last_updated_iso: "" },
};

export default function AdminSiteSettings() {
  const router = useRouter();
  const { pushToast, setSyncSnapshot } = useAdminLive();
  const [settings, setSettings] = useState(defaults);
  const [savedSettings, setSavedSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          router.replace(
            response.status === 403
              ? "/admin/login?reason=forbidden"
              : "/admin/login?reason=expired",
          );
          throw new Error(
            "Administrator access is no longer valid. Sign in again.",
          );
        }
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Could not load settings");
        const next = { ...defaults };
        for (const row of body.data as {
          setting_key: string;
          setting_value: unknown;
        }[]) {
          if (row.setting_key in next)
            (next as Record<string, unknown>)[row.setting_key] =
              row.setting_value;
        }
        setSettings(next);
        setSavedSettings(next);
        setSyncSnapshot({ syncState: "connected", lastSynced: Date.now() });
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load settings"),
      )
      .finally(() => setLoading(false));
  }, [router, setSyncSnapshot]);

  const dirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setString = (
    key: "website_name" | "tagline" | "contact_email",
    value: string,
  ) => setSettings((s) => ({ ...s, [key]: value }));
  const setLink = (
    key: "social_links" | "footer_links",
    index: number,
    field: keyof PublicLink,
    value: string,
  ) =>
    setSettings((s) => ({
      ...s,
      [key]: s[key].map((link, i) => {
        if (i !== index) return link;
        // An empty icon means "no icon", so the key is dropped rather than
        // stored as "". The API validates whatever remains.
        if (field === "icon" && !value) {
          const rest: PublicLink = { label: link.label, href: link.href };
          return rest;
        }
        return { ...link, [field]: value };
      }),
    }));
  const addLink = (key: "social_links" | "footer_links") =>
    setSettings((s) =>
      s[key].length >= 20
        ? s
        : { ...s, [key]: [...s[key], { label: "", href: "" }] },
    );
  const removeLink = (key: "social_links" | "footer_links", index: number) =>
    setSettings((s) => ({
      ...s,
      [key]: s[key].filter((_, i) => i !== index),
    }));

  async function save() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const entries = Object.entries(settings).map(
        ([setting_key, setting_value]) => ({ setting_key, setting_value }),
      );
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (response.status === 401 || response.status === 403) {
        router.replace(
          response.status === 403
            ? "/admin/login?reason=forbidden"
            : "/admin/login?reason=expired",
        );
        throw new Error(
          "Administrator access is no longer valid. Sign in again.",
        );
      }
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error ?? "Could not save settings");
      setSavedSettings(settings);
      window.dispatchEvent(new Event("quickkit:admin-mutated"));
      const msg =
        "Supported settings saved successfully; the Admin API confirmed the database write.";
      setMessage(msg);
      pushToast({
        tone: "success",
        title: "Site settings saved",
        description: "Database write confirmed and recorded in audit log.",
      });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Could not save settings";
      setError(errMsg);
      pushToast({ tone: "error", title: "Save failed", description: errMsg });
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className={styles["admin-skeleton-panel"]} role="status">
        <span className={styles["admin-visually-hidden"]}>
          Loading database-backed settings…
        </span>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className={styles["admin-skeleton-row"]} key={index}>
            <span className={styles["admin-skeleton-bar"]} />
            <span className={styles["admin-skeleton-bar"]} />
          </div>
        ))}
      </div>
    );

  return (
    <div className={styles["admin-settings-stack"]}>
      <AdminNotice warning>
        Only these explicitly supported public settings can be changed.
        Environment variables, credentials, arbitrary code, and private server
        configuration are not editable here.
      </AdminNotice>
      {error ? (
        <p className={styles["admin-error"]} role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className={styles["admin-state"]} role="status">
          {message}
        </p>
      ) : null}
      {dirty ? (
        <div
          className={`${styles["admin-state"]} ${styles["admin-state--warn"]} ${styles["admin-stale-banner"]}`}
          role="status"
        >
          <span>
            Unsaved changes. Leaving this page may discard your edits.
          </span>
          <div className={styles["admin-row-actions"]}>
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
              onClick={() => setSettings(savedSettings)}
              disabled={saving}
            >
              <RotateCcw size={13} aria-hidden="true" />
              Discard
            </button>
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--sm"]}`}
              onClick={() => void save()}
              disabled={saving}
            >
              <Save size={13} aria-hidden="true" />
              {saving ? "Saving…" : "Save now"}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles["admin-cms-toolbar"]}>
        <p>
          Settings are applied directly after a successful save; the current
          backend does not support separate drafts or staged publishing. Preview
          opens the currently published site.
        </p>
        <a
          className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
          href="/"
          target="_blank"
          rel="noreferrer"
        >
          Preview published site
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>

      {/* Brand Identity */}
      <section className={styles["admin-panel"]}>
        <div className={styles["admin-panel-heading"]}>
          <div className={styles["admin-panel-title-group"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
              aria-hidden="true"
            >
              <Globe size={15} />
            </span>
            <div>
              <h3>Brand &amp; contact identity</h3>
              <p className={styles["admin-panel-subtitle"]}>
                Public website name, tagline, and display contact address
              </p>
            </div>
          </div>
        </div>
        <div className={styles["admin-settings-grid"]}>
          <label className={styles["admin-field"]}>
            <span>Website name</span>
            <input
              className={styles["admin-input"]}
              maxLength={80}
              value={settings.website_name}
              onChange={(e) => setString("website_name", e.target.value)}
            />
          </label>
          <label className={styles["admin-field"]}>
            <span>Contact email</span>
            <input
              className={styles["admin-input"]}
              type="email"
              maxLength={254}
              value={settings.contact_email}
              onChange={(e) => setString("contact_email", e.target.value)}
            />
          </label>
          <label
            className={`${styles["admin-field"]} ${styles["admin-span-2"]}`}
          >
            <span>Tagline (shown in the footer)</span>
            <input
              className={styles["admin-input"]}
              maxLength={160}
              value={settings.tagline}
              onChange={(e) => setString("tagline", e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Banners & Notices */}
      <section className={styles["admin-panel"]}>
        <div className={styles["admin-panel-heading"]}>
          <div className={styles["admin-panel-title-group"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--rose"]}`}
              aria-hidden="true"
            >
              <Megaphone size={15} />
            </span>
            <div>
              <h3>Site-wide notices</h3>
              <p className={styles["admin-panel-subtitle"]}>
                Optional public announcement and non-blocking maintenance banner
              </p>
            </div>
          </div>
        </div>
        <div className={styles["admin-settings-grid"]}>
          <label
            className={`${styles["admin-toggle"]} ${styles["admin-span-2"]}`}
          >
            <input
              type="checkbox"
              checked={settings.announcement.enabled}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  announcement: {
                    ...s.announcement,
                    enabled: e.target.checked,
                  },
                }))
              }
            />
            <span>Public announcement enabled</span>
          </label>
          <label
            className={`${styles["admin-field"]} ${styles["admin-span-2"]}`}
          >
            <span>Announcement text</span>
            <textarea
              className={styles["admin-input"]}
              maxLength={500}
              value={settings.announcement.message}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  announcement: { ...s.announcement, message: e.target.value },
                }))
              }
            />
          </label>
          <label
            className={`${styles["admin-toggle"]} ${styles["admin-span-2"]}`}
          >
            <input
              type="checkbox"
              checked={settings.maintenance.enabled}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  maintenance: { ...s.maintenance, enabled: e.target.checked },
                }))
              }
            />
            <span>
              Maintenance notice enabled (this does not block public routes)
            </span>
          </label>
          <label
            className={`${styles["admin-field"]} ${styles["admin-span-2"]}`}
          >
            <span>Maintenance notice text</span>
            <textarea
              className={styles["admin-input"]}
              maxLength={500}
              value={settings.maintenance.message}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  maintenance: { ...s.maintenance, message: e.target.value },
                }))
              }
            />
          </label>
        </div>
      </section>

      {/* Homepage Content */}
      <section className={styles["admin-panel"]} id="homepage-content">
        <div className={styles["admin-panel-heading"]}>
          <div className={styles["admin-panel-title-group"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--teal"]}`}
              aria-hidden="true"
            >
              <Home size={15} />
            </span>
            <div>
              <h3>Homepage content</h3>
              <p className={styles["admin-panel-subtitle"]}>
                Supported update callout displayed on the public QUICKKIT home
                page
              </p>
            </div>
          </div>
        </div>
        <div className={styles["admin-settings-grid"]}>
          <label
            className={`${styles["admin-field"]} ${styles["admin-span-2"]}`}
          >
            <span>Homepage update title</span>
            <input
              className={styles["admin-input"]}
              maxLength={500}
              value={settings.homepage_content.announcement_title}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  homepage_content: {
                    ...s.homepage_content,
                    announcement_title: e.target.value,
                  },
                }))
              }
            />
          </label>
          <label
            className={`${styles["admin-field"]} ${styles["admin-span-2"]}`}
          >
            <span>Homepage update text</span>
            <textarea
              className={styles["admin-input"]}
              maxLength={500}
              value={settings.homepage_content.announcement_body}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  homepage_content: {
                    ...s.homepage_content,
                    announcement_body: e.target.value,
                  },
                }))
              }
            />
          </label>
        </div>
      </section>

      {/* Legal document dates */}
      <section className={styles["admin-panel"]} id="legal-dates">
        <div className={styles["admin-panel-heading"]}>
          <div className={styles["admin-panel-title-group"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--teal"]}`}
              aria-hidden="true"
            >
              <CalendarClock size={15} />
            </span>
            <div>
              <h3>Legal document dates</h3>
              <p className={styles["admin-panel-subtitle"]}>
                The &ldquo;last updated&rdquo; date shown on every policy page
              </p>
            </div>
          </div>
        </div>
        <div className={styles["admin-settings-grid"]}>
          <label className={styles["admin-field"]}>
            <span>Displayed date</span>
            <input
              className={styles["admin-input"]}
              maxLength={60}
              placeholder="16 November 2026"
              value={settings.legal_meta.last_updated}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  legal_meta: { ...s.legal_meta, last_updated: e.target.value },
                }))
              }
            />
          </label>
          <label className={styles["admin-field"]}>
            <span>Machine-readable date (YYYY-MM-DD)</span>
            <input
              className={styles["admin-input"]}
              type="date"
              value={settings.legal_meta.last_updated_iso}
              onChange={(e) => {
                const iso = e.target.value;
                setSettings((s) => ({
                  ...s,
                  legal_meta: {
                    ...s.legal_meta,
                    last_updated_iso: iso,
                    // Keep the visible date in step with the picker unless the
                    // operator has deliberately written their own wording.
                    last_updated:
                      s.legal_meta.last_updated.trim() === "" ||
                      s.legal_meta.last_updated ===
                        formatLegalDate(s.legal_meta.last_updated_iso)
                        ? formatLegalDate(iso)
                        : s.legal_meta.last_updated,
                  },
                }));
              }}
            />
          </label>
          <p
            className={`${styles["admin-field-hint"]} ${styles["admin-span-2"]}`}
          >
            Leave both blank to keep the dates built into the site. The
            machine-readable date must be a real calendar date; both values are
            validated by the Admin API before they are stored.
          </p>
        </div>
      </section>

      {/* Links */}
      <section className={styles["admin-panel"]}>
        <div className={styles["admin-panel-heading"]}>
          <div className={styles["admin-panel-title-group"]}>
            <span
              className={`${styles["admin-panel-badge"]} ${styles["admin-panel-badge--violet"]}`}
              aria-hidden="true"
            >
              <Link2 size={15} />
            </span>
            <div>
              <h3>Social &amp; footer links</h3>
              <p className={styles["admin-panel-subtitle"]}>
                Only HTTPS URLs without credentials are accepted (maximum 20 per
                group)
              </p>
            </div>
          </div>
        </div>
        <div className={styles["admin-links-groups"]}>
          {(["social_links", "footer_links"] as const).map((key) => (
            <fieldset className={styles["admin-link-fieldset"]} key={key}>
              <legend>
                {key === "social_links"
                  ? "Social links"
                  : "Additional footer links"}
              </legend>
              {settings[key].length === 0 ? (
                <p className={styles["admin-field-hint"]}>
                  No links configured yet.
                </p>
              ) : null}
              {settings[key].map((link, index) => (
                <div
                  className={styles["admin-link-row"]}
                  key={`${key}-${index}`}
                >
                  <label className={styles["admin-field"]}>
                    <span>Link label</span>
                    <input
                      className={styles["admin-input"]}
                      maxLength={50}
                      aria-label={`${key} ${index + 1} label`}
                      value={link.label}
                      onChange={(e) =>
                        setLink(key, index, "label", e.target.value)
                      }
                    />
                  </label>
                  <label className={styles["admin-field"]}>
                    <span>HTTPS URL</span>
                    <input
                      className={styles["admin-input"]}
                      type="url"
                      maxLength={500}
                      aria-label={`${key} ${index + 1} URL`}
                      value={link.href}
                      onChange={(e) =>
                        setLink(key, index, "href", e.target.value)
                      }
                    />
                  </label>
                  {key === "social_links" ? (
                    <label className={styles["admin-field"]}>
                      <span>Icon</span>
                      <select
                        className={styles["admin-input"]}
                        aria-label={`social_links ${index + 1} icon`}
                        value={link.icon ?? ""}
                        onChange={(e) =>
                          setLink(key, index, "icon", e.target.value)
                        }
                      >
                        <option value="">No icon (text label)</option>
                        {socialPlatforms.map((platform) => (
                          <option key={platform.id} value={platform.id}>
                            {platform.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <button
                    type="button"
                    className={`${styles["admin-button"]} ${styles["admin-button--danger"]} ${styles["admin-button--sm"]}`}
                    onClick={() => removeLink(key, index)}
                    aria-label={`Remove ${key} link ${index + 1}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Remove link
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={`${styles["admin-button"]} ${styles["admin-button--soft"]} ${styles["admin-button--sm"]}`}
                disabled={settings[key].length >= 20}
                onClick={() => addLink(key)}
              >
                <Plus size={14} aria-hidden="true" />
                Add {key === "social_links" ? "social" : "footer"} link
              </button>
            </fieldset>
          ))}
        </div>
      </section>

      <div className={styles["admin-save-footer"]}>
        <button
          type="button"
          className={styles["admin-button"]}
          disabled={saving}
          onClick={() => void save()}
        >
          <Save size={15} aria-hidden="true" />
          {saving ? "Saving…" : "Save website settings"}
        </button>
      </div>
    </div>
  );
}
