"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./hero-bubble-icon.module.css";

/** A local, repeatable bubble chase. The icon never leaves its perimeter lane. */
export default function HeroBubbleIcon({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const [playing, setPlaying] = useState(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const finish = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    active.current = false;
    setPlaying(false);
  };
  const launch = () => {
    if (active.current) return;
    active.current = true;
    setPlaying(true);
    timer.current = setTimeout(
      finish,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 350
        : 2500,
    );
  };
  return (
    <button
      type="button"
      className={styles.trigger}
      data-bubble-trigger
      data-bubble-state={playing ? "playing" : "idle"}
      aria-label={`${label}: bounce around and return`}
      onClick={launch}
    >
      <span
        className={styles.runner}
        data-bubble-runner
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) finish();
        }}
      >
        {children}
        <span className={styles.shell} aria-hidden="true" />
      </span>
    </button>
  );
}
