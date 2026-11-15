"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, ArrowRight } from "lucide-react";
import {
  LAPTOP_FINISHES,
  LAPTOP_CYCLE_MS,
  LAPTOP_HOLD_MS,
  laptopFinishStyle,
} from "@/lib/laptop-finishes";
import styles from "./laptop-colour-studio.module.css";

/** The laptop, screen and metal layers belong to the server shell. This small
 * client island only owns the controls and updates CSS variables after mount;
 * it never hydrates, reorders or replaces any laptop/screen children. */
export default function LaptopColourControls() {
  const controlsRef = useRef<HTMLDivElement>(null);
  const laptopRef = useRef<HTMLElement | null>(null);
  const elapsed = useRef(0);
  const [clock, setClock] = useState({ index: 0, changing: false });
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const laptop =
      controlsRef.current?.parentElement?.querySelector<HTMLElement>(
        "[data-laptop-body]",
      );
    if (!laptop) return;
    laptopRef.current = laptop;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(media.matches);
    const updateVisibility = () => setDocumentVisible(!document.hidden);
    updateMotion();
    updateVisibility();
    media.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    const observer =
      "IntersectionObserver" in window
        ? new IntersectionObserver(([entry]) =>
            setVisible(entry.isIntersecting),
          )
        : null;
    if (observer) observer.observe(laptop);
    const fallbackFrame = observer
      ? null
      : window.requestAnimationFrame(() => setVisible(true));
    return () => {
      observer?.disconnect();
      if (fallbackFrame !== null) window.cancelAnimationFrame(fallbackFrame);
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      laptopRef.current = null;
    };
  }, []);

  const running = !paused && visible && documentVisible && !reducedMotion;
  useEffect(() => {
    if (!running) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      elapsed.current += Math.max(0, now - previous);
      previous = now;
      const index =
        Math.floor(elapsed.current / LAPTOP_CYCLE_MS) % LAPTOP_FINISHES.length;
      const changing = elapsed.current % LAPTOP_CYCLE_MS >= LAPTOP_HOLD_MS;
      setClock((current) =>
        current.index === index && current.changing === changing
          ? current
          : { index, changing },
      );
    }, 100);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    const laptop = laptopRef.current;
    if (!laptop) return;
    for (const [name, value] of Object.entries(
      laptopFinishStyle(clock.index, clock.changing, running),
    )) {
      laptop.style.setProperty(name, String(value));
    }
    laptop.dataset.finishPhase = clock.changing ? "changing" : "holding";
    laptop.dataset.finishRunning = String(running);
    // Leave the frame paused if this controller is removed by navigation/HMR.
    return () => {
      laptop.style.setProperty("--finish-play-state", "paused");
    };
  }, [clock.index, clock.changing, running]);

  function nextColour() {
    const index = (clock.index + 1) % LAPTOP_FINISHES.length;
    elapsed.current = index * LAPTOP_CYCLE_MS;
    setClock({ index, changing: false });
  }

  return (
    <div
      ref={controlsRef}
      style={laptopFinishStyle(clock.index, clock.changing, running)}
      className={styles.controls}
      role="group"
      aria-label="Laptop colour rotation"
      data-colour-controls="studio-v2"
    >
      <button
        type="button"
        onClick={
          reducedMotion ? nextColour : () => setPaused((value) => !value)
        }
        aria-label={
          reducedMotion
            ? "Next laptop colour"
            : paused
              ? "Resume laptop colour rotation"
              : "Pause laptop colour rotation"
        }
      >
        {reducedMotion ? (
          <ArrowRight size={15} />
        ) : paused ? (
          <Play size={15} />
        ) : (
          <Pause size={15} />
        )}
      </button>
    </div>
  );
}
