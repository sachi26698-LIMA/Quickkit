"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import styles from "./hero-scene-orbit.module.css";
import dialogStyles from "./hero-feedback.module.css";

const STORAGE_KEY = "quickkit-hero-feedback-v1";
const UPDATE_EVENT = "quickkit:feedback-updated";
const OPEN_EVENT = "quickkit:open-feedback";
type Feedback = { name: string; message: string };

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(UPDATE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(UPDATE_EVENT, callback);
  };
}
function readFeedback() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function parseFeedback(raw: string): Feedback[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is Feedback =>
        item !== null &&
        typeof item === "object" &&
        typeof item.name === "string" &&
        typeof item.message === "string" &&
        item.name.length <= 35 &&
        item.message.length <= 180 &&
        item.message.trim().length > 0,
    );
  } catch {
    return [];
  }
}

/** A full-size way to open the same form when the screen is miniature. */
export function FeedbackTrigger() {
  return (
    <button
      type="button"
      className={dialogStyles.mobileTrigger}
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
    >
      Share feedback
    </button>
  );
}

function FeedbackDialog({
  onClose,
  onSave,
  entries,
  onRemove,
}: {
  onClose: () => void;
  onSave: (entry: Feedback) => boolean;
  entries: Feedback[];
  onRemove: (index: number) => boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className={dialogStyles.dialog}
      aria-labelledby="feedback-dialog-title"
      onClose={onClose}
    >
      <div className={dialogStyles.heading}>
        <div>
          <span className={dialogStyles.eyebrow}>QUICKKIT FEEDBACK</span>
          <h2 id="feedback-dialog-title">Share your experience</h2>
        </div>
        <button
          type="button"
          className={dialogStyles.close}
          onClick={() => dialog.current?.close()}
          aria-label="Close feedback form"
        >
          ×
        </button>
      </div>
      <p className={dialogStyles.intro}>
        Your feedback appears in the laptop template and is saved only in this
        browser. It is not sent to QUICKKIT or shared with other visitors.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name") ?? "").trim();
          const message = String(data.get("message") ?? "").trim();
          if (!message) {
            setError("Please enter your feedback.");
            return;
          }
          if (!onSave({ name, message })) {
            setError(
              "Could not save feedback in this browser. Please check your storage settings.",
            );
            return;
          }
          dialog.current?.close();
        }}
      >
        <label htmlFor="feedback-name">
          Name <span>(optional)</span>
        </label>
        <input
          id="feedback-name"
          name="name"
          maxLength={35}
          autoComplete="name"
          placeholder="Your name"
        />
        <label htmlFor="feedback-message">Your feedback</label>
        <textarea
          id="feedback-message"
          name="message"
          maxLength={180}
          rows={4}
          required
          placeholder="Tell us about your experience"
        />
        {error && (
          <p role="alert" className={dialogStyles.error}>
            {error}
          </p>
        )}
        <button type="submit" className={dialogStyles.submit}>
          Add feedback <span aria-hidden="true">→</span>
        </button>
      </form>
      {entries.length > 0 && (
        <section className={dialogStyles.saved} aria-label="Saved feedback">
          <h3>Saved in this browser</h3>
          <ul>
            {entries.map((entry, i) => (
              <li key={`${i}-${entry.name}-${entry.message}`}>
                <div>
                  <strong>{entry.name || "Anonymous"}</strong>
                  <p>{entry.message}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete feedback ${i + 1}`}
                  onClick={() => {
                    if (!onRemove(i))
                      setError(
                        "Could not remove feedback in this browser. Please check your storage settings.",
                      );
                  }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </dialog>,
    document.body,
  );
}

export default function HeroFeedback() {
  const raw = useSyncExternalStore(subscribe, readFeedback, () => "[]");
  const entries = useMemo(() => parseFeedback(raw), [raw]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);
  function save(entry: Feedback) {
    try {
      const next = [entry, ...parseFeedback(readFeedback())];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(UPDATE_EVENT));
      return true;
    } catch {
      return false;
    }
  }
  function remove(index: number) {
    try {
      const next = parseFeedback(readFeedback()).filter((_, i) => i !== index);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(UPDATE_EVENT));
      return true;
    } catch {
      return false;
    }
  }
  return (
    <>
      <section className={styles.miniFeedback} aria-label="User Feedback">
        <div className={styles.feedbackHeading}>
          <div>
            <strong>User Feedback</strong>
            <span>YOUR EXPERIENCE</span>
          </div>
        </div>
        <div className={styles.feedbackCards} aria-live="polite">
          {entries.length ? (
            entries.map((entry, i) => (
              <article
                className={styles.feedbackCard}
                key={`${i}-${entry.name}-${entry.message}`}
              >
                <b>{entry.name || "Anonymous"}</b>
                <p>{entry.message}</p>
              </article>
            ))
          ) : (
            <div className={styles.feedbackEmpty}>
              <b>No feedback yet</b>
              <p>Share your experience.</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className={styles.feedbackButton}
          onClick={() => setOpen(true)}
        >
          Share feedback <span aria-hidden="true">↗</span>
        </button>
      </section>
      {open && (
        <FeedbackDialog
          onClose={() => setOpen(false)}
          onSave={save}
          entries={entries}
          onRemove={remove}
        />
      )}
    </>
  );
}
