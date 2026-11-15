"use client";

import { useEffect, useRef, type ReactNode } from "react";
import styles from "./hero-scene-orbit.module.css";

/** Observe visibility only after hydration; the scene itself is server-rendered. */
export default function HeroMotion({ children }: { children: ReactNode }) {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!("IntersectionObserver" in window)) {
      scene.classList.add(styles.visible);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      scene.classList.toggle(styles.visible, entry.isIntersecting);
    });
    observer.observe(scene);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      data-hero-style="glass-feedback-v7"
    >
      {children}
    </div>
  );
}
