"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Check,
  Heart,
  LockKeyhole,
  Send,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { tools } from "@/lib/catalog";
import { toolTheme, toolThemeStyle, type ToolTheme } from "@/lib/tool-theme";
import styles from "./tool-download-feedback.module.css";
import {
  TOOL_FEEDBACK_KEY as STORAGE_KEY,
  TOOL_FEEDBACK_EVENT,
  parseToolFeedback,
  readToolFeedback,
} from "@/lib/tool-feedback";

const labels = [
  "Disappointing",
  "Could be better",
  "It was okay",
  "Really good",
  "Loved it!",
];
const positive = [
  "Easy to use",
  "Great result",
  "Fast & smooth",
  "Beautiful design",
];
const improve = ["Result quality", "Speed", "Hard to use", "Something else"];

export default function ToolDownloadFeedback() {
  const pathname = usePathname();
  const slug = pathname.startsWith("/tools/") ? pathname.slice(7) : "";
  const tool = tools.find((item) => item.slug === slug);
  return tool ? (
    <Feedback
      key={slug}
      slug={slug}
      name={tool.name}
      theme={toolTheme(tool.slug, tool.category)}
    />
  ) : null;
}

function Feedback({
  slug,
  name,
  theme,
}: {
  slug: string;
  name: string;
  theme: ToolTheme;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const shownRating = hover || rating;
  const reaction = ["idle", "sad", "unsure", "okay", "happy", "love"][
    done ? rating : shownRating
  ];

  const expression = ["idle", "crying", "sad", "smiling", "happy", "love"][
    done ? rating : shownRating
  ];

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const modal = dialog.current;
    if (modal) modal.dataset.feedbackReady = "true";
    // Observe the actual download anchor, not a button labelled Download:
    // conversion errors and preview/copy actions must never open this prompt.
    // All tools' programmatic anchors are attached before .click(), so this
    // also covers shared/local blob helpers, direct links and ZIP exports.
    const onDownload = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[download]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        !anchor.href ||
        anchor.getAttribute("aria-disabled") === "true" ||
        modal?.open ||
        timer
      )
        return;
      timer = setTimeout(() => {
        timer = undefined;
        if (event.defaultPrevented || modal?.open) return;
        setRating(0);
        setHover(0);
        setTags([]);
        setComment("");
        setDone(false);
        setError("");
        // Browsers expose download initiation, not when a file finishes saving.
        // Leave the browser's download action untouched, then invite feedback.
        modal?.showModal();
        setOpen(true);
      }, 650);
    };
    document.addEventListener("click", onDownload, true);
    return () => {
      document.removeEventListener("click", onDownload, true);
      clearTimeout(timer);
      modal?.close();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function dismiss() {
    dialog.current?.close();
    setOpen(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating || done) return;
    try {
      const entries = parseToolFeedback(readToolFeedback());
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify([
          ...entries,
          {
            tool: slug,
            rating,
            tags,
            comment: comment.trim().slice(0, 600),
            createdAt: new Date().toISOString(),
          },
        ]),
      );
      window.dispatchEvent(new Event(TOOL_FEEDBACK_EVENT));
      setError("");
      setDone(true);
    } catch {
      setError(
        "Your browser couldn’t save this feedback. Please allow local storage and try again, or close this window.",
      );
    }
  }

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      style={toolThemeStyle(theme)}
      data-feedback-tool={slug}
      data-feedback-style="laptop-feed-v5"
      aria-labelledby={`feedback-title-${slug}`}
      aria-describedby={`feedback-description-${slug}`}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            dismiss();
        }
      }}
    >
      <div
        className={styles.card}
        data-tool-feedback
        data-step={done ? "thanks" : rating ? "details" : "rating"}
      >
        <button
          className={styles.close}
          type="button"
          aria-label="Close feedback"
          onClick={dismiss}
          autoFocus
        >
          <X size={19} />
        </button>
        <div className={styles.topline}>
          <span className={styles.brand}>
            <Sparkles size={14} /> A LITTLE MOMENT FOR YOU
          </span>
          <span className={styles.step}>
            {done ? "ALL DONE" : rating ? "02 / 02" : "01 / 02"}
          </span>
        </div>
        <div
          className={styles.art}
          aria-hidden="true"
          data-reaction={reaction}
          data-saved={done}
        >
          <span className={styles.glassGlow} />
          <span className={styles.glassBubble} />
          <span className={styles.orbitOne} />
          <span className={styles.orbitTwo} />
          <span className={styles.sparkOne}>
            <Sparkles size={23} />
          </span>
          <span className={styles.sparkTwo}>
            <Heart size={20} fill="currentColor" />
          </span>
          <span className={styles.depthLayerBack} />
          <span className={styles.depthLayerMiddle} />
          <div
            key={`${done ? "saved" : "rating"}-${shownRating}`}
            className={styles.face}
            data-reaction={reaction}
            data-expression={expression}
            data-mood={
              done
                ? rating >= 4
                  ? "love"
                  : rating <= 2
                    ? "care"
                    : "smile"
                : shownRating
                  ? shownRating >= 4
                    ? "love"
                    : shownRating <= 2
                      ? "care"
                      : "smile"
                  : "smile"
            }
            data-celebrate={done}
          >
            <span className={`${styles.colourLayer} ${styles.layerCool}`} />
            <span className={`${styles.colourLayer} ${styles.layerWarm}`} />
            <span className={`${styles.colourLayer} ${styles.layerPrism}`} />
            <span className={styles.faceGlint} />
            <i className={styles.browLeft} />
            <i className={styles.browRight} />
            <i className={styles.eyeLeft} />
            <i className={styles.eyeRight} />
            <i className={styles.cheekLeft} />
            <i className={styles.cheekRight} />
            <i className={styles.mouth} />
            <span className={`${styles.tear} ${styles.tearLeft}`} />
            <span className={`${styles.tear} ${styles.tearRight}`} />
          </div>
          <span
            key={`bits-${done}-${shownRating}`}
            className={styles.reactionBits}
          >
            <Heart size={14} fill="currentColor" />
            <Sparkles size={18} />
            <Star size={12} fill="currentColor" />
          </span>
          <span className={styles.artBadge}>
            {done ? (
              <Check size={18} />
            ) : (
              <Star size={17} fill="currentColor" />
            )}
          </span>
        </div>
        <span className={styles.eyebrow}>
          {done ? "YOU MAKE QUICKKIT BETTER" : "YOUR DOWNLOAD IS ON ITS WAY"}
        </span>
        <h2 id={`feedback-title-${slug}`}>
          {done
            ? rating >= 4
              ? "You made our day!"
              : "Your experience matters."
            : "How did it feel?"}
        </h2>
        <p className={styles.description} id={`feedback-description-${slug}`}>
          {done ? (
            rating >= 4 ? (
              "A little joy, a job well done. Thanks for sharing yours."
            ) : (
              "Thanks for being honest. Every experience deserves to be heard."
            )
          ) : (
            <>
              A little feedback on <strong>{name}</strong>.<br />
              Just a few seconds. A big difference.
            </>
          )}
        </p>
        {done ? (
          <div className={styles.thanks} role="status">
            <div className={styles.receipt}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  size={20}
                  fill={i < rating ? "currentColor" : "none"}
                  opacity={i < rating ? 1 : 0.3}
                />
              ))}
              <span>{rating}/5</span>
            </div>
            <p>
              Feedback added to your laptop screen.
              <br />
              <small>Visible on the homepage in this browser only.</small>
            </p>
            <button className={styles.primary} type="button" onClick={dismiss}>
              Keep creating <Heart size={17} />
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <fieldset className={styles.rating}>
              <legend className={styles.srOnly}>Rate your experience</legend>
              {labels.map((label, i) => (
                <label
                  key={label}
                  className={styles.star}
                  data-active={i < shownRating}
                  onMouseEnter={() => setHover(i + 1)}
                  onMouseLeave={() => setHover(0)}
                >
                  <input
                    type="radio"
                    name={`tool-rating-${slug}`}
                    value={i + 1}
                    checked={rating === i + 1}
                    aria-label={`${i + 1} ${i === 0 ? "star" : "stars"} — ${label}`}
                    onChange={() => {
                      setRating(i + 1);
                      setTags([]);
                    }}
                  />
                  <Star
                    size={36}
                    strokeWidth={1.5}
                    fill={
                      i < shownRating
                        ? `url(#feedback-star-${slug}-${i})`
                        : "currentColor"
                    }
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id={`feedback-star-${slug}-${i}`}
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="var(--aurora-cool)" />
                        <stop offset="45%" stopColor="currentColor" />
                        <stop offset="100%" stopColor="var(--aurora-warm)" />
                      </linearGradient>
                    </defs>
                  </Star>
                </label>
              ))}
            </fieldset>
            <p className={styles.ratingLabel} aria-live="polite">
              {shownRating
                ? labels[shownRating - 1]
                : "Tap a star to get started"}
            </p>
            {rating > 0 && (
              <div className={styles.details}>
                <fieldset className={styles.options}>
                  <legend>
                    {rating >= 4
                      ? "What made it great?"
                      : "What could be better?"}{" "}
                    <span>Optional · pick any</span>
                  </legend>
                  <div>
                    {(rating >= 4 ? positive : improve).map((tag) => (
                      <label key={tag} className={styles.chip}>
                        <input
                          type="checkbox"
                          checked={tags.includes(tag)}
                          onChange={() =>
                            setTags((current) =>
                              current.includes(tag)
                                ? current.filter((item) => item !== tag)
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
                <label className={styles.comment}>
                  Anything else? <span>Optional</span>
                  <textarea
                    maxLength={600}
                    rows={2}
                    placeholder="Tell us how it went… (no personal or file details)"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                  />
                </label>
                <div className={styles.counter}>{comment.length}/600</div>
                {error && (
                  <p className={styles.error} role="alert">
                    {error}
                  </p>
                )}
                <button className={styles.primary} type="submit">
                  Save my feedback <Send size={16} />
                </button>
              </div>
            )}
            <button className={styles.later} type="button" onClick={dismiss}>
              Maybe later
            </button>
          </form>
        )}
        <p className={styles.privacy}>
          <LockKeyhole size={12} /> Only on this device. No account. No uploads.
        </p>
      </div>
    </dialog>
  );
}
