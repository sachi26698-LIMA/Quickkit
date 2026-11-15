"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { VisitorStats } from "@/lib/visitor-analytics";
import styles from "./hero-visitor-chart.module.css";

type Snapshot = VisitorStats & { available: true };
export default function HeroVisitorChart() {
  const [stats, setStats] = useState<Snapshot | null>(null);
  const [holding, setHolding] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const cancel = useCallback(() => {
    if (hold.current) clearTimeout(hold.current);
    hold.current = null;
    pointer.current = null;
    setHolding(false);
  }, []);
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/visitor-stats", {
          cache: "no-store",
          signal: controller.signal,
        });
        const value = await response.json();
        if (mounted)
          setStats(
            response.ok &&
              value.available === true &&
              [value.online, value.visitors, value.averageSeconds].every(
                (n) => typeof n === "number" && Number.isFinite(n) && n >= 0,
              )
              ? value
              : null,
          );
      } catch {
        if (mounted) setStats(null);
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 15000);
    const visibility = () => {
      if (document.hidden) {
        cancel();
        setRevealed(false);
      } else void refresh();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      mounted = false;
      controller.abort();
      clearInterval(interval);
      if (hold.current) clearTimeout(hold.current);
      if (hide.current) clearTimeout(hide.current);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [cancel]);
  const begin = () => {
    if (hold.current || revealed || !stats) return;
    setHolding(true);
    hold.current = setTimeout(() => {
      hold.current = null;
      setHolding(false);
      setRevealed(true);
      if (hide.current) clearTimeout(hide.current);
      hide.current = setTimeout(() => setRevealed(false), 10000);
    }, 10000);
  };
  const values = [stats?.online, stats?.visitors, stats?.averageSeconds];
  const labels = ["Online", "Visitors", "Avg. stay"];
  const ceiling = Math.max(1, ...values.map((n) => Math.log10(1 + (n ?? 0))));
  return (
    <button
      type="button"
      className={styles.card}
      data-visitor-chart
      data-revealed={revealed}
      data-holding={holding}
      aria-label="Live visitor graph. Hold for 10 seconds to show labels and numbers for 10 seconds. Keyboard: hold Space or Enter."
      aria-describedby="visitor-chart-help"
      onPointerDown={(event) => {
        if (!event.isPrimary || event.button !== 0) return;
        pointer.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
        begin();
      }}
      onPointerMove={(event) => {
        const p = pointer.current;
        if (p && Math.hypot(event.clientX - p.x, event.clientY - p.y) > 12)
          cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onBlur={cancel}
      onContextMenu={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          if (!event.repeat) begin();
        } else if (event.key === "Escape") cancel();
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          cancel();
        }
      }}
    >
      <span className={styles.heading}>
        <span className={styles.dot} /> Live audience{" "}
        <small>3D · log scale</small>
      </span>
      <span className={styles.plot} aria-hidden="true">
        {labels.map((label, index) => (
          <span className={styles.column} key={label}>
            <span className={styles.value} data-metric-value={index}>
              {revealed && stats
                ? index === 2
                  ? `${Math.floor(stats.averageSeconds / 60)}m ${stats.averageSeconds % 60}s`
                  : values[index]!.toLocaleString("en-IN")
                : ""}
            </span>
            <span className={styles.track}>
              <span
                className={styles.bar}
                style={{
                  height: `${stats ? (Math.log10(1 + values[index]!) / ceiling) * 100 : 0}%`,
                }}
              />
            </span>
            <span className={styles.label} data-metric-label={index}>
              {revealed && stats ? label : ""}
            </span>
          </span>
        ))}
      </span>
      <span id="visitor-chart-help" className={styles.hint} aria-live="polite">
        {!stats
          ? "Live stats unavailable"
          : revealed
            ? "Actual counts · visible for 10s"
            : holding
              ? "Keep holding… 10s to reveal"
              : "Hold 10s to reveal · stays 10s"}
      </span>
      {revealed && stats && (
        <span className="sr-only" role="status">
          {stats.online} online, {stats.visitors} visitors since tracking began,
          average visible visit {stats.averageSeconds} seconds.
        </span>
      )}
      <span className={styles.progress} />
    </button>
  );
}
