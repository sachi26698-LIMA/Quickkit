"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  Star,
  Smile,
  Frown,
  Heart,
  MessageCircle,
  Sparkles,
  Send,
  LockKeyhole,
  X,
  Check,
} from "lucide-react";
import { tools } from "@/lib/catalog";
import { toolTheme, toolThemeStyle } from "@/lib/tool-theme";
import {
  parseToolFeedback,
  readToolFeedback,
  subscribeToolFeedback,
  type ToolFeedback,
} from "@/lib/tool-feedback";
import styles from "./hero-scene-orbit.module.css";
import dialogStyles from "./hero-feedback.module.css";

const STORAGE_KEY = "quickkit-hero-feedback-v1";
const UPDATE_EVENT = "quickkit:feedback-updated";
const OPEN_EVENT = "quickkit:open-feedback";
type Feedback = {
  name: string;
  message: string;
  rating?: number;
  tool?: string;
  tags?: string[];
};
const ratingLabels = [
  "Could be better",
  "Needs a little work",
  "A useful experience",
  "Really enjoyed it",
  "Absolutely loved it!",
];
const feedbackTags = [
  "Easy to use",
  "Great results",
  "Beautiful design",
  "Room to improve",
];

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
        item.message.trim().length > 0 &&
        (item.rating === undefined ||
          (Number.isInteger(item.rating) &&
            item.rating >= 1 &&
            item.rating <= 5)) &&
        (item.tool === undefined ||
          (typeof item.tool === "string" && item.tool.length <= 100)) &&
        (item.tags === undefined ||
          (Array.isArray(item.tags) &&
            item.tags.length <= 4 &&
            item.tags.every(
              (tag: unknown) => typeof tag === "string" && tag.length <= 60,
            ))),
    );
  } catch {
    return [];
  }
}

/** Full-size access to the same laptop-screen form on small devices. */
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
  toolEntries,
}: {
  onClose: () => void;
  onSave: (entry: Feedback) => boolean;
  entries: Feedback[];
  toolEntries: ToolFeedback[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    const modal = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal?.showModal();
    return () => {
      document.body.style.overflow = previous;
      modal?.close();
    };
  }, []);
  return createPortal(
    <dialog
      ref={dialog}
      className={dialogStyles.dialog}
      aria-labelledby="feedback-dialog-title"
      aria-describedby="feedback-dialog-description"
      onClose={onClose}
    >
      <div className={dialogStyles.sheet}>
        <div className={dialogStyles.heading}>
          <span className={dialogStyles.eyebrow}>
            <Sparkles size={14} /> YOUR VOICE, OUR INSPIRATION
          </span>
          <button
            type="button"
            className={dialogStyles.close}
            onClick={() => dialog.current?.close()}
            aria-label="Close feedback form"
            autoFocus
          >
            <X size={19} />
          </button>
        </div>
        <div className={dialogStyles.art} aria-hidden="true">
          <span className={dialogStyles.artOrbit} />
          <span className={dialogStyles.artHeart}>
            <Heart fill="currentColor" />
          </span>
          <span
            className={dialogStyles.artGlass}
            data-mood={
              rating >= 4 ? "happy" : rating > 0 && rating < 3 ? "sad" : "smile"
            }
          >
            {rating > 0 && rating < 3 ? (
              <Frown />
            ) : rating === 5 ? (
              <Heart />
            ) : (
              <Smile />
            )}
          </span>
          <span className={dialogStyles.artSpark}>
            <Sparkles />
          </span>
        </div>
        <h2 id="feedback-dialog-title">Share your experience</h2>
        <p className={dialogStyles.intro} id="feedback-dialog-description">
          A small note. A little inspiration.
          <br />
          Your feedback appears on the laptop and is saved only in this browser.
          It is not shared with other visitors.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!rating) {
              setError("Please select a star rating.");
              return;
            }
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name") ?? "").trim();
            const tool = String(data.get("tool") ?? "");
            if (!message.trim()) {
              setError("Please enter your feedback.");
              return;
            }
            if (
              !onSave({ name, message: message.trim(), rating, tool, tags })
            ) {
              setError(
                "Could not save feedback in this browser. Please check your storage settings.",
              );
              return;
            }
            dialog.current?.close();
          }}
        >
          <fieldset className={dialogStyles.rating}>
            <legend>
              How was your experience? <span>Choose 1–5 stars</span>
            </legend>
            <div>
              {ratingLabels.map((label, index) => (
                <label
                  key={label}
                  className={dialogStyles.star}
                  data-active={index < rating}
                >
                  <input
                    type="radio"
                    name="hero-rating"
                    value={index + 1}
                    checked={rating === index + 1}
                    required
                    aria-label={`${index + 1} ${index ? "stars" : "star"} — ${label}`}
                    onChange={() => {
                      setRating(index + 1);
                      setError("");
                    }}
                  />
                  <Star size={35} fill="currentColor" aria-hidden="true" />
                </label>
              ))}
            </div>
            <p aria-live="polite">
              {rating
                ? ratingLabels[rating - 1]
                : "A little rating goes a long way"}
            </p>
          </fieldset>
          <div className={dialogStyles.fields}>
            <div>
              <label htmlFor="feedback-name">
                Name <span>(optional)</span>
              </label>
              <input
                id="feedback-name"
                name="name"
                maxLength={35}
                autoComplete="name"
                placeholder="What should we call you?"
              />
            </div>
            <div>
              <label htmlFor="feedback-tool">About</label>
              <select id="feedback-tool" name="tool" defaultValue="">
                <option value="">QUICKKIT overall</option>
                {tools.map((tool) => (
                  <option value={tool.slug} key={tool.slug}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <fieldset className={dialogStyles.tags}>
            <legend>
              What stood out? <span>Optional</span>
            </legend>
            <div>
              {feedbackTags.map((tag) => (
                <label key={tag} className={dialogStyles.chip}>
                  <input
                    type="checkbox"
                    checked={tags.includes(tag)}
                    onChange={() =>
                      setTags((current) =>
                        current.includes(tag)
                          ? current.filter((value) => value !== tag)
                          : [...current, tag],
                      )
                    }
                  />
                  <span>
                    {tag}
                    {tags.includes(tag) && <Check size={13} />}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="feedback-message">Your feedback</label>
            <textarea
              id="feedback-message"
              name="message"
              maxLength={180}
              rows={3}
              required
              placeholder="What felt great? What could be better? Please avoid personal or file details."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
            <span className={dialogStyles.counter}>{message.length}/180</span>
          </div>
          {error && (
            <p role="alert" className={dialogStyles.error}>
              {error}
            </p>
          )}
          <button type="submit" className={dialogStyles.submit}>
            Add feedback <Send size={17} />
          </button>
          <p className={dialogStyles.privacy}>
            <LockKeyhole size={12} /> Saved on this device · No account needed
          </p>
          <p className={dialogStyles.permanent}>
            Reviews are read-only once added. There is no delete option in
            QUICKKIT.
          </p>
        </form>
        {toolEntries.length > 0 && (
          <section
            className={dialogStyles.saved}
            aria-label="Saved tool reviews"
          >
            <h3>
              Your tool reviews <span>{toolEntries.length}</span>
            </h3>
            <ul>
              {toolEntries.slice(0, 12).map((entry, index) => (
                <li key={`${index}-${entry.createdAt}`}>
                  <strong>
                    {tools.find((tool) => tool.slug === entry.tool)?.name ??
                      entry.tool}{" "}
                    · {entry.rating}/5
                  </strong>
                  <p>
                    {entry.comment ||
                      entry.tags.join(" · ") ||
                      "Rated your experience"}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
        {entries.length > 0 && (
          <section className={dialogStyles.saved} aria-label="Saved feedback">
            <h3>
              Your notes <span>{entries.length}</span>
            </h3>
            <ul>
              {entries.slice(0, 12).map((entry, index) => (
                <li key={`${index}-${entry.name}-${entry.message}`}>
                  <strong>
                    {entry.name || "Anonymous"}
                    {entry.rating ? ` · ${entry.rating}/5` : ""}
                  </strong>
                  <p>{entry.message}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </dialog>,
    document.body,
  );
}

export default function HeroFeedback() {
  const raw = useSyncExternalStore(subscribe, readFeedback, () => "[]");
  const entries = useMemo(() => parseFeedback(raw), [raw]);
  const toolRaw = useSyncExternalStore(
    subscribeToolFeedback,
    readToolFeedback,
    () => "[]",
  );
  const toolEntries = useMemo(
    () =>
      parseToolFeedback(toolRaw)
        .reverse()
        .filter((entry) => tools.some((tool) => tool.slug === entry.tool)),
    [toolRaw],
  );
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);
  function save(entry: Feedback) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([entry, ...parseFeedback(readFeedback())]),
      );
      window.dispatchEvent(new Event(UPDATE_EVENT));
      return true;
    } catch {
      return false;
    }
  }
  return (
    <>
      <section
        className={styles.miniFeedback}
        aria-label="User Feedback"
        data-laptop-feedback-style="aurora-glass-v7"
      >
        <div className={styles.feedbackHeading}>
          <span className={styles.feedbackHeadingIcon} aria-hidden="true">
            <MessageCircle />
          </span>
          <div>
            <strong>User Feedback</strong>
            <span>
              {toolEntries.length + entries.length
                ? `${toolEntries.length + entries.length} REVIEWS · THIS BROWSER`
                : "YOUR EXPERIENCE MATTERS"}
            </span>
          </div>
        </div>
        <div className={styles.feedbackCards} aria-live="polite">
          {toolEntries.slice(0, 8).map((entry, index) => {
            const tool = tools.find((tool) => tool.slug === entry.tool)!;
            const Mood =
              entry.rating >= 5 ? Heart : entry.rating >= 3 ? Smile : Frown;
            return (
              <article
                key={`tool-${index}-${entry.createdAt}`}
                className={styles.reviewCard}
                style={toolThemeStyle(toolTheme(tool.slug, tool.category))}
                data-laptop-tool-review={entry.tool}
              >
                <div className={styles.reviewTop}>
                  <span className={styles.reviewMood} aria-hidden="true">
                    <Mood />
                  </span>
                  <div>
                    <b>{tool.name}</b>
                    <span>YOUR TOOL EXPERIENCE</span>
                  </div>
                  <MessageCircle
                    className={styles.reviewQuote}
                    aria-hidden="true"
                  />
                </div>
                <div
                  className={styles.reviewStars}
                  role="img"
                  aria-label={`${entry.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, star) => (
                    <Star
                      key={star}
                      fill={star < entry.rating ? "currentColor" : "none"}
                      opacity={star < entry.rating ? 1 : 0.25}
                    />
                  ))}
                  <span>{entry.rating}.0</span>
                </div>
                <p>
                  {entry.comment ||
                    entry.tags.join(" · ") ||
                    ratingLabels[entry.rating - 1]}
                </p>
                <span className={styles.reviewLocal}>Saved on this device</span>
              </article>
            );
          })}
          {entries.slice(0, 8).map((entry, index) => (
            <article
              className={styles.feedbackCard}
              key={`${index}-${entry.name}-${entry.message}`}
            >
              <b>{entry.name || "Anonymous"}</b>
              {entry.rating && (
                <div
                  className={styles.manualStars}
                  role="img"
                  aria-label={`${entry.rating} out of 5 stars`}
                >
                  {Array.from({ length: 5 }, (_, star) => (
                    <Star
                      key={star}
                      fill={star < entry.rating! ? "currentColor" : "none"}
                    />
                  ))}
                </div>
              )}
              <p>{entry.message}</p>
            </article>
          ))}
          {!entries.length && !toolEntries.length && (
            <div className={styles.feedbackEmpty}>
              <span className={styles.emptyHeart} aria-hidden="true">
                <Heart />
              </span>
              <b>No feedback yet</b>
              <p>Your next little success story belongs here.</p>
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
          toolEntries={toolEntries}
        />
      )}
    </>
  );
}
