"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./admin.module.css";
import { AdminNotice } from "./admin-page";

type PublicLink = { label: string; href: string };
type Settings = {
  website_name: string;
  tagline: string;
  contact_email: string;
  announcement: { enabled: boolean; message: string };
  maintenance: { enabled: boolean; message: string };
  homepage_content: { announcement_title: string; announcement_body: string };
  social_links: PublicLink[];
  footer_links: PublicLink[];
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
};

export default function AdminSiteSettings() {
  const router = useRouter();
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
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load settings"),
      )
      .finally(() => setLoading(false));
  }, [router]);
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
      [key]: s[key].map((link, i) =>
        i === index ? { ...link, [field]: value } : link,
      ),
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
      setMessage(
        "Supported settings saved successfully; the Admin API confirmed the database write.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }
  if (loading)
    return <AdminNotice>Loading database-backed settings…</AdminNotice>;
  return (
    <>
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
        <p
          className={`${styles["admin-state"]} ${styles["admin-state--warn"]}`}
          role="status"
        >
          Unsaved changes. Leaving this page may discard your edits.
        </p>
      ) : null}
      <div className={styles["admin-cms-toolbar"]}>
        <p>
          Settings are applied directly after a successful save; the current
          backend does not support separate drafts or staged publishing. Preview
          opens the currently published site.
        </p>
        <a
          className={styles["admin-button"]}
          href="/"
          target="_blank"
          rel="noreferrer"
        >
          Preview published site ↗
        </a>
      </div>
      <div className={styles["admin-card"]}>
        <div className={styles["admin-settings-grid"]}>
          <label>
            Website name
            <input
              className={styles["admin-input"]}
              maxLength={80}
              value={settings.website_name}
              onChange={(e) => setString("website_name", e.target.value)}
            />
          </label>
          <label>
            Tagline
            <input
              className={styles["admin-input"]}
              maxLength={160}
              value={settings.tagline}
              onChange={(e) => setString("tagline", e.target.value)}
            />
          </label>
          <label>
            Contact email
            <input
              className={styles["admin-input"]}
              type="email"
              maxLength={254}
              value={settings.contact_email}
              onChange={(e) => setString("contact_email", e.target.value)}
            />
          </label>
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
            />{" "}
            Public announcement enabled
          </label>
          <label className={styles["admin-span-2"]}>
            Announcement text
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
            />{" "}
            Maintenance notice enabled (this does not block public routes)
          </label>
          <label className={styles["admin-span-2"]}>
            Maintenance notice text
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
          <label className={styles["admin-span-2"]}>
            Homepage update title
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
          <label className={styles["admin-span-2"]}>
            Homepage update text
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
        {(["social_links", "footer_links"] as const).map((key) => (
          <fieldset className={styles["admin-card"]} key={key}>
            <legend>
              {key === "social_links"
                ? "Social links"
                : "Additional footer links"}
            </legend>
            <p>Only HTTPS links are accepted. Maximum 20 links per group.</p>
            {settings[key].map((link, index) => (
              <div
                className={styles["admin-detail-grid"]}
                key={`${key}-${index}`}
              >
                <label>
                  Link label
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
                <label>
                  HTTPS URL
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
                <button
                  type="button"
                  className={`${styles["admin-button"]} ${styles["admin-button--danger"]}`}
                  onClick={() => removeLink(key, index)}
                  aria-label={`Remove ${key} link ${index + 1}`}
                >
                  Remove link
                </button>
              </div>
            ))}
            <button
              type="button"
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
              disabled={settings[key].length >= 20}
              onClick={() => addLink(key)}
            >
              Add {key === "social_links" ? "social" : "footer"} link
            </button>
          </fieldset>
        ))}
        <p>
          <button
            className={styles["admin-button"]}
            disabled={saving}
            onClick={() => void save()}
          >
            {saving ? "Saving…" : "Save website settings"}
          </button>
        </p>
      </div>
    </>
  );
}
