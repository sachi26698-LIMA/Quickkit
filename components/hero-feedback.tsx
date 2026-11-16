"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Frown,
  Heart,
  LockKeyhole,
  MessageCircle,
  Send,
  Smile,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import type { Tool } from "@/lib/catalog";
import { toolTheme, toolThemeStyle } from "@/lib/tool-theme";
import {
  parseSiteFeedback,
  SITE_FEEDBACK_KEY,
  SITE_FEEDBACK_MAX_TAGS,
  SITE_FEEDBACK_MESSAGE_MAX,
  SITE_FEEDBACK_NAME_MAX,
  SITE_FEEDBACK_RATING_LABELS,
  siteFeedbackRatingLabel,
  siteFeedbackTagsFor,
  type SiteFeedback,
} from "@/lib/site-feedback";
import {
  parseToolFeedback,
  readToolFeedback,
  subscribeToolFeedback,
  type ToolFeedback,
} from "@/lib/tool-feedback";
import styles from "./hero-scene-orbit.module.css";
import dialogStyles from "./hero-feedback.module.css";

const STORAGE_KEY = SITE_FEEDBACK_KEY;
const UPDATE_EVENT = "quickkit:feedback-updated";
const OPEN_EVENT = "quickkit:open-feedback";
type Feedback = SiteFeedback;
const parseFeedback = parseSiteFeedback;

/** Five stars with the first `rating` filled, read as "N out of 5 stars". */
function Stars({ rating, className }: { rating: number; className: string }) {
  return (
    <span
      className={className}
      role="img"
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          fill={index < rating ? "currentColor" : "none"}
          opacity={index < rating ? 1 : 0.3}
        />
      ))}
    </span>
  );
}

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
  onRemove,
  onCloudSuccess,
  entries,
  toolEntries,
  catalogue,
}: {
  onClose: () => void;
  onSave: (entry: Feedback) => boolean;
  onRemove: (index: number) => boolean;
  onCloudSuccess: (message: string) => void;
  entries: Feedback[];
  toolEntries: ToolFeedback[];
  catalogue: readonly Tool[];
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [sendPrivately, setSendPrivately] = useState(false);
  const [sending, setSending] = useState(false);
  const shownRating = hover || rating;
  const tagOptions = siteFeedbackTagsFor(rating);
  const toolName = (slug: string) =>
    catalogue.find((tool) => tool.slug === slug)?.name ?? slug;
  useEffect(() => {
    const modal = dialog.current;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (modal && !modal.open) modal.showModal();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  // Closing never depends on the browser's `close` event alone: the form is
  // closed and the parent is told directly, so it can always be opened again.
  function finish() {
    if (dialog.current?.open) dialog.current.close();
    onClose();
  }
  return createPortal(
    <dialog
      ref={dialog}
      className={dialogStyles.dialog}
      data-hero-feedback=""
      aria-labelledby="feedback-dialog-title"
      aria-describedby="feedback-dialog-description"
      onClose={onClose}
    >
      <div className={dialogStyles.sheet}>
        <div className={dialogStyles.heading}>
          <span className={dialogStyles.eyebrow}>
            <Sparkles size={14} aria-hidden="true" /> YOUR VOICE, OUR
            INSPIRATION
          </span>
          <button
            type="button"
            className={dialogStyles.close}
            onClick={finish}
            aria-label="Close feedback form"
          >
            <X size={19} aria-hidden="true" />
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
          Rate QUICKKIT, write a few words, or both. Your feedback appears on
          the laptop and is saved only in this browser unless you choose to send
          it privately to QUICKKIT for review. It is never displayed to other
          visitors. Do not include passwords, private documents, or tool inputs.
        </p>
        <form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name") ?? "").trim();
            const tool = String(data.get("tool") ?? "");
            const text = message.trim();
            if (!text && !rating) {
              setError("Please choose a star rating or write your feedback.");
              return;
            }
            const entry: Feedback = {
              name,
              message: text,
              rating,
              tags,
              ...(tool ? { tool } : {}),
            };
            if (sendPrivately) {
              setSending(true);
              setError("");
              try {
                const response = await fetch("/api/feedback", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    message: text,
                    ...(rating ? { rating, tags } : {}),
                    ...(tool ? { tool } : {}),
                    consent: true,
                  }),
                });
                const result = (await response.json()) as {
                  ok?: boolean;
                  error?: string;
                };
                if (!response.ok || !result.ok)
                  throw new Error(result.error ?? "Submission failed.");
                const savedLocally = onSave(entry);
                onCloudSuccess(
                  savedLocally
                    ? "Feedback was sent privately to QUICKKIT and saved in this browser."
                    : "Feedback was sent privately to QUICKKIT; the local copy could not be saved.",
                );
                finish();
              } catch (submitError) {
                setError(
                  submitError instanceof Error
                    ? submitError.message
                    : "Feedback could not be sent. It was not saved to QUICKKIT.",
                );
                setSending(false);
              }
              return;
            }
            if (!onSave(entry)) {
              setError(
                "Could not save feedback in this browser. Please check your storage settings.",
              );
              return;
            }
            finish();
          }}
        >
          <fieldset className={dialogStyles.rating}>
            <legend>
              How would you rate QUICKKIT? <span>(optional)</span>
            </legend>
            <div onMouseLeave={() => setHover(0)}>
              {SITE_FEEDBACK_RATING_LABELS.map((label, index) => (
                <label
                  key={label}
                  className={dialogStyles.star}
                  data-active={index < shownRating}
                  onMouseEnter={() => setHover(index + 1)}
                >
                  <input
                    type="radio"
                    name="hero-rating"
                    value={index + 1}
                    checked={rating === index + 1}
                    aria-label={`${index + 1} ${index ? "stars" : "star"} — ${label}`}
                    onChange={() => {
                      setRating(index + 1);
                      // Quick answers belong to a rating; keep only those
                      // that still apply to the new one.
                      const allowed = siteFeedbackTagsFor(index + 1);
                      setTags((current) =>
                        current.filter((tag) => allowed.includes(tag)),
                      );
                      setError("");
                    }}
                  />
                  <Star size={35} fill="currentColor" aria-hidden="true" />
                </label>
              ))}
            </div>
            <p className={dialogStyles.ratingStatus}>
              <span aria-live="polite">
                {shownRating
                  ? `${shownRating}/5 · ${siteFeedbackRatingLabel(shownRating)}`
                  : "Tap a star to rate"}
              </span>
              {rating > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRating(0);
                    setHover(0);
                    setTags([]);
                  }}
                >
                  Clear rating
                </button>
              )}
            </p>
          </fieldset>
          {rating > 0 && (
            <fieldset className={dialogStyles.tags}>
              <legend>
                {rating >= 4 ? "What did you like?" : "What should we improve?"}{" "}
                <span>(optional · pick any)</span>
              </legend>
              <div>
                {tagOptions.map((tag) => (
                  <label key={tag} className={dialogStyles.chip}>
                    <input
                      type="checkbox"
                      checked={tags.includes(tag)}
                      onChange={() =>
                        setTags((current) =>
                          current.includes(tag)
                            ? current.filter((value) => value !== tag)
                            : [...current, tag].slice(
                                0,
                                SITE_FEEDBACK_MAX_TAGS,
                              ),
                        )
                      }
                    />
                    <span>
                      {tag}
                      {tags.includes(tag) && (
                        <Check size={13} aria-hidden="true" />
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className={dialogStyles.fields}>
            <div>
              <label htmlFor="feedback-name">
                Name <span>(optional)</span>
              </label>
              <input
                id="feedback-name"
                name="name"
                maxLength={SITE_FEEDBACK_NAME_MAX}
                autoComplete="name"
                placeholder="What should we call you?"
              />
            </div>
            <div>
              <label htmlFor="feedback-tool">About</label>
              <select id="feedback-tool" name="tool" defaultValue="">
                <option value="">QUICKKIT overall</option>
                {catalogue.map((tool) => (
                  <option value={tool.slug} key={tool.slug}>
                    {tool.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="feedback-message">
              Your feedback{" "}
              <span>{rating > 0 ? "(optional)" : "(or just rate above)"}</span>
            </label>
            <textarea
              id="feedback-message"
              name="message"
              maxLength={SITE_FEEDBACK_MESSAGE_MAX}
              rows={3}
              placeholder="What felt great? What could be better?"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setError("");
              }}
            />
            <span className={dialogStyles.counter}>
              {message.length}/{SITE_FEEDBACK_MESSAGE_MAX}
            </span>
          </div>
          <label
            className={dialogStyles.consent}
            htmlFor="feedback-send-privately"
          >
            <input
              id="feedback-send-privately"
              type="checkbox"
              checked={sendPrivately}
              onChange={(event) => setSendPrivately(event.target.checked)}
            />
            Send this feedback privately to QUICKKIT for review. The submission
            is retained according to the Privacy Policy.
          </label>
          {error && (
            <p role="alert" className={dialogStyles.error}>
              {error}
            </p>
          )}
          <button
            type="submit"
            className={dialogStyles.submit}
            disabled={sending}
          >
            {sending
              ? "Sending…"
              : sendPrivately
                ? "Send privately"
                : "Add feedback"}{" "}
            <Send size={17} aria-hidden="true" />
          </button>
          <p className={dialogStyles.privacy}>
            <LockKeyhole size={12} aria-hidden="true" /> Saved on this device ·
            No account needed
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
                  <div>
                    <strong>
                      {toolName(entry.tool)} · {entry.rating}/5
                    </strong>
                    <p>
                      {entry.comment ||
                        entry.tags.join(" · ") ||
                        "Rated your experience"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {entries.length > 0 && (
          <section className={dialogStyles.saved} aria-label="Saved feedback">
            <h3>
              Saved in this browser <span>{entries.length}</span>
            </h3>
            <ul>
              {entries.map((entry, index) => (
                <li key={`${index}-${entry.name}-${entry.message}`}>
                  <div>
                    <strong>
                      {entry.name || "Anonymous"}
                      {entry.tool ? ` · ${toolName(entry.tool)}` : ""}
                    </strong>
                    {entry.rating > 0 && (
                      <span className={dialogStyles.savedRating}>
                        <Stars
                          rating={entry.rating}
                          className={dialogStyles.savedStars}
                        />
                        {siteFeedbackRatingLabel(entry.rating)}
                      </span>
                    )}
                    {entry.tags.length > 0 && (
                      <span className={dialogStyles.savedTags}>
                        {entry.tags.join(" · ")}
                      </span>
                    )}
                    {entry.message && <p>{entry.message}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete feedback ${index + 1}`}
                    onClick={() => {
                      if (!onRemove(index))
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
  /*
   * The catalogue (every tool description and keyword) is loaded after the page
   * is idle, or the moment the form is opened, instead of being imported at
   * module scope. It is only needed to name a tool, so paying ~45 kB of
   * first-load JavaScript for it on the homepage was the wrong trade.
   */
  const [catalogue, setCatalogue] = useState<readonly Tool[]>([]);
  const mounted = useRef(true);
  const loadCatalogue = useCallback(() => {
    void import("@/lib/catalog").then((module) => {
      if (mounted.current) setCatalogue(module.tools);
    });
  }, []);
  useEffect(() => {
    mounted.current = true;
    const idle = "requestIdleCallback" in window;
    const handle = idle
      ? window.requestIdleCallback(loadCatalogue, { timeout: 2500 })
      : window.setTimeout(loadCatalogue, 1500);
    return () => {
      mounted.current = false;
      if (idle) window.cancelIdleCallback(handle as number);
      else window.clearTimeout(handle as number);
    };
  }, [loadCatalogue]);
  const toolEntries = useMemo(
    () =>
      parseToolFeedback(toolRaw)
        .reverse()
        .filter((entry) => catalogue.some((tool) => tool.slug === entry.tool)),
    [toolRaw, catalogue],
  );
  // 0 = closed. Every opening gets a new number, used as the form's key, so
  // each opening is a fresh form even if an earlier one did not report back.
  const [openId, setOpenId] = useState(0);
  const [notice, setNotice] = useState("");
  const show = useCallback(() => {
    // Already in front of the visitor: keep what they have typed.
    if (document.querySelector("dialog[data-hero-feedback][open]")) return;
    setNotice("");
    loadCatalogue();
    setOpenId((current) => current + 1);
  }, [loadCatalogue]);
  const [closedId, setClosedId] = useState(0);
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, [show]);
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
  const total = toolEntries.length + entries.length;
  const open = openId > closedId;
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
              {total
                ? `${total} ${total === 1 ? "REVIEW" : "REVIEWS"} · THIS BROWSER`
                : "YOUR EXPERIENCE MATTERS"}
            </span>
          </div>
        </div>
        <div className={styles.feedbackCards} aria-live="polite">
          {toolEntries.slice(0, 8).map((entry, index) => {
            const tool = catalogue.find((tool) => tool.slug === entry.tool)!;
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
                    siteFeedbackRatingLabel(entry.rating)}
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
              {entry.rating > 0 && (
                <Stars rating={entry.rating} className={styles.manualStars} />
              )}
              <p>
                {entry.message ||
                  [siteFeedbackRatingLabel(entry.rating), ...entry.tags].join(
                    " · ",
                  )}
              </p>
            </article>
          ))}
          {total === 0 && (
            <div className={styles.feedbackEmpty}>
              <span className={styles.emptyHeart} aria-hidden="true">
                <Heart />
              </span>
              <b>No feedback yet</b>
              <p>Your next little success story belongs here.</p>
            </div>
          )}
        </div>
        <button type="button" className={styles.feedbackButton} onClick={show}>
          Share feedback <span aria-hidden="true">↗</span>
        </button>
        {notice ? (
          <p className={dialogStyles.success} role="status">
            {notice}
          </p>
        ) : null}
      </section>
      {open && (
        <FeedbackDialog
          key={openId}
          onClose={() => setClosedId(openId)}
          onSave={save}
          onRemove={remove}
          onCloudSuccess={setNotice}
          entries={entries}
          toolEntries={toolEntries}
          catalogue={catalogue}
        />
      )}
    </>
  );
}
